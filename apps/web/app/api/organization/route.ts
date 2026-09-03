import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";
import { getPresignedPlaybackUrl } from "@/lib/s3";
import {
  parseBase64Image,
  deleteOldImage,
  uploadBase64Image,
} from "@/lib/branding-image";

export async function GET(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const organization = await db.organization.findUnique({
      where: { id: authCtx.orgId },
      include: {
        plan: true,
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
    const coverUrl = await getPresignedPlaybackUrl(organization.coverUrl);

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logoUrl,
        coverUrl,
        planId: organization.planId,
        planName: organization.plan?.name || "free",
        plan: organization.plan,
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

    const updateData: { name?: string; logoUrl?: string | null; coverUrl?: string | null } = {};

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

    // 2. Handle Logo Upload or Removal (1:1 Ratio)
    if (body.removeLogo) {
      await deleteOldImage(existingOrg.logoUrl);
      updateData.logoUrl = null;
    } else if (body.logoData || body.newLogoData) {
      const rawLogoData = body.logoData || body.newLogoData;
      if (!parseBase64Image(rawLogoData)) {
        return NextResponse.json(
          { error: "Invalid logo image format. Please upload a valid PNG, JPG, WebP, or SVG." },
          { status: 400 }
        );
      }

      // Delete previous custom logo from S3 if present
      await deleteOldImage(existingOrg.logoUrl);

      const s3Key = await uploadBase64Image({
        organizationId: authCtx.orgId,
        base64Data: rawLogoData,
        folder: "organization-logos",
        filenamePrefix: "logo",
        preset: "logo",
      });
      updateData.logoUrl = s3Key;
    }

    // 3. Handle Cover Photo / Banner Upload or Removal (3:1 / 16:9 Banner)
    if (body.removeCover || body.removeCoverPhoto) {
      await deleteOldImage(existingOrg.coverUrl);
      updateData.coverUrl = null;
    } else if (body.coverData || body.newCoverData || body.coverPhotoData) {
      const rawCoverData = body.coverData || body.newCoverData || body.coverPhotoData;
      if (!parseBase64Image(rawCoverData)) {
        return NextResponse.json(
          { error: "Invalid cover photo format. Please upload a valid PNG, JPG, WebP, or SVG." },
          { status: 400 }
        );
      }

      // Delete previous cover photo from S3 if present
      await deleteOldImage(existingOrg.coverUrl);

      const s3Key = await uploadBase64Image({
        organizationId: authCtx.orgId,
        base64Data: rawCoverData,
        folder: "organization-covers",
        filenamePrefix: "cover",
        preset: "organization-cover",
      });
      updateData.coverUrl = s3Key;
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
    const resolvedCoverUrl = await getPresignedPlaybackUrl(updatedOrg.coverUrl);

    return NextResponse.json({
      message: "Organization updated successfully",
      organization: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        slug: updatedOrg.slug,
        logoUrl: resolvedLogoUrl,
        coverUrl: resolvedCoverUrl,
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
