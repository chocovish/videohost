import { NextResponse } from "next/server";
import { db } from "@videohost/db";
import { authenticateRequest } from "@/lib/api-auth";
import { deleteFileFromS3, extractFileName, getPresignedDownloadUrl, getVideoOriginalS3Key } from "@/lib/s3";

/** Download name shown to the user: video title + the original file's extension. */
function buildDownloadFileName(title: string, originalKey: string): string {
  const sourceName = extractFileName(originalKey);
  const extension = sourceName.includes(".") ? sourceName.slice(sourceName.lastIndexOf(".")) : "";
  const baseName = title.trim().replace(/[\\/:*?"<>|]+/g, "_");
  return `${baseName || "video"}${extension}`;
}

function isBunnyStored(video: { storageType?: string | null; bunnyVideoId?: string | null }): boolean {
  return (video.storageType || "s3").toLowerCase() === "bunny" || Boolean(video.bunnyVideoId);
}

/** Presigned, attachment-disposition URL for the original source file. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authCtx = await authenticateRequest(req);
  if (!authCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const video = await db.video.findFirst({
    where: { id, organizationId: authCtx.orgId },
  });

  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  if (isBunnyStored(video)) {
    return NextResponse.json(
      { error: "This video is stored on Bunny Stream, so its original file is not available here." },
      { status: 400 }
    );
  }

  if (video.originalDeleted) {
    return NextResponse.json({ error: "The original file has been deleted from storage." }, { status: 409 });
  }

  const originalS3Key = getVideoOriginalS3Key(video.organizationId, video.id, video.originalKey);
  const fileName = buildDownloadFileName(video.title, video.originalKey);

  return NextResponse.json({
    url: await getPresignedDownloadUrl(originalS3Key, fileName),
    fileName,
  });
}

/** Deletes only the original source file from storage, leaving every rendition intact. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authCtx = await authenticateRequest(req);
  if (!authCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const video = await db.video.findFirst({
    where: { id, organizationId: authCtx.orgId },
    include: { renditions: true },
  });

  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  if (isBunnyStored(video)) {
    return NextResponse.json(
      { error: "This video is stored on Bunny Stream, so its original file cannot be deleted here." },
      { status: 400 }
    );
  }

  if (video.originalDeleted) {
    return NextResponse.json({ error: "The original file has already been deleted." }, { status: 409 });
  }

  // Playback falls back to the original file when no renditions exist, so never
  // remove it while it is still the only playable asset.
  if (video.renditions.length === 0) {
    return NextResponse.json(
      { error: "The original file can only be deleted once transcoded renditions are available." },
      { status: 409 }
    );
  }

  const originalS3Key = getVideoOriginalS3Key(video.organizationId, video.id, video.originalKey);

  try {
    await deleteFileFromS3(originalS3Key, { throwOnError: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete the original file from storage. Please try again." },
      { status: 502 }
    );
  }

  // sizeBytes tracks the original plus all renditions, so drop the original's share
  // (same math the renditions tab uses) and never report more than was stored.
  const renditionsSizeBytes = video.renditions.reduce((sum, r) => sum + Number(r.sizeBytes || 0), 0);
  const sizeBytesWithoutOriginal =
    video.sizeBytes !== null ? BigInt(Math.min(Number(video.sizeBytes), renditionsSizeBytes)) : null;

  const updated = await db.video.update({
    where: { id },
    data: { originalDeleted: true, sizeBytes: sizeBytesWithoutOriginal },
  });

  console.log(`[Video Original Delete] Removed original "${originalS3Key}" for video ${id}`);

  return NextResponse.json({
    success: true,
    originalDeleted: updated.originalDeleted,
    sizeBytes: updated.sizeBytes !== null ? Number(updated.sizeBytes) : null,
  });
}
