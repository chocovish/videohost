import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { getOrganizationUsage } from "@/lib/usage";
import { getPresignedUploadUrl, getPublicCdnUrl, getPlaybackUrl } from "@/lib/s3";
import { db } from "@videohost/db";

export async function POST(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = authCtx.orgId;

  try {
    const { title, description, visibility, folderId: rawFolderId, requireHls = false, durationSeconds, sourceWidth, sourceHeight } = await req.json();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const folderId = !rawFolderId || rawFolderId === "root" || rawFolderId === "null" ? null : rawFolderId;

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
        folderId: folderId,
        title,
        description: description || null,
        status: "UPLOADING",
        originalKey: "temp",
        visibility: visibility || "PRIVATE",
        requireHls: Boolean(requireHls),
        durationSeconds: durationSeconds ? Math.round(Number(durationSeconds)) : null,
        sourceWidth: sourceWidth ? Math.round(Number(sourceWidth)) : null,
        sourceHeight: sourceHeight ? Math.round(Number(sourceHeight)) : null,
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
      requireHls: video.requireHls,
      folderId: video.folderId,
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
  const rawFolderId = searchParams.get("folderId");

  const whereCondition: any = { organizationId: authCtx.orgId };

  if (rawFolderId === "all") {
    // Return all videos regardless of folder
  } else if (!rawFolderId || rawFolderId === "root" || rawFolderId === "null") {
    whereCondition.folderId = null;
  } else {
    whereCondition.folderId = rawFolderId;
  }

  const videos = await db.video.findMany({
    where: whereCondition,
    include: { renditions: true, folder: true },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  const total = await db.video.count({
    where: whereCondition,
  });

  const formattedVideos = videos.map((v) => ({
    id: v.id,
    title: v.title,
    description: v.description,
    status: v.status,
    requireHls: v.requireHls,
    folderId: v.folderId,
    folderName: v.folder?.name || null,
    durationSeconds: v.durationSeconds,
    visibility: v.visibility,
    playbackUrl: getPlaybackUrl(v),
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
