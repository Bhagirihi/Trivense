#!/usr/bin/env node
/**
 * Write Trivense Sentry DSN to .env (project created via Sentry MCP).
 * Org: rasoi-app · Team: trivense · Project: trivense-mobile
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env");

const SENTRY = {
  EXPO_PUBLIC_SENTRY_DSN:
    "https://5b800408c10c20f06d877d35cfc1c0ad@o4511569870520320.ingest.us.sentry.io/4511636035141632",
  SENTRY_ORG: "rasoi-app",
  SENTRY_PROJECT: "trivense-mobile",
};

function upsertEnv(lines, key, value) {
  let found = false;
  const out = lines.map((line) => {
    if (line.startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!found) out.push(`${key}=${value}`);
  return out;
}

let lines = [];
if (fs.existsSync(ENV_PATH)) {
  lines = fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/);
  if (lines.at(-1) === "") lines.pop();
}

for (const [key, value] of Object.entries(SENTRY)) {
  lines = upsertEnv(lines, key, value);
}

fs.writeFileSync(ENV_PATH, `${lines.join("\n")}\n`);

console.log("\nTrivense Sentry configured");
console.log("─".repeat(40));
console.log(`Org:     ${SENTRY.SENTRY_ORG}`);
console.log(`Project: ${SENTRY.SENTRY_PROJECT}`);
console.log(`DSN:     ${SENTRY.EXPO_PUBLIC_SENTRY_DSN.slice(0, 48)}…`);
console.log(`Console: https://rasoi-app.sentry.io/projects/trivense-mobile/`);
console.log("\nAdd EXPO_PUBLIC_SENTRY_DSN to EAS secrets for production builds.\n");
