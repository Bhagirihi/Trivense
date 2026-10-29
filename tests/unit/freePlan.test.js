import {
  FEATURES,
  PLANS,
  canUseAnalyticsPeriod,
  getPlanLimits,
  hasFeatureAccess,
} from "../../src/config/subscriptionPlans";

// Locks the single source of truth for the Free plan. These must match
// README.md, store-assets/play/LISTING_EN.md and website/src/lib/content.ts:
// unlimited personal boards, 1 shared board, settlements included,
// analytics for week/month/year/all, up to 3 custom categories, ads.
// BOARD_SHARING means *unlimited* sharing (Premium); Free sharing is capped
// at maxSharedBoards: 1, not zero — see subscriptionService.
describe("Free plan single source of truth", () => {
  it("free: unlimited personal boards, exactly 1 shared board", () => {
    const limits = getPlanLimits(PLANS.FREE);
    expect(limits.maxBoards).toBeNull();
    expect(limits.maxSharedBoards).toBe(1);
    expect(hasFeatureAccess(PLANS.FREE, FEATURES.UNLIMITED_BOARDS)).toBe(true);
  });

  it("free: settlements are included, not Premium-only", () => {
    expect(hasFeatureAccess(PLANS.FREE, FEATURES.BOARD_SETTLEMENTS)).toBe(true);
  });

  it("free: up to 3 custom categories, ads shown", () => {
    const limits = getPlanLimits(PLANS.FREE);
    expect(limits.maxCustomCategories).toBe(3);
    expect(hasFeatureAccess(PLANS.FREE, FEATURES.AD_FREE)).toBe(false);
    expect(hasFeatureAccess(PLANS.FREE, FEATURES.UNLIMITED_CATEGORIES)).toBe(
      false
    );
  });

  it("free: all analytics periods are usable", () => {
    for (const period of ["week", "month", "year", "all"]) {
      expect(canUseAnalyticsPeriod(PLANS.FREE, period)).toBe(true);
    }
  });

  it("premium: unlimited sharing, categories, export and ad-free", () => {
    for (const plan of [PLANS.MONTHLY, PLANS.YEARLY]) {
      const limits = getPlanLimits(plan);
      expect(limits.maxSharedBoards).toBeNull();
      expect(limits.maxCustomCategories).toBeNull();
      expect(hasFeatureAccess(plan, FEATURES.BOARD_SHARING)).toBe(true);
      expect(hasFeatureAccess(plan, FEATURES.EXPORT_DATA)).toBe(true);
      expect(hasFeatureAccess(plan, FEATURES.AD_FREE)).toBe(true);
    }
  });
});
