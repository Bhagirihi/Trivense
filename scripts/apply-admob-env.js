#!/usr/bin/env node
/**
 * Apply AdMob ad unit IDs from .env and verify configuration.
 * After creating units in AdMob console, paste IDs into .env then run:
 *   node scripts/apply-admob-env.js
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env");
const EXAMPLE_PATH = path.join(ROOT, ".env.example");

const KEYS = [
  "EXPO_PUBLIC_ADMOB_ANDROID_APP_ID",
  "EXPO_PUBLIC_ADMOB_IOS_APP_ID",
  "EXPO_PUBLIC_ADMOB_ANDROID_BANNER",
  "EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL",
  "EXPO_PUBLIC_ADMOB_ANDROID_APP_OPEN",
  "EXPO_PUBLIC_ADMOB_ANDROID_REWARDED",
  "EXPO_PUBLIC_ADMOB_ANDROID_BANNER_FOOTER",
  "EXPO_PUBLIC_ADMOB_ANDROID_BANNER_INLINE",
  "EXPO_PUBLIC_ADMOB_IOS_BANNER",
  "EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL",
  "EXPO_PUBLIC_ADMOB_IOS_APP_OPEN",
  "EXPO_PUBLIC_ADMOB_IOS_REWARDED",
  "EXPO_PUBLIC_ADMOB_IOS_BANNER_FOOTER",
  "EXPO_PUBLIC_ADMOB_IOS_BANNER_INLINE",
];

function isRealId(value) {
  return (
    value &&
    /^ca-app-pub-\d+/.test(value) &&
    !value.includes("xxxxxxxx")
  );
}

console.log("\nTrivense AdMob configuration check\n" + "─".repeat(44));

let configured = 0;
for (const key of KEYS) {
  const value = process.env[key];
  const ok = isRealId(value);
  if (ok) configured += 1;
  console.log(`${ok ? "✓" : "○"} ${key}`);
  if (ok) console.log(`  ${value}`);
}

console.log(`\n${configured}/${KEYS.length} production IDs set in .env`);

if (configured === 0) {
  console.log(`
No production IDs yet — Google TEST ads are used in dev builds.

Create ad units here (opened in browser if you ran setup:admob):
  https://admob.google.com/v2/apps/5149530682/adunits/list

Steps:
  1. Click "Add ad unit"
  2. Create Banner      → name: Trivense Banner Home
  3. Create Interstitial → name: Trivense Interstitial Expense
  4. Create App open    → name: Trivense App Open
  5. Copy App ID from App settings → EXPO_PUBLIC_ADMOB_ANDROID_APP_ID
  6. Copy each unit ID into .env (see .env.example)
  7. Re-run: node scripts/apply-admob-env.js
`);
  process.exit(0);
}

if (!fs.existsSync(ENV_PATH)) {
  console.log("\nTip: copy .env.example → .env first.\n");
}

console.log("\nRebuild native app after updating .env:\n  eas build --profile production --platform android\n");
