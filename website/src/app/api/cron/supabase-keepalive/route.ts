import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedCron } from "@/lib/cron-auth";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Lightweight ping so Supabase free-tier projects stay active (7-day inactivity pause). */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabase();
  if (!supabase) {
    const error = "Supabase env vars not configured";
    console.error("[supabase-keepalive] failed:", error);
    await pingHeartbeat(false, error);
    return NextResponse.json(
      { ok: false, error },
      { status: 503 },
    );
  }

  const startedAt = Date.now();
  const { error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error("[supabase-keepalive] failed:", error.message);
    await pingHeartbeat(false, error.message);
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        durationMs: Date.now() - startedAt,
      },
      { status: 502 },
    );
  }

  const durationMs = Date.now() - startedAt;
  await pingHeartbeat(true);
  return NextResponse.json({
    ok: true,
    pingedAt: new Date().toISOString(),
    durationMs,
  });
}

/**
 * Optional heartbeat for an external cron monitor (e.g. Healthchecks.io,
 * free for 20 checks with email alerts).
 *
 * Set HEALTHCHECKS_PING_URL in Vercel (production) to the check's ping URL.
 * Success pings the URL, failure pings `<url>/fail` so the monitor alerts
 * at once; a missed run (no ping within period + grace) alerts too, which
 * is what catches the cron itself not firing. Missing env var = no-op, and
 * a heartbeat failure never fails the keepalive itself.
 */
async function pingHeartbeat(ok: boolean, message?: string): Promise<void> {
  const base = process.env.HEALTHCHECKS_PING_URL?.trim();
  if (!base) return;
  try {
    await fetch(ok ? base : `${base.replace(/\/$/, "")}/fail`, {
      method: "POST",
      ...(message ? { body: message } : {}),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.error("[supabase-keepalive] heartbeat ping failed:", err);
  }
}
