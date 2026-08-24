import { NextResponse } from "next/server";
import { db } from "@videohost/db";
import { verifySignupOtp } from "@/lib/auth-otp";

export async function POST(req: Request) {
  try {
    const { token, otp, code, email } = await req.json();
    const verificationCode = (otp || code || token || "").toString().trim();

    if (!verificationCode || !email) {
      return NextResponse.json({ error: "Missing verification code or email" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }

    // If user is already verified, treat verification as successful
    if (user.emailVerified) {
      return NextResponse.json({ success: true, message: "This email address is already verified." });
    }

    // Verify OTP code
    const verification = await verifySignupOtp(normalizedEmail, verificationCode);
    if (!verification.success) {
      return NextResponse.json({ error: verification.error || "Invalid or expired verification code." }, { status: 400 });
    }

    // Mark user as verified
    await db.user.update({
      where: { email: normalizedEmail },
      data: { emailVerified: new Date() },
    });

    return NextResponse.json({ success: true, message: "Email verified successfully! You can now log in." });
  } catch (error: any) {
    console.error("Email verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
