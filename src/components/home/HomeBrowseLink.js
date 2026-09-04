import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "../../hooks/useTranslation";
import { radii, spacing, typography } from "../../theme/tokens";

export const HomeBrowseLink = memo(({ count, onPress }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  if (count <= 0) return null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={[
        styles.row,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View style={styles.copy}>
        <Text style={[styles.title, { color: theme.text }]}>
          {t("homeBrowseExpensesTitle")}
        </Text>
        <Text style={[styles.sub, { color: theme.textSecondary }]}>
          {t("homeBrowseExpensesSubtitle").replace("{{count}}", String(count))}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={theme.primary} />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  copy: {
    flex: 1,
    paddingRight: spacing.md,
  },
  title: {
    ...typography.bodyMedium,
    fontSize: 15,
    fontWeight: "700",
  },
  sub: {
    marginTop: 2,
    ...typography.caption,
    lineHeight: 18,
    fontWeight: "400",
  },
});
