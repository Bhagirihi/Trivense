import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import Card from "./Card";
import { radii, spacing, typography } from "../../theme/tokens";

const StatCard = memo(
  ({
    title,
    value,
    icon,
    trend,
    trendType = "neutral",
    style,
    titleStyle,
    valueStyle,
    trendStyle,
    ...props
  }) => {
    const { theme } = useTheme();

    const styles = useMemo(
      () =>
        StyleSheet.create({
          container: { ...style },
          header: {
            flexDirection: "row",
            alignItems: "center",
            marginBottom: spacing.md,
          },
          iconContainer: {
            width: 44,
            height: 44,
            borderRadius: radii.md,
            backgroundColor: theme.primaryMuted,
            justifyContent: "center",
            alignItems: "center",
            marginRight: spacing.md,
          },
          title: {
            ...typography.caption,
            fontWeight: "600",
            color: theme.textSecondary,
            ...titleStyle,
          },
          value: {
            fontSize: 26,
            fontWeight: "700",
            letterSpacing: -0.5,
            color: theme.text,
            marginBottom: spacing.xs,
            ...valueStyle,
          },
          trendContainer: { flexDirection: "row", alignItems: "center" },
          trendIcon: { marginRight: spacing.xs },
          trendText: {
            ...typography.caption,
            fontWeight: "600",
            color:
              trendType === "positive"
                ? theme.success
                : trendType === "negative"
                ? theme.error
                : theme.textSecondary,
            ...trendStyle,
          },
        }),
      [theme, trendType, style, titleStyle, valueStyle, trendStyle]
    );

    const getTrendIcon = () => {
      switch (trendType) {
        case "positive":
          return "trending-up";
        case "negative":
          return "trending-down";
        default:
          return "trending-neutral";
      }
    };

    return (
      <Card variant="elevated" style={styles.container} {...props}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name={icon} size={22} color={theme.primary} />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.value}>{value}</Text>
        {trend ? (
          <View style={styles.trendContainer}>
            <MaterialCommunityIcons
              name={getTrendIcon()}
              size={16}
              color={styles.trendText.color}
              style={styles.trendIcon}
            />
            <Text style={styles.trendText}>{trend}</Text>
          </View>
        ) : null}
      </Card>
    );
  }
);

export default StatCard;
