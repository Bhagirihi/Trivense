import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { layout, spacing } from "../../theme/tokens";

/**
 * Pins primary actions above the home indicator / Android nav bar.
 */
export const ScreenActionBar = memo(
  ({ children, style, bordered = true, backgroundColor }) => {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();

    return (
      <View
        style={[
          styles.bar,
          {
            paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm,
            backgroundColor: backgroundColor ?? theme.background,
            borderTopColor: theme.border,
            borderTopWidth: bordered ? StyleSheet.hairlineWidth : 0,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
  },
});

export default ScreenActionBar;
