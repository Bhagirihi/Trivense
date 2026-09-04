#!/usr/bin/env node
/**
 * Enable Google sign-in for Trivense (Supabase + Google Cloud).
 *
 * - Reads OAuth web client from Firebase Identity Toolkit (after Firebase Auth → Google enabled)
 * - Patches Supabase Auth (Management API): Google provider + mobile redirect URLs
 * - Ensures Google OAuth web client allows Supabase callback redirect URI
 *
 * Usage:
 *   npm run setup:google-auth
 *
 * Env (optional):
 *   SUPABASE_ACCESS_TOKEN — defaults to Supabase CLI keychain token
 *   GOOGLE_WEB_CLIENT_ID / GOOGLE_WEB_CLIENT_SECRET — skip Firebase lookup
 */

require("dotenv").config();
const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PROJECT_REF = "pvuybefxxtjwxpqhmgkw";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const SUPABASE_CALLBACK = `${SUPABASE_URL}/auth/v1/callback`;
const FIREBASE_PROJECT = "trivense-app-prod";
const GCP_OAUTH_CLIENT_URL =
  "https://console.cloud.google.com/auth/clients/265290976146-4bp383fmm2i37mlj723jd1iivr16cqki.apps.googleusercontent.com?project=trivense-app-prod";

const REDIRECT_ALLOW_LIST = [
  "trivense://auth/callback",
  "exp+trivense://auth/callback",
  "trivense://verify-email",
  "trivense://reset-password",
  "http://localhost:8081",
  "http://127.0.0.1:3000",
  "https://127.0.0.1:3000",
].join(",");

function getSupabaseAccessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  try {
    const out = execSync("supabase --debug projects list 2>&1", {
      encoding: "utf8",
      cwd: ROOT,
    });
    const match = out.match(/authorization \[Bearer (sbp_[a-f0-9]+)\]/i);
    if (match) return match[1];
  } catch (_) {
    /* ignore */
  }
  throw new Error(
    "Supabase access token not found. Run: supabase login — or set SUPABASE_ACCESS_TOKEN"
  );
}

function getFirebaseAccessToken() {
  const cfgPath = path.join(os.homedir(), ".config/configstore/firebase-tools.json");
  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  if (!cfg?.tokens?.access_token) {
    throw new Error("Firebase CLI not logged in. Run: firebase login");
  }
  return cfg.tokens.access_token;
}

async function fetchGoogleIdpFromFirebase(fbToken) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v2/projects/${FIREBASE_PROJECT}/defaultSupportedIdpConfigs/google.com`,
    { headers: { Authorization: `Bearer ${fbToken}` } }
  );
  const body = await res.json();
  if (!res.ok) {
    throw new Error(
      `Firebase Google IdP not configured (${body.error?.message || res.status}). ` +
        `Enable Google in Firebase Console → Authentication → Sign-in method → Google.`
    );
  }
  if (!body.clientId || !body.clientSecret) {
    throw new Error("Firebase Google IdP missing clientId/clientSecret");
  }
  return { clientId: body.clientId, clientSecret: body.clientSecret };
}

async function patchSupabaseAuth(sbpToken, clientId, clientSecret) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${sbpToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      external_google_enabled: true,
      external_google_client_id: clientId,
      external_google_secret: clientSecret,
      external_google_skip_nonce_check: true,
      uri_allow_list: REDIRECT_ALLOW_LIST,
      site_url: "trivense://auth/callback",
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Supabase auth patch failed: ${body.message || res.status}`);
  }
  return body;
}

async function googleAcceptsSupabaseRedirect(clientId) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", SUPABASE_CALLBACK);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  const res = await fetch(url.toString(), { redirect: "manual" });
  const location = res.headers.get("location") || "";
  if (location.includes("signin/oauth/error") || location.includes("oauth/error")) {
    return false;
  }
  return res.status === 302 && location.includes("accounts.google.com");
}

