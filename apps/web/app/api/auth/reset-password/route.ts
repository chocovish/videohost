import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@videohost/db";
import { verifyPasswordResetOtp } from "@/lib/auth-otp";

export async function POST(req: Request) {
  try {
    const { email, otp, code, newPassword } = await req.json();
    const resetCode = (otp || code || "").toString().trim();

    if (!email || !resetCode || !newPassword) {
      return NextResponse.json(
        { error: "Missing required fields: email, verification code, and new password." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid password reset request." },
        { status: 400 }
      );
    }

    if (user.isBlocked) {
      return NextResponse.json(
        { error: "This account has been suspended." },
        { status: 403 }
      );
    }

    // Verify OTP and consume it
    const verification = await verifyPasswordResetOtp(normalizedEmail, resetCode, true);
    if (!verification.success) {
      return NextResponse.json(
        { error: verification.error || "Invalid or expired password reset code." },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password and verify email
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        emailVerified: user.emailVerified || new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Your password has been successfully reset. You can now log in with your new password.",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
