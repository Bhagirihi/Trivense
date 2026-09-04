import { createServerSupabase } from "@/lib/supabase/server";
import { csvEscape, weekAgoIso } from "@/lib/admin-api";
import { getAppConfig, type AppConfig } from "@/lib/app-config.server";

export type AdminOverview = {
  generatedAt: string;
  config: {
    supabase: boolean;
    revenueCat: boolean;
  };
  appConfig: AppConfig;
  stats: {
    users: { total: number; last7Days: number; withPushToken: number };
    plans: { free: number; premiumProfile: number; monthly: number; yearly: number };
    subscriptions: {
      activePaid: number;
      referralRewards: number;
      expiredOrCancelled: number;
    };
    referrals: { total: number; last7Days: number };
    boards: { total: number; last7Days: number };
    expenses: { total: number; last7Days: number };
    shares: { total: number; accepted: number; pending: number };
    waitlist: { total: number; last7Days: number };
  };
  recentUsers: AdminUserRow[];
  subscriptions: AdminSubscriptionRow[];
  referrals: AdminReferralRow[];
  waitlist: AdminWaitlistRow[];
  recentBoards: AdminBoardRow[];
  topReferrers: AdminTopReferrer[];
};

export type AdminUserRow = {
  id: string;
  full_name: string | null;
  email_address: string | null;
  current_plan: string | null;
  account_status: string | null;
  referral_code: string | null;
  expo_push_token: string | null;
  created_at: string;
};

export type AdminSubscriptionRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  plan: string;
  status: string;
  store_product_id: string | null;
  expires_at: string | null;
  updated_at: string;
};

export type AdminReferralRow = {
  id: string;
  referral_code_used: string;
  reward_days: number;
  created_at: string;
  referrer_email: string | null;
  referrer_name: string | null;
  referred_email: string | null;
  referred_name: string | null;
};

export type AdminWaitlistRow = {
  id: string;
  email: string;
  name: string | null;
  source: string | null;
  created_at: string;
};

export type AdminBoardRow = {
  id: string;
  name: string;
  created_by: string;
  owner_email: string | null;
  share_code: string | null;
  total_expense: number | null;
  created_at: string;
};

export type AdminTopReferrer = {
  referrer_id: string;
  email: string | null;
  full_name: string | null;
  referral_code: string | null;
  count: number;
};

type ProfileMap = Map<
  string,
  { full_name: string | null; email_address: string | null; referral_code: string | null }
>;

