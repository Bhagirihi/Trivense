import React, { memo, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { radii, spacing, typography } from "../../theme/tokens";

const ListHeader = memo(
  ({
    title,
    subtitle,
    action,
    actionText,
    style,
    titleStyle,
    subtitleStyle,
    actionStyle,
    actionTextStyle,
    ...props
  }) => {
    const { theme } = useTheme();

    const styles = useMemo(
      () =>
        StyleSheet.create({
          container: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            ...style,
          },
          titleContainer: {
            flex: 1,
          },
          title: {
            ...typography.h3,
            color: theme.text,
            marginBottom: spacing.xs,
            ...titleStyle,
          },
          subtitle: {
            ...typography.caption,
            fontWeight: "400",
            color: theme.textSecondary,
            ...subtitleStyle,
          },
          action: {
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: radii.sm,
            backgroundColor: theme.primaryMuted,
            ...actionStyle,
          },
          actionText: {
            ...typography.caption,
            fontWeight: "700",
            color: theme.primary,
            ...actionTextStyle,
          },
        }),
      [theme]
    );

    return (
      <View style={styles.container} {...props}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {action && (
          <TouchableOpacity style={styles.action} onPress={action}>
            <Text style={styles.actionText}>{actionText}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
);

export default ListHeader;
