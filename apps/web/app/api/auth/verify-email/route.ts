import { NextResponse } from "next/server";
import { db } from "@videohost/db";

export async function POST(req: Request) {
  try {
    const { token, email } = await req.json();

    if (!token || !email) {
      return NextResponse.json({ error: "Missing token or email" }, { status: 400 });
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }

    // If user is already verified, treat verification as successful
    if (user.emailVerified) {
      return NextResponse.json({ success: true, message: "This email address is already verified." });
    }

    // Find verification token
    const verificationToken = await db.verificationToken.findFirst({
      where: {
        identifier: email,
        token: token,
      },
    });

    if (!verificationToken) {
      return NextResponse.json({ error: "Invalid or expired verification link" }, { status: 400 });
    }

    if (new Date() > verificationToken.expires) {
      await db.verificationToken.deleteMany({
        where: {
          identifier: email,
          token: token,
        },
      });
      return NextResponse.json({ error: "Verification token has expired. Please request a new link." }, { status: 400 });
    }

    // Mark user as verified & delete token atomically (deleteMany avoids throws if already deleted)
    await db.$transaction([
      db.user.update({
        where: { email },
        data: { emailVerified: new Date() },
      }),
      db.verificationToken.deleteMany({
        where: {
          identifier: email,
          token: token,
        },
      }),
    ]);

    return NextResponse.json({ success: true, message: "Email verified successfully" });
  } catch (error: any) {
    console.error("Email verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
