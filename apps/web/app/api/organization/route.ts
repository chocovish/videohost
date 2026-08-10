import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";

export async function GET(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const organization = await db.organization.findUnique({
      where: { id: authCtx.orgId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        invitations: {
          where: {
            acceptedAt: null,
            expiresAt: { gt: new Date() },
          },
          orderBy: { expiresAt: "desc" },
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        planId: organization.planId,
        createdAt: organization.createdAt,
        members: organization.members.map((m) => ({
          id: m.id,
          role: m.role,
          joinedAt: m.joinedAt,
          user: {
            id: m.user.id,
            name: m.user.name || m.user.email?.split("@")[0] || "User",
            email: m.user.email || "",
          },
        })),
        invitations: organization.invitations.map((inv) => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          token: inv.token,
          expiresAt: inv.expiresAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("Error fetching organization:", error);
    return NextResponse.json({ error: "Failed to fetch organization details" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Restrict editing organization name to OWNER or ADMIN
  if (authCtx.role === "VIEWER") {
    return NextResponse.json(
      { error: "Forbidden: You do not have permissions to edit organization settings" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }

    if (name.length < 2) {
      return NextResponse.json(
        { error: "Organization name must be at least 2 characters long" },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: "Organization name must be 100 characters or less" },
        { status: 400 }
      );
    }

    const updatedOrg = await db.organization.update({
      where: { id: authCtx.orgId },
      data: { name },
    });

    return NextResponse.json({
      message: "Organization name updated successfully",
      organization: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        slug: updatedOrg.slug,
      },
    });
  } catch (error: any) {
    console.error("Error updating organization name:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update organization name" },
      { status: 500 }
    );
  }
}
