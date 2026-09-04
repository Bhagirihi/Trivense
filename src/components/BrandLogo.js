import React from "react";
import { Image, View, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";

/** Transparent mark derived from UI/icon.png (no navy background). */
const ICON_TRANSPARENT = require("../../assets/icon_transparent.png");

/**
 * Trivense logo — transparent mark for auth hero, or themed tile elsewhere.
 */
export function BrandLogo({
  size = 48,
  transparent = false,
  backgroundColor,
  framed = false,
  frameColor,
  style,
  imageStyle,
  markScale = 0.88,
}) {
  const { theme } = useTheme();
  const borderRadius = Math.round(size * 0.22);
  const markSize = Math.round(size * markScale);

  if (transparent) {
    return (
      <View style={style}>
        <Image
          source={ICON_TRANSPARENT}
          style={[{ width: size, height: size }, imageStyle]}
          resizeMode="contain"
          accessibilityLabel="Trivense logo"
        />
      </View>
    );
  }

  const bg = backgroundColor ?? theme.primary;

  const logoTile = (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: bg,
        },
      ]}
    >
      <Image
        source={ICON_TRANSPARENT}
        style={[{ width: markSize, height: markSize }, imageStyle]}
        resizeMode="contain"
        accessibilityLabel="Trivense logo"
      />
    </View>
  );

  if (!framed) {
    return <View style={style}>{logoTile}</View>;
  }

  const frameSize = size + 16;
  const ringColor = frameColor ?? theme.primaryMuted;

  return (
    <View
      style={[
        styles.frame,
        {
          width: frameSize,
          height: frameSize,
          borderRadius: borderRadius + 4,
          backgroundColor: ringColor,
        },
        style,
      ]}
    >
      {logoTile}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default BrandLogo;
