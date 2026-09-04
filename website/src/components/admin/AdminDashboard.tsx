"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminOverview } from "@/lib/admin-data.server";
import { site } from "@/lib/content";

type TabId =
  | "overview"
  | "users"
  | "subscriptions"
  | "referrals"
  | "waitlist"
  | "boards"
  | "ops";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "referrals", label: "Referrals" },
  { id: "waitlist", label: "Waitlist" },
  { id: "boards", label: "Boards" },
  { id: "ops", label: "Ops" },
];

const OPS_LINKS = [
  { label: "Google Play Console", href: "https://play.google.com/console" },
  { label: "AdMob", href: "https://admob.google.com/v2/apps/5149530682/overview" },
  { label: "RevenueCat", href: "https://app.revenuecat.com/projects/proj2d578859" },
  { label: "Supabase", href: "https://supabase.com/dashboard" },
  { label: "Vercel", href: "https://vercel.com/dashboard" },
  { label: "Firebase", href: "https://console.firebase.google.com" },
];

const SITE_CHECKS = [
  { label: "app-ads.txt", href: "/app-ads.txt" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Delete account", href: "/delete-account" },
  { label: "Download page", href: "/download" },
  { label: "Play Store listing", href: site.playStoreUrl },
];

export function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("overview");
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/overview");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load admin data");
      setData(json as AdminOverview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold/80">Admin</p>
          <h1 className="mt-2 text-3xl font-extrabold text-white">Trivense control center</h1>
          <p className="mt-2 text-sm text-white/55">
            Users, subscriptions, referrals, waitlist, boards, and ops in one place.
          </p>
          {data?.generatedAt ? (
            <p className="mt-1 text-xs text-white/35">
              Updated {new Date(data.generatedAt).toLocaleString()}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportMenu />
          <button
            type="button"
            onClick={load}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/85 hover:border-gold/40"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/85 hover:border-red-400/40 hover:text-red-200"
          >
            Sign out
          </button>
        </div>
      </header>

      <nav className="mt-8 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === item.id
                ? "bg-gold/20 text-gold-light ring-1 ring-gold/30"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {loading && !data ? (
        <p className="mt-10 text-sm text-white/50">Loading dashboard…</p>
      ) : data ? (
        <div className="mt-8">
          {tab === "overview" && (
            <OverviewTab
              data={data}
              onConfigChange={(appConfig) => setData({ ...data, appConfig })}
            />
          )}
          {tab === "users" && <UsersTab data={data} />}
          {tab === "subscriptions" && <SubscriptionsTab data={data} />}
          {tab === "referrals" && <ReferralsTab data={data} />}
          {tab === "waitlist" && <WaitlistTab data={data} />}
          {tab === "boards" && <BoardsTab data={data} />}
          {tab === "ops" && <OpsTab data={data} />}
        </div>
      ) : null}
    </div>
  );
}

function OverviewTab({
  data,
  onConfigChange,
}: {
  data: AdminOverview;
  onConfigChange: (config: AdminOverview["appConfig"]) => void;
}) {
  const s = data.stats;
  return (
    <div className="space-y-8">
      <PaymentsToggleCard config={data.appConfig} onUpdated={onConfigChange} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="App users" value={String(s.users.total)} hint={`+${s.users.last7Days} this week · ${s.users.withPushToken} with push token`} />
        <StatCard label="Premium (paid)" value={String(s.subscriptions.activePaid)} hint={`${s.plans.monthly} monthly · ${s.plans.yearly} yearly rows`} />
        <StatCard label="Referrals" value={String(s.referrals.total)} hint={`+${s.referrals.last7Days} this week`} />
        <StatCard label="Waitlist" value={String(s.waitlist.total)} hint={`+${s.waitlist.last7Days} this week`} />
        <StatCard label="Boards" value={String(s.boards.total)} hint={`+${s.boards.last7Days} this week`} />
        <StatCard label="Expenses logged" value={String(s.expenses.total)} hint={`+${s.expenses.last7Days} this week`} />
        <StatCard label="Board shares" value={String(s.shares.total)} hint={`${s.shares.accepted} accepted · ${s.shares.pending} pending`} />
        <StatCard label="Referral rewards" value={String(s.subscriptions.referralRewards)} hint="Trial premium grants" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="Plan breakdown">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <Metric label="Free profiles" value={s.plans.free} />
            <Metric label="Premium profiles" value={s.plans.premiumProfile} />
            <Metric label="Monthly subs" value={s.plans.monthly} />
            <Metric label="Yearly subs" value={s.plans.yearly} />
            <Metric label="Store-paid active" value={s.subscriptions.activePaid} />
            <Metric label="Expired/cancelled" value={s.subscriptions.expiredOrCancelled} />
          </dl>
        </Panel>
        <Panel title="Integrations">
          <dl className="space-y-3 text-sm">
            <StatusRow label="Supabase" ok={data.config.supabase} />
            <StatusRow label="RevenueCat API" ok={data.config.revenueCat} />
            <StatusRow
              label="Mobile payments"
              ok={data.appConfig.paymentsEnabled}
              value={data.appConfig.paymentsEnabled ? "ON" : "OFF"}
              hint="Toggle in Mobile payments panel above"
            />
            <StatusRow label="Package" ok value="com.trivense.app" />
            <StatusRow label="Support" ok value={site.supportEmail} />
          </dl>
        </Panel>
      </section>

      {data.topReferrers.length ? (
        <Panel title="Top referrers">
          <SimpleTable
            headers={["User", "Code", "Referrals"]}
            rows={data.topReferrers.map((r) => [
              r.email ?? r.full_name ?? r.referrer_id.slice(0, 8),
              r.referral_code ?? "—",
              String(r.count),
            ])}
          />
        </Panel>
      ) : null}
    </div>
  );
}

function UsersTab({ data }: { data: AdminOverview }) {
  return (
    <Panel title={`Recent users (${data.recentUsers.length})`}>
      <UsersTable users={data.recentUsers} />
    </Panel>
  );
}

function UsersTable({ users }: { users: AdminOverview["recentUsers"] }) {
  if (!users.length) {
    return <p className="text-sm text-white/50">No records yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-white/10 text-white/45">
          <tr>
            {[
              "Email",
              "Name",
              "Plan",
              "Status",
              "Referral code",
              "Expo push token",
              "Joined",
            ].map((header) => (
              <th key={header} className="px-3 py-2 font-medium first:pl-0 last:pr-0">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-white/[0.06] text-white/75">
              <td className="px-3 py-2.5 first:pl-0">{user.email_address ?? "—"}</td>
              <td className="px-3 py-2.5">{user.full_name ?? "—"}</td>
              <td className="px-3 py-2.5">{user.current_plan ?? "free"}</td>
              <td className="px-3 py-2.5">{user.account_status ?? "active"}</td>
              <td className="px-3 py-2.5">{user.referral_code ?? "—"}</td>
              <td className="max-w-[220px] px-3 py-2.5">
                <PushTokenCell token={user.expo_push_token} />
              </td>
              <td className="px-3 py-2.5 last:pr-0">{formatDate(user.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PushTokenCell({ token }: { token: string | null }) {
  if (!token?.trim()) {
    return <span className="text-white/35">—</span>;
  }

  const trimmed = token.trim();
  const compact =
    trimmed.length > 36 ? `${trimmed.slice(0, 18)}…${trimmed.slice(-10)}` : trimmed;

  return (
    <code
      className="block truncate font-mono text-xs text-emerald-200/90"
      title={trimmed}
    >
      {compact}
    </code>
  );
}

function SubscriptionsTab({ data }: { data: AdminOverview }) {
  return (
    <Panel title={`Premium subscriptions (${data.subscriptions.length})`}>
      <SimpleTable
        headers={["Email", "Plan", "Status", "Store product", "Expires", "Updated"]}
        rows={data.subscriptions.map((s) => [
          s.email ?? s.user_id.slice(0, 8),
          s.plan,
          s.status,
          s.store_product_id ?? "—",
          s.expires_at ? formatDate(s.expires_at) : "—",
          formatDate(s.updated_at),
        ])}
      />
    </Panel>
  );
}

function ReferralsTab({ data }: { data: AdminOverview }) {
  return (
    <div className="space-y-6">
      <Panel title={`Referrals (${data.referrals.length})`}>
        <SimpleTable
          headers={["Code", "Referrer", "Referred", "Reward days", "Date"]}
          rows={data.referrals.map((r) => [
            r.referral_code_used,
            r.referrer_email ?? r.referrer_name ?? "—",
            r.referred_email ?? r.referred_name ?? "—",
            String(r.reward_days),
            formatDate(r.created_at),
          ])}
        />
      </Panel>
      {data.topReferrers.length ? (
        <Panel title="Leaderboard">
          <SimpleTable
            headers={["Referrer", "Code", "Count"]}
            rows={data.topReferrers.map((r) => [
              r.email ?? r.full_name ?? "—",
              r.referral_code ?? "—",
              String(r.count),
            ])}
          />
        </Panel>
      ) : null}
    </div>
  );
}

function WaitlistTab({ data }: { data: AdminOverview }) {
  return (
    <Panel title={`Waitlist signups (${data.waitlist.length})`}>
      <SimpleTable
        headers={["Email", "Name", "Source", "Joined"]}
        rows={data.waitlist.map((w) => [
          w.email,
          w.name ?? "—",
          w.source ?? "website",
          formatDate(w.created_at),
        ])}
      />
    </Panel>
  );
}

function BoardsTab({ data }: { data: AdminOverview }) {
  return (
    <Panel title={`Recent boards (${data.recentBoards.length})`}>
      <SimpleTable
        headers={["Name", "Owner", "Share code", "Total spent", "Created"]}
        rows={data.recentBoards.map((b) => [
          b.name,
          b.owner_email ?? b.created_by.slice(0, 8),
          b.share_code ?? "—",
          b.total_expense != null ? String(b.total_expense) : "—",
          formatDate(b.created_at),
        ])}
      />
    </Panel>
  );
}

function OpsTab({ data }: { data: AdminOverview }) {
  return (
    <div className="space-y-6">
      <Panel title="External dashboards">
        <div className="flex flex-wrap gap-3">
          {OPS_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 hover:border-gold/30 hover:text-gold-light"
            >
              {link.label}
            </a>
          ))}
        </div>
      </Panel>

      <Panel title="Site & store checks">
        <div className="flex flex-wrap gap-3">
          {SITE_CHECKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 hover:border-gold/30 hover:text-gold-light"
            >
              {link.label}
            </a>
          ))}
        </div>
      </Panel>

      <Panel title="Environment">
        <dl className="space-y-3 text-sm">
          <StatusRow label="Supabase connected" ok={data.config.supabase} />
          <StatusRow
            label="RevenueCat pricing API"
            ok={data.config.revenueCat}
            hint={data.config.revenueCat ? "Live regional pricing enabled" : "Set REVENUECAT_API_V2_KEY"}
          />
          <StatusRow label="Website URL" ok value={site.url} />
          <StatusRow label="Play package" ok value="com.trivense.app" />
          <StatusRow label="AdMob publisher" ok value="pub-4173581536398147" />
        </dl>
      </Panel>
    </div>
  );
}

function ExportMenu() {
  const exports = [
    { label: "Waitlist CSV", type: "waitlist" },
    { label: "Users CSV", type: "users" },
    { label: "Referrals CSV", type: "referrals" },
    { label: "Subscriptions CSV", type: "subscriptions" },
  ];

  return (
    <div className="relative group">
      <button
        type="button"
        className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/85 hover:border-gold/40"
      >
        Export ▾
      </button>
      <div className="invisible absolute right-0 z-10 mt-2 min-w-[180px] rounded-xl border border-white/10 bg-[#001525] py-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
        {exports.map((item) => (
          <a
            key={item.type}
            href={`/api/admin/export?type=${item.type}`}
            className="block px-4 py-2 text-sm text-white/75 hover:bg-white/5 hover:text-gold-light"
          >
            {item.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/40">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-gradient-gold">{value}</p>
      {hint ? <p className="mt-2 text-xs text-white/45">{hint}</p> : null}
    </div>
  );
}

function PaymentsToggleCard({
  config,
  onUpdated,
}: {
  config: AdminOverview["appConfig"];
  onUpdated: (config: AdminOverview["appConfig"]) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleToggle(next: boolean) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/app-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentsEnabled: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update payments setting");
      onUpdated(json as AdminOverview["appConfig"]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update payments setting");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel title="Mobile payments">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl">
          <p className="text-sm leading-relaxed text-white/70">
            When <strong className="text-white">off</strong>, the app hides the paywall, upgrade
            prompts, and in-app purchases. All premium features stay unlocked for every user.
            Unpaid users see ads on free and premium surfaces; paying subscribers stay ad-free.
          </p>
          {config.updatedAt ? (
            <p className="mt-2 text-xs text-white/40">
              Last changed {new Date(config.updatedAt).toLocaleString()}
            </p>
          ) : null}
          {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={config.paymentsEnabled}
          disabled={saving}
          onClick={() => handleToggle(!config.paymentsEnabled)}
          className={`relative inline-flex h-11 w-[4.75rem] shrink-0 items-center rounded-full border transition ${
            config.paymentsEnabled
              ? "border-emerald-400/40 bg-emerald-500/20"
              : "border-white/15 bg-white/10"
          } ${saving ? "opacity-60" : "hover:border-gold/40"}`}
        >
          <span
            className={`inline-block h-8 w-8 transform rounded-full bg-white shadow transition ${
              config.paymentsEnabled ? "translate-x-9" : "translate-x-1"
            }`}
          />
          <span className="sr-only">
            {config.paymentsEnabled ? "Payments enabled" : "Payments disabled"}
          </span>
        </button>
      </div>
      <p className="mt-4 text-sm font-semibold text-white/85">
        Status:{" "}
        <span className={config.paymentsEnabled ? "text-emerald-300" : "text-amber-300"}>
          {config.paymentsEnabled ? "Payments ON — paywall active" : "Payments OFF — ad-supported full access"}
        </span>
        {saving ? <span className="ml-2 text-xs font-normal text-white/45">Saving…</span> : null}
      </p>
    </Panel>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
      <div className="border-b border-white/10 px-6 py-4">
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-white/45">{label}</dt>
      <dd className="mt-1 text-2xl font-bold text-white">{value}</dd>
    </div>
  );
}

function StatusRow({
  label,
  ok,
  value,
  hint,
}: {
  label: string;
  ok: boolean;
  value?: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-white/70">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-white/40">{hint}</p> : null}
      </div>
      <span className={`text-sm font-semibold ${ok ? "text-emerald-300" : "text-amber-300"}`}>
        {value ?? (ok ? "Connected" : "Not set")}
      </span>
    </div>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (!rows.length) {
    return <p className="text-sm text-white/50">No records yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-white/10 text-white/45">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 font-medium first:pl-0 last:pr-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-white/[0.06] text-white/75">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2.5 first:pl-0 last:pr-0">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}
