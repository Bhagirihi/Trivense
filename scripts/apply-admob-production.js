#!/usr/bin/env node
/**
 * Apply production AdMob unit IDs (created in AdMob console for Trivense Android).
 * Run: node scripts/apply-admob-production.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env");
const ADMOB_ENV_PATH = path.join(ROOT, ".cursor/mcp-servers/admob/.env");

const ANDROID_APP_ID = "ca-app-pub-4173581536398147~5149530682";

const PRODUCTION = {
  EXPO_PUBLIC_ADMOB_ANDROID_APP_ID: ANDROID_APP_ID,
  EXPO_PUBLIC_ADMOB_ANDROID_BANNER: "ca-app-pub-4173581536398147/5347458345",
  EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL: "ca-app-pub-4173581536398147/6514602727",
  EXPO_PUBLIC_ADMOB_ANDROID_APP_OPEN: "ca-app-pub-4173581536398147/1509688055",
};

function upsertEnvFile(filePath, entries) {
  let lines = [];
  if (fs.existsSync(filePath)) {
    lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    if (lines.at(-1) === "") lines.pop();
  }

  for (const [key, value] of Object.entries(entries)) {
    let found = false;
    lines = lines.map((line) => {
      if (line.startsWith(`${key}=`)) {
        found = true;
        return `${key}=${value}`;
      }
      return line;
    });
    if (!found) lines.push(`${key}=${value}`);
  }

  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

upsertEnvFile(ENV_PATH, PRODUCTION);
upsertEnvFile(ADMOB_ENV_PATH, { TRIVENSE_ADMOB_ANDROID_APP_ID: ANDROID_APP_ID });

console.log("\nTrivense AdMob production IDs applied");
console.log("─".repeat(44));
for (const [key, value] of Object.entries(PRODUCTION)) {
  console.log(`${key}=${value}`);
}
console.log(`
iOS: Register com.trivense.app in AdMob, create matching units, then add:
  EXPO_PUBLIC_ADMOB_IOS_APP_ID
  EXPO_PUBLIC_ADMOB_IOS_BANNER / INTERSTITIAL / APP_OPEN

Verify: npm run admob:check
Rebuild: eas build --profile production --platform android
`);
