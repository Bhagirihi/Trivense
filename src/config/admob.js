import { Platform } from "react-native";

/**
 * AdMob app (console): https://admob.google.com/v2/apps/5149530682/overview
 * Linked package: com.trivense.app · Firebase: trivense-app-prod
 */
export const ADMOB_CONSOLE_APP_ID = "5149530682";

export const GOOGLE_ADMOB_TEST_IDS = {
  ADAPTIVE_BANNER: "ca-app-pub-3940256099942544/6300978111",
  INTERSTITIAL: "ca-app-pub-3940256099942544/1033173712",
  APP_OPEN: "ca-app-pub-3940256099942544/3419835294",
  REWARDED: "ca-app-pub-3940256099942544/5224354917",
};

const TEST = {
  android: {
    appId: "ca-app-pub-3940256099942544~3347511713",
    banner: GOOGLE_ADMOB_TEST_IDS.ADAPTIVE_BANNER,
    interstitial: GOOGLE_ADMOB_TEST_IDS.INTERSTITIAL,
    appOpen: GOOGLE_ADMOB_TEST_IDS.APP_OPEN,
    rewarded: GOOGLE_ADMOB_TEST_IDS.REWARDED,
  },
  ios: {
    appId: "ca-app-pub-3940256099942544~1458002511",
    banner: GOOGLE_ADMOB_TEST_IDS.ADAPTIVE_BANNER,
    interstitial: GOOGLE_ADMOB_TEST_IDS.INTERSTITIAL,
    appOpen: GOOGLE_ADMOB_TEST_IDS.APP_OPEN,
    rewarded: GOOGLE_ADMOB_TEST_IDS.REWARDED,
  },
};

const platform = Platform.OS === "ios" ? "ios" : "android";

function env(key) {
  const value = process.env[key];
  if (!value || String(value).trim().startsWith("@EXPO_PUBLIC_")) return null;
  return value && String(value).trim() ? String(value).trim() : null;
}

export const ADMOB_APP_IDS = {
  android: env("EXPO_PUBLIC_ADMOB_ANDROID_APP_ID") ?? TEST.android.appId,
  ios: env("EXPO_PUBLIC_ADMOB_IOS_APP_ID") ?? TEST.ios.appId,
};

export const ADMOB_UNITS = {
  banner:
    (platform === "ios"
      ? env("EXPO_PUBLIC_ADMOB_IOS_BANNER")
      : env("EXPO_PUBLIC_ADMOB_ANDROID_BANNER")) ?? TEST[platform].banner,
  interstitial:
    (platform === "ios"
      ? env("EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL")
      : env("EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL")) ??
    TEST[platform].interstitial,
  appOpen:
    (platform === "ios"
      ? env("EXPO_PUBLIC_ADMOB_IOS_APP_OPEN")
      : env("EXPO_PUBLIC_ADMOB_ANDROID_APP_OPEN")) ?? TEST[platform].appOpen,
  rewarded:
    (platform === "ios"
      ? env("EXPO_PUBLIC_ADMOB_IOS_REWARDED")
      : env("EXPO_PUBLIC_ADMOB_ANDROID_REWARDED")) ?? TEST[platform].rewarded,
};

/** Optional placement-specific banner units (fallback to ADMOB_UNITS.banner). */
export function getBannerUnitId(placement = "default") {
  const ios = platform === "ios";
  if (placement === "footer") {
    return (
      (ios
        ? env("EXPO_PUBLIC_ADMOB_IOS_BANNER_FOOTER")
        : env("EXPO_PUBLIC_ADMOB_ANDROID_BANNER_FOOTER")) ?? ADMOB_UNITS.banner
    );
  }
  if (placement === "inline") {
    return (
      (ios
        ? env("EXPO_PUBLIC_ADMOB_IOS_BANNER_INLINE")
        : env("EXPO_PUBLIC_ADMOB_ANDROID_BANNER_INLINE")) ?? ADMOB_UNITS.banner
    );
  }
  return ADMOB_UNITS.banner;
}

/** Interstitial after every N expense saves (shown after leaving Add Expense). */
export const EXPENSE_AD_EVERY_N = 6;

/** Interstitial when creating board N+1 (1 = after first board). */
export const FREE_BOARD_AD_AFTER_COUNT = 1;

/** Free plan: inline banner on these analytics periods (week stays ad-free). */
export const FREE_AD_ANALYTICS_PERIODS = ["month", "year", "all"];

/** Premium-surface placements when payments are off (unpaid users only). */
export const PREMIUM_FEATURE_AD_SURFACES = [
  "settlements",
  "analytics_footer",
  "export",
  "google_drive_backup",
  "board_settlements_entry",
];

export const LIST_AD_INTERVAL_TRANSACTIONS = 5;
export const LIST_AD_INTERVAL_BOARDS = 2;
export const LIST_AD_INTERVAL_CATEGORIES = 3;

/** Minimum gap between interstitial impressions (ms). */
export const INTERSTITIAL_COOLDOWN_MS = 5 * 60 * 1000;

/** Max full-screen interstitials per app session. */
export const MAX_INTERSTITIALS_PER_SESSION = 2;

/** App-open ad at most once per calendar day. */
export const APP_OPEN_MAX_PER_DAY = 1;

/** New users: banners only until grace ends (days AND expense count). */
export const NEW_USER_GRACE_DAYS = 7;
export const NEW_USER_GRACE_MAX_EXPENSES = 10;

/** Rewarded opt-in: hours of ad-free after watching one video. */
export const REWARDED_AD_FREE_HOURS = 24;

export function getAdMobAppId() {
  return Platform.OS === "ios" ? ADMOB_APP_IDS.ios : ADMOB_APP_IDS.android;
}

export function isUsingTestAdUnits() {
  return (
    ADMOB_UNITS.banner === GOOGLE_ADMOB_TEST_IDS.ADAPTIVE_BANNER ||
    ADMOB_UNITS.interstitial === GOOGLE_ADMOB_TEST_IDS.INTERSTITIAL
  );
}

export function shouldShowAnalyticsPeriodAd(isAdFree, period) {
  return !isAdFree && FREE_AD_ANALYTICS_PERIODS.includes(period);
}
