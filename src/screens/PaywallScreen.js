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
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSubscription } from "../context/SubscriptionContext";
import { Header } from "../components/Header";
import { ScreenLayout } from "../components/ScreenLayout";
import { AnimatedLoader } from "../components/ui/AnimatedLoader";
import { useTranslation } from "../hooks/useTranslation";
import { showToast } from "../utils/toast";
import {
  PAYWALL_FEATURE_LIST,
  PLAN_CATALOG,
  PLANS,
  getFeatureLockInfo,
} from "../config/subscriptionPlans";
import { LEGAL_LINKS } from "../config/appLinks";
import { kinetic } from "../theme/tokens";

// Kinetic redesign (2026-11-13): navy gradient crown hero, green-tick
// feature list, highlighted Yearly card, coral subscribe CTA, Restore
// Purchase link. Purchase + restore still go through the existing
// RevenueCat flow (purchasePlan / restorePurchases).
// PRICES ARE THE REAL ONES from subscriptionPlans.js — Monthly ₹299,
// Yearly ₹2,499 (≈ ₹208/month). None of the design mock's prices,
// discount percentages or free-trial claims are used: no free trial
// exists in the RevenueCat config, so none is promised here. The yearly
// saving shown (₹1,089/yr) is computed from the real catalog prices.

const C = kinetic.colors;
const T = kinetic.typography;
const R = kinetic.radii;

const SELECTABLE_PLANS = [PLANS.YEARLY, PLANS.MONTHLY];

