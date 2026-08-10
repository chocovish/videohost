import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Invitation token parameter missing" }, { status: 400 });
    }

    const invitation = await db.invitation.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invalid or non-existent invitation token" }, { status: 444 });
    }

    const authCtx = await authenticateRequest(req);
    let currentUserEmail: string | null = null;
    let isEmailMismatch = false;

    if (authCtx?.userId) {
      const user = await db.user.findUnique({
        where: { id: authCtx.userId },
        select: { email: true },
      });
      if (user?.email) {
        currentUserEmail = user.email;
        isEmailMismatch = user.email.toLowerCase() !== invitation.email.toLowerCase();
      }
    }

    const isExpired = new Date(invitation.expiresAt) < new Date();
    const isAccepted = invitation.acceptedAt !== null;

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        isExpired,
        isAccepted,
        organizationName: invitation.organization.name,
        organizationId: invitation.organization.id,
        currentUserEmail,
        isEmailMismatch,
      },
    });
  } catch (error: any) {
    console.error("[Accept Invite GET API] Error:", error);
    return NextResponse.json({ error: "Failed to inspect invitation token" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized: Please sign in to accept this invitation" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Invitation token parameter is required" }, { status: 400 });
    }

    const invitation = await db.invitation.findUnique({
      where: { token },
      include: {
        organization: true,
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invalid invitation token" }, { status: 404 });
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      return NextResponse.json({ error: "This invitation link has expired. Please ask for a new invite." }, { status: 410 });
    }

    if (invitation.acceptedAt) {
      return NextResponse.json({
        success: true,
        message: "Invitation has already been accepted",
        organizationId: invitation.organizationId,
      });
    }

    // Verify logged in user email matches the invitation email
    const currentUser = await db.user.findUnique({
      where: { id: authCtx.userId },
      select: { email: true },
    });

    if (
      !currentUser ||
      !currentUser.email ||
      currentUser.email.toLowerCase() !== invitation.email.toLowerCase()
    ) {
      return NextResponse.json(
        {
          error: `This invitation was issued to ${invitation.email}. You are currently logged in as ${currentUser?.email || "a different user"}. Please sign in with ${invitation.email} to accept.`,
        },
        { status: 403 }
      );
    }

    // Add user to organization members
    await db.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: authCtx.userId,
        },
      },
      create: {
        organizationId: invitation.organizationId,
        userId: authCtx.userId,
        role: invitation.role,
      },
      update: {
        role: invitation.role,
      },
    });

    // Mark invitation as accepted
    await db.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: `You have successfully joined ${invitation.organization.name}`,
      organizationId: invitation.organizationId,
      organizationName: invitation.organization.name,
    });
  } catch (error: any) {
    console.error("[Accept Invite POST API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to accept organization invitation" },
      { status: 500 }
    );
  }
}
