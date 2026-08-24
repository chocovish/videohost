import { NextResponse } from "next/server";
import { db } from "@videohost/db";
import { sendSignupOtpEmail } from "@/lib/mail";
import { generateSignupOtp } from "@/lib/auth-otp";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await db.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      return NextResponse.json({ error: "No user found with this email address" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "This email address is already verified" }, { status: 400 });
    }

    // Generate new 10-minute OTP
    const otpCode = await generateSignupOtp(normalizedEmail);

    // Send OTP email
    await sendSignupOtpEmail(normalizedEmail, otpCode);

    return NextResponse.json({
      success: true,
      message: "A new 6-digit verification code has been sent to your email (valid for 10 minutes).",
    });
  } catch (error: any) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ error: "Failed to resend verification code" }, { status: 500 });
  }
}
