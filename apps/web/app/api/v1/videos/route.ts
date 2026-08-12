import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { getOrganizationUsage } from "@/lib/usage";
import { getPresignedUploadUrl, getPlaybackUrl, getPresignedPlaybackUrl } from "@/lib/s3";
import { db } from "@videohost/db";

export async function POST(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = authCtx.orgId;

  try {
    const { title, description, folderId: rawFolderId, requireHls = false, durationSeconds, sizeBytes, sourceWidth, sourceHeight } = await req.json();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const folderId = !rawFolderId || rawFolderId === "root" || rawFolderId === "null" ? null : rawFolderId;

    const usage = await getOrganizationUsage(orgId);
    const incomingSize = sizeBytes ? Number(sizeBytes) : 0;
    if (usage.isLimitReached || (incomingSize > 0 && usage.usedBytes + incomingSize > usage.storageLimitBytes)) {
      return NextResponse.json(
        { error: `Organization storage limit reached (${usage.storageLimitGb}GB limit)`, code: "QUOTA_EXCEEDED", usage },
        { status: 403 }
      );
    }

    const isHls = Boolean(requireHls);

    const video = await db.video.create({
      data: {
        organizationId: orgId,
        uploadedByUserId: authCtx.userId,
        folderId: folderId,
        title,
        description: description || null,
        status: "UPLOADING",
        originalKey: "temp",
        shareAccessMode: "PUBLIC",
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
      id: video.id,
      title: video.title,
      status: video.status,
      requireHls: video.requireHls,
      folderId: video.folderId,
      uploadUrl,
      thumbnailUploadUrl,
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

  const formattedVideos = await Promise.all(
    videos.map(async (v) => {
      const computedSizeBytes = v.sizeBytes !== null ? Number(v.sizeBytes) : null;

      return {
        id: v.id,
        title: v.title,
        description: v.description,
        status: v.status,
        progress: v.progress || 0,
        requireHls: v.requireHls,
        folderId: v.folderId,
        folderName: v.folder?.name || null,
        durationSeconds: v.durationSeconds,
        sizeBytes: computedSizeBytes,
        shareAccessMode: v.shareAccessMode,
        playbackUrl: await getPlaybackUrl(v),
        thumbnailUrl: v.thumbnailKey ? await getPresignedPlaybackUrl(v.thumbnailKey) : null,
        createdAt: v.createdAt,
      };
    })
  );

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
