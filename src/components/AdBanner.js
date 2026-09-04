import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getBannerUnitId } from "../config/admob";
import { useAdPolicy } from "../context/AdPolicyContext";
import { isAdMobAvailable } from "../services/adService";
import { loadNativeModule } from "../utils/lazyNativeModule";
import { AD_SLOT_HEIGHT } from "./AdSlotPlaceholder";

export { AD_SLOT_HEIGHT as AD_BANNER_HEIGHT };

/**
 * Footer adaptive banner — only rendered when a real ad is available.
 */
export default function AdBanner() {
  const { showBannerAds } = useAdPolicy();
  const insets = useSafeAreaInsets();
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
        "google-mobile-ads banner",
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
        { paddingBottom: Math.max(insets.bottom > 0 ? 0 : 4, 0) },
        !loaded && styles.hiddenBanner,
      ]}
    >
      <BannerAd
        unitId={getBannerUnitId("footer")}
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
    backgroundColor: "transparent",
  },
  hiddenBanner: {
    height: 0,
    overflow: "hidden",
    opacity: 0,
  },
});
