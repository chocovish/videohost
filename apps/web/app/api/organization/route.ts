import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";
import { getPresignedPlaybackUrl, uploadBufferToS3, deleteFileFromS3 } from "@/lib/s3";

function parseBase64Data(dataString: string): { buffer: Buffer; contentType: string; extension: string } | null {
  const matches = dataString.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return null;

  const contentType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, "base64");

  let extension = "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) extension = "jpg";
  else if (contentType.includes("svg")) extension = "svg";
  else if (contentType.includes("webp")) extension = "webp";
  else if (contentType.includes("gif")) extension = "gif";

  return { buffer, contentType, extension };
}

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

    const logoUrl = await getPresignedPlaybackUrl(organization.logoUrl);

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logoUrl,
        planId: organization.planId,
        planExpiresAt: organization.planExpiresAt,
        billingMode: organization.billingMode,
        billingCycle: organization.billingCycle,
        subscriptionStatus: organization.subscriptionStatus,
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

  // Restrict editing organization to OWNER or ADMIN
  if (authCtx.role === "VIEWER") {
    return NextResponse.json(
      { error: "Forbidden: You do not have permissions to edit organization settings" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const existingOrg = await db.organization.findUnique({
      where: { id: authCtx.orgId },
    });

    if (!existingOrg) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const updateData: { name?: string; logoUrl?: string | null } = {};

    // 1. Handle Display Name Update
    if (body.name !== undefined) {
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

      updateData.name = name;
    }

    // 2. Handle Logo Upload or Removal
    if (body.removeLogo) {
      if (existingOrg.logoUrl) {
        await deleteFileFromS3(existingOrg.logoUrl);
      }
      updateData.logoUrl = null;
    } else if (body.logoData || body.newLogoData) {
      const rawLogoData = body.logoData || body.newLogoData;
      const parsed = parseBase64Data(rawLogoData);
      if (!parsed) {
        return NextResponse.json(
          { error: "Invalid image format. Please upload a valid PNG, JPG, WebP, or SVG." },
          { status: 400 }
        );
      }

      // Delete previous custom logo from S3 if present
      if (existingOrg.logoUrl) {
        await deleteFileFromS3(existingOrg.logoUrl);
      }

      const timestamp = Date.now();
      const s3Key = `organization-logos/${authCtx.orgId}/logo-${timestamp}.${parsed.extension}`;
      await uploadBufferToS3(s3Key, parsed.buffer, parsed.contentType);
      updateData.logoUrl = s3Key;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No update parameters provided" },
        { status: 400 }
      );
    }

    const updatedOrg = await db.organization.update({
      where: { id: authCtx.orgId },
      data: updateData,
    });

    const resolvedLogoUrl = await getPresignedPlaybackUrl(updatedOrg.logoUrl);

    return NextResponse.json({
      message: "Organization updated successfully",
      organization: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        slug: updatedOrg.slug,
        logoUrl: resolvedLogoUrl,
      },
    });
  } catch (error: any) {
    console.error("Error updating organization:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update organization" },
      { status: 500 }
    );
  }
}
