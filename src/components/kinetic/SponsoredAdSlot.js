import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { kinetic } from "../../theme/tokens";

/**
 * Sponsored ad slot (Kinetic spec §6): dashed #CBD5E1 border, uppercase
 * 10px SPONSORED tag in slate. RESTYLE ONLY — the child is the real ad
 * (InlineListAd / HomeInlineAd) gated by the existing entitlement checks
 * in the caller. Premium users never see this slot.
 */
export function SponsoredAdSlot({ children, testID = "sponsored-ad-slot" }) {
  if (!children) return null;
  return (
    <View testID={testID} style={styles.slot}>
      <Text style={styles.tag}>SPONSORED</Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: kinetic.colors.borderStrong,
    borderRadius: kinetic.radii.lg,
    backgroundColor: kinetic.colors.card,
    padding: 12,
  },
  tag: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: kinetic.colors.textTertiary,
    marginBottom: 8,
  },
  body: { overflow: "hidden" },
});
