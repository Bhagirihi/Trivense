#!/usr/bin/env node
/**
 * Provision Trivense subscription products in RevenueCat via API v2.
 *
 * Usage:
 *   REVENUECAT_API_V2_KEY=sk_... node scripts/setup-revenuecat-trivense.js
 *
 * Optional:
 *   REVENUECAT_PROJECT_ID=proj_...  (auto-detected if omitted)
 *
 * After running, copy public SDK keys into .env:
 *   EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...
 *   EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_...
 */

require("dotenv").config();

const path = require("path");

const API_BASE = "https://api.revenuecat.com/v2";

const ENTITLEMENT_LOOKUP_KEY = "premium";
const OFFERING_LOOKUP_KEY = "default";
const IOS_BUNDLE_ID = "com.trivense.app";
const ANDROID_PACKAGE = "com.trivense.app";

const PRODUCTS = [
  {
    storeIdentifier: "trivense_monthly",
    displayName: "Trivense Premium Monthly",
    duration: "P1M",
    packageLookupKey: "monthly",
    packageDisplayName: "Monthly",
    position: 1,
    androidStoreIdentifier: "trivense_monthly:monthly",
  },
  {
    storeIdentifier: "trivense_yearly",
    displayName: "Trivense Premium Yearly",
    duration: "P1Y",
    packageLookupKey: "annual",
    packageDisplayName: "Yearly",
    position: 2,
    androidStoreIdentifier: "trivense_yearly:yearly",
  },
];

const apiKey = process.env.REVENUECAT_API_V2_KEY;

