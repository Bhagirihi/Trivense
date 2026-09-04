import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { spacing, typography } from "../../theme/tokens";

export const HomeSectionHeader = memo(
  ({ title, subtitle, icon, iconColor, trailing, style }) => {
    const { theme } = useTheme();

    return (
      <View style={[styles.wrap, style]}>
        <View style={styles.titleRow}>
          <View style={styles.titleMain}>
            {icon ? (
              <MaterialCommunityIcons
                name={icon}
                size={16}
                color={iconColor || theme.textSecondary}
              />
            ) : null}
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          </View>
          {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
        </View>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  titleMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minWidth: 0,
  },
  trailing: {
    flexShrink: 0,
  },
  title: {
    ...typography.h3,
    fontSize: 17,
    lineHeight: 22,
  },
  subtitle: {
    marginTop: 2,
    ...typography.caption,
    lineHeight: 18,
    fontWeight: "400",
  },
});
