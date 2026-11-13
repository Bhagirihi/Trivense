import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { kinetic } from "../../theme/tokens";

/**
 * Shared board card (Dashboard "Active Shared Boards", ExpenseBoard list).
 * White card, hairline border, icon tile, title + subtitle, your-share
 * figure, avatar stack with +N counter, budget gauge whose fill colour
 * follows usage (<70% green, 70–90% amber, >90% red).
 * `members` are { id, name } — the avatar shows the first initial; no
 * remote photos are invented. `yourShare` is signed: >0 green (+owed),
 * <0 red (-owe), 0 neutral ("₹0 settled").
 */
export function BoardCard({
  title,
  subtitle,
  icon,
  yourShare = 0,
  members = [],
  totalMembers = 0,
  budgetUsagePercent = null,
  unsettledCount = null,
  settleLabel = null,
  onPress,
  onSettlePress,
  testID = "board-card",
}) {
  const share = Number(yourShare) || 0;
  const shareColor =
    share > 0
      ? kinetic.colors.textPositive
      : share < 0
        ? kinetic.colors.textNegative
        : kinetic.colors.textPrimary;
  const shareText =
    share > 0
      ? `+₹${share.toLocaleString("en-IN")}`
      : share < 0
        ? `-₹${Math.abs(share).toLocaleString("en-IN")}`
        : "₹0 settled";
  const shown = members.slice(0, 3);
  const extra = Math.max((totalMembers || members.length) - shown.length, 0);

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      activeOpacity={0.97}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View style={styles.titleRow}>
          <View style={styles.iconTile}>
            <Text style={styles.iconText}>{icon || "💰"}</Text>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.shareBlock}>
          <Text style={styles.shareLabel}>YOUR SHARE</Text>
          <Text style={[styles.shareValue, { color: shareColor }]}>
            {shareText}
          </Text>
        </View>
      </View>

      {budgetUsagePercent !== null && budgetUsagePercent !== undefined ? (
        <View style={styles.gaugeTrack}>
          <View
            style={[
              styles.gaugeFill,
              {
                width: `${Math.min(100, Math.max(0, budgetUsagePercent))}%`,
                backgroundColor: kinetic.gaugeColor(budgetUsagePercent),
              },
            ]}
          />
        </View>
      ) : null}

      <View style={styles.bottomRow}>
        <View style={styles.avatarStack}>
          {shown.map((m, i) => (
            <View
              key={m.id || m.name || i}
              style={[styles.avatar, i > 0 && { marginLeft: -8 }]}
            >
              <Text style={styles.avatarText}>
                {(m.name || "?").trim().charAt(0).toUpperCase()}
              </Text>
            </View>
          ))}
          {extra > 0 ? (
            <View style={[styles.avatar, styles.avatarMore, { marginLeft: -8 }]}>
              <Text style={styles.avatarMoreText}>+{extra}</Text>
            </View>
          ) : null}
        </View>
        {settleLabel && onSettlePress ? (
          <TouchableOpacity
            onPress={onSettlePress}
            style={styles.settleButton}
            accessibilityRole="button"
            accessibilityLabel={settleLabel}
          >
            <Text style={styles.settleButtonText}>{settleLabel}</Text>
          </TouchableOpacity>
        ) : unsettledCount !== null && unsettledCount !== undefined ? (
          <Text style={styles.unsettledText}>
            {unsettledCount > 0
              ? `${unsettledCount} unsettled bill${unsettledCount === 1 ? "" : "s"}`
              : "All settled"}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: kinetic.colors.card,
    borderWidth: 1,
    borderColor: kinetic.colors.border,
    borderRadius: kinetic.radii.lg,
    padding: 16,
    ...kinetic.shadows.card,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  titleRow: { flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: kinetic.radii.md,
    backgroundColor: kinetic.colors.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 20 },
  titleBlock: { flex: 1, marginLeft: 12, minWidth: 0 },
  title: { ...kinetic.typography.headingSmall, color: kinetic.colors.textPrimary },
  subtitle: {
    ...kinetic.typography.caption,
    color: kinetic.colors.textSecondary,
    marginTop: 2,
  },
  shareBlock: { alignItems: "flex-end", marginLeft: 8 },
  shareLabel: {
    ...kinetic.typography.captionBold,
    color: kinetic.colors.textTertiary,
    letterSpacing: 0.5,
  },
  shareValue: { ...kinetic.typography.bodyMedium, marginTop: 2 },
  gaugeTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EEF2F6",
    marginTop: 12,
    overflow: "hidden",
  },
  gaugeFill: { height: 6, borderRadius: 3 },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  avatarStack: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#D6E4ED",
    borderWidth: 2,
    borderColor: kinetic.colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 11,
    fontWeight: "700",
    color: kinetic.colors.navy,
  },
  avatarMore: { backgroundColor: "#DEE8FF" },
  avatarMoreText: {
    fontSize: 10,
    fontWeight: "700",
    color: kinetic.colors.navy,
  },
  unsettledText: {
    ...kinetic.typography.caption,
    color: kinetic.colors.textSecondary,
  },
  settleButton: {
    backgroundColor: kinetic.colors.subtle,
    borderRadius: kinetic.radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
    justifyContent: "center",
  },
  settleButtonText: {
    ...kinetic.typography.caption,
    fontWeight: "600",
    color: kinetic.colors.navy,
  },
});
