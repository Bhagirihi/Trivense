import { NextResponse } from "next/server";
import {
  adminCookie,
  createAdminSessionToken,
  isAdminConfigured,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Admin is not configured. Set ADMIN_PASSWORD in environment." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const password = String(body.password || "");

    if (!verifyAdminPassword(password)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const token = createAdminSessionToken();
    if (!token) {
      return NextResponse.json({ error: "Could not create session" }, { status: 500 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(adminCookie.name, token, adminCookie.options);
    return response;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
