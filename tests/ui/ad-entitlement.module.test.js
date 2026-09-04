import {
  isAdFreeUser,
  shouldShowFreeTierAds,
  shouldShowPremiumFeatureAds,
} from "../../src/utils/adEntitlement";
import { shouldShowAnalyticsPeriodAd } from "../../src/config/admob";

describe("ad entitlement helpers", () => {
  it("treats paid subscribers as ad-free", () => {
    expect(isAdFreeUser(true)).toBe(true);
    expect(isAdFreeUser(false)).toBe(false);
  });

  it("shows free-tier ads only for unpaid users when banners are on", () => {
    expect(
      shouldShowFreeTierAds({ isPaidSubscriber: false, showBannerAds: true }),
    ).toBe(true);
    expect(
      shouldShowFreeTierAds({ isPaidSubscriber: true, showBannerAds: true }),
    ).toBe(false);
    expect(
      shouldShowFreeTierAds({ isPaidSubscriber: false, showBannerAds: false }),
    ).toBe(false);
  });

  it("shows premium-surface ads when payments are off and user is unpaid", () => {
    expect(
      shouldShowPremiumFeatureAds({
        paymentsEnabled: false,
        isPaidSubscriber: false,
        showBannerAds: true,
      }),
    ).toBe(true);

    expect(
      shouldShowPremiumFeatureAds({
        paymentsEnabled: false,
        isPaidSubscriber: true,
        showBannerAds: true,
      }),
    ).toBe(false);

    expect(
      shouldShowPremiumFeatureAds({
        paymentsEnabled: true,
        isPaidSubscriber: false,
        showBannerAds: true,
      }),
    ).toBe(false);
  });

  it("shows analytics period ads for unpaid users on month/year/all only", () => {
    expect(shouldShowAnalyticsPeriodAd(false, "week")).toBe(false);
    expect(shouldShowAnalyticsPeriodAd(false, "month")).toBe(true);
    expect(shouldShowAnalyticsPeriodAd(true, "month")).toBe(false);
  });
});
