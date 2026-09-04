import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { radii, spacing, typography } from "../../theme/tokens";

export const SectionLabel = memo(({ title, style }) => {
  const { theme } = useTheme();
  return (
    <Text style={[styles.label, { color: theme.textMuted }, style]}>
      {title.toUpperCase()}
    </Text>
  );
});

export const SettingsRow = memo(
  ({
    icon,
    iconColor,
    iconBg,
    title,
    subtitle,
    onPress,
    rightElement,
    showChevron = true,
    isLast = false,
  }) => {
    const { theme } = useTheme();
    const Wrapper = onPress ? TouchableOpacity : View;

    return (
      <Wrapper
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
        style={[
          styles.row,
          !isLast && {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: iconBg || theme.primaryMuted },
          ]}
        >
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={iconColor || theme.primary}
          />
        </View>
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightElement ||
          (showChevron && onPress ? (
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color={theme.textMuted}
            />
          ) : null)}
      </Wrapper>
    );
  }
);

export const QuickActionTile = memo(({ icon, label, color, bg, onPress, highlighted }) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.actionTile,
        {
          backgroundColor: theme.surface,
          borderColor: highlighted ? theme.primary : theme.border,
          borderWidth: highlighted ? 2 : 1,
        },
        highlighted && { backgroundColor: theme.primaryMuted },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.actionIcon, { backgroundColor: bg || `${color}18` }]}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.actionLabel, { color: theme.text }]} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  label: {
    ...typography.micro,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    marginLeft: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: { flex: 1 },
  title: { ...typography.bodyMedium, fontSize: 15 },
  subtitle: { ...typography.caption, marginTop: 2, fontWeight: "400" },
  actionTile: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    ...typography.caption,
    textAlign: "center",
    fontWeight: "600",
  },
});
