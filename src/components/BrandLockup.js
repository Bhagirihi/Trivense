import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import BrandLogo from "./BrandLogo";
import { BRAND_TAGLINE } from "../config/brand";

/**
 * Centered Trivense brand stack for auth heroes:
 * logo badge → wordmark → tagline.
 */
export function BrandLockup({
  size = "md",
  color = "#FFFFFF",
  style,
  highlightLogo = true,
  showTagline = true,
  tagline = BRAND_TAGLINE,
}) {
  const logoSize = size === "lg" ? 56 : size === "sm" ? 40 : 48;
  const wordSize = size === "lg" ? 26 : size === "sm" ? 20 : 22;
  const tagSize = size === "lg" ? 14 : size === "sm" ? 12 : 13;
  const borderWidth = 2.5;
  const tilePad = 2;
  const tileSize = logoSize + tilePad * 2;
  const outerSize = tileSize + borderWidth * 2;
  const tileRadius = Math.round(tileSize * 0.24);
  const outerRadius = tileRadius + borderWidth;

  const logo = highlightLogo ? (
    <View
      style={[
        styles.logoBadge,
        {
          width: outerSize,
          height: outerSize,
          borderRadius: outerRadius,
          borderWidth,
        },
      ]}
    >
      <View
        style={[
          styles.logoBadgeInner,
          {
            width: tileSize,
            height: tileSize,
            borderRadius: tileRadius,
          },
        ]}
      >
        <BrandLogo size={logoSize} transparent markScale={1} />
      </View>
    </View>
  ) : (
    <BrandLogo size={logoSize} transparent markScale={1} />
  );

  return (
    <View style={[styles.stack, style]} accessibilityRole="header">
      {logo}
      <Text
        style={[
          styles.wordmark,
          {
            color,
            fontSize: wordSize,
            lineHeight: wordSize + 2,
            letterSpacing: wordSize * 0.12,
          },
        ]}
        accessibilityLabel="Trivense"
      >
        TRIVENSE
      </Text>
      {showTagline && tagline ? (
        <View style={styles.taglineRow}>
          <View style={styles.taglineDot} />
          <Text
            style={[
              styles.tagline,
              {
                color: "rgba(255,255,255,0.82)",
                fontSize: tagSize,
                lineHeight: tagSize + 5,
              },
            ]}
            numberOfLines={1}
          >
            {tagline}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    alignItems: "center",
  },
  wordmark: {
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 12,
    textAlign: "center",
  },
  taglineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  taglineDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E8C547",
  },
  tagline: {
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0.15,
  },
  logoBadge: {
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#FFFFFF",
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  logoBadgeInner: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0A1628",
    overflow: "hidden",
  },
});

export default BrandLockup;
