#!/usr/bin/env node
/**
 * Pre-release QA for Trivense Play internal testing.
 * Run: npm run qa:preflight
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
let failed = 0;
let warned = 0;

function pass(msg) {
  console.log(`✓ ${msg}`);
}

function fail(msg) {
  console.log(`✗ ${msg}`);
  failed += 1;
}

function warn(msg) {
  console.log(`○ ${msg}`);
  warned += 1;
}

function fileExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function envOk(key, { optional = false, pattern } = {}) {
  const v = process.env[key];
  const set =
    v &&
    !v.includes("your_") &&
    !v.includes("YOUR_") &&
    !v.includes("xxxxxxxx") &&
    !String(v).startsWith("@EXPO_PUBLIC_");
  const valid = set && (!pattern || pattern.test(v));
  if (valid) pass(`${key} configured`);
  else if (optional) warn(`${key} not set (optional)`);
  else fail(`${key} missing or placeholder`);
  return valid;
}

console.log("\nTrivense pre-release QA\n" + "═".repeat(44));

// ── Project health ──────────────────────────────────────────────────────────
try {
  execSync("npx expo-doctor", { cwd: ROOT, stdio: "pipe" });
  pass("expo-doctor (all checks)");
} catch (err) {
  const out = String(err.stdout || err.stderr || "");
  if (out.includes("Check for app config fields that may not be synced")) {
    warn("expo-doctor: prebuild/CNG sync note (expected with committed android/ folder)");
  } else {
    fail("expo-doctor reported issues — run: npx expo-doctor");
  }
}

// ── Core config files ───────────────────────────────────────────────────────
const requiredFiles = [
  "app.config.js",
  "eas.json",
  "firebase/google-services.json",
  "store-assets/listing/manifest.json",
  "store-assets/listing/LISTING_SPECS.md",
  "store-assets/listing/app-icon/app_icon_512.png",
  "store-assets/listing/feature-graphic/feature_graphic_1024x500.png",
  "store-assets/listing/screenshots/android/screenshot_01_split_expenses.png",
  "store-assets/listing/screenshots/android/screenshot_08_premium.png",
  "website/src/app/privacy/page.tsx",
  "website/src/app/terms/page.tsx",
];
for (const f of requiredFiles) {
  if (fileExists(f)) pass(`File: ${f}`);
  else fail(`Missing: ${f}`);
}

// Legacy play/ copies (optional — upload uses store-assets/listing/)
if (fileExists("store-assets/play/app_icon_512.png")) {
  pass("File: store-assets/play/app_icon_512.png (legacy copy)");
} else {
  warn("store-assets/play/app_icon_512.png missing (optional legacy copy)");
}

// ── Local env (dev) ─────────────────────────────────────────────────────────
envOk("EXPO_PUBLIC_SUPABASE_URL", { pattern: /^https:\/\/.+\.supabase\.co/ });
envOk("EXPO_PUBLIC_SUPABASE_ANON_KEY", { pattern: /^eyJ/ });

const supabaseRef = process.env.EXPO_PUBLIC_SUPABASE_URL?.match(
  /https:\/\/([^.]+)\.supabase\.co/
)?.[1];
const expectedRef = "pvuybefxxtjwxpqhmgkw";
if (supabaseRef === expectedRef) {
  pass(`Supabase project ref matches Trivense (${expectedRef})`);
} else if (supabaseRef) {
  fail(
    `EXPO_PUBLIC_SUPABASE_URL uses "${supabaseRef}" — expected "${expectedRef}". Google login and auth will fail until you fix EAS env and rebuild.`
  );
}
envOk("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY", { pattern: /^goog_/ });
envOk("EXPO_PUBLIC_SENTRY_DSN", { optional: true, pattern: /^https:\/\// });
envOk("EXPO_PUBLIC_ADMOB_ANDROID_APP_ID", {
  optional: true,
  pattern: /^ca-app-pub-/,
});
envOk("EXPO_PUBLIC_ADMOB_ANDROID_REWARDED", {
  optional: true,
  pattern: /^ca-app-pub-/,
});

// ── Play / submit ───────────────────────────────────────────────────────────
const saPath = ".cursor/mcp-servers/google-play/credentials/service_account.json";
if (fileExists(saPath)) pass("Play API service account present");
else warn(`Play API credentials missing — run: bash scripts/setup-google-play-api.sh`);

if (fileExists("google-play-service-account.json")) pass("EAS submit service account linked");
else warn("google-play-service-account.json missing (needed for eas submit)");

// ── eas.json sanity ─────────────────────────────────────────────────────────
const eas = JSON.parse(fs.readFileSync(path.join(ROOT, "eas.json"), "utf8"));
const prodEnv = eas?.build?.production?.env || {};
const envKeys = Object.keys(prodEnv);
const badRefs = envKeys.filter((k) => String(prodEnv[k]).startsWith("@") && !prodEnv[k].includes("_"));
if (envKeys.length > 0) {
  pass(`eas.json production env: ${envKeys.length} EAS secret refs`);
} else {
  pass("eas.json production env: using EAS dashboard only");
}

// ── App config ──────────────────────────────────────────────────────────────
const appConfig = fs.readFileSync(path.join(ROOT, "app.config.js"), "utf8");
if (appConfig.includes('package: "com.trivense.app"')) pass("Android package: com.trivense.app");
else fail("Android package name mismatch");

if (appConfig.includes("googleServicesFile")) pass("Firebase google-services.json wired");
else warn("googleServicesFile not in app.config.js");

if (appConfig.includes("expo-image-picker")) pass("expo-image-picker plugin configured");
else warn("expo-image-picker plugin missing");

if (!appConfig.includes("versionCode:")) pass("versionCode managed by EAS remote");
else warn("Remove android.versionCode from app.config (EAS remote source)");

// ── Summary ─────────────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(44));
if (failed === 0) {
  console.log(`QA passed with ${warned} warning(s).`);
  if (warned > 0) {
    console.log("\nNext:");
    console.log("  1. bash scripts/setup-google-play-api.sh  (Play API)");
    console.log("  2. eas build -p android --profile production");
    console.log("  3. npm run setup:play  (listing + subscriptions + submit)");
  }
} else {
  console.log(`QA failed: ${failed} error(s), ${warned} warning(s).`);
  process.exit(1);
}
