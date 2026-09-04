export const WEBSITE_URL = "https://trivense.vercel.app";

export const ANDROID_PACKAGE = "com.trivense.app";

export const PLAY_STORE_BASE =
  "https://play.google.com/store/apps/details?id=com.trivense.app";

export function buildPlayStoreUrl(referralCode?: string | null) {
  const code = referralCode?.trim().toUpperCase();
  if (!code) return PLAY_STORE_BASE;
  const referrer = encodeURIComponent(`invite=${code}`);
  return `${PLAY_STORE_BASE}&referrer=${referrer}`;
}

/** Android: try native app first, fall back to Play Store with referral. */
export function buildAndroidAppIntentUrl(referralCode: string) {
  const code = encodeURIComponent(referralCode.trim().toUpperCase());
  const fallback = encodeURIComponent(buildPlayStoreUrl(referralCode));
  return `intent://invite/${code}#Intent;scheme=trivense;package=${ANDROID_PACKAGE};S.browser_fallback_url=${fallback};end`;
}

export function buildReferralDownloadUrl(referralCode: string) {
  const code = encodeURIComponent(referralCode.trim().toUpperCase());
  return `${WEBSITE_URL}/download?invite=${code}`;
}

/** Normalize board share codes for display and deep links. */
export function normalizeBoardCode(boardCode?: string | null) {
  return String(boardCode || "").trim();
}

/** Custom-scheme deep link handled by the app (`/join/` path segment). */
export function buildJoinDeepLink(boardCode: string) {
  const code = encodeURIComponent(normalizeBoardCode(boardCode));
  return `trivense://join/${code}`;
}

/** Public web join URL shared from the mobile app. */
export function buildBoardJoinWebUrl(boardCode: string) {
  const code = encodeURIComponent(normalizeBoardCode(boardCode));
  return `${WEBSITE_URL}/join/${code}`;
}

/**
 * Android: try the native app with the board code, then fall back to Play Store.
 * The app parses any URL containing `/join/{code}`.
 */
export function buildAndroidJoinIntentUrl(boardCode: string) {
  const code = encodeURIComponent(normalizeBoardCode(boardCode));
  const fallback = encodeURIComponent(PLAY_STORE_BASE);
  return `intent://join/${code}#Intent;scheme=trivense;package=${ANDROID_PACKAGE};S.browser_fallback_url=${fallback};end`;
}
