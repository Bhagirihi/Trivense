#!/usr/bin/env node
/**
 * Print Trivense external-service setup status and next steps.
 * Run: node scripts/print-setup-status.js
 */

require("dotenv").config();

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

const checks = [
  {
    name: "Supabase — Trivense project (pvuybefxxtjwxpqhmgkw)",
    ok: false,
    detail: "Project paused/unreachable — restore at dashboard then npm run setup:supabase",
    url: "https://supabase.com/dashboard/project/pvuybefxxtjwxpqhmgkw",
  },
  {
    name: "RevenueCat — Trivense project",
    ok: true,
    detail: "proj2d578859 · entitlement premium · offering default · webhook → Supabase",
    url: "https://app.revenuecat.com/projects/proj2d578859",
  },
  {
    name: "RevenueCat — iOS SDK key",
    ok: true,
    detail: "appl_zAcnKrQHwmEZBckJSWcHFTTTywd (add to .env)",
  },
  {
    name: "RevenueCat — Android SDK key",
    ok: true,
    detail: "goog_yEuXEgHvGCpioYQwECAhRiQAhFM (add to .env)",
  },
  {
    name: "RevenueCat — Test Store key",
    ok: true,
    detail: "test_IGvFDXFXmmGKdvrwdPuGhNfuIIy (dev builds · premium USD/EUR/GBP pricing synced)",
  },
  {
    name: "RevenueCat — tiered pricing sync",
    ok: true,
    detail: "Test Store + Play via npm run sync:revenuecat-pricing (needs REVENUECAT_API_V2_KEY)",
    url: "https://app.revenuecat.com/projects/proj2d578859/settings/service-account",
  },
  {
    name: "RevenueCat — Google Play credentials",
    ok: false,
    detail: "Link Play service account in Project Settings → Google Play for dashboard store-state sync",
    url: "https://app.revenuecat.com/projects/proj2d578859/settings/service-account",
  },
  {
    name: "Firebase — trivense-app-prod",
    ok: fs.existsSync(path.join(ROOT, "firebase/google-services.json")),
    detail: "Android + iOS apps registered · com.trivense.app",
    url: "https://console.firebase.google.com/project/trivense-app-prod/overview",
  },
  {
    name: "Firebase — google-services.json",
    ok: fs.existsSync(path.join(ROOT, "firebase/google-services.json")),
    detail: "firebase/google-services.json",
  },
  {
    name: "Firebase — GoogleService-Info.plist",
    ok: fs.existsSync(path.join(ROOT, "firebase/GoogleService-Info.plist")),
    detail: "firebase/GoogleService-Info.plist",
  },
  {
    name: "Sentry — Trivense Mobile",
    ok: Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
    detail: "rasoi-app / trivense-mobile · npm run setup:sentry",
    url: "https://rasoi-app.sentry.io/projects/trivense-mobile/",
  },
  {
    name: "AdMob MCP — Cursor",
    ok: fs.existsSync(
      path.join(ROOT, ".cursor/mcp-servers/admob-mcp/dist/src/index.js")
    ),
    detail: "npm run setup:admob-mcp · list apps, ad units, revenue reports",
    url: "https://github.com/willhou/admob-mcp",
  },
  {
    name: "AdMob — Trivense app",
    ok: Boolean(process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID),
    detail:
      "App 5149530682 · Banner + Interstitial + App open (npm run setup:admob)",
    url: "https://admob.google.com/v2/apps/5149530682/overview",
    manual: !process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID,
  },
  {
    name: "Play Store assets",
    ok: fs.existsSync(path.join(ROOT, "store-assets/play/app_icon_512.png")),
    detail: "store-assets/play/ + store-assets/promo/ (9 banners @ 1024×682)",
  },
  {
    name: "Play Console API credentials",
    ok: fs.existsSync(
      path.join(ROOT, ".cursor/mcp-servers/google-play/credentials/service_account.json")
    ),
    detail:
      "Save service account JSON → .cursor/mcp-servers/google-play/credentials/service_account.json · then npm run setup:play",
    url: "https://play.google.com/console/u/3/developers/5766759369200444867/users-and-permissions",
    manual: !fs.existsSync(
      path.join(ROOT, ".cursor/mcp-servers/google-play/credentials/service_account.json")
    ),
  },
  {
    name: "Privacy & Terms pages",
    ok: fs.existsSync(path.join(ROOT, "website/src/app/privacy/page.tsx")),
    detail: "Live: trivense.vercel.app · also trivenseapp.vercel.app · target custom domain trivense.app",
    url: "https://trivense.vercel.app/privacy",
  },
  {
    name: "Play Console subscriptions",
    ok: false,
    detail: "Create trivense_monthly + trivense_yearly (base plans monthly/yearly)",
    manual: true,
  },
  {
    name: "Local .env file",
    ok: fs.existsSync(path.join(ROOT, ".env")),
    detail: "Copy .env.example → .env and fill Supabase + Sentry",
  },
];

console.log("\nTrivense external services status\n" + "─".repeat(50));

for (const c of checks) {
  const icon = c.ok ? "✓" : c.manual ? "○" : "✗";
  console.log(`${icon} ${c.name}`);
  console.log(`  ${c.detail}`);
  if (c.url) console.log(`  ${c.url}`);
}

console.log("\nNext steps (manual — require your login):\n");
console.log("1. Restore Supabase: npm run setup:supabase");
console.log("2. AdMob iOS: register com.trivense.app and create iOS ad units");
console.log("3. AdMob MCP OAuth (optional): npm run setup:admob-mcp");
console.log("3. Play Console: Upload assets from store-assets/play/, paste listing.json copy");
console.log("4. Play Console → Monetize → Subscriptions: trivense_monthly, trivense_yearly");
console.log("5. RevenueCat: Link Play service credentials (Settings → Google Play)");
console.log("6. Copy .env.example to .env and add Supabase keys\n");
