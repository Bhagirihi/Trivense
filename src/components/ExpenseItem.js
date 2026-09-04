import React, { memo, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { formatCurrency } from "../utils/formatters";
import { radii, spacing, typography } from "../theme/tokens";

const formatDate = (date) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const expenseDate = new Date(date);
  if (expenseDate.toDateString() === today.toDateString()) return "Today";
  if (expenseDate.toDateString() === yesterday.toDateString()) return "Yesterday";
  return expenseDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const ExpenseItem = memo(({ expense, onPress, onDelete, compact = false }) => {
  const { theme } = useTheme();
  const categoryName =
    typeof expense.category === "string"
      ? expense.category
      : expense.category?.name || "Uncategorized";
  const iconName = expense.icon || expense.category?.icon || "receipt";
  const iconColor = expense.color || expense.category?.color || theme.primary;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          alignItems: "center",
          padding: compact ? spacing.sm : spacing.md,
          borderRadius: compact ? radii.md : radii.lg,
          marginBottom: compact ? spacing.xs : spacing.sm,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
          ...Platform.select({
            ios: compact
              ? {}
              : {
                  shadowColor: "#0F172A",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 6,
                },
            android: { elevation: compact ? 0 : 1 },
          }),
        },
        icon: {
          width: compact ? 36 : 44,
          height: compact ? 36 : 44,
          borderRadius: compact ? radii.sm : radii.md,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: `${iconColor}18`,
        },
        body: { flex: 1, marginLeft: compact ? spacing.sm : spacing.md },
        topRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: compact ? 0 : spacing.xs,
        },
        title: {
          ...(compact ? typography.caption : typography.bodyMedium),
          color: theme.text,
          flex: 1,
          marginRight: spacing.sm,
        },
        amount: {
          ...(compact ? typography.caption : typography.bodyMedium),
          fontWeight: "700",
          color: theme.text,
        },
        desc: {
          fontSize: 13,
          color: theme.textSecondary,
          marginBottom: spacing.sm,
        },
        metaRow: { flexDirection: "row", flexWrap: "wrap", gap: compact ? spacing.sm : spacing.md },
        meta: { flexDirection: "row", alignItems: "center", gap: 4 },
        metaText: { fontSize: compact ? 11 : 12, color: theme.textMuted },
        deleteBtn: {
          width: compact ? 32 : 36,
          height: compact ? 32 : 36,
          borderRadius: radii.sm,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.errorLight,
          marginLeft: spacing.sm,
        },
      }),
    [theme, iconColor, compact]
  );

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${categoryName}, ${formatCurrency(expense.amount)}${
        expense.description ? `, ${expense.description}` : ""
      }`}
    >
      <View style={styles.icon}>
        <MaterialCommunityIcons
          name={iconName}
          size={compact ? 18 : 22}
          color={iconColor}
        />
      </View>
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={1}>
            {categoryName}
          </Text>
          <Text style={styles.amount}>{formatCurrency(expense.amount)}</Text>
        </View>
        {!compact && expense.description ? (
          <Text style={styles.desc} numberOfLines={1}>
            {expense.description}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <View style={styles.meta}>
            <MaterialCommunityIcons
              name="calendar-outline"
              size={compact ? 11 : 13}
              color={theme.textMuted}
            />
            <Text style={styles.metaText}>{formatDate(expense.date)}</Text>
          </View>
          {expense.board ? (
            <View style={styles.meta}>
              <MaterialCommunityIcons
                name="view-grid-outline"
                size={compact ? 11 : 13}
                color={theme.textMuted}
              />
              <Text style={styles.metaText} numberOfLines={1}>
                {expense.board}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => onDelete(expense)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Delete expense"
      >
        <MaterialCommunityIcons
          name="trash-can-outline"
          size={compact ? 16 : 18}
          color={theme.error}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

export default ExpenseItem;
