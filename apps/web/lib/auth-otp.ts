import { db } from "@videohost/db";

/**
 * OTP validity period in milliseconds: 10 minutes
 */
export const OTP_EXPIRY_MS = 10 * 60 * 1000;

/**
 * Generate a random 6-digit numeric string OTP.
 */
export function generateRandomNumericOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generates and stores a 6-digit OTP for signup email verification with 10 minutes validity.
 */
export async function generateSignupOtp(email: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const identifier = `signup_otp:${normalizedEmail}`;
  const code = generateRandomNumericOtp();
  const tokenRecord = `signup_otp_${normalizedEmail}_${code}`;
  const expires = new Date(Date.now() + OTP_EXPIRY_MS);

  // Clear any existing signup tokens for this email
  await db.verificationToken.deleteMany({
    where: {
      OR: [
        { identifier },
        { identifier: normalizedEmail },
      ],
    },
  });

  // Store new 10-minute OTP
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
 * Validates a 6-digit signup OTP against the database.
 * Returns true if valid and not expired; deletes token upon success.
 */
export async function verifySignupOtp(email: string, code: string): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();
  const identifier = `signup_otp:${normalizedEmail}`;
  const tokenRecord = `signup_otp_${normalizedEmail}_${cleanCode}`;

  const record = await db.verificationToken.findFirst({
    where: {
      OR: [
        { identifier, token: tokenRecord },
        { identifier: normalizedEmail, token: cleanCode },
        { identifier, token: cleanCode },
      ],
    },
  });

  if (!record) {
    return { success: false, error: "Invalid verification code. Please check and try again." };
  }

  if (new Date() > record.expires) {
    // Delete expired token
    await db.verificationToken.deleteMany({
      where: {
        OR: [
          { identifier },
          { identifier: normalizedEmail },
        ],
      },
    });
    return { success: false, error: "Verification code has expired (10 mins validity). Please request a new one." };
  }

  // Atomically delete token
  await db.verificationToken.deleteMany({
    where: {
      OR: [
        { identifier },
        { identifier: normalizedEmail },
      ],
    },
  });

  return { success: true };
}

/**
 * Generates and stores a 6-digit OTP for password reset with 10 minutes validity.
 */
export async function generatePasswordResetOtp(email: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const identifier = `reset_otp:${normalizedEmail}`;
  const code = generateRandomNumericOtp();
  const tokenRecord = `reset_otp_${normalizedEmail}_${code}`;
  const expires = new Date(Date.now() + OTP_EXPIRY_MS);

  // Clear any existing reset tokens for this email
  await db.verificationToken.deleteMany({
    where: { identifier },
  });

  // Store new 10-minute reset OTP
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
 * Validates a 6-digit password reset OTP against the database without deleting immediately
 * (or deletes on final password change).
 */
export async function verifyPasswordResetOtp(
  email: string,
  code: string,
  consume: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();
  const identifier = `reset_otp:${normalizedEmail}`;
  const tokenRecord = `reset_otp_${normalizedEmail}_${cleanCode}`;

  const record = await db.verificationToken.findFirst({
    where: {
      identifier,
      token: tokenRecord,
    },
  });

  if (!record) {
    return { success: false, error: "Invalid password reset code. Please check the code and try again." };
  }

  if (new Date() > record.expires) {
    await db.verificationToken.deleteMany({
      where: { identifier },
    });
    return { success: false, error: "Password reset code has expired (10 mins validity). Please request a new one." };
  }

  if (consume) {
    await db.verificationToken.deleteMany({
      where: { identifier },
    });
  }

  return { success: true };
}
