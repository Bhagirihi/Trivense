#!/usr/bin/env node
/**
 * Provision / verify Trivense Supabase (project ref: pvuybefxxtjwxpqhmgkw).
 *
 * Run after restoring an inactive project or creating a new one:
 *   npm run setup:supabase
 *
 * Requires: supabase CLI logged in, project linked (supabase link --project-ref pvuybefxxtjwxpqhmgkw)
 */

require("dotenv").config();
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PROJECT_REF = "pvuybefxxtjwxpqhmgkw";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, stdio: "pipe", encoding: "utf8", ...opts });
}

async function probeProject() {
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) return { ok: false, reason: "missing anon key in .env" };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/expense_boards?select=id&limit=1`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });
    if (res.status === 404 || res.status === 401) {
      return { ok: false, reason: "API up but schema/auth not ready — restore project or run full_schema.sql" };
    }
    if (!res.ok) {
      return { ok: false, reason: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error.message || "network error" };
  }
}

(async () => {
  console.log("\nTrivense Supabase setup\n" + "═".repeat(44));
  console.log(`Project: ${PROJECT_REF} (Trivense · Mumbai)`);
  console.log(`URL:     ${SUPABASE_URL}\n`);

  const probe = await probeProject();
  if (!probe.ok) {
    console.log(`✗ Supabase not ready (${probe.reason})`);
    console.log(`
Restore or create the project:
  1. https://supabase.com/dashboard/project/${PROJECT_REF}
  2. If paused → Restore project (or create a new project and update .env + RevenueCat webhook)
  3. supabase link --project-ref ${PROJECT_REF}
  4. Re-run: npm run setup:supabase
`);
    process.exit(1);
  }

  console.log("✓ Supabase API reachable with Trivense schema");

  try {
    run("supabase db push");
    console.log("✓ Migrations applied (supabase db push)");
  } catch (error) {
    console.log("✗ db push failed:");
    console.log(error.stdout || error.message);
    process.exit(1);
  }

  try {
    run("supabase functions deploy revenuecat-webhook --no-verify-jwt");
    console.log("✓ Edge function deployed: revenuecat-webhook");
  } catch (error) {
    console.log("○ Edge function deploy skipped or failed — deploy manually after secrets are set");
    console.log("  supabase secrets set REVENUECAT_WEBHOOK_AUTH=$(openssl rand -hex 32)");
  }

  const envPath = path.join(ROOT, ".env");
  const anonHint = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? "set" : "missing";
  console.log(`
Next steps:
  • npm run setup:google-auth  — enable Google in Supabase (uses Firebase OAuth client)
  • Dashboard → Settings → API → copy anon key into .env (currently ${anonHint})
  • Set secret: supabase secrets set REVENUECAT_WEBHOOK_AUTH=...
  • RevenueCat webhook URL:
      ${SUPABASE_URL}/functions/v1/revenuecat-webhook
  • EAS secrets: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY

Schema reference: supabase/full_schema.sql
`);
})();
