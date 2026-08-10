import { NextResponse } from "next/server";
import crypto from "crypto";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";
import { sendOrgInviteEmail } from "@/lib/mail";

export async function POST(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Restrict sending invitations to OWNER or ADMIN
  if (authCtx.role !== "OWNER" && authCtx.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Only Organization Owners and Admins can invite team members" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { email, role } = body;

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: "Invalid email address format" }, { status: 400 });
    }

    const targetRole = ["ADMIN", "MEMBER", "VIEWER"].includes(role) ? role : "MEMBER";

    const organization = await db.organization.findUnique({
      where: { id: authCtx.orgId },
      select: { id: true, name: true },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Check if user is already a member
    const existingMember = await db.organizationMember.findFirst({
      where: {
        organizationId: authCtx.orgId,
        user: { email: cleanEmail },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "User with this email is already a member of your organization" },
        { status: 400 }
      );
    }

    // Clear any previous unaccepted invitations for this email in this org
    await db.invitation.deleteMany({
      where: {
        organizationId: authCtx.orgId,
        email: cleanEmail,
      },
    });

    // Create new invitation token valid for 7 days
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await db.invitation.create({
      data: {
        organizationId: authCtx.orgId,
        email: cleanEmail,
        role: targetRole as any,
        token,
        expiresAt,
      },
    });

    // Fetch sender user details
    const sender = await db.user.findUnique({
      where: { id: authCtx.userId },
      select: { name: true, email: true },
    });

    const senderName = sender?.name || sender?.email?.split("@")[0] || "An organization admin";
    const baseUrl = process.env.APP_URL || "http://localhost:3000";
    const inviteUrl = `${baseUrl}/invite/${token}`;

    let emailSent = false;
    let emailErrorMessage = "";

    try {
      await sendOrgInviteEmail({
        toEmail: cleanEmail,
        senderName,
        organizationName: organization.name,
        role: targetRole,
        inviteUrl,
      });
      emailSent = true;
    } catch (mailErr: any) {
      console.error("[Invite API] Error sending invitation email:", mailErr);
      emailErrorMessage = mailErr?.message || "Failed to deliver email message";
    }

    if (!emailSent) {
      return NextResponse.json({
        success: false,
        error: `Invitation token generated, but email delivery failed: ${emailErrorMessage}`,
        invitation,
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      message: `Invitation successfully sent to ${cleanEmail}`,
      invitation,
    });
  } catch (error: any) {
    console.error("[Invite API] Internal error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process organization invitation" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const invitations = await db.invitation.findMany({
      where: {
        organizationId: authCtx.orgId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: "desc" },
    });

    return NextResponse.json({ invitations });
  } catch (error: any) {
    console.error("[Invite API] Error fetching invitations:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (authCtx.role !== "OWNER" && authCtx.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Only Organization Owners and Admins can revoke invitations" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const inviteId = searchParams.get("id");

    if (!inviteId) {
      return NextResponse.json({ error: "Invitation ID parameter is required" }, { status: 400 });
    }

    await db.invitation.deleteMany({
      where: {
        id: inviteId,
        organizationId: authCtx.orgId,
      },
    });

    return NextResponse.json({ success: true, message: "Invitation revoked successfully" });
  } catch (error: any) {
    console.error("[Invite API] Error revoking invitation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to revoke invitation" },
      { status: 500 }
    );
  }
}
