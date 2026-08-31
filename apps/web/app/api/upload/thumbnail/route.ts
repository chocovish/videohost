import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { getPresignedUploadUrl, getPresignedPlaybackUrl, deleteFileFromS3 } from "@/lib/s3";
import { db } from "@videohost/db";

export async function POST(req: Request) {
  try {
    const authCtx = await authenticateRequest(req);
    if (!authCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = authCtx.orgId;
    const { videoId } = await req.json();

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const video = await db.video.findFirst({
      where: { id: videoId, organizationId: orgId },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Bunny branch: return proxied thumbnail upload URL (same endpoint as bunny thumbnail)
    const storageType = (video as any).storageType || "s3";
    if (storageType === "bunny") {
      const bunnyVideoId = (video as any).bunnyVideoId;
      if (!bunnyVideoId) {
        return NextResponse.json({ error: "Bunny video GUID missing" }, { status: 500 });
      }
      const unique = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const thumbnailKey = `${orgId}/${video.id}/thumbnail-${unique}.webp`;
      await db.video.update({ where: { id: videoId }, data: { thumbnailKey } });

      // For Bunny, client should PUT to the bunny thumbnail proxy
      const proxyUrl = `/api/bunny/thumbnail/${video.id}`;
      console.log(`[Thumbnail Bunny] video ${videoId} guid=${bunnyVideoId} → proxy ${proxyUrl}`);
      // Also provide presigned S3 fallback thumbnailUrl for UI preview (not used for Bunny)
      const thumbnailUrl = await getPresignedPlaybackUrl(thumbnailKey);
      return NextResponse.json({ uploadUrl: proxyUrl, thumbnailUrl, storageType: "bunny", proxyUrl });
    }

    const oldThumbnailKey = video.thumbnailKey;
    const unique = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const thumbnailKey = `${orgId}/${video.id}/thumbnail-${unique}.webp`;

    await db.video.update({
      where: { id: videoId },
      data: { thumbnailKey },
    });

    // Delete previous thumbnail from S3 to prevent orphaned files
    if (oldThumbnailKey && oldThumbnailKey !== thumbnailKey) {
      deleteFileFromS3(oldThumbnailKey).catch((err) =>
        console.error("Failed to delete old thumbnail from S3:", err)
      );
    }

    const uploadUrl = await getPresignedUploadUrl(thumbnailKey, "image/webp");
    const thumbnailUrl = await getPresignedPlaybackUrl(thumbnailKey);

    return NextResponse.json({ uploadUrl, thumbnailUrl, storageType: "s3" });
  } catch (error: any) {
    console.error("Thumbnail upload route error:", error);
    return NextResponse.json({ error: "Failed to generate thumbnail upload URL" }, { status: 500 });
  }
}
