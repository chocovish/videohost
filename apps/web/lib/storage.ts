/**
 * Storage Provider Abstraction
 * ---------------------------------------------------------------------------
 * Decouples VIDEO_STORAGE=bunny vs default S3 logic.
 * Keeps upload flows isolated for debuggability.
 *
 * Usage:
 *   import { isBunnyEnabled, getStorageType, getPlaybackUrl } from "@/lib/storage"
 *   if (isBunnyEnabled()) { // bunny branch } else { // s3 branch }
 *
 * Also re-exports helpers so callers don’t need to know the underlying
 * implementation; storage-specific modules stay pure.
 * ---------------------------------------------------------------------------
 */

import { isBunnyEnabled as isBunnyFlag } from "./bunny";

export type StorageType = "s3" | "bunny";

export function getStorageType(options?: { requireHls?: boolean }): StorageType {
  if (options?.requireHls) {
    return "s3";
  }
  return isBunnyFlag() ? "bunny" : "s3";
}

export { isBunnyFlag as isBunnyEnabled };

/**
 * Resolve playback URL for any video record, irrespective of storage.
 * Returns:
 *   - Bunny iframe/HLS URL when storageType === "bunny"
 *   - S3/HLS URL via getPlaybackUrl when storageType === "s3"
 */
export async function resolvePlaybackUrl(video: {
  id: string;
  organizationId: string;
  status: string;
  originalKey: string;
  requireHls?: boolean | null;
  storageType?: string | null;
  bunnyVideoId?: string | null;
  bunnyLibraryId?: string | null;
  renditions?: any[];
}): Promise<string | null> {
  if (video.status !== "READY") return null;

  const storageType = (video.storageType || "s3").toLowerCase() as StorageType;

  if (storageType === "bunny") {
    // Bunny: use dedicated helper
    const { getBunnyPlaybackUrl } = await import("./bunny");
    const guid = video.bunnyVideoId || video.originalKey;
    if (!guid) return null;

    // Try to get CDN hostname from env – fallback to iframe embed
    try {
      return getBunnyPlaybackUrl(guid, {
        libraryId: video.bunnyLibraryId || undefined,
      });
    } catch {
      return getBunnyPlaybackUrl(guid);
    }
  }

  // S3 fallback
  const { getPlaybackUrl } = await import("./s3");
  return getPlaybackUrl(video as any);
}

export async function resolveThumbnailUrl(video: {
  storageType?: string | null;
  bunnyVideoId?: string | null;
  thumbnailKey?: string | null;
}): Promise<string | null> {
  const storageType = (video.storageType || "s3").toLowerCase() as StorageType;

  if (storageType === "bunny" && video.bunnyVideoId) {
    const { getBunnyThumbnailUrl } = await import("./bunny");
    // If CDN hostname is not configured, fall back to S3 thumbnailKey if present
    const bunnyThumb = getBunnyThumbnailUrl(video.bunnyVideoId);
    if (bunnyThumb) return bunnyThumb;
    if (video.thumbnailKey) {
      const { getPresignedPlaybackUrl } = await import("./s3");
      return getPresignedPlaybackUrl(video.thumbnailKey);
    }
    return null;
  }

  if (video.thumbnailKey) {
    const { getPresignedPlaybackUrl } = await import("./s3");
    return getPresignedPlaybackUrl(video.thumbnailKey);
  }

  return null;
}

/**
 * Unified delete helper – routes to correct provider based on storageType.
 */
export async function deleteVideoStorage(
  video: {
    organizationId: string;
    id: string;
    originalKey?: string | null;
    storageType?: string | null;
    bunnyVideoId?: string | null;
  }
): Promise<void> {
  const storageType = (video.storageType || "s3").toLowerCase() as StorageType;

  if (storageType === "bunny") {
    // GUID may be in bunnyVideoId or fallback to originalKey (both store GUID for bunny)
    const guid = video.bunnyVideoId || video.originalKey;
    // Validate GUID looks like Bunny GUID (UUID format) — avoid accidental S3 key delete via Bunny API
    const isGuid = guid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guid);
    if (guid && isGuid) {
      const { deleteBunnyVideo } = await import("./bunny");
      console.log(`[Storage] Deleting bunny video ${video.id} (guid=${guid}, bunnyVideoId=${video.bunnyVideoId || "fallback originalKey"})`);
      try {
        await deleteBunnyVideo(guid);
      } catch (err) {
        console.error(`[Storage Delete Error] Bunny delete failed for ${guid}:`, err);
        // Don’t re-throw – allow DB record to be removed even if remote is gone (404 = already deleted)
      }
      return;
    }
    if (guid && !isGuid) {
      console.warn(`[Storage] Bunny video ${video.id} has storageType=bunny but guid "${guid}" doesn't look like UUID — skipping Bunny delete, will try S3 fallback`);
    } else {
      console.warn(`[Storage] Bunny video ${video.id} has no guid (bunnyVideoId and originalKey empty) — nothing to delete on Bunny`);
      return;
    }
  }

  // S3 path
  const { deleteVideoFromS3 } = await import("./s3");
  console.log(`[Storage] Deleting S3 assets for video ${video.id}`);
  await deleteVideoFromS3(video.organizationId, video.id, video.originalKey || undefined);
}

export async function deleteThumbnailStorage(key: string | null | undefined, storageType?: string | null): Promise<void> {
  if (!key) return;
  // Thumbnails for bunny live inside Bunny, not S3, unless we stored them separately.
  // If storageType is bunny we assume thumbnail is on Bunny (or not needed).
  const st = (storageType || "s3").toLowerCase();
  if (st === "bunny") {
    console.log(`[Storage] Bunny thumbnail delete skipped (managed by Bunny) – key=${key}`);
    return;
  }
  const { deleteFileFromS3 } = await import("./s3");
  await deleteFileFromS3(key);
}
