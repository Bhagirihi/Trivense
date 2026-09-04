import { NextResponse } from "next/server";
import {
  adminServiceUnavailable,
  adminUnauthorized,
  requireAdminSession,
} from "@/lib/admin-api";
import { fetchAdminOverview } from "@/lib/admin-data.server";

export async function GET() {
  if (!(await requireAdminSession())) {
    return adminUnauthorized();
  }

  try {
    const overview = await fetchAdminOverview();
    return NextResponse.json(overview, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load admin data";
    return adminServiceUnavailable(message);
  }
}
