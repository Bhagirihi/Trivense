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
    return NextResponse.json(
      { ok: false, error: "Supabase env vars not configured" },
      { status: 503 },
    );
  }

  const startedAt = Date.now();
  const { error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        durationMs: Date.now() - startedAt,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    pingedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
  });
}
