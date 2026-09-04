import {
  EXPENSE_AD_EVERY_N,
  LIST_AD_INTERVAL_TRANSACTIONS,
  LIST_AD_INTERVAL_BOARDS,
  LIST_AD_INTERVAL_CATEGORIES,
  INTERSTITIAL_COOLDOWN_MS,
  MAX_INTERSTITIALS_PER_SESSION,
  NEW_USER_GRACE_DAYS,
  NEW_USER_GRACE_MAX_EXPENSES,
  REWARDED_AD_FREE_HOURS,
} from "../../src/config/admob";

describe("AdMob policy constants", () => {
  it("uses balanced list intervals", () => {
    expect(LIST_AD_INTERVAL_TRANSACTIONS).toBe(5);
    expect(LIST_AD_INTERVAL_BOARDS).toBe(2);
    expect(LIST_AD_INTERVAL_CATEGORIES).toBe(3);
  });

  it("limits full-screen ad frequency", () => {
    expect(EXPENSE_AD_EVERY_N).toBe(6);
    expect(INTERSTITIAL_COOLDOWN_MS).toBe(5 * 60 * 1000);
    expect(MAX_INTERSTITIALS_PER_SESSION).toBe(2);
  });

  it("defines new-user grace and rewarded ad-free window", () => {
    expect(NEW_USER_GRACE_DAYS).toBe(7);
    expect(NEW_USER_GRACE_MAX_EXPENSES).toBe(10);
    expect(REWARDED_AD_FREE_HOURS).toBe(24);
  });
});
