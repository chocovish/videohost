import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { getOrganizationUsage } from "@/lib/usage";
import { getPresignedUploadUrl, getPublicCdnUrl } from "@/lib/s3";
import { db } from "@videohost/db";

export async function POST(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = authCtx.orgId;

  try {
    const { title, description, visibility } = await req.json();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const usage = await getOrganizationUsage(orgId);
    if (usage.isLimitReached) {
      return NextResponse.json(
        { error: "Usage limit reached for organization", code: "QUOTA_EXCEEDED", usage },
        { status: 403 }
      );
    }

    const video = await db.video.create({
      data: {
        organizationId: orgId,
        uploadedByUserId: authCtx.userId,
        title,
        description: description || null,
        status: "UPLOADING",
        originalKey: "temp",
        visibility: visibility || "PRIVATE",
      },
    });

    const originalKey = `${orgId}/${video.id}/original.mp4`;
    await db.video.update({
      where: { id: video.id },
      data: { originalKey },
    });

    const uploadUrl = await getPresignedUploadUrl(originalKey, "video/mp4");

    return NextResponse.json({
      id: video.id,
      title: video.title,
      status: video.status,
      uploadUrl,
      originalKey,
      createdAt: video.createdAt,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create video" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  const videos = await db.video.findMany({
    where: { organizationId: authCtx.orgId },
    include: { renditions: true },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  const total = await db.video.count({
    where: { organizationId: authCtx.orgId },
  });

  const formattedVideos = videos.map((v) => ({
    id: v.id,
    title: v.title,
    description: v.description,
    status: v.status,
    durationSeconds: v.durationSeconds,
    visibility: v.visibility,
    playbackUrl: v.status === "READY" ? getPublicCdnUrl(`${v.organizationId}/${v.id}/hls/master.m3u8`) : null,
    thumbnailUrl: v.thumbnailUrl,
    createdAt: v.createdAt,
  }));

  return NextResponse.json({
    data: formattedVideos,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
