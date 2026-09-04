#!/usr/bin/env node
/**
 * Sync Trivense tiered subscription pricing to RevenueCat.
 *
 * - Test Store: premium currency prices for dev/sandbox (INR not supported on Test Store)
 * - Play Store: territory_prices via RevenueCat store-state API (requires Play credentials
 *   linked in RevenueCat → Project Settings → Google Play)
 *
 * Production Android billing prices always come from Google Play; run
 * `npm run setup:play` / Play MCP sync first so Play Console matches manifest.json.
 *
 * Usage:
 *   REVENUECAT_API_V2_KEY=sk_... node scripts/sync-revenuecat-pricing.js
 */

require("dotenv").config();

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const MANIFEST_PATH = path.join(ROOT, "store-assets/play/manifest.json");
const PLAY_CLIENT_DIR = path.join(ROOT, ".cursor/mcp-servers/google-play");
const API_BASE = "https://api.revenuecat.com/v2";
const PROJECT_ID = process.env.REVENUECAT_PROJECT_ID || "proj2d578859";
const TEST_STORE_APP_ID = "app13783e11c3";

const TEST_STORE_CURRENCIES = {
  monthly: [
    { currency: "USD", amount: 9.99 },
    { currency: "EUR", amount: 9.99 },
    { currency: "GBP", amount: 8.99 },
    { currency: "AUD", amount: 15.99 },
    { currency: "CAD", amount: 13.99 },
    { currency: "SGD", amount: 14.99 },
  ],
  yearly: [
    { currency: "USD", amount: 79.99 },
    { currency: "EUR", amount: 84.99 },
    { currency: "GBP", amount: 72.99 },
    { currency: "AUD", amount: 129.99 },
    { currency: "CAD", amount: 109.99 },
    { currency: "SGD", amount: 109.99 },
  ],
};

const apiKey = process.env.REVENUECAT_API_V2_KEY;
if (!apiKey) {
  console.error("Missing REVENUECAT_API_V2_KEY.");
  process.exit(1);
}

function loadManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

function toMicros(amount) {
  return Math.round(Number(amount) * 1_000_000);
}

