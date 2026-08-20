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
  if (body.title !== undefined) dataToUpdate.title = body.title.trim();
  if (body.description !== undefined) dataToUpdate.description = body.description ? body.description.trim() : null;
  if (body.shareAccessMode !== undefined) dataToUpdate.shareAccessMode = body.shareAccessMode;

  if (body.removeThumbnail === true || body.thumbnailKey === null) {
    if (video.thumbnailKey) {
      deleteVideoFromS3(video.organizationId, video.id, video.thumbnailKey).catch(() => {
        // Best-effort cleanup of standalone thumbnail
      });
    }
    dataToUpdate.thumbnailKey = null;
  }

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
    include: { renditions: true },
  });

  const computedSizeBytes = updated.sizeBytes !== null ? Number(updated.sizeBytes) : null;
  const playbackUrl = await getPlaybackUrl(updated);
  const thumbnailUrl = updated.thumbnailKey ? await getPresignedPlaybackUrl(updated.thumbnailKey) : null;

  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    description: updated.description,
    folderId: updated.folderId,
    status: updated.status,
    progress: updated.progress || 0,
    requireHls: updated.requireHls,
    durationSeconds: updated.durationSeconds,
    sizeBytes: computedSizeBytes,
    sourceResolution: updated.sourceWidth ? `${updated.sourceWidth}x${updated.sourceHeight}` : null,
    shareAccessMode: updated.shareAccessMode,
    playbackUrl,
    thumbnailUrl,
    renditions: updated.renditions.map((r) => ({
      resolution: r.resolution,
      bitrateKbps: r.bitrateKbps,
      playlistUrl: `/api/hls/${r.storageKey}`,
      sizeBytes: Number(r.sizeBytes || 0),
    })),
    createdAt: updated.createdAt,
  });
}

import { executeDeleteService } from "@/lib/delete-service";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authCtx = await authenticateRequest(req);
  if (!authCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const video = await db.video.findFirst({
    where: { id, organizationId: authCtx.orgId },
  });

  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  const result = await executeDeleteService({
    organizationId: authCtx.orgId,
    videoIds: [id],
  });

  return NextResponse.json({ success: true, ...result });
}
