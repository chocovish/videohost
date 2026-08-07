import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { getPublicCdnUrl } from "@/lib/s3";
import { db } from "@videohost/db";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const video = await db.video.findFirst({
    where: { id: params.id, organizationId: authCtx.orgId },
    include: { renditions: true },
  });

  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  return NextResponse.json({
    id: video.id,
    title: video.title,
    description: video.description,
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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const video = await db.video.findFirst({
    where: { id: params.id, organizationId: authCtx.orgId },
  });

  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  const updated = await db.video.update({
    where: { id: params.id },
    data: {
      title: body.title ?? video.title,
      description: body.description ?? video.description,
      visibility: body.visibility ?? video.visibility,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const video = await db.video.findFirst({
    where: { id: params.id, organizationId: authCtx.orgId },
  });

  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  await db.video.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true, message: `Video ${params.id} deleted` });
}
