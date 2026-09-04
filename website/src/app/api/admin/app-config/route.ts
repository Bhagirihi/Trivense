import { NextResponse } from "next/server";
import {
  adminServiceUnavailable,
  adminUnauthorized,
  requireAdminSession,
} from "@/lib/admin-api";
import { getAppConfig, setPaymentsEnabled } from "@/lib/app-config.server";

export async function GET() {
  if (!(await requireAdminSession())) {
    return adminUnauthorized();
  }

  try {
    const config = await getAppConfig();
    return NextResponse.json(config, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load app config";
    return adminServiceUnavailable(message);
  }
}

export async function PATCH(request: Request) {
  if (!(await requireAdminSession())) {
    return adminUnauthorized();
  }

  try {
    const body = (await request.json()) as { paymentsEnabled?: unknown };
    if (typeof body.paymentsEnabled !== "boolean") {
      return NextResponse.json(
        { error: "paymentsEnabled (boolean) is required" },
        { status: 400 }
      );
    }

    const config = await setPaymentsEnabled(body.paymentsEnabled);
    return NextResponse.json(config, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update app config";
    return adminServiceUnavailable(message);
  }
}
