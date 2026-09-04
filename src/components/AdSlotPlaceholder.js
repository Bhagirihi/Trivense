import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { radii, spacing, typography } from "../theme/tokens";

/** Matches adaptive banner height used for footer scroll padding. */
export const AD_SLOT_HEIGHT = Platform.OS === "ios" ? 58 : 56;

/**
 * Dim placeholder shown where an ad slot exists (free users) when the real
 * AdMob banner is loading, unavailable (Expo Go), or failed to load.
 */
export default function AdSlotPlaceholder({ variant = "inline", style, testID }) {
  const { theme } = useTheme();
  const isFooter = variant === "footer";

  return (
    <View
      testID={testID || "ad-slot-placeholder"}
      style={[
        styles.wrap,
        isFooter ? styles.footerWrap : styles.inlineWrap,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel="Advertisement"
    >
      <View style={styles.rule} />
      <View style={[styles.body, { minHeight: isFooter ? AD_SLOT_HEIGHT : 52 }]}>
        <MaterialCommunityIcons
          name="advertisements"
          size={18}
          color={theme.textMuted}
        />
        <Text style={[styles.label, { color: theme.textMuted }]}>Ad</Text>
        {__DEV__ ? (
          <Text style={[styles.devHint, { color: theme.textMuted }]}>
            {isFooter ? "Footer banner" : "Inline banner"}
          </Text>
        ) : null}
      </View>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "stretch",
    overflow: "hidden",
  },
  inlineWrap: {
    marginVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
    opacity: 0.72,
  },
  footerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    opacity: 0.85,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "transparent",
  },
  body: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.label,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  devHint: {
    fontSize: 10,
    marginLeft: spacing.xs,
    opacity: 0.8,
  },
});