if (!apiKey) {
  console.error("Missing REVENUECAT_API_V2_KEY in environment.");
  console.error("Create a v2 secret key in RevenueCat → Project Settings → API keys.");
  process.exit(1);
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
      data?.message ||
      data?.type ||
      data?.raw ||
      `${response.status} ${response.statusText}`;
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

async function getProjectId() {
  if (process.env.REVENUECAT_PROJECT_ID) {
    return process.env.REVENUECAT_PROJECT_ID;
  }
  const projects = await listAll("/projects");
  if (!projects.length) {
    throw new Error("No RevenueCat projects found for this API key.");
  }
  if (projects.length > 1) {
    console.log(
      "Multiple projects found; using the first. Set REVENUECAT_PROJECT_ID to override:"
    );
    projects.forEach((project) => console.log(`  - ${project.id} (${project.name})`));
  }
  return projects[0].id;
}

async function ensureApp(projectId, type, payload) {
  const apps = await listAll(`/projects/${projectId}/apps`);
  const match = apps.find((app) => {
    if (type === "app_store") return app.app_store?.bundle_id === IOS_BUNDLE_ID;
    if (type === "play_store") return app.play_store?.package_name === ANDROID_PACKAGE;
    return false;
  });
  if (match) {
    console.log(`✓ ${type} app exists: ${match.id}`);
    return match;
  }

  const created = await rc(`/projects/${projectId}/apps`, {
    method: "POST",
    body: { type, name: "Trivense", ...payload },
  });
  console.log(`+ Created ${type} app: ${created.id}`);
  return created;
}

async function ensureEntitlement(projectId) {
  const entitlements = await listAll(`/projects/${projectId}/entitlements`);
  const existing = entitlements.find((e) => e.lookup_key === ENTITLEMENT_LOOKUP_KEY);
  if (existing) {
    console.log(`✓ Entitlement "${ENTITLEMENT_LOOKUP_KEY}" exists: ${existing.id}`);
    return existing;
  }

  const created = await rc(`/projects/${projectId}/entitlements`, {
    method: "POST",
    body: {
      lookup_key: ENTITLEMENT_LOOKUP_KEY,
      display_name: "Trivense Premium",
    },
  });
  console.log(`+ Created entitlement: ${created.id}`);
  return created;
}

async function ensureProduct(projectId, appId, product, { isAndroid = false } = {}) {
  const storeIdentifier = isAndroid
    ? product.androidStoreIdentifier
    : product.storeIdentifier;
  const products = await listAll(`/projects/${projectId}/products`);
  const existing = products.find(
    (item) => item.app_id === appId && item.store_identifier === storeIdentifier
  );
  if (existing) {
    console.log(`✓ Product ${storeIdentifier} exists on app ${appId}`);
    return existing;
  }

  const created = await rc(`/projects/${projectId}/products`, {
    method: "POST",
    body: {
      app_id: appId,
      store_identifier: storeIdentifier,
      type: "subscription",
      display_name: product.displayName,
    },
  });
  console.log(`+ Created product ${storeIdentifier}: ${created.id}`);
  return created;
}

async function attachProductsToEntitlement(projectId, entitlementId, productIds) {
  if (!productIds.length) return;
  await rc(`/projects/${projectId}/entitlements/${entitlementId}/actions/attach_products`, {
    method: "POST",
    body: { product_ids: productIds },
  });
  console.log(`✓ Attached ${productIds.length} product(s) to entitlement`);
}

async function ensureOffering(projectId) {
  const offerings = await listAll(`/projects/${projectId}/offerings`);
  const existing = offerings.find((o) => o.lookup_key === OFFERING_LOOKUP_KEY);
  if (existing) {
    console.log(`✓ Offering "${OFFERING_LOOKUP_KEY}" exists: ${existing.id}`);
    return existing;
  }

  const created = await rc(`/projects/${projectId}/offerings`, {
    method: "POST",
    body: {
      lookup_key: OFFERING_LOOKUP_KEY,
      display_name: "Trivense Premium",
      metadata: { app: "trivense" },
    },
  });
  console.log(`+ Created offering: ${created.id}`);
  return created;
}

async function ensurePackage(projectId, offeringId, product, productIdsByStore) {
  const packages = await listAll(
    `/projects/${projectId}/offerings/${offeringId}/packages`
  );
  const existing = packages.find((pkg) => pkg.lookup_key === product.packageLookupKey);
  let pkg = existing;

  if (!pkg) {
    pkg = await rc(`/projects/${projectId}/offerings/${offeringId}/packages`, {
      method: "POST",
      body: {
        lookup_key: product.packageLookupKey,
        display_name: product.packageDisplayName,
        position: product.position,
      },
    });
    console.log(`+ Created package ${product.packageLookupKey}: ${pkg.id}`);
  } else {
    console.log(`✓ Package ${product.packageLookupKey} exists: ${pkg.id}`);
  }

  const productIds = Object.values(productIdsByStore)
    .filter((item) => item.storeIdentifier === product.storeIdentifier)
    .map((item) => item.id);

  if (productIds.length) {
    await rc(
      `/projects/${projectId}/offerings/${offeringId}/packages/${pkg.id}/actions/attach_products`,
      {
        method: "POST",
        body: { product_ids: productIds },
      }
    );
    console.log(`✓ Attached products to package ${product.packageLookupKey}`);
  }

  return pkg;
}

async function setCurrentOffering(projectId, offeringId) {
  await rc(`/projects/${projectId}/offerings/${offeringId}`, {
    method: "POST",
    body: { is_current: true },
  });
  console.log("✓ Set offering as current");
}

async function printPublicKeys(projectId, iosAppId, androidAppId) {
  const keys = await listAll(`/projects/${projectId}/apps/${iosAppId}/public_api_keys`).catch(
    () => []
  );
  if (!keys.length) {
    console.log("\nFetch SDK keys from RevenueCat dashboard → Apps → API keys");
    return;
  }
  console.log("\nPublic SDK keys (add to .env):");
  keys.forEach((key) => {
    console.log(`  ${key.platform}: ${key.key}`);
  });
}

async function main() {
  console.log("Setting up Trivense packages in RevenueCat...\n");

  const projectId = await getProjectId();
  console.log(`Project: ${projectId}\n`);

  const iosApp = await ensureApp(projectId, "app_store", {
    app_store: { bundle_id: IOS_BUNDLE_ID },
  });
  const androidApp = await ensureApp(projectId, "play_store", {
    play_store: { package_name: ANDROID_PACKAGE },
  });

  const entitlement = await ensureEntitlement(projectId);

  const createdProducts = [];
  for (const product of PRODUCTS) {
    const iosProduct = await ensureProduct(projectId, iosApp.id, product);
    const androidProduct = await ensureProduct(projectId, androidApp.id, product, {
      isAndroid: true,
    });
    createdProducts.push(
      { id: iosProduct.id, storeIdentifier: product.storeIdentifier },
      { id: androidProduct.id, storeIdentifier: product.androidStoreIdentifier }
    );
  }

  await attachProductsToEntitlement(
    projectId,
    entitlement.id,
    createdProducts.map((p) => p.id)
  );

  const offering = await ensureOffering(projectId);

  for (const product of PRODUCTS) {
    await ensurePackage(projectId, offering.id, product, createdProducts);
  }

  await setCurrentOffering(projectId, offering.id);

  console.log("\n→ Syncing tiered pricing (Test Store + Play via RevenueCat)…");
  try {
    require("child_process").execFileSync(
      process.execPath,
      [path.join(__dirname, "sync-revenuecat-pricing.js")],
      { stdio: "inherit", env: process.env }
    );
  } catch {
    console.log("  Pricing sync skipped or partial — run: npm run sync:revenuecat-pricing");
  }

  console.log("\nDone. Trivense RevenueCat setup:");
  console.log(`  Entitlement: ${ENTITLEMENT_LOOKUP_KEY}`);
  console.log(`  Offering:    ${OFFERING_LOOKUP_KEY}`);
  console.log(`  Packages:    monthly, annual`);
  console.log(`  Products:    trivense_monthly, trivense_yearly`);
  console.log("\nNext steps:");
  console.log("  1. Create matching products in App Store Connect & Google Play Console");
  console.log("  2. Add EXPO_PUBLIC_REVENUECAT_IOS_API_KEY and EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY to .env");
  console.log("  3. Deploy supabase/functions/revenuecat-webhook and configure webhook in RevenueCat");
  console.log("  4. Build with EAS (purchases do not work in Expo Go)");

  await printPublicKeys(projectId, iosApp.id, androidApp.id);
}

main().catch((error) => {
  console.error("\nSetup failed:", error.message);
  if (error.data) {
    console.error(JSON.stringify(error.data, null, 2));
  }
  process.exit(1);
});
