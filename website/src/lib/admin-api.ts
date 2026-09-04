import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminCookie, readAdminSession } from "@/lib/admin-auth";

export async function requireAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookie.name)?.value;
  if (!readAdminSession(token)) {
    return null;
  }
  return true;
}

export async function adminUnauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function adminServiceUnavailable(message: string) {
  return NextResponse.json({ error: message }, { status: 503 });
}

export function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function csvResponse(filename: string, header: string, lines: string[]) {
  return new NextResponse([header, ...lines].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export function weekAgoIso(): string {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}
