import { supabase } from "../config/supabase";
import {
  PLANS,
  FEATURES,
  getPlanLimits,
  hasFeatureAccess,
  isPremiumPlan,
  canUseAnalyticsPeriod,
} from "../config/subscriptionPlans";
import { devError } from "../utils/logger";

const DEFAULT_SUBSCRIPTION = {
  plan: PLANS.FREE,
  status: "active",
  isPremium: false,
  expiresAt: null,
  startedAt: null,
};

function normalizeSubscription(payload) {
  if (!payload) return { ...DEFAULT_SUBSCRIPTION };

  const plan = payload.plan || PLANS.FREE;
  const isPremium = Boolean(payload.is_premium ?? isPremiumPlan(plan));

  return {
    plan: isPremium ? plan : PLANS.FREE,
    status: payload.status || "active",
    isPremium,
    expiresAt: payload.expires_at || null,
    startedAt: payload.started_at || null,
  };
}

export const subscriptionService = {
  async getEffectiveSubscription(userId) {
    if (!userId) return { ...DEFAULT_SUBSCRIPTION };

    const { data, error } = await supabase.rpc("get_effective_subscription", {
      p_user_id: userId,
    });

    if (error) {
      devError("getEffectiveSubscription error:", error.message);
      const { data: profile } = await supabase
        .from("profiles")
        .select("current_plan")
        .eq("id", userId)
        .maybeSingle();

      const plan =
        profile?.current_plan === "premium" ? PLANS.MONTHLY : PLANS.FREE;
      return {
        plan,
        status: "active",
        isPremium: plan !== PLANS.FREE,
        expiresAt: null,
        startedAt: null,
      };
    }

    return normalizeSubscription(data);
  },

  async waitForServerSubscription(userId, expectedPlan, attempts = 6) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const subscription = await this.getEffectiveSubscription(userId);
      if (subscription.plan === expectedPlan) {
        return subscription;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return this.getEffectiveSubscription(userId);
  },

  hasFeature(subscription, featureKey) {
    const plan = subscription?.plan || PLANS.FREE;
    return hasFeatureAccess(plan, featureKey);
  },

  getLimits(subscription) {
    return getPlanLimits(subscription?.plan || PLANS.FREE);
  },

  canUsePeriod(subscription, period) {
    const plan = subscription?.plan || PLANS.FREE;
    return canUseAnalyticsPeriod(plan, period);
  },

  async countOwnedBoards(userId) {
    const { count, error } = await supabase
      .from("expense_boards")
      .select("id", { count: "exact", head: true })
      .eq("created_by", userId);

    if (error) throw error;
    return count || 0;
  },

  async countCustomCategories(userId) {
    const { count, error } = await supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_default", false);

    if (error) throw error;
    return count || 0;
  },

  async canCreateBoard(subscription, userId) {
    const limits = this.getLimits(subscription);
    if (limits.maxBoards == null) return { allowed: true };

    const count = await this.countOwnedBoards(userId);
    return {
      allowed: count < limits.maxBoards,
      count,
      max: limits.maxBoards,
    };
  },

  async canCreateCustomCategory(subscription, userId) {
    const limits = this.getLimits(subscription);
    if (limits.maxCustomCategories == null) return { allowed: true };

    const count = await this.countCustomCategories(userId);
    return {
      allowed: count < limits.maxCustomCategories,
      count,
      max: limits.maxCustomCategories,
    };
  },

  canShareBoard(subscription) {
    return this.hasFeature(subscription, FEATURES.BOARD_SHARING);
  },

  async countJoinedSharedBoards(userId) {
    const { count, error } = await supabase
      .from("shared_users")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_accepted", true);

    if (error) throw error;
    return count || 0;
  },

  async countOwnedBoardsWithMembers(userId) {
    const { data: ownedBoards, error: boardsError } = await supabase
      .from("expense_boards")
      .select("id")
      .eq("created_by", userId);

    if (boardsError) throw boardsError;
    if (!ownedBoards?.length) return 0;

    const boardIds = ownedBoards.map((board) => board.id);
    const { count, error } = await supabase
      .from("shared_users")
      .select("id", { count: "exact", head: true })
      .in("board_id", boardIds);

    if (error) throw error;
    return count || 0;
  },

  async getSharedBoardUsage(userId) {
    const [joined, sharedOut] = await Promise.all([
      this.countJoinedSharedBoards(userId),
      this.countOwnedBoardsWithMembers(userId),
    ]);
    return joined + sharedOut;
  },

  async boardHasSharedMembers(boardId) {
    const { count, error } = await supabase
      .from("shared_users")
      .select("id", { count: "exact", head: true })
      .eq("board_id", boardId);

    if (error) throw error;
    return (count || 0) > 0;
  },

  async canShareBoardWithLimit(subscription, userId, boardId) {
    if (this.hasFeature(subscription, FEATURES.BOARD_SHARING)) {
      return { allowed: true };
    }

    const limits = this.getLimits(subscription);
    if (limits.maxSharedBoards == null) return { allowed: true };

    if (boardId && (await this.boardHasSharedMembers(boardId))) {
      return { allowed: true };
    }

    const usage = await this.getSharedBoardUsage(userId);
    return {
      allowed: usage < limits.maxSharedBoards,
      count: usage,
      max: limits.maxSharedBoards,
    };
  },

  async canJoinSharedBoard(subscription, userId) {
    if (this.hasFeature(subscription, FEATURES.BOARD_SHARING)) {
      return { allowed: true };
    }

    const limits = this.getLimits(subscription);
    if (limits.maxSharedBoards == null) return { allowed: true };

    const { count, error } = await supabase
      .from("shared_users")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_accepted", true);

    if (error) throw error;

    return {
      allowed: (count || 0) < limits.maxSharedBoards,
      count: count || 0,
      max: limits.maxSharedBoards,
    };
  },
};
