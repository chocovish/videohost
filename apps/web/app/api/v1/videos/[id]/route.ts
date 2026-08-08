import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { getPublicCdnUrl, deleteVideoFromS3 } from "@/lib/s3";
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

  return NextResponse.json({
    id: video.id,
    title: video.title,
    description: video.description,
    folderId: video.folderId,
    status: video.status,
    durationSeconds: video.durationSeconds,
    sourceResolution: video.sourceWidth ? `${video.sourceWidth}x${video.sourceHeight}` : null,
    visibility: video.visibility,
    playbackUrl: video.status === "READY" ? getPublicCdnUrl(`${video.organizationId}/${video.id}/hls/master.m3u8`) : null,
    thumbnailUrl: video.thumbnailUrl,
    renditions: video.renditions.map((r) => ({
      resolution: r.resolution,
      bitrateKbps: r.bitrateKbps,
      playlistUrl: getPublicCdnUrl(r.storageKey),
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

  const updated = await db.video.update({
    where: { id },
    data: {
      title: body.title ?? video.title,
      description: body.description ?? video.description,
      visibility: body.visibility ?? video.visibility,
    },
  });

  return NextResponse.json(updated);
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

