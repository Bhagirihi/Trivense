import { NextRequest, NextResponse } from "next/server";
import {
  adminServiceUnavailable,
  adminUnauthorized,
  csvResponse,
  requireAdminSession,
  weekAgoIso,
} from "@/lib/admin-api";
import { createServerSupabase } from "@/lib/supabase/server";

type WaitlistRow = {
  id: string;
  email: string;
  name: string | null;
  source: string | null;
  created_at: string;
};

export async function GET(request: NextRequest) {
  if (!(await requireAdminSession())) {
    return adminUnauthorized();
  }

  const supabase = createServerSupabase();
  if (!supabase) {
    return adminServiceUnavailable("Supabase is not configured. Add SUPABASE_SERVICE_ROLE_KEY.");
  }

  const format = request.nextUrl.searchParams.get("format");

  const { data, error } = await supabase
    .from("website_waitlist")
    .select("id, email, name, source, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as WaitlistRow[];

  if (format === "csv") {
    return csvResponse(
      "trivense-waitlist.csv",
      "email,name,source,created_at",
      rows.map((row) =>
        [row.email, row.name ?? "", row.source ?? "website", row.created_at].join(",")
      )
    );
  }

  const weekAgo = weekAgoIso();
  const recent = rows.filter((row) => row.created_at >= weekAgo).length;

  return NextResponse.json({
    total: rows.length,
    recent7Days: recent,
    rows,
  });
}
