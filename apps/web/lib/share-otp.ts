import jwt from "jsonwebtoken";
import { db } from "@videohost/db";

const JWT_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "taped-share-secret-fallback-key-2026";
export const SHARE_OTP_COOKIE_NAME = "share_otp_pass";

/**
 * Generates a 6-digit numeric OTP code, saves it to db, and returns it.
 */
export async function generateShareOtp(email: string, targetToken: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const identifier = `share_otp:${targetToken}:${normalizedEmail}`;
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const tokenRecord = `share_otp_${targetToken}_${normalizedEmail}_${code}`;
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Clean up any old OTPs for this identifier
  await db.verificationToken.deleteMany({
    where: { identifier },
  });

  // Create new OTP record
  await db.verificationToken.create({
    data: {
      identifier,
      token: tokenRecord,
      expires,
    },
  });

  return code;
}

/**
 * Validates a 6-digit OTP code against the database.
 */
export async function verifyShareOtp(email: string, targetToken: string, code: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const identifier = `share_otp:${targetToken}:${normalizedEmail}`;
  const tokenRecord = `share_otp_${targetToken}_${normalizedEmail}_${code.trim()}`;

  const record = await db.verificationToken.findFirst({
    where: {
      identifier,
      token: tokenRecord,
    },
  });

  if (!record) {
    return false;
  }

  // Check expiration
  if (new Date() > record.expires) {
    await db.verificationToken.deleteMany({
      where: { identifier },
    });
    return false;
  }

  // Atomically delete token on successful verification
  await db.verificationToken.deleteMany({
    where: { identifier },
  });

  return true;
}

/**
 * Generates a 1-day (24 hour) signed JWT for browser viewer pass.
 */
export function createSharePassJwt(email: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  return jwt.sign(
    {
      email: normalizedEmail,
      type: "share_otp_pass",
    },
    JWT_SECRET,
    {
      expiresIn: "24h", // 1 day
    }
  );
}

/**
 * Verifies a share pass JWT and returns the verified email or null.
 */
export function verifySharePassJwt(tokenString?: string | null): { email: string } | null {
  if (!tokenString) return null;

  try {
    const payload = jwt.verify(tokenString, JWT_SECRET) as {
      email?: string;
      type?: string;
    };

    if (payload && payload.type === "share_otp_pass" && payload.email) {
      return { email: payload.email.toLowerCase() };
    }
    return null;
  } catch (err) {
    return null;
  }
}
