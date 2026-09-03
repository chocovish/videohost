import { db } from "@videohost/db";
import { deleteVideoFromS3 } from "@/lib/s3";
import { cancelTranscodeJob } from "@/lib/queue";
import { deleteVideoStorage } from "@/lib/storage";

export interface BatchDeleteOptions {
  organizationId: string;
  videoIds?: string[];
  folderIds?: string[];
}

export interface BatchDeleteResult {
  deletedVideos: number;
  deletedFolders: number;
  message: string;
}

export async function executeDeleteService({
  organizationId,
  videoIds = [],
  folderIds = [],
}: BatchDeleteOptions): Promise<BatchDeleteResult> {
  const allFolderIdsToDelete = new Set<string>();

  // 1. If folderIds are provided, find all descendants (nested folders) recursively
  if (folderIds.length > 0) {
    const initialFolders = await db.folder.findMany({
      where: {
        id: { in: folderIds },
        organizationId,
      },
      select: { id: true },
    });

    let currentLevelIds = initialFolders.map((f) => f.id);
    for (const id of currentLevelIds) {
      allFolderIdsToDelete.add(id);
    }

    while (currentLevelIds.length > 0) {
      const childFolders = await db.folder.findMany({
        where: {
          parentId: { in: currentLevelIds },
          organizationId,
        },
        select: { id: true },
      });

      const nextLevelIds: string[] = [];
      for (const child of childFolders) {
        if (!allFolderIdsToDelete.has(child.id)) {
          allFolderIdsToDelete.add(child.id);
          nextLevelIds.push(child.id);
        }
      }
      currentLevelIds = nextLevelIds;
    }
  }

  // 2. Find all videos to delete (both directly selected and nested inside any of the folders)
  const videoMap = new Map<
    string,
    { id: string; originalKey: string; title: string; status: string; storageType?: string | null; bunnyVideoId?: string | null }
  >();

  // Videos inside folders
  if (allFolderIdsToDelete.size > 0) {
    const folderVideos = await db.video.findMany({
      where: {
        folderId: { in: Array.from(allFolderIdsToDelete) },
        organizationId,
      },
      select: {
        id: true,
        originalKey: true,
        title: true,
        status: true,
        storageType: true as any,
        bunnyVideoId: true as any,
      } as any,
    });

    for (const v of folderVideos as any) {
      videoMap.set(v.id, v);
    }
  }

  // Explicitly selected videos
  if (videoIds.length > 0) {
    const directVideos = await db.video.findMany({
      where: {
        id: { in: videoIds },
        organizationId,
      },
      select: {
        id: true,
        originalKey: true,
        title: true,
        status: true,
        storageType: true as any,
        bunnyVideoId: true as any,
      } as any,
    });

    for (const v of directVideos as any) {
      videoMap.set(v.id, v);
    }
  }

  const allVideosToDelete = Array.from(videoMap.values());

  // 3. Stop any queued/in-progress transcode jobs — S3 ONLY
  // Bunny Stream encodes server-side outside our worker; no local FFmpeg
  // job to cancel, so we skip this entirely for storageType=bunny.
  const inFlightVideos = allVideosToDelete.filter(
    (v) => (v.status === "QUEUED" || v.status === "PROCESSING") && (v as any).storageType !== "bunny"
  );

  if (inFlightVideos.length > 0) {
    console.log(
      `[Delete Service] Cancelling ${inFlightVideos.length} S3 in-flight transcode job(s) before deletion (bunny videos skipped)...`
    );

    // Mark CANCELLED first so any in-flight worker callback is ignored — only S3 videos
    const s3Ids = inFlightVideos.filter((v) => (v as any).storageType !== "bunny").map((v) => v.id);
    if (s3Ids.length > 0) {
      await db.video.updateMany({
        where: {
          id: { in: s3Ids },
          status: { in: ["QUEUED", "PROCESSING"] },
        },
        data: { status: "CANCELLED" },
      });
    }

    // Then stop the job on the worker / remove it from the queue — S3 only
    await Promise.allSettled(inFlightVideos.map((v) => cancelTranscodeJob(v.id)));
  } else if (allVideosToDelete.some((v) => (v as any).storageType === "bunny" && (v.status === "QUEUED" || v.status === "PROCESSING"))) {
    console.log(`[Delete Service] Bunny video(s) in QUEUED/PROCESSING — skipping local transcode cancel (handled by Bunny)`);
  }

  // 4. Delete all files (S3 or Bunny) for all videos – storage-aware
  if (allVideosToDelete.length > 0) {
    console.log(
      `[Delete Service] Deleting storage assets for ${allVideosToDelete.length} video(s) in org ${organizationId}...`
    );

    // Subtitle .vtt files for Bunny videos live in our S3 (not on Bunny),
    // so clean them explicitly – for S3 videos the whole prefix delete below
    // already covers them, making this a harmless best-effort second pass.
    try {
      const subs = await db.videoSubtitle.findMany({
        where: { videoId: { in: allVideosToDelete.map((v) => v.id) } },
        select: { storageKey: true },
      });
      if (subs.length > 0) {
        const { deleteFileFromS3 } = await import("@/lib/s3");
        await Promise.allSettled(
          subs.map((s) =>
            deleteFileFromS3(s.storageKey).catch((err) => {
              console.error(`[Delete Service Error] Failed to delete subtitle ${s.storageKey}:`, err);
            })
          )
        );
      }
    } catch (subErr) {
      console.warn("[Delete Service Warning] Subtitle cleanup lookup failed:", subErr);
    }

    await Promise.allSettled(
      allVideosToDelete.map((v) =>
        deleteVideoStorage({
          organizationId,
          id: v.id,
          originalKey: v.originalKey,
          storageType: (v as any).storageType || "s3",
          bunnyVideoId: (v as any).bunnyVideoId,
        }).catch((err) => {
          console.error(`[Delete Service Error] Failed to delete storage for video ${v.id}:`, err);
        })
      )
    );
  }

  // 5. Delete Video DB records
  let deletedVideosCount = 0;
  if (allVideosToDelete.length > 0) {
    const videoIdsToDelete = allVideosToDelete.map((v) => v.id);
    const videoDeleteRes = await db.video.deleteMany({
      where: {
        id: { in: videoIdsToDelete },
        organizationId,
      },
    });
    deletedVideosCount = videoDeleteRes.count;
  }

  // 6. Delete Folder DB records
  let deletedFoldersCount = 0;
  if (allFolderIdsToDelete.size > 0) {
    const folderDeleteRes = await db.folder.deleteMany({
      where: {
        id: { in: Array.from(allFolderIdsToDelete) },
        organizationId,
      },
    });
    deletedFoldersCount = folderDeleteRes.count;
  }

  return {
    deletedVideos: deletedVideosCount,
    deletedFolders: deletedFoldersCount,
    message: `Deleted ${deletedVideosCount} video(s) and ${deletedFoldersCount} folder(s)`,
  };
}
