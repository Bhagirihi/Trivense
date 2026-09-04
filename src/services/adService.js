import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ADMOB_UNITS,
  EXPENSE_AD_EVERY_N,
  FREE_BOARD_AD_AFTER_COUNT,
  INTERSTITIAL_COOLDOWN_MS,
  MAX_INTERSTITIALS_PER_SESSION,
  NEW_USER_GRACE_DAYS,
  NEW_USER_GRACE_MAX_EXPENSES,
  REWARDED_AD_FREE_HOURS,
} from "../config/admob";
import { devError } from "../utils/logger";
import { loadNativeModule } from "../utils/lazyNativeModule";
import { hasCustomNativeModules } from "../utils/nativeRuntime";

const STORAGE = {
  EXPENSE_COUNT: "@trivense/ad_expense_add_count",
  INSTALL_AT: "@trivense/ad_install_at",
  REWARDED_FREE_UNTIL: "@trivense/ad_rewarded_free_until",
  LAST_INTERSTITIAL_AT: "@trivense/ad_last_interstitial_at",
  APP_OPEN_DAY: "@trivense/ad_last_app_open_day",
  SESSION_INTERSTITIALS: "@trivense/ad_session_interstitial_count",
};

let initialized = false;
let initPromise = null;
let interstitial = null;
let interstitialLoaded = false;
let appOpen = null;
let appOpenLoaded = false;
let rewarded = null;
let rewardedLoaded = false;
let adsModule = null;
let sessionInterstitialCount = 0;

function isNativeAdsSupported() {
  return hasCustomNativeModules();
}

async function getAdsModule() {
  if (adsModule) return adsModule;
  adsModule = await loadNativeModule(
    () => import("react-native-google-mobile-ads"),
    "google-mobile-ads",
  );
  return adsModule;
}

export function isAdMobAvailable() {
  return isNativeAdsSupported();
}

async function ensureInstallRecorded() {
  const existing = await AsyncStorage.getItem(STORAGE.INSTALL_AT);
  if (existing) return parseInt(existing, 10);
  const now = String(Date.now());
  await AsyncStorage.setItem(STORAGE.INSTALL_AT, now);
  return parseInt(now, 10);
}

export async function getRewardedAdFreeUntil() {
  const raw = await AsyncStorage.getItem(STORAGE.REWARDED_FREE_UNTIL);
  if (!raw) return null;
  const until = parseInt(raw, 10);
  if (!until || until <= Date.now()) {
    await AsyncStorage.removeItem(STORAGE.REWARDED_FREE_UNTIL);
    return null;
  }
  return until;
}

export async function isRewardedAdFreeActive() {
  return (await getRewardedAdFreeUntil()) != null;
}

export async function grantRewardedAdFree(hours = REWARDED_AD_FREE_HOURS) {
  const until = Date.now() + hours * 60 * 60 * 1000;
  await AsyncStorage.setItem(STORAGE.REWARDED_FREE_UNTIL, String(until));
  return until;
}

export async function getExpenseSaveCount() {
  const raw = await AsyncStorage.getItem(STORAGE.EXPENSE_COUNT);
  return parseInt(raw, 10) || 0;
}

export async function isInNewUserGracePeriod(isAdFree) {
  if (isAdFree) return false;

  const installAt = await ensureInstallRecorded();
  const daysSince = (Date.now() - installAt) / (24 * 60 * 60 * 1000);
  const expenseCount = await getExpenseSaveCount();

  return (
    daysSince < NEW_USER_GRACE_DAYS &&
    expenseCount < NEW_USER_GRACE_MAX_EXPENSES
  );
}

/**
 * Visibility flags for banners vs full-screen formats.
 */
export async function getAdVisibilityState(isAdFree) {
  if (isAdFree || !isNativeAdsSupported()) {
    return {
      showBannerAds: false,
      showInterstitialAds: false,
      showAppOpenAds: false,
      inGracePeriod: false,
      rewardedAdFreeUntil: null,
    };
  }

  const rewardedAdFreeUntil = await getRewardedAdFreeUntil();
  if (rewardedAdFreeUntil) {
    return {
      showBannerAds: false,
      showInterstitialAds: false,
      showAppOpenAds: false,
      inGracePeriod: false,
      rewardedAdFreeUntil,
    };
  }

  const inGracePeriod = await isInNewUserGracePeriod(false);

  return {
    showBannerAds: true,
    showInterstitialAds: !inGracePeriod,
    showAppOpenAds: !inGracePeriod,
    inGracePeriod,
    rewardedAdFreeUntil: null,
  };
}

