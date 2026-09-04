#!/usr/bin/env node
/**
 * Sync production build env vars from .env to EAS (non-interactive).
 * Run: node scripts/sync-eas-production-env.js
 */
require("dotenv").config();
const { execFileSync } = require("child_process");

function easEnvUpsert(name, value, visibility) {
  const baseArgs = [
    "eas-cli",
    "env:update",
    "production",
    `--variable-name=${name}`,
    "--variable-environment=production",
    `--value=${value}`,
    `--visibility=${visibility}`,
    "--non-interactive",
  ];
  try {
    execFileSync("npx", baseArgs, { stdio: "pipe" });
    return;
  } catch (updateErr) {
    execFileSync(
      "npx",
      [
        "eas-cli",
        "env:create",
        "production",
        `--name=${name}`,
        `--value=${value}`,
        "--type=string",
        `--visibility=${visibility}`,
        "--force",
        "--non-interactive",
      ],
      { stdio: "pipe" }
    );
  }
}

const KEYS = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
  "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY",
  "EXPO_PUBLIC_REVENUECAT_TEST_API_KEY",
  "EXPO_PUBLIC_SENTRY_DSN",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
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

const SENSITIVE = new Set([
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SENTRY_DSN",
]);

function visibilityFor(name) {
  if (SENSITIVE.has(name)) return "secret";
  return "plaintext";
}

let synced = 0;
let skipped = 0;

for (const name of KEYS) {
  const value = process.env[name];
  if (!value || value.includes("your_") || value.includes("xxxxxxxx")) {
    console.log(`○ skip ${name} (not set locally)`);
    skipped += 1;
    continue;
  }

  const visibility = visibilityFor(name);
  try {
    easEnvUpsert(name, value, visibility);
    console.log(`✓ ${name}`);
    synced += 1;
  } catch (err) {
    const msg = err.stderr?.toString() || err.message;
    console.error(`✗ ${name}: ${msg.trim()}`);
    process.exitCode = 1;
  }
}

console.log(`\nSynced ${synced}, skipped ${skipped}`);
