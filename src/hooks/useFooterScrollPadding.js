import { useSafeAreaInsets } from "react-native-safe-area-context";
import { footerScrollPadding } from "../theme/tokens";
import { AD_BANNER_HEIGHT } from "../components/AdBanner";
import { useShouldShowBannerAds } from "./useAds";

/** Scroll padding when footer tab + optional AdMob banner are visible. */
export function useFooterScrollPadding(extra = 0, includeFooterBanner = true) {
  const insets = useSafeAreaInsets();
  const showFooterBanner = useShouldShowBannerAds(includeFooterBanner);
  const base = footerScrollPadding(insets.bottom) + extra;
  return showFooterBanner ? base + AD_BANNER_HEIGHT : base;
}
