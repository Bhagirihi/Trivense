import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext";
import { useTranslation } from "../hooks/useTranslation";
import { useSubscription } from "../context/SubscriptionContext";
import { radii, spacing } from "../theme/tokens";

const DISMISS_KEY = "@trivense/ad_supported_banner_dismissed";

export default function AdSupportedAccessBanner() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { paymentsEnabled, isPaidSubscriber, loading } = useSubscription();
  const [dismissed, setDismissed] = useState(true);

  const loadDismissed = useCallback(async () => {
    const raw = await AsyncStorage.getItem(DISMISS_KEY);
    setDismissed(raw === "1");
  }, []);

  useEffect(() => {
    loadDismissed();
  }, [loadDismissed, paymentsEnabled]);

  const handleDismiss = async () => {
    setDismissed(true);
    await AsyncStorage.setItem(DISMISS_KEY, "1");
  };

  if (loading || paymentsEnabled || isPaidSubscriber || dismissed) {
    return null;
  }

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: theme.primaryMuted, borderColor: theme.border },
      ]}
    >
      <MaterialCommunityIcons
        name="information-outline"
        size={16}
        color={theme.primary}
      />
      <Text
        style={[styles.text, { color: theme.textSecondary }]}
        numberOfLines={2}
      >
        <Text style={[styles.title, { color: theme.text }]}>
          {t("adSupportedAccessTitle")}
        </Text>
        {" · "}
        {t("adSupportedAccessBody")}
      </Text>
      <TouchableOpacity
        onPress={handleDismiss}
        hitSlop={8}
        accessibilityLabel={t("dismiss")}
        style={styles.closeBtn}
      >
        <MaterialCommunityIcons name="close" size={16} color={theme.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
  },
  title: {
    fontSize: 12,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 2,
  },
});
