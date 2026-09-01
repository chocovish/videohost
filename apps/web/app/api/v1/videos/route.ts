import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { getOrganizationUsage } from "@/lib/usage";
import { getPresignedUploadUrl, getPlaybackUrl, getPresignedPlaybackUrl } from "@/lib/s3";
import { getStorageType } from "@/lib/storage";
import { db } from "@videohost/db";

export async function POST(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = authCtx.orgId;

  try {
    const {
      title,
      description,
      folderId: rawFolderId,
      requireHls = false,
      durationSeconds,
      sizeBytes,
      sourceWidth,
      sourceHeight,
      fileName,
      contentType,
      shareAccessMode = "PUBLIC",
      price,
      currency = "USD",
      countryPricing,
      inviteEmails = [],
    } = await req.json();
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
    const validModes = ["PUBLIC", "RESTRICTED", "PRIVATE", "PURCHASABLE"];
    const resolvedMode = validModes.includes(shareAccessMode) ? shareAccessMode : "PUBLIC";
    const parsedPrice = resolvedMode === "PURCHASABLE" && price !== undefined && price !== null ? parseFloat(String(price)) : null;

    const video = await db.video.create({
      data: {
        organizationId: orgId,
        uploadedByUserId: authCtx.userId,
        folderId: folderId,
        title,
        description: description || null,
        status: "UPLOADING",
        originalKey: "temp",
        shareAccessMode: resolvedMode as any,
        price: parsedPrice,
        currency: currency || "USD",
        countryPricing: resolvedMode === "PURCHASABLE" && countryPricing ? countryPricing : undefined,
        requireHls: isHls,
        sizeBytes: sizeBytes ? BigInt(sizeBytes) : null,
        durationSeconds: durationSeconds ? Math.round(Number(durationSeconds)) : null,
        sourceWidth: sourceWidth ? Math.round(Number(sourceWidth)) : null,
        sourceHeight: sourceHeight ? Math.round(Number(sourceHeight)) : null,
      },
    });

    if (resolvedMode === "RESTRICTED" && Array.isArray(inviteEmails) && inviteEmails.length > 0) {
      try {
        await db.sharedEmail.createMany({
          data: inviteEmails.map((email: string) => ({
            videoId: video.id,
            email: email.trim().toLowerCase(),
          })),
          skipDuplicates: true,
        });
      } catch (emailErr) {
        console.warn("Failed to create initial shared emails for video:", emailErr);
      }
    }

    // ------------------------------------------------------------------
    // Branch: Bunny.net Stream vs S3
    // ------------------------------------------------------------------
    const storageType = getStorageType({ requireHls: isHls });
    console.log(`[Upload Init] storageType=${storageType} for video ${video.id} (org ${orgId})`);

    if (storageType === "bunny") {
      // --------- BUNNY PATH -------------------------------------------------
      try {
        const { ensureBunnyCollectionForOrg, createBunnyVideo, createBunnyTusCredentials, getBunnyConfig } = await import(
          "@/lib/bunny"
        );
        const { collectionId, collectionName } = await ensureBunnyCollectionForOrg(orgId);
        const cfg = getBunnyConfig();
        const bunnyVideo = await createBunnyVideo({ title, collectionId });
        const bunnyVideoId = bunnyVideo.guid;

        const unique = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const thumbnailKey = `videos/${orgId}/${video.id}/thumbnail-${unique}.webp`;

        await db.video.update({
          where: { id: video.id },
          data: {
            originalKey: bunnyVideoId, // store guid as originalKey for traceability
            storageType: "bunny",
            bunnyVideoId,
            bunnyLibraryId: cfg.libraryId,
            bunnyCollectionId: collectionId,
            thumbnailKey, // keep for S3 thumbnail fallback; Bunny thumb uploaded via proxy
            storageMeta: {
              provider: "bunny",
              libraryId: cfg.libraryId,
              collectionId,
              collectionName,
              bunnyGuid: bunnyVideoId,
            } as any,
          },
        });

        const tus = createBunnyTusCredentials(bunnyVideoId, 86400, cfg);

        // Proxy URLs (keeps API key secret) – client PUTs here, we stream to Bunny
        const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "";
        const proxyUploadUrl = `/api/bunny/upload/${video.id}`;
        const proxyThumbnailUploadUrl = `/api/bunny/thumbnail/${video.id}`;

        console.log(`[Upload Init Bunny] video ${video.id} → bunny guid ${bunnyVideoId}, collection ${collectionId}`);

        return NextResponse.json({
          id: video.id,
          title: video.title,
          status: video.status,
          requireHls: video.requireHls,
          folderId: video.folderId,
          storageType: "bunny",
          bunnyVideoId,
          libraryId: cfg.libraryId,
          collectionId,
          uploadUrl: proxyUploadUrl,
          thumbnailUploadUrl: proxyThumbnailUploadUrl,
          // TUS credentials for clients that want resumable upload directly to Bunny
          tus: {
            endpoint: tus.tusEndpoint,
            videoId: tus.videoId,
            libraryId: tus.libraryId,
            expirationTime: tus.expirationTime,
            signature: tus.signature,
          },
          originalKey: bunnyVideoId,
          createdAt: video.createdAt,
        });
      } catch (bunnyErr: any) {
        console.error("[Upload Init Bunny Error]", bunnyErr);
        // Cleanup DB record if bunny creation failed
        await db.video.delete({ where: { id: video.id } }).catch(() => {});
        return NextResponse.json(
          { error: bunnyErr?.message || "Failed to create Bunny video", code: "BUNNY_ERROR" },
          { status: 500 }
        );
      }
    }

    // --------- S3 PATH (default) -------------------------------------------
    let ext = "mp4";
    if (fileName && typeof fileName === "string" && fileName.includes(".")) {
      const parts = fileName.split(".");
      const extractedExt = parts.pop()?.toLowerCase();
      if (extractedExt && ["mp4", "mkv", "webm", "mov", "avi"].includes(extractedExt)) {
        ext = extractedExt;
      }
    } else if (contentType?.includes("matroska") || contentType?.includes("mkv")) {
      ext = "mkv";
    }

    const resolvedContentType = contentType || (ext === "mkv" ? "video/x-matroska" : "video/mp4");
    const unique = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const originalKey = `videos/${orgId}/${video.id}/original.${ext}`;
    const thumbnailKey = `videos/${orgId}/${video.id}/thumbnail-${unique}.webp`;

    await db.video.update({
      where: { id: video.id },
      data: { originalKey, thumbnailKey, storageType: "s3" },
    });

    const uploadUrl = await getPresignedUploadUrl(originalKey, resolvedContentType);
    const thumbnailUploadUrl = await getPresignedUploadUrl(thumbnailKey, "image/webp");

    console.log(`[Upload Init S3] video ${video.id} → key ${originalKey}`);

    return NextResponse.json({
      id: video.id,
      title: video.title,
      status: video.status,
      requireHls: video.requireHls,
      folderId: video.folderId,
      storageType: "s3",
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
      const { resolvePlaybackUrl, resolveThumbnailUrl } = await import("@/lib/storage");

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
        price: v.price,
        currency: v.currency || "USD",
        storageType: (v as any).storageType || "s3",
        bunnyVideoId: (v as any).bunnyVideoId || null,
        playbackUrl: await resolvePlaybackUrl(v as any),
        thumbnailUrl: await resolveThumbnailUrl(v as any),
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
