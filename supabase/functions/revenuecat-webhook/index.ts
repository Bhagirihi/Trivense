import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const ENTITLEMENT_PREMIUM = "premium";

function mapPlan(productId: string | undefined): "monthly" | "yearly" | "free" {
  if (!productId) return "free";
  const id = productId.toLowerCase();
  if (id.includes("year") || id.includes("annual")) return "yearly";
  if (id.includes("month")) return "monthly";
  return "monthly";
}

function parseExpiresAt(ms: number | null | undefined): string | null {
  if (!ms) return null;
  return new Date(ms).toISOString();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  const expectedAuth = Deno.env.get("REVENUECAT_WEBHOOK_AUTH");
  if (expectedAuth && authHeader !== `Bearer ${expectedAuth}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response("Server misconfigured", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const body = await req.json();
  const event = body?.event;

  if (!event?.app_user_id) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = event.app_user_id;
  const eventType = event.type;
  const entitlement = event.entitlement_ids?.includes(ENTITLEMENT_PREMIUM)
    ? ENTITLEMENT_PREMIUM
    : event.entitlement_id;

  let plan: "monthly" | "yearly" | "free" = "free";
  let expiresAt: string | null = null;

  if (
    ["INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "PRODUCT_CHANGE"].includes(
      eventType
    )
  ) {
    plan = mapPlan(event.product_id);
    expiresAt = parseExpiresAt(event.expiration_at_ms);
  } else if (["CANCELLATION", "EXPIRATION", "BILLING_ISSUE"].includes(eventType)) {
    plan = "free";
  } else {
    return new Response(JSON.stringify({ ok: true, ignored: eventType }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { error } = await supabase.rpc("activate_subscription_from_store", {
    p_user_id: userId,
    p_plan: plan,
    p_store_product_id: event.product_id ?? null,
    p_store_transaction_id: event.transaction_id ?? event.id ?? null,
    p_expires_at: expiresAt,
  });

  if (error) {
    console.error("activate_subscription_from_store failed:", error.message);
    return new Response(error.message, { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, plan }), {
    headers: { "Content-Type": "application/json" },
  });
});