async function countRows(
  supabase: NonNullable<ReturnType<typeof createServerSupabase>>,
  table: string,
  filters?: (query: ReturnType<ReturnType<typeof supabase.from>["select"]>) => ReturnType<
    ReturnType<typeof supabase.from>["select"]
  >
): Promise<number> {
  try {
    let query = supabase.from(table).select("*", { count: "exact", head: true });
    if (filters) query = filters(query);
    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

function isReferralStoreProduct(id: string | null | undefined): boolean {
  if (!id) return false;
  return id === "referral_reward" || id.startsWith("referral_");
}

function isActivePremiumSub(row: {
  plan: string;
  status: string;
  expires_at: string | null;
}): boolean {
  if (!["monthly", "yearly"].includes(row.plan)) return false;
  if (row.status !== "active") return false;
  if (row.expires_at && row.expires_at <= new Date().toISOString()) return false;
  return true;
}

async function loadProfileMap(
  supabase: NonNullable<ReturnType<typeof createServerSupabase>>,
  ids: string[]
): Promise<ProfileMap> {
  const map: ProfileMap = new Map();
  if (!ids.length) return map;

  const unique = [...new Set(ids)];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email_address, referral_code")
    .in("id", unique);

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    map.set(row.id, {
      full_name: row.full_name,
      email_address: row.email_address,
      referral_code: row.referral_code,
    });
  }

  return map;
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const supabase = createServerSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured. Add SUPABASE_SERVICE_ROLE_KEY.");
  }

  const weekAgo = weekAgoIso();

  const [
    appConfig,
    usersTotal,
    usersRecent,
    usersWithPushToken,
    premiumProfiles,
    freeProfiles,
    referralsTotal,
    referralsRecent,
    boardsTotal,
    boardsRecent,
    expensesTotal,
    expensesRecent,
    sharesTotal,
    sharesAccepted,
    sharesPending,
    waitlistTotal,
    waitlistRecent,
    recentUsersRes,
    allSubsRes,
    referralsRes,
    waitlistRes,
    recentBoardsRes,
  ] = await Promise.all([
    getAppConfig().catch(() => ({
      paymentsEnabled: true,
      updatedAt: null,
    })),
    countRows(supabase, "profiles"),
    countRows(supabase, "profiles", (q) => q.gte("created_at", weekAgo)),
    countRows(supabase, "profiles", (q) =>
      q.not("expo_push_token", "is", null).neq("expo_push_token", "")
    ),
    countRows(supabase, "profiles", (q) => q.eq("current_plan", "premium")),
    countRows(supabase, "profiles", (q) => q.eq("current_plan", "free")),
    countRows(supabase, "referrals"),
    countRows(supabase, "referrals", (q) => q.gte("created_at", weekAgo)),
    countRows(supabase, "expense_boards"),
    countRows(supabase, "expense_boards", (q) => q.gte("created_at", weekAgo)),
    countRows(supabase, "expenses"),
    countRows(supabase, "expenses", (q) => q.gte("created_at", weekAgo)),
    countRows(supabase, "shared_users"),
    countRows(supabase, "shared_users", (q) => q.eq("is_accepted", true)),
    countRows(supabase, "shared_users", (q) => q.eq("is_accepted", false)),
    countRows(supabase, "website_waitlist"),
    countRows(supabase, "website_waitlist", (q) => q.gte("created_at", weekAgo)),
    supabase
      .from("profiles")
      .select(
        "id, full_name, email_address, current_plan, account_status, referral_code, expo_push_token, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("user_subscriptions")
      .select("user_id, plan, status, store_product_id, expires_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(500),
    supabase
      .from("referrals")
      .select("id, referrer_id, referred_user_id, referral_code_used, reward_days, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("website_waitlist")
      .select("id, email, name, source, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("expense_boards")
      .select("id, name, created_by, share_code, total_expense, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  for (const result of [recentUsersRes, allSubsRes, waitlistRes, recentBoardsRes]) {
    if (result.error) throw new Error(result.error.message);
  }

  const allSubs = allSubsRes.data ?? [];
  const monthlySubs = allSubs.filter((s) => s.plan === "monthly").length;
  const yearlySubs = allSubs.filter((s) => s.plan === "yearly").length;
  const activePaid = allSubs.filter(
    (s) => isActivePremiumSub(s) && !isReferralStoreProduct(s.store_product_id)
  ).length;
  const referralRewards = allSubs.filter((s) =>
    isReferralStoreProduct(s.store_product_id)
  ).length;
  const expiredOrCancelled = allSubs.filter((s) =>
    ["cancelled", "expired"].includes(s.status)
  ).length;

  const premiumSubs = allSubs
    .filter((s) => ["monthly", "yearly"].includes(s.plan))
    .slice(0, 50);

  const referralRows = referralsRes.error ? [] : (referralsRes.data ?? []);
  const boardRows = recentBoardsRes.data ?? [];

  const profileIds = [
    ...premiumSubs.map((s) => s.user_id as string),
    ...referralRows.flatMap((r) => [r.referrer_id as string, r.referred_user_id as string]),
    ...boardRows.map((b) => b.created_by as string),
  ];

  const { data: allReferralsForTop, error: topReferralsError } = await supabase
    .from("referrals")
    .select("referrer_id");

  const referrerCounts = new Map<string, number>();
  if (!topReferralsError) {
    for (const row of allReferralsForTop ?? []) {
      const id = row.referrer_id as string;
      referrerCounts.set(id, (referrerCounts.get(id) ?? 0) + 1);
    }
  }

  const topReferrerIds = [...referrerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);

  profileIds.push(...topReferrerIds);
  const profiles = await loadProfileMap(supabase, profileIds);

  const subscriptions: AdminSubscriptionRow[] = premiumSubs.map((row) => {
    const profile = profiles.get(row.user_id as string);
    return {
      user_id: row.user_id as string,
      email: profile?.email_address ?? null,
      full_name: profile?.full_name ?? null,
      plan: row.plan as string,
      status: row.status as string,
      store_product_id: row.store_product_id as string | null,
      expires_at: row.expires_at as string | null,
      updated_at: row.updated_at as string,
    };
  });

  const referrals: AdminReferralRow[] = referralRows.map((row) => {
    const referrer = profiles.get(row.referrer_id as string);
    const referred = profiles.get(row.referred_user_id as string);
    return {
      id: row.id as string,
      referral_code_used: row.referral_code_used as string,
      reward_days: row.reward_days as number,
      created_at: row.created_at as string,
      referrer_email: referrer?.email_address ?? null,
      referrer_name: referrer?.full_name ?? null,
      referred_email: referred?.email_address ?? null,
      referred_name: referred?.full_name ?? null,
    };
  });

  const recentBoards: AdminBoardRow[] = boardRows.map((row) => {
    const owner = profiles.get(row.created_by as string);
    return {
      id: row.id as string,
      name: row.name as string,
      created_by: row.created_by as string,
      owner_email: owner?.email_address ?? null,
      share_code: row.share_code as string | null,
      total_expense: row.total_expense as number | null,
      created_at: row.created_at as string,
    };
  });

  const topReferrers: AdminTopReferrer[] = topReferrerIds.map((id) => {
    const profile = profiles.get(id);
    return {
      referrer_id: id,
      email: profile?.email_address ?? null,
      full_name: profile?.full_name ?? null,
      referral_code: profile?.referral_code ?? null,
      count: referrerCounts.get(id) ?? 0,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    config: {
      supabase: true,
      revenueCat: Boolean(process.env.REVENUECAT_API_V2_KEY),
    },
    appConfig,
    stats: {
      users: { total: usersTotal, last7Days: usersRecent, withPushToken: usersWithPushToken },
      plans: {
        free: freeProfiles,
        premiumProfile: premiumProfiles,
        monthly: monthlySubs,
        yearly: yearlySubs,
      },
      subscriptions: {
        activePaid,
        referralRewards,
        expiredOrCancelled,
      },
      referrals: { total: referralsTotal, last7Days: referralsRecent },
      boards: { total: boardsTotal, last7Days: boardsRecent },
      expenses: { total: expensesTotal, last7Days: expensesRecent },
      shares: {
        total: sharesTotal,
        accepted: sharesAccepted,
        pending: sharesPending,
      },
      waitlist: { total: waitlistTotal, last7Days: waitlistRecent },
    },
    recentUsers: (recentUsersRes.data ?? []) as AdminUserRow[],
    subscriptions,
    referrals,
    waitlist: (waitlistRes.data ?? []) as AdminWaitlistRow[],
    recentBoards,
    topReferrers,
  };
}

export async function fetchAdminExport(type: string): Promise<{ header: string; lines: string[]; filename: string }> {
  const overview = await fetchAdminOverview();

  switch (type) {
    case "waitlist":
      return {
        filename: "trivense-waitlist.csv",
        header: "email,name,source,created_at",
        lines: overview.waitlist.map((row) =>
          [row.email, row.name ?? "", row.source ?? "website", row.created_at]
            .map(String)
            .join(",")
        ),
      };
    case "users":
      return {
        filename: "trivense-users.csv",
        header: "email,name,plan,status,referral_code,expo_push_token,created_at",
        lines: overview.recentUsers.map((row) =>
          [
            row.email_address ?? "",
            row.full_name ?? "",
            row.current_plan ?? "",
            row.account_status ?? "",
            row.referral_code ?? "",
            row.expo_push_token ?? "",
            row.created_at,
          ]
            .map((value) => csvEscape(String(value)))
            .join(",")
        ),
      };
    case "referrals":
      return {
        filename: "trivense-referrals.csv",
        header: "code,referrer_email,referred_email,reward_days,created_at",
        lines: overview.referrals.map((row) =>
          [
            row.referral_code_used,
            row.referrer_email ?? "",
            row.referred_email ?? "",
            row.reward_days,
            row.created_at,
          ].join(",")
        ),
      };
    case "subscriptions":
      return {
        filename: "trivense-subscriptions.csv",
        header: "email,plan,status,store_product_id,expires_at,updated_at",
        lines: overview.subscriptions.map((row) =>
          [
            row.email ?? "",
            row.plan,
            row.status,
            row.store_product_id ?? "",
            row.expires_at ?? "",
            row.updated_at,
          ].join(",")
        ),
      };
    default:
      throw new Error("Unknown export type");
  }
}
