/**
 * Pure ad-entitlement helpers (payments-off ad-supported full access).
 */

/** User should not see ads (paid subscriber). Rewarded ad-free is handled in AdPolicyContext. */
export function isAdFreeUser(isPaidSubscriber) {
  return Boolean(isPaidSubscriber);
}

/** Inline/footer ads on premium-only surfaces when IAP is paused. */
export function shouldShowPremiumFeatureAds({
  paymentsEnabled,
  isPaidSubscriber,
  showBannerAds,
}) {
  return !paymentsEnabled && !isPaidSubscriber && Boolean(showBannerAds);
}

/** Standard free-tier banner/list ads. */
export function shouldShowFreeTierAds({ isPaidSubscriber, showBannerAds }) {
  return !isPaidSubscriber && Boolean(showBannerAds);
}
