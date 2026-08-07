import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@videohost/db";
import { sendVerificationEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: "No user found with this email address" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "This email address is already verified" }, { status: 400 });
    }

    // Generate new token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.verificationToken.deleteMany({
      where: { identifier: email },
    });

    await db.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    await sendVerificationEmail(email, token);

    return NextResponse.json({ success: true, message: "Verification email resent successfully" });
  } catch (error: any) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ error: "Failed to resend verification email" }, { status: 500 });
  }
}
