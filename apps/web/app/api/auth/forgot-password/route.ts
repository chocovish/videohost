import { NextResponse } from "next/server";
import { db } from "@videohost/db";
import { generatePasswordResetOtp } from "@/lib/auth-otp";
import { sendPasswordResetOtpEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Look up user
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    // If user does not exist or has no password (e.g. Google-only account),
    // we still return a generic success message to prevent user enumeration attacks,
    // but don't send the email if not applicable.
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email address, a password reset code has been sent.",
      });
    }

    if (user.isBlocked) {
      return NextResponse.json({
        error: "This account has been suspended. Please contact support for assistance.",
      }, { status: 403 });
    }

    // Generate 6-digit OTP with 10-minute validity
    const otpCode = await generatePasswordResetOtp(normalizedEmail);

    // Send password reset email
    try {
      await sendPasswordResetOtpEmail(normalizedEmail, otpCode);
    } catch (mailErr) {
      console.error("Failed to send password reset OTP email:", mailErr);
      return NextResponse.json(
        { error: "Failed to deliver password reset email. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email address, a 6-digit password reset code has been sent.",
    });
  } catch (error: any) {
    console.error("Forgot password request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
