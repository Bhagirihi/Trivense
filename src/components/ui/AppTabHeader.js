import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { BRAND_NAME } from "../../config/brand";
import { PlanBadge } from "./PlanBadge";
import { layout, spacing, typography } from "../../theme/tokens";

/**
 * Main tab screen header — branded navy chrome for Home / Analytics / Profile / Settings.
 */
export const AppTabHeader = memo(
  ({
    title,
    subtitle,
    eyebrow,
    leading,
    trailing,
    compact = false,
    onTitlePress,
    onPlanPress,
    testID,
  }) => {
    const { theme } = useTheme();
    const bg = theme.headerBackground || theme.primary;
    const fg = theme.headerText || theme.white;
    const fgMuted = theme.headerTextMuted || "rgba(255,255,255,0.78)";
    const trailingNode =
      trailing ?? <PlanBadge onPress={onPlanPress} tone="onDark" />;

    const titleContent = (
      <Text
        style={[
          styles.title,
          compact && styles.titleCompact,
          { color: fg },
          leading ? styles.titleWithLeading : null,
        ]}
        numberOfLines={2}
      >
        {title}
      </Text>
    );

    return (
      <View
        style={[styles.wrap, { backgroundColor: bg }]}
        testID={testID}
      >
        <View style={styles.topRow}>
          <Text style={[styles.brand, { color: fg }]}>
            {BRAND_NAME.toUpperCase()}
          </Text>
          <View style={styles.trailing}>{trailingNode}</View>
        </View>

        {eyebrow ? (
          <Text style={[styles.eyebrow, { color: "#E8C547" }]}>{eyebrow}</Text>
        ) : null}

        <View style={styles.titleRow}>
          {leading ? <View style={styles.leading}>{leading}</View> : null}
          {onTitlePress ? (
            <TouchableOpacity
              onPress={onTitlePress}
              activeOpacity={0.8}
              style={styles.titlePressable}
            >
              {titleContent}
            </TouchableOpacity>
          ) : (
            titleContent
          )}
        </View>

        {subtitle ? (
          <Text
            style={[
              styles.subtitle,
              compact && styles.subtitleCompact,
              { color: fgMuted },
            ]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  wrap: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    paddingHorizontal: layout.screenPadding,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    minHeight: 36,
  },
  trailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  brand: {
    ...typography.micro,
    letterSpacing: 2,
    fontWeight: "700",
  },
  eyebrow: {
    ...typography.micro,
    marginTop: spacing.md,
    fontWeight: "700",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  leading: {
    marginTop: spacing.xs,
  },
  titlePressable: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    ...typography.h1,
    color: "#FFFFFF",
    lineHeight: 34,
  },
  titleWithLeading: {
    marginTop: 0,
  },
  titleCompact: {
    fontSize: 26,
    lineHeight: 32,
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  subtitleCompact: {
    marginTop: spacing.xs,
    marginBottom: 0,
    fontSize: 13,
    lineHeight: 18,
  },
});
