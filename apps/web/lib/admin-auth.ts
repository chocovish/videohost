import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const ADMIN_COOKIE_NAME = "admin_auth_session";
export const IMPERSONATION_COOKIE_NAME = "admin_impersonation";
const TOKEN_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface ImpersonationPayload {
  targetUserId: string;
  targetUserName?: string | null;
  targetUserEmail?: string | null;
  targetUserImage?: string | null;
  adminImpersonator: boolean;
  startedAt: number;
  exp: number;
}

function getAdminSecret(): string {
  return (
    process.env.ADMIN_PASSWORD ||
    process.env.ADMIN_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "videohost-admin-super-secret-key-2026"
  );
}

export function verifyAdminPassword(password: string): boolean {
  const configuredPassword = process.env.ADMIN_PASSWORD || "admin123";
  if (!password || !configuredPassword) return false;
  // Constant-time comparison to prevent timing attacks
  const a = Buffer.from(password);
  const b = Buffer.from(configuredPassword);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createAdminToken(): string {
  const secret = getAdminSecret();
  const payload = {
    role: "super_admin",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS,
  };

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadStr)
    .digest("base64url");

  return `${payloadStr}.${signature}`;
}

export function verifyAdminToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payloadStr, signature] = parts;
  const secret = getAdminSecret();

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payloadStr)
    .digest("base64url");

  if (signature !== expectedSignature) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadStr, "base64url").toString("utf-8"));
    if (payload.role !== "super_admin") return false;
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === "number" && payload.exp < now) {
      return false; // Expired
    }
    return true;
  } catch {
    return false;
  }
}

export function createImpersonationToken(data: {
  targetUserId: string;
  targetUserName?: string | null;
  targetUserEmail?: string | null;
  targetUserImage?: string | null;
}): string {
  const secret = getAdminSecret();
  const now = Math.floor(Date.now() / 1000);
  const payload: ImpersonationPayload = {
    targetUserId: data.targetUserId,
    targetUserName: data.targetUserName,
    targetUserEmail: data.targetUserEmail,
    targetUserImage: data.targetUserImage,
    adminImpersonator: true,
    startedAt: now,
    exp: now + TOKEN_EXPIRY_SECONDS,
  };

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadStr)
    .digest("base64url");

  return `${payloadStr}.${signature}`;
}

export function verifyImpersonationToken(token: string | null | undefined): ImpersonationPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadStr, signature] = parts;
  const secret = getAdminSecret();

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payloadStr)
    .digest("base64url");

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadStr, "base64url").toString("utf-8")) as ImpersonationPayload;
    if (!payload.adminImpersonator || !payload.targetUserId) return null;
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === "number" && payload.exp < now) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

export async function isUserAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    return verifyAdminToken(token);
  } catch {
    return false;
  }
}

export async function getImpersonationSession(): Promise<ImpersonationPayload | null> {
  try {
    const cookieStore = await cookies();
    const isAdmin = await isUserAdmin();
    if (!isAdmin) return null;

    const token = cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value;
    return verifyImpersonationToken(token);
  } catch {
    return null;
  }
}

export async function requireAdminApi(): Promise<NextResponse | null> {
  const isAdmin = await isUserAdmin();
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Unauthorized: Admin access required" },
      { status: 401 }
    );
  }
  return null;
}

export async function encodeNextAuthSession(
  user: { id: string; email?: string | null; name?: string | null; image?: string | null },
  salt: string = "authjs.session-token"
): Promise<string> {
  // Dynamically import encode from @auth/core/jwt
  const { encode } = await import("@auth/core/jwt");
  const secret =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "videohost-admin-super-secret-key-2026";

  const token = {
    id: user.id,
    sub: user.id,
    email: user.email,
    name: user.name,
    picture: user.image,
  };

  return await encode({
    token,
    secret,
    salt,
    maxAge: TOKEN_EXPIRY_SECONDS,
  });
}
