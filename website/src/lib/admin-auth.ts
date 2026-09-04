import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "trivense_admin_session";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret(): string | null {
  return process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET || null;
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function isAdminConfigured(): boolean {
  return Boolean(getSecret());
}

export function verifyAdminPassword(password: string): boolean {
  const secret = getSecret();
  if (!secret) return false;

  const a = Buffer.from(password);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

export function createAdminSessionToken(): string | null {
  const secret = getSecret();
  if (!secret) return null;

  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + SESSION_MS, v: 1 })
  ).toString("base64url");

  return `${payload}.${signPayload(payload, secret)}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  const secret = getSecret();
  if (!secret || !token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = signPayload(payload, secret);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);

  if (sigBuf.length !== expectedBuf.length) return false;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      exp?: number;
    };
    return typeof data.exp === "number" && Date.now() < data.exp;
  } catch {
    return false;
  }
}

export const adminCookie = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MS / 1000,
  },
};

export function readAdminSession(cookieValue: string | undefined | null): boolean {
  return verifyAdminSessionToken(cookieValue);
}
