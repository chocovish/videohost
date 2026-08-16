import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { getPlaybackUrl, getPresignedPlaybackUrl, deleteVideoFromS3 } from "@/lib/s3";
import { db } from "@videohost/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authCtx = await authenticateRequest(req);
  if (!authCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const video = await db.video.findFirst({
    where: { id, organizationId: authCtx.orgId },
    include: { renditions: true },
  });

  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  const computedSizeBytes = video.sizeBytes !== null ? Number(video.sizeBytes) : null;
  const playbackUrl = await getPlaybackUrl(video);
  const thumbnailUrl = video.thumbnailKey ? await getPresignedPlaybackUrl(video.thumbnailKey) : null;

  return NextResponse.json({
    id: video.id,
    title: video.title,
    description: video.description,
    folderId: video.folderId,
    status: video.status,
    progress: video.progress || 0,
    requireHls: video.requireHls,
    durationSeconds: video.durationSeconds,
    sizeBytes: computedSizeBytes,
    sourceResolution: video.sourceWidth ? `${video.sourceWidth}x${video.sourceHeight}` : null,
    shareAccessMode: video.shareAccessMode,
    playbackUrl,
    thumbnailUrl,
    renditions: video.renditions.map((r) => ({
      resolution: r.resolution,
      bitrateKbps: r.bitrateKbps,
      playlistUrl: `/api/hls/${r.storageKey}`,
      sizeBytes: Number(r.sizeBytes || 0),
    })),
    createdAt: video.createdAt,
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authCtx = await authenticateRequest(req);
  if (!authCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const video = await db.video.findFirst({
    where: { id, organizationId: authCtx.orgId },
  });

  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  const dataToUpdate: any = {};
  if (body.title !== undefined) dataToUpdate.title = body.title;
  if (body.description !== undefined) dataToUpdate.description = body.description;
  if (body.shareAccessMode !== undefined) dataToUpdate.shareAccessMode = body.shareAccessMode;

  if (body.folderId !== undefined) {
    const newFolderId = !body.folderId || body.folderId === "root" || body.folderId === "null" ? null : body.folderId;
    if (newFolderId) {
      const targetFolder = await db.folder.findFirst({
        where: { id: newFolderId, organizationId: authCtx.orgId },
      });
      if (!targetFolder) {
        return NextResponse.json({ error: "Destination folder not found" }, { status: 404 });
      }
    }
    dataToUpdate.folderId = newFolderId;
  }

  const updated = await db.video.update({
    where: { id },
    data: dataToUpdate,
  });

  return NextResponse.json({
    ...updated,
    sizeBytes: updated.sizeBytes !== null ? Number(updated.sizeBytes) : null,
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authCtx = await authenticateRequest(req);
  if (!authCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const video = await db.video.findFirst({
    where: { id, organizationId: authCtx.orgId },
  });

  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  const rawEnv = process.env.DELETE_S3_ON_VIDEO_DELETE || "";
  const cleanedEnv = rawEnv.replace(/^["']|["']$/g, "").replace(/["'\r\n]/g, "").trim().toLowerCase();
  const shouldDeleteS3 = cleanedEnv === "true" || cleanedEnv === "1";

  console.log(
    `[Video Delete] Received request to delete video ${id} (Title: "${video.title}"). DELETE_S3_ON_VIDEO_DELETE="${rawEnv}" -> shouldDeleteS3=${shouldDeleteS3}`
  );

  if (shouldDeleteS3) {
    try {
      console.log(`[Video Delete] S3 deletion enabled. Deleting S3 files for video ${id}...`);
      await deleteVideoFromS3(video.organizationId, video.id, video.originalKey);
      console.log(`[Video Delete] S3 file deletion finished for video ${id}.`);
    } catch (err) {
      console.error(`[Video Delete Error] Failed to delete video ${id} files from S3:`, err);
    }
  } else {
    console.log(
      `[Video Delete] S3 deletion is disabled (DELETE_S3_ON_VIDEO_DELETE=${rawEnv}). Skipping S3 cleanup.`
    );
  }

  await db.video.delete({ where: { id } });
  console.log(`[Video Delete] Database record for video ${id} deleted successfully.`);

  return NextResponse.json({ success: true, message: `Video ${id} deleted` });
}