async function rc(path, { method = "GET", body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message =
      data?.message || data?.type || data?.raw || `${response.status} ${response.statusText}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function listAll(path) {
  const items = [];
  let startingAfter = null;

  do {
    const query = new URLSearchParams({ limit: "100" });
    if (startingAfter) query.set("starting_after", startingAfter);
    const page = await rc(`${path}?${query.toString()}`);
    items.push(...(page.items || []));
    startingAfter = page.next_page
      ? new URL(page.next_page, API_BASE).searchParams.get("starting_after")
      : null;
  } while (startingAfter);

  return items;
}

function exportPlayTerritoryPrices(priceInr, priceUsdPremium) {
  const envFile = path.join(PLAY_CLIENT_DIR, ".env");
  const python = path.join(PLAY_CLIENT_DIR, ".venv/bin/python");
  const code = `
import json
from play_client import export_territory_prices_for_revenuecat
print(json.dumps(export_territory_prices_for_revenuecat(
    price_inr=${priceInr},
    price_usd_premium=${priceUsdPremium},
)))
`.trim();

  const stdout = execFileSync(python, ["-c", code], {
    cwd: PLAY_CLIENT_DIR,
    env: {
      ...process.env,
      ...(fs.existsSync(envFile)
        ? Object.fromEntries(
            fs
              .readFileSync(envFile, "utf8")
              .split("\n")
              .filter((line) => line && !line.startsWith("#"))
              .map((line) => {
                const idx = line.indexOf("=");
                if (idx === -1) return null;
                const key = line.slice(0, idx).trim();
                let value = line.slice(idx + 1).trim();
                if (
                  (value.startsWith('"') && value.endsWith('"')) ||
                  (value.startsWith("'") && value.endsWith("'"))
                ) {
                  value = value.slice(1, -1);
                }
                return [key, value];
              })
              .filter(Boolean)
          )
        : {}),
    },
    encoding: "utf8",
  });

  return JSON.parse(stdout.trim());
}

async function listExistingTestPrices(projectId, productId) {
  try {
    return await rc(`/projects/${projectId}/products/${productId}/prices`);
  } catch (error) {
    if (error.status === 404) return [];
    throw error;
  }
}

async function ensureTestStorePrice(projectId, productId, currency, amountMicros) {
  const existing = await listExistingTestPrices(projectId, productId);
  const match = existing.find((item) => item.currency === currency);
  if (match && match.amount_micros === amountMicros) {
    console.log(`  ✓ Test Store ${currency} already ${match.amount}`);
    return "unchanged";
  }
  if (match) {
    console.log(
      `  ! Test Store ${currency} is ${match.amount}; target ${amountMicros / 1_000_000} — update manually in RevenueCat dashboard`
    );
    return "manual";
  }

  await rc(`/projects/${projectId}/products/${productId}/prices`, {
    method: "POST",
    body: {
      prices: [{ currency, amount_micros: amountMicros }],
    },
  });
  console.log(`  + Test Store ${currency} → ${amountMicros / 1_000_000}`);
  return "created";
}

async function syncTestStoreProduct(projectId, productId, planKey) {
  console.log(`Test Store product ${productId} (${planKey})`);
  const currencies = TEST_STORE_CURRENCIES[planKey] || [];
  for (const entry of currencies) {
    await ensureTestStorePrice(projectId, productId, entry.currency, toMicros(entry.amount));
  }
}

async function pollStoreStateOperation(projectId, productId, operationId) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await rc(
      `/projects/${projectId}/products/${productId}/store_state/${operationId}`
    );
    if (result.status === "succeeded") return result;
    if (result.status === "failed") {
      const error = new Error(result.error_message || "store_state operation failed");
      error.result = result;
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error("Timed out waiting for RevenueCat store_state operation");
}

async function syncPlayStoreProduct(projectId, productId, territoryPrices) {
  console.log(`Play Store product ${productId} (${Object.keys(territoryPrices).length} territories)`);
  const inPrice = territoryPrices.IN;
  const usPrice = territoryPrices.US;
  if (inPrice) {
    console.log(
      `  IN → ${inPrice.amount_micros / 1_000_000} ${inPrice.currency}`
    );
  }
  if (usPrice) {
    console.log(
      `  US → ${usPrice.amount_micros / 1_000_000} ${usPrice.currency}`
    );
  }

  const started = await rc(`/projects/${projectId}/products/${productId}/store_state`, {
    method: "POST",
    body: {
      store: "play_store",
      common: {
        pricing: {
          territory_prices: territoryPrices,
        },
      },
    },
  });

  try {
    await pollStoreStateOperation(projectId, productId, started.operation_id);
    console.log("  ✓ RevenueCat Play store_state applied");
    return "updated";
  } catch (error) {
    if (/MissingCredentials/i.test(error.message)) {
      console.log(
        "  ! Skipped — link Google Play service account in RevenueCat → Project Settings → Google Play"
      );
      console.log("    Android production prices still come from Google Play (already synced).");
      return "credentials_missing";
    }
    throw error;
  }
}

async function main() {
  const manifest = loadManifest();
  const products = manifest.subscriptions?.products || [];
  const rcProducts = await listAll(`/projects/${PROJECT_ID}/products`);

  console.log("Syncing Trivense pricing to RevenueCat\n");
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Manifest: ${MANIFEST_PATH}\n`);

  for (const spec of products) {
    const planKey = spec.basePlanId === "yearly" ? "yearly" : "monthly";
    const rcIds = manifest.subscriptions?.revenueCatProductIds || {};
    const testProductId =
      planKey === "yearly" ? rcIds.testStore?.yearly : rcIds.testStore?.monthly;
    const playProductId =
      planKey === "yearly" ? rcIds.playStore?.yearly : rcIds.playStore?.monthly;

    const testProduct =
      (testProductId && rcProducts.find((item) => item.id === testProductId)) ||
      rcProducts.find(
        (item) =>
          item.app_id === TEST_STORE_APP_ID && item.store_identifier === spec.productId
      );

    if (testProduct) {
      await syncTestStoreProduct(PROJECT_ID, testProduct.id, planKey);
    }

    const androidProduct =
      (playProductId && rcProducts.find((item) => item.id === playProductId)) ||
      rcProducts.find(
        (item) =>
          item.store_identifier === `${spec.productId}:${spec.basePlanId}` &&
          item.app_id === "appc06abb7240"
      );

    if (androidProduct) {
      const territoryPrices = exportPlayTerritoryPrices(
        spec.priceInr,
        spec.priceUsdPremium
      );
      await syncPlayStoreProduct(PROJECT_ID, androidProduct.id, territoryPrices);
    }
  }

  console.log("\nDone.");
  console.log("India: ₹299/mo · ₹2,499/yr on Google Play");
  console.log("Premium markets: $9.99/mo · $79.99/yr anchor on Google Play + RevenueCat Test Store");
  console.log(
    "RevenueCat dashboard Play sync: https://app.revenuecat.com/projects/proj2d578859"
  );
}

main().catch((error) => {
  console.error("\nSync failed:", error.message);
  if (error.data) console.error(JSON.stringify(error.data, null, 2));
  process.exit(1);
});
