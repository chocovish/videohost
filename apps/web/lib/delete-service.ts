import { db } from "@videohost/db";
import { deleteVideoFromS3 } from "@/lib/s3";
import { cancelTranscodeJob } from "@/lib/queue";

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
  const videoMap = new Map<string, { id: string; originalKey: string; title: string; status: string }>();

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
      },
    });

    for (const v of folderVideos) {
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
      },
    });

    for (const v of directVideos) {
      videoMap.set(v.id, v);
    }
  }

  const allVideosToDelete = Array.from(videoMap.values());

  // 3. Stop any queued/in-progress transcode jobs so we don't orphan running
  // encodes or have the worker re-create assets after deletion
  const inFlightVideos = allVideosToDelete.filter(
    (v) => v.status === "QUEUED" || v.status === "PROCESSING"
  );

  if (inFlightVideos.length > 0) {
    console.log(
      `[Delete Service] Cancelling ${inFlightVideos.length} in-flight transcode job(s) before deletion...`
    );

    // Mark CANCELLED first so any in-flight worker callback is ignored
    await db.video.updateMany({
      where: {
        id: { in: inFlightVideos.map((v) => v.id) },
        status: { in: ["QUEUED", "PROCESSING"] },
      },
      data: { status: "CANCELLED" },
    });

    // Then stop the job on the worker / remove it from the queue
    await Promise.allSettled(inFlightVideos.map((v) => cancelTranscodeJob(v.id)));
  }

  // 4. Delete all files from S3 for all videos
  if (allVideosToDelete.length > 0) {
    console.log(
      `[Delete Service] Deleting S3 assets for ${allVideosToDelete.length} video(s) in org ${organizationId}...`
    );

    // Delete in parallel with allSettled
    await Promise.allSettled(
      allVideosToDelete.map((v) =>
        deleteVideoFromS3(organizationId, v.id, v.originalKey).catch((err) => {
          console.error(`[Delete Service Error] Failed to delete S3 assets for video ${v.id}:`, err);
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
