/** Canonical public website (Vercel). Use for all user-facing links. */
export const WEBSITE_URL = "https://trivense.vercel.app";

export const LEGAL_LINKS = {
  privacyPolicy: `${WEBSITE_URL}/privacy`,
  termsOfService: `${WEBSITE_URL}/terms`,
  advertisingPolicy: `${WEBSITE_URL}/ads`,
  support: "mailto:support@trivense.app",
};

export const STORE_LINKS = {
  website: WEBSITE_URL,
  androidPackage: "com.trivense.app",
  playStoreBase:
    "https://play.google.com/store/apps/details?id=com.trivense.app",
};

/** Play Store URL; optional invite code passed via install referrer on Android. */
export function buildPlayStoreUrl(referralCode) {
  const code = (referralCode || "").trim().toUpperCase();
  if (!code) return STORE_LINKS.playStoreBase;
  const referrer = encodeURIComponent(`invite=${code}`);
  return `${STORE_LINKS.playStoreBase}&referrer=${referrer}`;
}

/** Public landing link — opens app if installed, otherwise redirects to Play Store. */
export function buildReferralShareUrl(referralCode) {
  const code = encodeURIComponent((referralCode || "").trim().toUpperCase());
  return `${STORE_LINKS.website}/download?invite=${code}`;
}

export function buildBoardJoinUrl(boardCode) {
  const code = encodeURIComponent(String(boardCode || "").trim());
  return `${WEBSITE_URL}/join/${code}`;
}

export function buildReferralDeepLink(referralCode) {
  const code = encodeURIComponent((referralCode || "").trim().toUpperCase());
  return `trivense://invite/${code}`;
}
