import React from "react";
import InlineListAd from "./InlineListAd";
import { useAdEntitlement } from "../hooks/useAdEntitlement";

/**
 * Inline banner on premium surfaces when payments are off and the user is unpaid.
 */
export default function PremiumFeatureAd({ style }) {
  const { shouldShowPremiumFeatureAds } = useAdEntitlement();

  if (!shouldShowPremiumFeatureAds) {
    return null;
  }

  return <InlineListAd style={style} />;
}
