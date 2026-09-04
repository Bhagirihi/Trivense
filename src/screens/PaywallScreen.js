import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useSubscription } from "../context/SubscriptionContext";
import { Header } from "../components/Header";
import ScreenLayout from "../components/ScreenLayout";
import { AnimatedLoader } from "../components/ui/AnimatedLoader";
import { useTranslation } from "../hooks/useTranslation";
import { showToast } from "../utils/toast";
import {
  FEATURES,
  PAYWALL_FEATURE_LIST,
  PLAN_CATALOG,
  PLANS,
  getFeatureLockInfo,
} from "../config/subscriptionPlans";
import { LEGAL_LINKS } from "../config/appLinks";

const SELECTABLE_PLANS = [PLANS.MONTHLY, PLANS.YEARLY];

export const PaywallScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const {
    plan: currentPlan,
    purchasePlan,
    purchasing,
    restoring,
    restorePurchases,
    refreshSubscription,
    hasFeature,
    purchasesConfigured,
    getPlanPriceLabel,
    getPlanMonthlyPriceLabel,
    offeringsLoading,
    paymentsEnabled,
    loading: subscriptionLoading,
  } = useSubscription();

  useEffect(() => {
    if (!subscriptionLoading && !paymentsEnabled) {
      navigation.goBack();
    }
  }, [subscriptionLoading, paymentsEnabled, navigation]);

  const lockedFeature = route.params?.feature;
  const [selectedPlan, setSelectedPlan] = useState(
    currentPlan === PLANS.YEARLY ? PLANS.YEARLY : PLANS.MONTHLY
  );

  const lockedFeatureInfo = useMemo(
    () => (lockedFeature ? getFeatureLockInfo(lockedFeature) : null),
    [lockedFeature]
  );

  if (subscriptionLoading) {
    return (
      <ScreenLayout
        header={<Header title={t("upgradePlan")} onBack={() => navigation.goBack()} />}
      >
        <AnimatedLoader context="paywall" />
      </ScreenLayout>
    );
  }

  if (!paymentsEnabled) {
    return (
      <ScreenLayout
        header={<Header title={t("upgradePlan")} onBack={() => navigation.goBack()} />}
      >
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      </ScreenLayout>
    );
  }

  const handleSubscribe = async () => {
    try {
      await purchasePlan(selectedPlan);
      await refreshSubscription();
      showToast.success(
        t("subscriptionActivated"),
        t("subscriptionActivatedMessage")
      );
      navigation.goBack();
    } catch (error) {
      showToast.error(t("subscriptionFailed"), error.message);
    }
  };

  const handleRestore = async () => {
    try {
      const restored = await restorePurchases();
      await refreshSubscription();
      if (restored.isPremium) {
        showToast.success(t("restoreSuccess"), t("restoreSuccessMessage"));
        navigation.goBack();
      } else {
        showToast.info(t("restoreNoPurchases"), t("restoreNoPurchasesMessage"));
      }
    } catch (error) {
      showToast.error(t("restoreFailed"), error.message);
    }
  };

  const openLegalLink = async (url) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      showToast.error(t("error"), error.message);
    }
  };

  return (
    <ScreenLayout header={<Header title={t("upgradePlan")} onBack={() => navigation.goBack()} />}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: `${theme.primary}12` }]}>
          <MaterialCommunityIcons name="crown" size={40} color={theme.primary} />
          <Text style={[styles.heroTitle, { color: theme.text }]}>
            {lockedFeatureInfo ? t(lockedFeatureInfo.titleKey) : t("paywallTitle")}
          </Text>
          <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
            {lockedFeatureInfo
              ? t(lockedFeatureInfo.descKey)
              : t("paywallSubtitle")}
          </Text>
          {lockedFeatureInfo ? (
            <Text style={[styles.heroBenefit, { color: theme.text }]}>
              {t(lockedFeatureInfo.benefitKey)}
            </Text>
          ) : null}
        </View>

        {offeringsLoading ? (
          <ActivityIndicator
            style={styles.offeringsLoader}
            size="small"
            color={theme.primary}
          />
        ) : null}

        <View style={styles.planRow}>
          {SELECTABLE_PLANS.map((planId) => {
            const catalog = PLAN_CATALOG[planId];
            const selected = selectedPlan === planId;
            return (
              <TouchableOpacity
                key={planId}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: selected ? theme.primary : theme.border,
                    borderWidth: selected ? 2 : 1,
                  },
                ]}
                onPress={() => setSelectedPlan(planId)}
              >
                {catalog.badgeKey ? (
                  <View
                    style={[styles.badge, { backgroundColor: theme.primary }]}
                  >
                    <Text style={styles.badgeText}>{t(catalog.badgeKey)}</Text>
                  </View>
                ) : null}
                <Text style={[styles.planName, { color: theme.text }]}>
                  {t(catalog.nameKey)}
                </Text>
                <Text style={[styles.planPrice, { color: theme.text }]}>
                  {getPlanPriceLabel(planId)}
                </Text>
                <Text style={[styles.planBilling, { color: theme.textSecondary }]}>
                  {planId === PLANS.YEARLY && getPlanMonthlyPriceLabel(planId)
                    ? `${getPlanMonthlyPriceLabel(planId)} / ${t("planMonthly").toLowerCase()}`
                    : t(catalog.billingKey)}
                </Text>
                {planId === PLANS.YEARLY ? (
                  <Text style={[styles.planSave, { color: theme.success }]}>
                    {t("planYearlySave")}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.freeCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.freeTitle, { color: theme.text }]}>
            {t("planFree")}
          </Text>
          <Text style={[styles.freeDesc, { color: theme.textSecondary }]}>
            {t("planFreeDesc")}
          </Text>
          {currentPlan === PLANS.FREE ? (
            <Text style={[styles.currentPlanLabel, { color: theme.primary }]}>
              {t("currentPlanLabel")}
            </Text>
          ) : null}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t("premiumFeaturesTitle")}
        </Text>
        {PAYWALL_FEATURE_LIST.map((item) => {
          const unlocked = hasFeature(item.feature);
          return (
            <View
              key={item.feature}
              style={[styles.featureRow, { backgroundColor: theme.card }]}
            >
              <View
                style={[
                  styles.featureIcon,
                  { backgroundColor: `${theme.primary}15` },
                ]}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={22}
                  color={theme.primary}
                />
              </View>
              <Text style={[styles.featureText, { color: theme.text }]}>
                {t(item.titleKey)}
              </Text>
              <MaterialCommunityIcons
                name={unlocked ? "check-circle" : "lock-outline"}
                size={20}
                color={unlocked ? theme.success : theme.textSecondary}
              />
            </View>
          );
        })}

        <TouchableOpacity
          style={[styles.subscribeButton, { backgroundColor: theme.primary }]}
          onPress={handleSubscribe}
          disabled={purchasing || !purchasesConfigured}
        >
          {purchasing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.subscribeText}>
              {purchasesConfigured
                ? t("subscribeToPlan").replace(
                    "{{plan}}",
                    t(PLAN_CATALOG[selectedPlan].nameKey)
                  )
                : t("purchasesNotConfigured")}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={restoring || !purchasesConfigured}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={theme.textSecondary} />
          ) : (
            <Text style={[styles.restoreText, { color: theme.primary }]}>
              {t("restorePurchases")}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => openLegalLink(LEGAL_LINKS.termsOfService)}>
            <Text style={[styles.legalLink, { color: theme.primary }]}>
              {t("termsOfService")}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.legalDivider, { color: theme.textSecondary }]}>·</Text>
          <TouchableOpacity onPress={() => openLegalLink(LEGAL_LINKS.privacyPolicy)}>
            <Text style={[styles.legalLink, { color: theme.primary }]}>
              {t("privacyPolicy")}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.legalDivider, { color: theme.textSecondary }]}>·</Text>
          <TouchableOpacity onPress={() => openLegalLink(LEGAL_LINKS.advertisingPolicy)}>
            <Text style={[styles.legalLink, { color: theme.primary }]}>
              {t("advertisingPolicy")}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>
          {t("paywallDisclaimer")}
        </Text>
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  hero: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 12,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  heroBenefit: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 10,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  offeringsLoader: {
    marginBottom: 8,
  },
  planRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  planCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    minHeight: 150,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  planName: {
    fontSize: 16,
    fontWeight: "700",
  },
  planPrice: {
    fontSize: 28,
    fontWeight: "800",
    marginTop: 8,
  },
  planBilling: {
    fontSize: 12,
    marginTop: 4,
  },
  planSave: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },
  freeCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  freeTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  freeDesc: {
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  currentPlanLabel: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  subscribeButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
  },
  subscribeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  restoreButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: "600",
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  legalLink: {
    fontSize: 12,
    fontWeight: "600",
  },
  legalDivider: {
    fontSize: 12,
  },
  disclaimer: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 16,
  },
});

export default PaywallScreen;
