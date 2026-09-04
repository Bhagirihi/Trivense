import React, { memo, useMemo } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { radii, spacing } from "../../theme/tokens";

const Card = memo(({ children, style, variant, padding = "medium" }) => {
  const { theme } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: theme.surface,
          borderRadius: radii.lg,
          padding:
            padding === "large" ? spacing.xl : padding === "small" ? spacing.md : spacing.lg,
          borderWidth: variant === "flat" ? 0 : 1,
          borderColor: theme.border,
          ...Platform.select({
            ios: {
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: variant === "flat" ? 0 : 0.05,
              shadowRadius: 8,
            },
            android: { elevation: variant === "flat" ? 0 : 2 },
          }),
          ...(variant === "outlined" && {
            backgroundColor: "transparent",
          }),
          ...(variant === "elevated" && {
            borderWidth: 0,
            ...Platform.select({
              ios: { shadowOpacity: 0.1, shadowRadius: 16 },
              android: { elevation: 4 },
            }),
          }),
        },
      }),
    [theme, variant, padding]
  );

  return <View style={[styles.card, style]}>{children}</View>;
});

export default Card;
