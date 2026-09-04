import { Platform } from "react-native";
import { PLANS } from "../config/subscriptionPlans";
import {
  REVENUECAT_ENTITLEMENT_ID,
  REVENUECAT_OFFERING_ID,
  getPackageLookupKey,
  productIdMatchesPlan,
} from "../config/revenueCat";
import { devLog, devWarn } from "../utils/logger";
import { loadNativeModule } from "../utils/lazyNativeModule";
import { hasCustomNativeModules, isExpoGo } from "../utils/nativeRuntime";

const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
const testKey = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;

let configuredUserId = null;
let purchasesModule = null;
let purchasesReady = false;

const EMPTY_PLAN_PRICES = {
  [PLANS.MONTHLY]: null,
  [PLANS.YEARLY]: null,
};

async function getPurchasesModule() {
  if (purchasesModule) return purchasesModule;
  purchasesModule = await loadNativeModule(
    () => import("react-native-purchases"),
    "react-native-purchases"
  );
  return purchasesModule;
}

function getApiKey() {
  // Development builds and Expo Go have unreliable Play/App Store billing on
  // emulators, so prefer RevenueCat Test Store when it is configured.
  if (__DEV__ && testKey) {
    return testKey || null;
  }

  if (Platform.OS === "ios") {
    return iosKey || null;
  }
  return androidKey || null;
}

function getPlatformKey() {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return __DEV__ ? "test" : "ios";
}

function planFromProductId(productId) {
  if (!productId) return PLANS.FREE;

  const platform = getPlatformKey();
  if (productIdMatchesPlan(productId, PLANS.YEARLY, platform)) {
    return PLANS.YEARLY;
  }
  if (productIdMatchesPlan(productId, PLANS.MONTHLY, platform)) {
    return PLANS.MONTHLY;
  }

  const normalized = productId.toLowerCase();
  if (normalized.includes("year") || normalized.includes("annual")) {
    return PLANS.YEARLY;
  }
  if (normalized.includes("month")) return PLANS.MONTHLY;

  return PLANS.FREE;
}

function planFromCustomerInfo(customerInfo) {
  const entitlement =
    customerInfo?.entitlements?.active?.[REVENUECAT_ENTITLEMENT_ID];
  if (!entitlement) return PLANS.FREE;
  return planFromProductId(entitlement.productIdentifier);
}

function getOffering(offerings) {
  if (!offerings) return null;
  return (
    offerings.all?.[REVENUECAT_OFFERING_ID] ??
    offerings.current ??
    null
  );
}

function findPackage(offering, planId) {
  if (!offering) return null;

  const lookupKey = getPackageLookupKey(planId);
  const fromLookup = offering.availablePackages?.find(
    (pkg) => pkg.identifier === lookupKey
  );
  if (fromLookup) return fromLookup;

  if (planId === PLANS.YEARLY) {
    return (
      offering.annual ??
      offering.availablePackages?.find((pkg) => pkg.packageType === "ANNUAL")
    );
  }

  return (
    offering.monthly ??
    offering.availablePackages?.find((pkg) => pkg.packageType === "MONTHLY")
  );
}

function formatPrice(pkg) {
  const product = pkg?.product;
  if (!product?.priceString) return null;

  return {
    priceString: product.priceString,
    price: product.price,
    currencyCode: product.currencyCode,
    pricePerMonthString: product.pricePerMonthString || null,
  };
}

function buildPlanPrices(offering) {
  const prices = { ...EMPTY_PLAN_PRICES };

  [PLANS.MONTHLY, PLANS.YEARLY].forEach((planId) => {
    const pkg = findPackage(offering, planId);
    prices[planId] = formatPrice(pkg);
  });

  return prices;
}

export const purchaseService = {
  isConfigured() {
    const apiKey = getApiKey();
    if (!apiKey) return false;
    return isExpoGo() || hasCustomNativeModules();
  },

  isReady() {
    return purchasesReady && Boolean(configuredUserId);
  },

  async configure(userId) {
    const apiKey = getApiKey();
    if (!apiKey || !userId) {
      purchasesReady = false;
      return false;
    }

    if (!isExpoGo() && !hasCustomNativeModules()) {
      purchasesReady = false;
      return false;
    }

    if (configuredUserId === userId && purchasesReady) return true;

    try {
      const mod = await getPurchasesModule();
      const Purchases = mod?.default;
      if (!Purchases) {
        purchasesReady = false;
        return false;
      }

      if (__DEV__ && mod.LOG_LEVEL) {
        Purchases.setLogLevel(mod.LOG_LEVEL.DEBUG);
      }

      Purchases.configure({ apiKey, appUserID: userId });
      configuredUserId = userId;
      purchasesReady = true;
      devLog("RevenueCat configured for user", userId);
      return true;
    } catch (error) {
      purchasesReady = false;
      configuredUserId = null;
      devWarn("RevenueCat configure failed:", error?.message || error);
      return false;
    }
  },

  async getOfferings() {
    if (!this.isConfigured()) {
      return { offering: null, planPrices: { ...EMPTY_PLAN_PRICES } };
    }

    const mod = await getPurchasesModule();
    const Purchases = mod?.default;
    if (!Purchases) {
      return { offering: null, planPrices: { ...EMPTY_PLAN_PRICES } };
    }

    const offerings = await Purchases.getOfferings();
    const offering = getOffering(offerings);
    return {
      offering,
      planPrices: buildPlanPrices(offering),
    };
  },

  async getActivePlan() {
    if (!this.isConfigured()) return PLANS.FREE;
    const mod = await getPurchasesModule();
    const Purchases = mod?.default;
    if (!Purchases) return PLANS.FREE;
    const customerInfo = await Purchases.getCustomerInfo();
    return planFromCustomerInfo(customerInfo);
  },

  async purchasePlan(planId) {
    if (!this.isConfigured()) {
      throw new Error(
        "In-app purchases are not configured. Set RevenueCat API keys for this build."
      );
    }

    const mod = await getPurchasesModule();
    const Purchases = mod?.default;
    if (!Purchases) {
      throw new Error("In-app purchases native module is not available in this build.");
    }

    const offerings = await Purchases.getOfferings();
    const offering = getOffering(offerings);
    const selectedPackage = findPackage(offering, planId);

    if (!selectedPackage) {
      throw new Error(
        `Subscription package "${getPackageLookupKey(planId)}" not found. Run scripts/setup-revenuecat-trivense.js or configure RevenueCat offerings.`
      );
    }

    const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
    const activePlan = planFromCustomerInfo(customerInfo);

    if (activePlan === PLANS.FREE) {
      throw new Error("Purchase completed but premium entitlement was not granted.");
    }

    return activePlan;
  },

  async restorePurchases() {
    if (!this.isConfigured()) {
      throw new Error(
        "In-app purchases are not configured. Set RevenueCat API keys for this build."
      );
    }

    const mod = await getPurchasesModule();
    const Purchases = mod?.default;
    if (!Purchases) {
      throw new Error("In-app purchases native module is not available in this build.");
    }

    const customerInfo = await Purchases.restorePurchases();
    return planFromCustomerInfo(customerInfo);
  },

  async syncPurchases() {
    if (!this.isReady()) return PLANS.FREE;
    const mod = await getPurchasesModule();
    const Purchases = mod?.default;
    if (!Purchases) return PLANS.FREE;
    try {
      await Purchases.syncPurchases();
    } catch (error) {
      devWarn("syncPurchases failed:", error?.message);
    }
    return this.getActivePlan();
  },
};
