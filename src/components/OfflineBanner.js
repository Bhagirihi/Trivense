import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNetwork } from "../context/NetworkContext";
import { useTranslation } from "../hooks/useTranslation";
import { spacing, typography } from "../theme/tokens";

export default function OfflineBanner() {
  const { isOffline, refresh } = useNetwork();
  const { t } = useTranslation();

  if (!isOffline) return null;

  return (
    <View
      style={[styles.banner, { backgroundColor: "#B45309" }]}
      accessibilityRole="alert"
      accessibilityLabel={t("youAreOffline")}
    >
      <MaterialCommunityIcons name="wifi-off" size={16} color="#FFFFFF" />
      <Text style={styles.text}>{t("youAreOffline")}</Text>
      <TouchableOpacity
        onPress={refresh}
        accessibilityRole="button"
        accessibilityLabel={t("retry")}
        hitSlop={8}
      >
        <Text style={styles.retry}>{t("retry")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  text: {
    ...typography.caption,
    color: "#FFFFFF",
    flex: 1,
    fontWeight: "600",
  },
  retry: {
    ...typography.caption,
    color: "#FFFFFF",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
