import AsyncStorage from "@react-native-async-storage/async-storage";
import { WEBSITE_URL } from "../config/appLinks";

const PENDING_REFERRAL_KEY = "@trivense/pending_referral_code";
const APPLIED_REFERRAL_KEY = "@trivense/applied_referral_for_user";

export function normalizeReferralCode(code) {
  return (code || "").trim().toUpperCase();
}

export async function setPendingReferralCode(code) {
  const normalized = normalizeReferralCode(code);
  if (!normalized) {
    await AsyncStorage.removeItem(PENDING_REFERRAL_KEY);
    return;
  }
  await AsyncStorage.setItem(PENDING_REFERRAL_KEY, normalized);
}

export async function getPendingReferralCode() {
  const value = await AsyncStorage.getItem(PENDING_REFERRAL_KEY);
  return normalizeReferralCode(value);
}

export async function clearPendingReferralCode() {
  await AsyncStorage.removeItem(PENDING_REFERRAL_KEY);
}

export async function markReferralAppliedForUser(userId) {
  if (!userId) return;
  await AsyncStorage.setItem(APPLIED_REFERRAL_KEY, userId);
}

export async function hasAppliedReferralForUser(userId) {
  if (!userId) return false;
  const stored = await AsyncStorage.getItem(APPLIED_REFERRAL_KEY);
  return stored === userId;
}

export function extractReferralCodeFromUrl(url) {
  if (!url) return null;

  try {
    const parsed = new URL(
      url.replace(/^trivense:\/\//, `${WEBSITE_URL}/`)
    );
    const fromQuery =
      parsed.searchParams.get("invite") ||
      parsed.searchParams.get("referral") ||
      parsed.searchParams.get("code");
    if (fromQuery) return normalizeReferralCode(fromQuery);
  } catch {
    // fall through to regex
  }

  const inviteMatch = url.match(/[?&]invite=([^&]+)/i);
  if (inviteMatch?.[1]) return normalizeReferralCode(decodeURIComponent(inviteMatch[1]));

  const pathMatch = url.match(/\/invite\/([^/?#]+)/i);
  if (pathMatch?.[1]) return normalizeReferralCode(decodeURIComponent(pathMatch[1]));

  return null;
}
