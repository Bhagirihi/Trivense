#!/usr/bin/env node
/**
 * AdMob setup checklist for Trivense (console app id: 5149530682).
 *
 * https://admob.google.com/v2/apps/5149530682/overview
 */

const AD_UNITS = [
  {
    type: "Banner",
    format: "Adaptive banner",
    placement: "Home, Analytics, Settings (above tab bar)",
    envAndroid: "EXPO_PUBLIC_ADMOB_ANDROID_BANNER",
    envIos: "EXPO_PUBLIC_ADMOB_IOS_BANNER",
  },
  {
    type: "Interstitial",
    format: "Full screen",
    placement: "After creating a board (free) · every 3 expense saves (free) · app open on launch",
    envAndroid: "EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL",
    envIos: "EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL",
  },
  {
    type: "App open",
    format: "App open",
    placement: "Once per cold start (free users)",
    envAndroid: "EXPO_PUBLIC_ADMOB_ANDROID_APP_OPEN",
    envIos: "EXPO_PUBLIC_ADMOB_IOS_APP_OPEN",
  },
];

console.log(`
Trivense AdMob setup
════════════════════

Console: https://admob.google.com/v2/apps/5149530682/adunits/list
Package: com.trivense.app
Firebase: trivense-app-prod

── CREATE AD UNITS (do this in the browser) ──

  1. Open ad units list → click "Add ad unit" (or "Get started")

  2. BANNER
     • Format: Banner
     • Name:  Trivense Banner Home
     • Copy ad unit ID → EXPO_PUBLIC_ADMOB_ANDROID_BANNER

  3. INTERSTITIAL
     • Format: Interstitial
     • Name:  Trivense Interstitial Expense
     • Copy ad unit ID → EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL

  4. APP OPEN
     • Format: App open
     • Name:  Trivense App Open
     • Copy ad unit ID → EXPO_PUBLIC_ADMOB_ANDROID_APP_OPEN

  5. APP ID (App settings → App ID, format ca-app-pub-…~…)
     → EXPO_PUBLIC_ADMOB_ANDROID_APP_ID

  6. Paste all into .env then verify:
     node scripts/apply-admob-env.js

  7. Rebuild: eas build --profile production --platform android

Premium users never see ads (RevenueCat entitlement: premium).
Until IDs are set, Google test ads are used automatically.
`);
