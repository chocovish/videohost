import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getOrganizationUsage } from "@/lib/usage";
import { getPresignedUploadUrl } from "@/lib/s3";
import { db } from "@videohost/db";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id || !(session as any).organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (session as any).organizationId as string;
    const userId = session.user.id;
    const role = (session as any).role || "MEMBER";

    if (!can("videos.upload", { userId, role })) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { title, description, folderId: rawFolderId, requireHls = false, durationSeconds, sizeBytes, sourceWidth, sourceHeight } = await req.json();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const folderId = !rawFolderId || rawFolderId === "root" || rawFolderId === "null" ? null : rawFolderId;

    if (folderId) {
      const folderExists = await db.folder.findFirst({
        where: { id: folderId, organizationId: orgId },
      });
      if (!folderExists) {
        return NextResponse.json({ error: "Target folder not found" }, { status: 404 });
      }
    }

    // Check plan quota storage limits
    const usage = await getOrganizationUsage(orgId);
    const incomingSize = sizeBytes ? Number(sizeBytes) : 0;
    if (usage.isLimitReached || (incomingSize > 0 && usage.usedBytes + incomingSize > usage.storageLimitBytes)) {
      return NextResponse.json(
        {
          error: `Organization storage limit reached (${usage.storageLimitGb}GB plan limit). Upgrade plan or delete videos to free space.`,
          code: "QUOTA_EXCEEDED",
          usage,
        },
        { status: 403 }
      );
    }

    const org = await db.organization.findUnique({
      where: { id: orgId },
      include: { plan: true },
    });

    const isFreePlan = org?.plan.name.toLowerCase() === "free";
    // Adaptive bitrate storage (HLS) is only available on Pro and Enterprise plans
    const isHls = isFreePlan ? false : Boolean(requireHls);

    // Create DB Video record (for non-HLS videos, store sizeBytes immediately upon upload; for HLS videos, store after processing)
    const video = await db.video.create({
      data: {
        organizationId: orgId,
        uploadedByUserId: userId,
        folderId: folderId,
        title,
        description: description || null,
        status: "UPLOADING",
        originalKey: `temp-key`,
        requireHls: isHls,
        sizeBytes: sizeBytes ? BigInt(sizeBytes) : null,
        durationSeconds: durationSeconds ? Math.round(Number(durationSeconds)) : null,
        sourceWidth: sourceWidth ? Math.round(Number(sourceWidth)) : null,
        sourceHeight: sourceHeight ? Math.round(Number(sourceHeight)) : null,
      },
    });

    const originalKey = `${orgId}/${video.id}/original.mp4`;
    const thumbnailKey = `${orgId}/${video.id}/thumbnail.jpg`;

    await db.video.update({
      where: { id: video.id },
      data: { originalKey, thumbnailKey },
    });

    const uploadUrl = await getPresignedUploadUrl(originalKey, "video/mp4");
    const thumbnailUploadUrl = await getPresignedUploadUrl(thumbnailKey, "image/jpeg");

    return NextResponse.json({
      videoId: video.id,
      uploadUrl,
      thumbnailUploadUrl,
      key: originalKey,
    });
  } catch (error: any) {
    console.error("Presigned upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
