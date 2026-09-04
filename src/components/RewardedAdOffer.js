import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useAdPolicy } from "../context/AdPolicyContext";
import { useSubscription } from "../context/SubscriptionContext";
import { useTranslation } from "../hooks/useTranslation";
import {
  isAdMobAvailable,
  showRewardedAdForTemporaryAdFree,
} from "../services/adService";
import { REWARDED_AD_FREE_HOURS } from "../config/admob";
import { showToast } from "../utils/toast";
import { radii, spacing, typography } from "../theme/tokens";

function withHours(template, hours = REWARDED_AD_FREE_HOURS) {
  return String(template).replace(/\{\{hours\}\}/g, String(hours));
}

export default function RewardedAdOffer({ navigation, compact = false }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { showBannerAds, rewardedAdFreeUntil, refreshAdPolicy } = useAdPolicy();
  const { paymentsEnabled } = useSubscription();
  const [loading, setLoading] = useState(false);

  if (!isAdMobAvailable() || rewardedAdFreeUntil) {
    return null;
  }

  const handleWatch = async () => {
    setLoading(true);
    try {
      await showRewardedAdForTemporaryAdFree();
      await refreshAdPolicy();
      showToast.success(
        t("rewardedAdSuccessTitle"),
        withHours(t("rewardedAdSuccessMessage")),
      );
    } catch (error) {
      showToast.error(
        t("rewardedAdFailedTitle"),
        error?.message || t("tryAgainLater"),
      );
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactRow, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={handleWatch}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <MaterialCommunityIcons name="play-circle-outline" size={20} color={theme.primary} />
        )}
        <Text style={[styles.compactText, { color: theme.text }]}>
          {withHours(t("rewardedAdOfferCompact"))}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name="television-play" size={28} color={theme.primary} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.text }]}>{t("rewardedAdOfferTitle")}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {withHours(t("rewardedAdOfferSubtitle"))}
        </Text>
        {showBannerAds ? (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primaryMuted }]}
            onPress={handleWatch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <>
                <MaterialCommunityIcons name="play" size={18} color={theme.primary} />
                <Text style={[styles.buttonText, { color: theme.primary }]}>
                  {t("rewardedAdWatchButton")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
        {paymentsEnabled ? (
          <TouchableOpacity onPress={() => navigation?.navigate("Paywall")}>
            <Text style={[styles.premiumLink, { color: theme.primary }]}>
              {t("rewardedAdPremiumLink")}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  iconWrap: {
    paddingTop: 2,
  },
  body: {
    flex: 1,
  },
  title: {
    ...typography.bodyMedium,
    fontWeight: "600",
    marginBottom: 4,
  },
  subtitle: {
    ...typography.caption,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.xs,
  },
  buttonText: {
    ...typography.label,
    fontWeight: "600",
  },
  premiumLink: {
    ...typography.caption,
    fontWeight: "600",
  },
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  compactText: {
    ...typography.caption,
    flex: 1,
  },
});
