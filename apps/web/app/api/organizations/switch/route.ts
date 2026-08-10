import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";

export async function POST(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    // Verify user belongs to the target organization
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: authCtx.userId,
        },
      },
      include: {
        organization: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Forbidden: You are not a member of this organization" },
        { status: 403 }
      );
    }

    // Update active organization on user profile
    await db.user.update({
      where: { id: authCtx.userId },
      data: { activeOrganizationId: organizationId },
    });

    return NextResponse.json({
      success: true,
      message: `Active organization changed to ${membership.organization.name}`,
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        role: membership.role,
        themeId: membership.organization.themeId,
      },
    });
  } catch (error: any) {
    console.error("[Switch Organization POST API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to switch active organization" },
      { status: 500 }
    );
  }
}
