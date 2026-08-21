import { NextResponse } from "next/server";
import { verifyShareOtp, createSharePassJwt, SHARE_OTP_COOKIE_NAME } from "@/lib/share-otp";

export async function POST(req: Request) {
  try {
    const { token, email, code } = await req.json();

    if (!token || !email || !code) {
      return NextResponse.json(
        { error: "Token, email, and verification code are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isValid = await verifyShareOtp(normalizedEmail, token, code);

    if (!isValid) {
      return NextResponse.json(
        {
          error: "INVALID_CODE",
          message: "The 6-digit access code is invalid or has expired. Please request a new code.",
        },
        { status: 400 }
      );
    }

    // Generate 24-hour (1 day) JWT viewer pass
    const passJwt = createSharePassJwt(normalizedEmail);

    const response = NextResponse.json({
      success: true,
      message: "Access granted for 24 hours.",
      email: normalizedEmail,
      passToken: passJwt,
    });

    // Set 24-hour cookie for this browser session
    response.cookies.set(SHARE_OTP_COOKIE_NAME, passJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours in seconds
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("[OTP Verify Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
