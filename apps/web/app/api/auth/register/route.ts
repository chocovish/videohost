import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@videohost/db";
import { sendSignupOtpEmail } from "@/lib/mail";
import { generateSignupOtp } from "@/lib/auth-otp";

export async function POST(req: Request) {
  try {
    const { name, email, password, orgName, viewMode, inviteToken, callbackUrl } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const selectedViewMode = viewMode === "VIEWER" ? "VIEWER" : "CREATOR";
    const effectiveOrgName = orgName || `${name || normalizedEmail.split("@")[0]}'s Workspace`;

    const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    // Check optional invitation token
    let validInvite = null;
    if (inviteToken && typeof inviteToken === "string") {
      const inviteRecord = await db.invitation.findUnique({
        where: { token: inviteToken },
      });
      if (inviteRecord && !inviteRecord.acceptedAt && new Date(inviteRecord.expiresAt) > new Date()) {
        if (inviteRecord.email.toLowerCase() === normalizedEmail) {
          validInvite = inviteRecord;
        } else {
          return NextResponse.json(
            { error: `This invitation was issued to ${inviteRecord.email}. Please register with ${inviteRecord.email} to accept.` },
            { status: 400 }
          );
        }
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const slug = effectiveOrgName.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Math.random().toString(36).substring(2, 6);

    // Get default free plan
    let freePlan = await db.plan.findUnique({ where: { id: "plan_free" } });
    if (!freePlan) {
      freePlan = await db.plan.create({
        data: {
          id: "plan_free",
          name: "free",
          minutesLimit: 200,
          maxResolution: "1080p",
          seatLimit: 5,
          priceMonthlyCents: 0,
          isCustom: false,
        },
      });
    }

    // Transaction to create User, Org, Member
    const result = await db.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: effectiveOrgName,
          slug,
          planId: freePlan.id,
          themeId: "lime",
        },
      });

      const user = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          emailVerified: null,
          viewMode: selectedViewMode,
          activeOrganizationId: organization.id,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      if (validInvite) {
        await tx.organizationMember.create({
          data: {
            organizationId: validInvite.organizationId,
            userId: user.id,
            role: validInvite.role,
          },
        });

        await tx.invitation.update({
          where: { id: validInvite.id },
          data: { acceptedAt: new Date() },
        });
      }

      return { user, organization };
    });

    // Generate 6-digit OTP with 10-minute validity
    const otpCode = await generateSignupOtp(normalizedEmail);

    // Send signup verification OTP email
    try {
      await sendSignupOtpEmail(normalizedEmail, otpCode);
    } catch (mailErr) {
      console.error("Failed to send verification OTP email:", mailErr);
    }

    return NextResponse.json({
      success: true,
      requiresVerification: true,
      email: normalizedEmail,
      orgId: result.organization.id,
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

