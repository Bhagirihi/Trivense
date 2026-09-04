import { useEffect } from "react";
import { useSubscription } from "../context/SubscriptionContext";
import { useAdPolicy } from "../context/AdPolicyContext";
import { useTranslation } from "./useTranslation";
import {
  initializeAds,
  isAdMobAvailable,
  showAppOpenIfReady,
  getSessionInterstitialCount,
} from "../services/adService";
import { showToast } from "../utils/toast";

/**
 * Initialize AdMob and show app-open ad (max once per day, not during grace).
 */
export function useAdsBootstrap(enabled = true) {
  const { isAdFree, paymentsEnabled, loading: subscriptionLoading } = useSubscription();
  const { t } = useTranslation();
  const {
    showAppOpenAds,
    loading: policyLoading,
    refreshAdPolicy,
  } = useAdPolicy();

  useEffect(() => {
    if (!enabled || !isAdMobAvailable() || subscriptionLoading || isAdFree) {
      return;
    }
    if (policyLoading) return;

    let cancelled = false;

    (async () => {
      const ready = await initializeAds();
      if (!ready || cancelled) return;

      await refreshAdPolicy();
      if (cancelled || !showAppOpenAds) return;

      await new Promise((r) => setTimeout(r, 800));
      if (cancelled) return;

      const shown = await showAppOpenIfReady(isAdFree);
      if (shown && getSessionInterstitialCount() >= 2) {
        if (paymentsEnabled) {
          showToast.info(t("goAdFreeToastTitle"), t("goAdFreeToastPremium"));
        } else {
          showToast.info(t("goAdFreeToastTitle"), t("goAdFreeToastAdSupported"));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    isAdFree,
    paymentsEnabled,
    subscriptionLoading,
    policyLoading,
    showAppOpenAds,
    refreshAdPolicy,
    t,
  ]);
}

export function useShouldShowAds() {
  const { showBannerAds, loading } = useAdPolicy();
  return !loading && showBannerAds;
}

export function useShouldShowBannerAds(includeFooter = true) {
  const { showBannerAds, loading } = useAdPolicy();
  if (loading) return false;
  return includeFooter && showBannerAds;
}
