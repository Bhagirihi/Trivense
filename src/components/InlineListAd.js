import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { getBannerUnitId } from "../config/admob";
import { useAdPolicy } from "../context/AdPolicyContext";
import { isAdMobAvailable } from "../services/adService";
import { loadNativeModule } from "../utils/lazyNativeModule";
import { radii, spacing } from "../theme/tokens";

/**
 * Inline banner between list rows (free users, respects grace + rewarded ad-free).
 */
export default function InlineListAd({ style }) {
  const { showBannerAds } = useAdPolicy();
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [BannerAd, setBannerAd] = useState(null);
  const [bannerSize, setBannerSize] = useState(null);

  const canRequestAd = showBannerAds && !failed && isAdMobAvailable();

  useEffect(() => {
    if (!canRequestAd) return;

    let cancelled = false;

    (async () => {
      const mod = await loadNativeModule(
        () => import("react-native-google-mobile-ads"),
        "google-mobile-ads inline banner",
      );
      if (cancelled || !mod?.BannerAd || !mod?.BannerAdSize) return;
      setBannerAd(() => mod.BannerAd);
      setBannerSize(mod.BannerAdSize.ANCHORED_ADAPTIVE_BANNER);
    })();

    return () => {
      cancelled = true;
    };
  }, [canRequestAd]);

  if (!showBannerAds || failed || !canRequestAd || !BannerAd || !bannerSize) {
    return null;
  }

  return (
    <View
      style={[
        styles.wrap,
        style,
        !loaded && styles.hiddenBanner,
      ]}
    >
      <BannerAd
        unitId={getBannerUnitId("inline")}
        size={bannerSize}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginVertical: spacing.sm,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  hiddenBanner: {
    height: 0,
    overflow: "hidden",
    opacity: 0,
    marginVertical: 0,
  },
});
