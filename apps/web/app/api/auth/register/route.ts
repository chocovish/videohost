import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@videohost/db";
import { sendVerificationEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const { name, email, password, orgName, viewMode, inviteToken } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const selectedViewMode = viewMode === "VIEWER" ? "VIEWER" : "CREATOR";
    const effectiveOrgName = orgName || `${name || email.split("@")[0]}'s Workspace`;

    const existingUser = await db.user.findUnique({ where: { email } });
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
        if (inviteRecord.email.toLowerCase() === email.trim().toLowerCase()) {
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

    // Transaction to create User, Org, Member & VerificationToken
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          emailVerified: null,
          viewMode: selectedViewMode,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: effectiveOrgName,
          slug,
          planId: freePlan.id,
          themeId: "lime",
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

      // Generate verification token
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await tx.verificationToken.deleteMany({
        where: { identifier: email },
      });

      await tx.verificationToken.create({
        data: {
          identifier: email,
          token,
          expires,
        },
      });

      return { user, organization, token };
    });

    // Send verification email
    try {
      await sendVerificationEmail(email, result.token);
    } catch (mailErr) {
      console.error("Failed to send verification email:", mailErr);
    }

    return NextResponse.json({
      success: true,
      requiresVerification: true,
      email,
      orgId: result.organization.id,
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