async function refreshGoogleServicesJson() {
  const outPath = path.join(ROOT, "firebase/google-services.json");
  execSync(
    `npx -y firebase-tools@latest apps:sdkconfig ANDROID 1:265290976146:android:3a532a2acc6284bba9cf4b --project trivense-app-prod -o ${outPath}.tmp`,
    { cwd: ROOT, stdio: "pipe" }
  );
  fs.renameSync(`${outPath}.tmp`, outPath);
}

async function tryAddRedirectWithPlaywright() {
  const scriptPath = path.join(__dirname, "add-google-oauth-redirect.mjs");
  if (!fs.existsSync(scriptPath)) return false;
  try {
    execSync(`node ${scriptPath}`, { cwd: ROOT, stdio: "inherit" });
    return true;
  } catch {
    return false;
  }
}

function openOAuthClientInBrowser() {
  try {
    if (process.platform === "darwin") {
      execSync(`open "${GCP_OAUTH_CLIENT_URL}"`, { stdio: "ignore" });
    }
  } catch {
    /* ignore */
  }
}

(async () => {
  console.log("\nTrivense Google Auth setup\n" + "═".repeat(40));

  const sbpToken = getSupabaseAccessToken();
  let clientId = process.env.GOOGLE_WEB_CLIENT_ID;
  let clientSecret = process.env.GOOGLE_WEB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const fbToken = getFirebaseAccessToken();
    const idp = await fetchGoogleIdpFromFirebase(fbToken);
    clientId = idp.clientId;
    clientSecret = idp.clientSecret;
    console.log("✓ Loaded Google web OAuth client from Firebase Identity Toolkit");
  } else {
    console.log("✓ Using GOOGLE_WEB_CLIENT_ID / GOOGLE_WEB_CLIENT_SECRET from env");
  }

  await patchSupabaseAuth(sbpToken, clientId, clientSecret);
  console.log("✓ Supabase Google provider enabled");
  console.log(`  Redirect allow list: ${REDIRECT_ALLOW_LIST.split(",").join(", ")}`);

  let redirectOk = await googleAcceptsSupabaseRedirect(clientId);
  if (!redirectOk) {
    console.log("\n○ Google OAuth client needs Supabase callback redirect URI:");
    console.log(`  ${SUPABASE_CALLBACK}`);
    const automated = await tryAddRedirectWithPlaywright();
    if (automated) {
      redirectOk = await googleAcceptsSupabaseRedirect(clientId);
    }
    if (!redirectOk) {
      openOAuthClientInBrowser();
      console.log("\n  Opened Google Cloud Console (add the URI under Authorized redirect URIs → Save).");
      console.log(`  Or visit: ${GCP_OAUTH_CLIENT_URL}`);
      for (let i = 0; i < 12 && !redirectOk; i += 1) {
        await new Promise((r) => setTimeout(r, 5000));
        redirectOk = await googleAcceptsSupabaseRedirect(clientId);
        if (redirectOk) break;
        process.stdout.write(".");
      }
      console.log("");
    }
  }

  if (redirectOk) {
    console.log("✓ Google accepts Supabase OAuth redirect URI");
  } else {
    console.log("✗ Redirect URI still not registered — complete in GCP Console, then re-run.");
    process.exit(1);
  }

  try {
    await refreshGoogleServicesJson();
    console.log("✓ firebase/google-services.json refreshed");
  } catch (error) {
    console.log("○ Could not refresh google-services.json:", error.message);
  }

  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (anon) {
    const probe = await fetch(
      `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=trivense%3A%2F%2Fauth%2Fcallback`,
      { headers: { apikey: anon }, redirect: "manual" }
    );
    if (probe.status === 302 && (probe.headers.get("location") || "").includes("accounts.google.com")) {
      console.log("✓ Supabase /auth/v1/authorize?provider=google returns Google OAuth URL");
    } else {
      console.log("○ Supabase authorize probe:", probe.status);
    }
  }

  console.log("\nDone. Test in app: Continue with Google on Login / Register.\n");
})().catch((error) => {
  console.error("\n✗", error.message || error);
  process.exit(1);
});