async function getLastInterstitialAt() {
  const raw = await AsyncStorage.getItem(STORAGE.LAST_INTERSTITIAL_AT);
  return parseInt(raw, 10) || 0;
}

async function recordInterstitialShown() {
  sessionInterstitialCount += 1;
  await AsyncStorage.setItem(
    STORAGE.LAST_INTERSTITIAL_AT,
    String(Date.now()),
  );
  await AsyncStorage.setItem(
    STORAGE.SESSION_INTERSTITIALS,
    String(sessionInterstitialCount),
  );
}

export async function canShowInterstitial(isAdFree) {
  const visibility = await getAdVisibilityState(isAdFree);
  if (!visibility.showInterstitialAds) return false;
  if (sessionInterstitialCount >= MAX_INTERSTITIALS_PER_SESSION) return false;

  const lastAt = await getLastInterstitialAt();
  if (Date.now() - lastAt < INTERSTITIAL_COOLDOWN_MS) return false;

  return true;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function canShowAppOpenToday(isAdFree) {
  const visibility = await getAdVisibilityState(isAdFree);
  if (!visibility.showAppOpenAds) return false;

  const lastDay = await AsyncStorage.getItem(STORAGE.APP_OPEN_DAY);
  return lastDay !== todayKey();
}

async function recordAppOpenShown() {
  await AsyncStorage.setItem(STORAGE.APP_OPEN_DAY, todayKey());
}

export async function initializeAds() {
  if (!isNativeAdsSupported()) return false;
  if (initialized) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await ensureInstallRecorded();
      const mod = await getAdsModule();
      if (!mod?.default) return false;

      await mod.default().initialize();
      initialized = true;
      preloadInterstitial();
      preloadAppOpen();
      preloadRewarded();
      return true;
    } catch (error) {
      devError("AdMob initialize failed:", error?.message || error);
      return false;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

async function preloadInterstitial() {
  if (!isNativeAdsSupported()) return;

  const mod = await getAdsModule();
  if (!mod?.InterstitialAd || !mod?.AdEventType) return;

  interstitial = mod.InterstitialAd.createForAdRequest(
    ADMOB_UNITS.interstitial,
    { requestNonPersonalizedAdsOnly: false },
  );

  interstitial.addAdEventListener(mod.AdEventType.LOADED, () => {
    interstitialLoaded = true;
  });

  interstitial.addAdEventListener(mod.AdEventType.CLOSED, () => {
    interstitialLoaded = false;
    preloadInterstitial();
  });

  interstitial.addAdEventListener(mod.AdEventType.ERROR, () => {
    interstitialLoaded = false;
  });

  interstitial.load();
}

async function preloadAppOpen() {
  if (!isNativeAdsSupported()) return;

  const mod = await getAdsModule();
  if (!mod?.AppOpenAd || !mod?.AdEventType) return;

  appOpen = mod.AppOpenAd.createForAdRequest(ADMOB_UNITS.appOpen, {
    requestNonPersonalizedAdsOnly: false,
  });

  appOpen.addAdEventListener(mod.AdEventType.LOADED, () => {
    appOpenLoaded = true;
  });

  appOpen.addAdEventListener(mod.AdEventType.CLOSED, () => {
    appOpenLoaded = false;
    preloadAppOpen();
  });

  appOpen.addAdEventListener(mod.AdEventType.ERROR, () => {
    appOpenLoaded = false;
  });

  appOpen.load();
}

async function preloadRewarded() {
  if (!isNativeAdsSupported()) return;

  const mod = await getAdsModule();
  if (!mod?.RewardedAd || !mod?.RewardedAdEventType || !mod?.AdEventType) return;

  rewarded = mod.RewardedAd.createForAdRequest(ADMOB_UNITS.rewarded, {
    requestNonPersonalizedAdsOnly: false,
  });

  rewarded.addAdEventListener(mod.RewardedAdEventType.LOADED, () => {
    rewardedLoaded = true;
  });

  rewarded.addAdEventListener(mod.AdEventType.CLOSED, () => {
    rewardedLoaded = false;
    preloadRewarded();
  });

  rewarded.addAdEventListener(mod.AdEventType.ERROR, () => {
    rewardedLoaded = false;
  });

  rewarded.load();
}

export async function showInterstitialIfReady(isAdFree) {
  if (!(await canShowInterstitial(isAdFree))) return false;
  if (!isNativeAdsSupported() || !initialized) return false;

  if (!interstitialLoaded || !interstitial) {
    preloadInterstitial();
    return false;
  }

  try {
    await interstitial.show();
    await recordInterstitialShown();
    interstitialLoaded = false;
    return true;
  } catch (error) {
    devError("Interstitial show failed:", error?.message || error);
    return false;
  }
}

export async function showAppOpenIfReady(isAdFree) {
  if (!(await canShowAppOpenToday(isAdFree))) return false;
  if (!isNativeAdsSupported() || !initialized) return false;

  if (!appOpenLoaded || !appOpen) {
    preloadAppOpen();
    return false;
  }

  try {
    await appOpen.show();
    await recordAppOpenShown();
    appOpenLoaded = false;
    return true;
  } catch (error) {
    devError("App open ad failed:", error?.message || error);
    return false;
  }
}

/** Returns true if an interstitial should run after navigating back from Add Expense. */
export async function registerExpenseSaveForAd(isAdFree) {
  if (isAdFree || !isNativeAdsSupported()) return false;

  try {
    const nextCount = (await getExpenseSaveCount()) + 1;
    await AsyncStorage.setItem(STORAGE.EXPENSE_COUNT, String(nextCount));

    if (nextCount % EXPENSE_AD_EVERY_N !== 0) return false;
    return canShowInterstitial(isAdFree);
  } catch (error) {
    devError("Expense ad counter failed:", error?.message || error);
    return false;
  }
}

/** Call after navigation.goBack() from a successful expense save. */
export async function showExpenseInterstitialAfterLeave(isAdFree) {
  await initializeAds();
  return showInterstitialIfReady(isAdFree);
}

export async function shouldShowBoardCreateInterstitial(
  isAdFree,
  ownedBoardCount = 0,
) {
  if (isAdFree) return false;
  if (ownedBoardCount < FREE_BOARD_AD_AFTER_COUNT) return false;
  return canShowInterstitial(isAdFree);
}

export async function showInterstitialAfterBoardCreate(
  isAdFree,
  ownedBoardCount = 0,
) {
  if (!(await shouldShowBoardCreateInterstitial(isAdFree, ownedBoardCount))) {
    return false;
  }
  await initializeAds();
  return showInterstitialIfReady(isAdFree);
}

/** Pre-action interstitial on export/backup when payments are off (unpaid only). */
export async function shouldShowPremiumActionInterstitial(isAdFree, paymentsEnabled) {
  if (isAdFree || paymentsEnabled || !isNativeAdsSupported()) return false;
  return canShowInterstitial(isAdFree);
}

export async function showPremiumActionInterstitialIfReady(isAdFree, paymentsEnabled) {
  if (!(await shouldShowPremiumActionInterstitial(isAdFree, paymentsEnabled))) {
    return false;
  }
  await initializeAds();
  return showInterstitialIfReady(isAdFree);
}

export async function showRewardedAdForTemporaryAdFree() {
  if (!isNativeAdsSupported()) {
    throw new Error("Ads are not available in this build");
  }

  await initializeAds();
  const mod = await getAdsModule();
  if (!mod?.RewardedAd || !mod?.RewardedAdEventType) {
    throw new Error("Rewarded ads are not supported");
  }

  if (!rewardedLoaded || !rewarded) {
    preloadRewarded();
    throw new Error("Rewarded ad is still loading. Try again in a moment.");
  }

  return new Promise((resolve, reject) => {
    let earned = false;

    const unsubEarned = rewarded.addAdEventListener(
      mod.RewardedAdEventType.EARNED_REWARD,
      async () => {
        earned = true;
        const until = await grantRewardedAdFree();
        unsubEarned?.();
        unsubClosed?.();
        resolve({ until, hours: REWARDED_AD_FREE_HOURS });
      },
    );

    const unsubClosed = rewarded.addAdEventListener(mod.AdEventType.CLOSED, () => {
      unsubEarned?.();
      unsubClosed?.();
      rewardedLoaded = false;
      preloadRewarded();
      if (!earned) {
        reject(new Error("Rewarded ad closed before completion"));
      }
    });

    rewarded.show().catch((error) => {
      unsubEarned?.();
      unsubClosed?.();
      reject(error);
    });
  });
}

/** For upsell after heavy ad exposure in one session. */
export function getSessionInterstitialCount() {
  return sessionInterstitialCount;
}
