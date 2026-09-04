import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState } from "react-native";
import { useAuth } from "./AuthContext";
import { subscriptionService } from "../services/subscriptionService";
import { purchaseService } from "../services/purchaseService";
import { appConfigService } from "../services/appConfigService";
import { supabase } from "../config/supabase";
import { FEATURES, PLANS, PLAN_CATALOG, getPlanLimits } from "../config/subscriptionPlans";
import { devError } from "../utils/logger";

const SubscriptionContext = createContext(null);

const DEFAULT_PLAN_PRICES = {
  [PLANS.MONTHLY]: null,
  [PLANS.YEARLY]: null,
};

const isBillingUnavailableError = (error) => {
  const details = [
    error?.message,
    error?.code,
    error?.userInfo?.readableErrorCode,
    error?.userInfo?.underlyingErrorMessage,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    details.includes("BILLING_UNAVAILABLE") ||
    details.includes("Billing service unavailable") ||
    details.includes("PurchaseNotAllowedError")
  );
};

export const SubscriptionProvider = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState({
    plan: PLANS.FREE,
    status: "active",
    isPremium: false,
    expiresAt: null,
    startedAt: null,
  });
  const [paymentsEnabled, setPaymentsEnabled] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [planPrices, setPlanPrices] = useState(DEFAULT_PLAN_PRICES);
  const [offeringsLoading, setOfferingsLoading] = useState(false);

  const refreshAppConfig = useCallback(async () => {
    try {
      const config = await appConfigService.fetchConfig();
      setPaymentsEnabled(config.paymentsEnabled);
    } catch (error) {
      devError("refreshAppConfig error:", error);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  // Fetch remote flag on launch, when returning to foreground, and on admin updates.
  useEffect(() => {
    refreshAppConfig();

    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        refreshAppConfig();
      }
    });

    const configChannel = supabase
      .channel("app-config-payments")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "app_config",
          filter: "id=eq.1",
        },
        (payload) => {
          const enabled = payload.new?.payments_enabled;
          if (typeof enabled === "boolean") {
            setPaymentsEnabled(enabled);
            setConfigLoading(false);
          }
        }
      )
      .subscribe();

    return () => {
      appStateSub.remove();
      supabase.removeChannel(configChannel);
    };
  }, [refreshAppConfig]);

  const refreshOfferings = useCallback(async () => {
    if (!paymentsEnabled || !purchaseService.isConfigured()) {
      setPlanPrices(DEFAULT_PLAN_PRICES);
      return;
    }

    try {
      setOfferingsLoading(true);
      const { planPrices: nextPrices } = await purchaseService.getOfferings();
      setPlanPrices(nextPrices);
    } catch (error) {
      if (!isBillingUnavailableError(error)) {
        devError("refreshOfferings error:", error);
      }
    } finally {
      setOfferingsLoading(false);
    }
  }, [paymentsEnabled]);

  const refreshSubscription = useCallback(async () => {
    let paymentsOn = true;
    try {
      const config = await appConfigService.fetchConfig();
      paymentsOn = config.paymentsEnabled;
      setPaymentsEnabled(config.paymentsEnabled);
    } catch (error) {
      devError("refreshAppConfig error:", error);
    } finally {
      setConfigLoading(false);
    }

    if (!user?.id) {
      setSubscription({
        plan: PLANS.FREE,
        status: "active",
        isPremium: false,
        expiresAt: null,
        startedAt: null,
      });
      setPlanPrices(DEFAULT_PLAN_PRICES);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      if (paymentsOn) {
        try {
          await purchaseService.syncPurchases();
        } catch (error) {
          if (!isBillingUnavailableError(error)) {
            devError("syncPurchases error:", error);
          }
        }
      }
      const next = await subscriptionService.getEffectiveSubscription(user.id);
      setSubscription(next);
      if (paymentsOn && purchaseService.isConfigured()) {
        try {
          setOfferingsLoading(true);
          const { planPrices: nextPrices } = await purchaseService.getOfferings();
          setPlanPrices(nextPrices);
        } catch (error) {
          if (!isBillingUnavailableError(error)) {
            devError("refreshOfferings error:", error);
          }
        } finally {
          setOfferingsLoading(false);
        }
      } else {
        setPlanPrices(DEFAULT_PLAN_PRICES);
      }
    } catch (error) {
      devError("refreshSubscription error:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      refreshSubscription();
      return;
    }

    if (!paymentsEnabled) {
      refreshSubscription();
      return;
    }

    purchaseService.configure(user.id).finally(() => {
      refreshSubscription();
    });
  }, [user?.id, paymentsEnabled, refreshSubscription]);

  const isPaidSubscriber = subscription.isPremium;

  const getPlanPriceLabel = useCallback(
    (planId) => {
      const livePrice = planPrices[planId]?.priceString;
      if (livePrice) return livePrice;
      return `₹${PLAN_CATALOG[planId]?.priceInr ?? ""}`;
    },
    [planPrices]
  );

  const getPlanMonthlyPriceLabel = useCallback(
    (planId) => {
      const liveMonthly = planPrices[planId]?.pricePerMonthString;
      if (liveMonthly) return liveMonthly;
      const fallback = PLAN_CATALOG[planId]?.priceMonthlyInr;
      return fallback ? `₹${fallback}` : null;
    },
    [planPrices]
  );

  const purchasePlan = useCallback(
    async (planId) => {
      if (!paymentsEnabled) {
        throw new Error("Subscriptions are not available right now.");
      }
      if (!user?.id) throw new Error("Sign in to subscribe");
      if (planId === PLANS.FREE) {
        throw new Error("Use the app store to manage or cancel your subscription.");
      }

      try {
        setPurchasing(true);
        const purchasedPlan = await purchaseService.purchasePlan(planId);
        const next = await subscriptionService.waitForServerSubscription(
          user.id,
          purchasedPlan
        );
        setSubscription(next);
        return next;
      } finally {
        setPurchasing(false);
      }
    },
    [user?.id, paymentsEnabled]
  );

  const restorePurchases = useCallback(async () => {
    if (!paymentsEnabled) {
      throw new Error("Subscriptions are not available right now.");
    }
    if (!user?.id) throw new Error("Sign in to restore purchases");

    try {
      setRestoring(true);
      const restoredPlan = await purchaseService.restorePurchases();
      const next = await subscriptionService.waitForServerSubscription(
        user.id,
        restoredPlan
      );
      setSubscription(next);
      return next;
    } finally {
      setRestoring(false);
    }
  }, [user?.id, paymentsEnabled]);

  const hasFeature = useCallback(
    (featureKey) => {
      if (!paymentsEnabled) return true;
      return subscriptionService.hasFeature(subscription, featureKey);
    },
    [subscription, paymentsEnabled]
  );

  const canUseAnalyticsPeriod = useCallback(
    (period) => {
      if (!paymentsEnabled) return true;
      return subscriptionService.canUsePeriod(subscription, period);
    },
    [subscription, paymentsEnabled]
  );

  const requireFeature = useCallback(
    (featureKey, navigation, options = {}) => {
      if (configLoading) return true;
      if (!paymentsEnabled || hasFeature(featureKey)) return true;
      navigation.navigate("Paywall", {
        feature: featureKey,
        ...options,
      });
      return false;
    },
    [configLoading, hasFeature, paymentsEnabled]
  );

  const limits = useMemo(() => {
    if (!paymentsEnabled) {
      return getPlanLimits(PLANS.MONTHLY);
    }
    return subscriptionService.getLimits(subscription);
  }, [subscription, paymentsEnabled]);

  const value = useMemo(
    () => ({
      subscription,
      loading: loading || configLoading,
      purchasing,
      restoring,
      offeringsLoading,
      planPrices,
      paymentsEnabled,
      configLoading,
      getPlanPriceLabel,
      getPlanMonthlyPriceLabel,
      refreshSubscription,
      refreshOfferings,
      refreshAppConfig,
      purchasePlan,
      restorePurchases,
      hasFeature,
      canUseAnalyticsPeriod,
      requireFeature,
      isPaidSubscriber,
      isPremium: isPaidSubscriber,
      isAdFree: isPaidSubscriber,
      plan: subscription.plan,
      limits,
      purchasesConfigured: paymentsEnabled && purchaseService.isConfigured(),
      FEATURES,
      PLANS,
    }),
    [
      subscription,
      loading,
      configLoading,
      purchasing,
      restoring,
      offeringsLoading,
      planPrices,
      paymentsEnabled,
      isPaidSubscriber,
      getPlanPriceLabel,
      getPlanMonthlyPriceLabel,
      refreshSubscription,
      refreshOfferings,
      refreshAppConfig,
      purchasePlan,
      restorePurchases,
      hasFeature,
      canUseAnalyticsPeriod,
      requireFeature,
      limits,
    ]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return context;
};
