#!/usr/bin/env node
/**
 * Headed Playwright helper: add Supabase callback to Firebase Google web OAuth client.
 */

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REDIRECT = "https://pvuybefxxtjwxpqhmgkw.supabase.co/auth/v1/callback";
const CLIENT_URL =
  "https://console.cloud.google.com/auth/clients/265290976146-4bp383fmm2i37mlj723jd1iivr16cqki.apps.googleusercontent.com?project=trivense-app-prod";

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    execSync("npm install --no-save playwright@1.51.0", {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit",
    });
    return import("playwright");
  }
}

const { chromium } = await loadPlaywright();

const browser = await chromium.launch({ headless: false, channel: "chrome" });
const page = await browser.newPage();
await page.goto(CLIENT_URL, { waitUntil: "networkidle", timeout: 180000 });

await page.waitForTimeout(4000);

// Already has redirect?
const bodyText = await page.locator("body").innerText().catch(() => "");
if (bodyText.includes(REDIRECT)) {
  console.log("Redirect URI already present");
  await browser.close();
  process.exit(0);
}

const addButtons = [
  page.getByRole("button", { name: /add uri/i }),
  page.getByRole("button", { name: /add redirect/i }),
  page.locator("button").filter({ hasText: /add/i }).filter({ hasText: /uri/i }),
];
for (const btn of addButtons) {
  if (await btn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await btn.first().click();
    break;
  }
}

const uriInput = page.locator(
  'input[aria-label*="Redirect URI" i], input[aria-label*="redirect" i], input[placeholder*="https://" i]'
);
if (await uriInput.first().isVisible({ timeout: 10000 }).catch(() => false)) {
  const count = await uriInput.count();
  await uriInput.nth(count - 1).fill(REDIRECT);
} else {
  await page.screenshot({
    path: path.join(__dirname, "..", "scripts", ".google-oauth-debug.png"),
    fullPage: true,
  });
  throw new Error("Could not find redirect URI input — screenshot saved to scripts/.google-oauth-debug.png");
}

const saveButtons = [
  page.getByRole("button", { name: /^save$/i }),
  page.getByRole("button", { name: /save/i }),
];
for (const btn of saveButtons) {
  if (await btn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
    await btn.first().click();
    break;
  }
}

await page.waitForTimeout(5000);
await browser.close();
console.log("Attempted to save redirect URI:", REDIRECT);
