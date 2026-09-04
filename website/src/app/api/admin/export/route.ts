import { NextRequest, NextResponse } from "next/server";
import {
  adminServiceUnavailable,
  adminUnauthorized,
  csvResponse,
  requireAdminSession,
} from "@/lib/admin-api";
import { fetchAdminExport } from "@/lib/admin-data.server";

const VALID_TYPES = new Set(["waitlist", "users", "referrals", "subscriptions"]);

export async function GET(request: NextRequest) {
  if (!(await requireAdminSession())) {
    return adminUnauthorized();
  }

  const type = request.nextUrl.searchParams.get("type") ?? "waitlist";
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
  }

  try {
    const { header, lines, filename } = await fetchAdminExport(type);
    return csvResponse(filename, header, lines);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    return adminServiceUnavailable(message);
  }
}