export const PaywallScreen = ({ navigation, route }) => {
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
    currentPlan === PLANS.MONTHLY ? PLANS.MONTHLY : PLANS.YEARLY
  );

  const lockedFeatureInfo = useMemo(
    () => (lockedFeature ? getFeatureLockInfo(lockedFeature) : null),
    [lockedFeature]
  );

  // Yearly saving vs paying monthly, from the real catalog prices.
  const yearlySaveInr =
    PLAN_CATALOG[PLANS.MONTHLY].priceInr * 12 -
    PLAN_CATALOG[PLANS.YEARLY].priceInr;

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
          <ActivityIndicator size="small" color={C.navy} />
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={C.heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.crownWrap}>
            <MaterialCommunityIcons name="crown" size={32} color="#FFFFFF" />
          </View>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
          <Text style={styles.heroTitle}>
            {lockedFeatureInfo ? t(lockedFeatureInfo.titleKey) : t("paywallTitle")}
          </Text>
          <Text style={styles.heroSubtitle}>
            {lockedFeatureInfo
              ? t(lockedFeatureInfo.descKey)
              : t("paywallSubtitle")}
          </Text>
          {lockedFeatureInfo ? (
            <Text style={styles.heroBenefit}>
              {t(lockedFeatureInfo.benefitKey)}
            </Text>
          ) : null}
        </LinearGradient>

        {offeringsLoading ? (
          <ActivityIndicator
            style={styles.offeringsLoader}
            size="small"
            color={C.navy}
          />
        ) : null}

        <Text style={styles.sectionTitle}>Choose Membership</Text>
        <Text style={styles.sectionSub}>Cancel anytime</Text>
        <View style={styles.planColumn}>
          {SELECTABLE_PLANS.map((planId) => {
            const catalog = PLAN_CATALOG[planId];
            const selected = selectedPlan === planId;
            const isYearly = planId === PLANS.YEARLY;
            return (
              <TouchableOpacity
                key={planId}
                style={[
                  styles.planCard,
                  selected ? styles.planCardSelected : styles.planCardIdle,
                ]}
                onPress={() => setSelectedPlan(planId)}
                activeOpacity={0.9}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                {catalog.badgeKey ? (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: isYearly ? C.coral : C.navy },
                    ]}
                  >
                    <Text style={styles.badgeText}>{t(catalog.badgeKey)}</Text>
                  </View>
                ) : null}
                <View style={styles.planTopRow}>
                  <View style={styles.planNameBlock}>
                    <Text style={styles.planName}>{t(catalog.nameKey)}</Text>
                    <Text style={styles.planBilling}>{t(catalog.billingKey)}</Text>
                  </View>
                  <View style={styles.planPriceBlock}>
                    <Text style={styles.planPrice}>{getPlanPriceLabel(planId)}</Text>
                    <Text style={styles.planPer}>
                      {isYearly ? "/ year" : "/ month"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      selected ? styles.radioSelected : styles.radioIdle,
                    ]}
                  >
                    {selected ? (
                      <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
                    ) : null}
                  </View>
                </View>
                {isYearly && getPlanMonthlyPriceLabel(planId) ? (
                  <Text style={styles.planMonthlyLine}>
                    Just {getPlanMonthlyPriceLabel(planId)}/month · Billed annually
                  </Text>
                ) : null}
                {isYearly && yearlySaveInr > 0 ? (
                  <Text style={styles.planSave}>
                    Save ₹{yearlySaveInr.toLocaleString("en-IN")} a year vs monthly
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.freeCard}>
          <Text style={styles.freeTitle}>{t("planFree")}</Text>
          <Text style={styles.freeDesc}>{t("planFreeDesc")}</Text>
          {currentPlan === PLANS.FREE ? (
            <Text style={styles.currentPlanLabel}>{t("currentPlanLabel")}</Text>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>{t("premiumFeaturesTitle")}</Text>
        <View style={styles.featureList}>
          {PAYWALL_FEATURE_LIST.map((item) => {
            const unlocked = hasFeature(item.feature);
            return (
              <View key={item.feature} style={styles.featureRow}>
                <View style={styles.featureCheck}>
                  <MaterialCommunityIcons
                    name={unlocked ? "check-circle" : "check-circle-outline"}
                    size={22}
                    color={C.success}
                  />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={styles.featureText}>{t(item.titleKey)}</Text>
                  <Text style={styles.featureDesc}>{t(item.descKey)}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.subscribeButton}
          onPress={handleSubscribe}
          disabled={purchasing || !purchasesConfigured}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={C.coralGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.subscribeGradient}
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
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.subscribeNote}>
          {selectedPlan === PLANS.YEARLY
            ? `${getPlanPriceLabel(PLANS.YEARLY)} per year · Cancel anytime`
            : `${getPlanPriceLabel(PLANS.MONTHLY)} per month · Cancel anytime`}
        </Text>

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={restoring || !purchasesConfigured}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={C.textSecondary} />
          ) : (
            <Text style={styles.restoreText}>{t("restorePurchases")}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => openLegalLink(LEGAL_LINKS.termsOfService)}>
            <Text style={styles.legalLink}>{t("termsOfService")}</Text>
          </TouchableOpacity>
          <Text style={styles.legalDivider}>·</Text>
          <TouchableOpacity onPress={() => openLegalLink(LEGAL_LINKS.privacyPolicy)}>
            <Text style={styles.legalLink}>{t("privacyPolicy")}</Text>
          </TouchableOpacity>
          <Text style={styles.legalDivider}>·</Text>
          <TouchableOpacity onPress={() => openLegalLink(LEGAL_LINKS.advertisingPolicy)}>
            <Text style={styles.legalLink}>{t("advertisingPolicy")}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>{t("paywallDisclaimer")}</Text>
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, backgroundColor: C.canvas },
  hero: {
    borderRadius: R.xl,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    ...kinetic.shadows.elevated,
  },
  crownWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  proBadge: {
    backgroundColor: C.coral,
    borderRadius: R.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  proBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  heroTitle: {
    ...T.displayMedium,
    color: "#FFFFFF",
    textAlign: "center",
  },
  heroSubtitle: {
    ...T.body,
    color: "rgba(255,255,255,0.8)",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  heroBenefit: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: 10,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  offeringsLoader: {
    marginBottom: 8,
  },
  sectionTitle: {
    ...T.headingMedium,
    color: C.textPrimary,
    marginBottom: 4,
  },
  sectionSub: {
    ...T.caption,
    color: C.textSecondary,
    marginBottom: 12,
  },
  planColumn: {
    gap: 12,
    marginBottom: 16,
  },
  planCard: {
    borderRadius: R.lg,
    padding: 16,
  },
  planCardSelected: {
    backgroundColor: C.card,
    borderColor: C.coral,
    borderWidth: 2,
    ...kinetic.shadows.ctaCoral,
  },
  planCardIdle: {
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: R.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  planTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  planNameBlock: { flex: 1 },
  planName: {
    ...T.headingSmall,
    color: C.textPrimary,
  },
  planBilling: {
    ...T.caption,
    color: C.textSecondary,
    marginTop: 2,
  },
  planPriceBlock: {
    alignItems: "flex-end",
  },
  planPrice: {
    fontSize: 26,
    fontWeight: "800",
    color: C.textPrimary,
    letterSpacing: -0.3,
  },
  planPer: {
    ...T.caption,
    color: C.textSecondary,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { backgroundColor: C.coral },
  radioIdle: { borderWidth: 2, borderColor: C.borderStrong },
  planMonthlyLine: {
    ...T.bodyMedium,
    color: C.textSecondary,
    marginTop: 10,
  },
  planSave: {
    fontSize: 13,
    fontWeight: "700",
    color: C.success,
    marginTop: 6,
  },
  freeCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.lg,
    padding: 16,
    marginBottom: 20,
  },
  freeTitle: {
    ...T.headingSmall,
    color: C.textPrimary,
  },
  freeDesc: {
    ...T.body,
    color: C.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  currentPlanLabel: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
    color: C.navy,
  },
  featureList: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.lg,
    padding: 8,
    marginBottom: 8,
    ...kinetic.shadows.card,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    minHeight: 48,
  },
  featureCheck: {
    marginTop: 2,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureText: {
    ...T.bodyMedium,
    color: C.textPrimary,
    fontWeight: "600",
  },
  featureDesc: {
    ...T.caption,
    color: C.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  subscribeButton: {
    borderRadius: 14,
    marginTop: 16,
    overflow: "hidden",
    ...kinetic.shadows.ctaCoral,
  },
  subscribeGradient: {
    paddingVertical: 16,
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
  },
  subscribeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  subscribeNote: {
    ...T.caption,
    color: C.textSecondary,
    textAlign: "center",
    marginTop: 10,
  },
  restoreButton: {
    alignItems: "center",
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: "center",
  },
  restoreText: {
    fontSize: 14,
    fontWeight: "700",
    color: C.navy,
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
    color: C.navy,
  },
  legalDivider: {
    fontSize: 12,
    color: C.textSecondary,
  },
  disclaimer: {
    fontSize: 11,
    color: C.textSecondary,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 16,
  },
});

export default PaywallScreen;
