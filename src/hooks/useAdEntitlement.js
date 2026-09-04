import { useSubscription } from "../context/SubscriptionContext";
import { useAdPolicy } from "../context/AdPolicyContext";
import {
  isAdFreeUser,
  shouldShowFreeTierAds,
  shouldShowPremiumFeatureAds,
} from "../utils/adEntitlement";

export function useAdEntitlement() {
  const { isPaidSubscriber, paymentsEnabled } = useSubscription();
  const { showBannerAds } = useAdPolicy();

  const isAdFree = isAdFreeUser(isPaidSubscriber);

  return {
    isPaidSubscriber,
    isAdFree,
    paymentsEnabled,
    showBannerAds,
    shouldShowFreeTierAds: shouldShowFreeTierAds({
      isPaidSubscriber,
      showBannerAds,
    }),
    shouldShowPremiumFeatureAds: shouldShowPremiumFeatureAds({
      paymentsEnabled,
      isPaidSubscriber,
      showBannerAds,
    }),
  };
}
