import {
  FEATURES,
  PLANS,
  PLAN_CATALOG,
  getPlanLimits,
  hasFeatureAccess,
  canUseAnalyticsPeriod,
  isPremiumPlan,
} from "../../src/config/subscriptionPlans";

describe("Subscription plans module", () => {
  it("defines free, monthly, and yearly plans", () => {
    expect(PLAN_CATALOG[PLANS.FREE].priceInr).toBe(0);
    expect(PLAN_CATALOG[PLANS.MONTHLY].priceInr).toBe(299);
    expect(PLAN_CATALOG[PLANS.YEARLY].priceInr).toBe(2499);
  });

  it("free plan allows unlimited boards with one shared board slot", () => {
    const limits = getPlanLimits(PLANS.FREE);
    expect(limits.maxBoards).toBeNull();
    expect(limits.maxSharedBoards).toBe(1);
    expect(hasFeatureAccess(PLANS.FREE, FEATURES.UNLIMITED_BOARDS)).toBe(true);
    expect(hasFeatureAccess(PLANS.FREE, FEATURES.AD_FREE)).toBe(false);
  });

  it("premium plans unlock all features", () => {
    for (const plan of [PLANS.MONTHLY, PLANS.YEARLY]) {
      expect(hasFeatureAccess(plan, FEATURES.AD_FREE)).toBe(true);
      expect(hasFeatureAccess(plan, FEATURES.BOARD_SHARING)).toBe(true);
      expect(hasFeatureAccess(plan, FEATURES.UNLIMITED_BOARDS)).toBe(true);
      expect(hasFeatureAccess(plan, FEATURES.EXPORT_DATA)).toBe(true);
    }
  });

  it("free plan allows all analytics periods (ads shown for month/year/all)", () => {
    expect(canUseAnalyticsPeriod(PLANS.FREE, "week")).toBe(true);
    expect(canUseAnalyticsPeriod(PLANS.FREE, "month")).toBe(true);
    expect(canUseAnalyticsPeriod(PLANS.FREE, "year")).toBe(true);
    expect(canUseAnalyticsPeriod(PLANS.FREE, "all")).toBe(true);
    expect(canUseAnalyticsPeriod(PLANS.MONTHLY, "year")).toBe(true);
  });

  it("identifies premium plans correctly", () => {
    expect(isPremiumPlan(PLANS.FREE)).toBe(false);
    expect(isPremiumPlan(PLANS.MONTHLY)).toBe(true);
    expect(isPremiumPlan(PLANS.YEARLY)).toBe(true);
  });
});
