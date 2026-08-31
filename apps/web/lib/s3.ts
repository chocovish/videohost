import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  PutBucketCorsCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2Endpoint = (process.env.R2_ENDPOINT || "http://localhost:9000").replace(/^["']|["']$/g, "").trim();
const r2AccessKey = (process.env.R2_ACCESS_KEY_ID || "minioadmin").replace(/^["']|["']$/g, "").trim();
const r2SecretKey = (process.env.R2_SECRET_ACCESS_KEY || "passpass").replace(/^["']|["']$/g, "").trim();
const r2Bucket = (process.env.R2_BUCKET_NAME || "videohost").replace(/^["']|["']$/g, "").trim();

function getRegionFromEndpoint(endpoint: string): string {
  if (process.env.R2_REGION || process.env.S3_REGION) {
    return (process.env.R2_REGION || process.env.S3_REGION!).replace(/^["']|["']$/g, "").trim();
  }
  const ociMatch = endpoint.match(/(?:compat\.objectstorage|objectstorage)\.([a-z0-9-]+)\.oraclecloud\.com/i);
  if (ociMatch && ociMatch[1]) {
    return ociMatch[1];
  }
  const awsMatch = endpoint.match(/s3[.-]([a-z0-9-]+)\.amazonaws\.com/i);
  if (awsMatch && awsMatch[1]) {
    return awsMatch[1];
  }
  return "auto";
}

const region = getRegionFromEndpoint(r2Endpoint);

export const s3 = new S3Client({
  region,
  endpoint: r2Endpoint,
  credentials: {
    accessKeyId: r2AccessKey,
    secretAccessKey: r2SecretKey,
  },
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_SUPPORTED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

export const BUCKET_NAME = r2Bucket;

export async function ensureBucketExists(): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
  } catch (err: any) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404 || err.name === "NoSuchBucket") {
      try {
        await s3.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
      } catch (createErr) {
        console.error("Failed to auto-create bucket:", createErr);
      }
    }
  }

  // Ensure CORS headers are set on S3/MinIO for playback and segment requests
  try {
    await s3.send(
      new PutBucketCorsCommand({
        Bucket: BUCKET_NAME,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ["*"],
              AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
              AllowedOrigins: ["*"],
              ExposeHeaders: ["ETag", "Content-Range", "Accept-Ranges", "Content-Length"],
              MaxAgeSeconds: 3000,
            },
          ],
        },
      })
    );
  } catch (policyErr) {
    // Ignore policy errors if CORS already configured or unsupported by provider
  }
}

export async function getPresignedUploadUrl(key: string, contentType: string = "video/mp4"): Promise<string> {
  await ensureBucketExists();

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(s3, command, { expiresIn: 3600 });
}

export async function getPresignedPlaybackUrl(key?: string | null, expiresInSeconds: number = 10000): Promise<string> {
  if (!key) return "";
  if (key.startsWith("http://") || key.startsWith("https://") || key.startsWith("data:") || key.startsWith("/")) {
    return key;
  }
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}


export function getRenditionPlaybackUrl(storageKey: string): string {
  const mode = (
    process.env.STREAMING_PROTOCOL ||
    process.env.NEXT_PUBLIC_STREAMING_PROTOCOL ||
    "dash"
  ).toLowerCase().trim();

  // Strip any specific manifest filename if present to get the generic base key
  const cleanKey = storageKey.replace(/\/(?:master\.(?:mpd|m3u8)|manifest\.mpd)?$/, "");
  const manifest = mode === "hls" ? "master.m3u8" : "master.mpd";
  return `/api/hls/${cleanKey}/${manifest}`;
}

export async function getPlaybackUrl(video: {
  status: string;
  organizationId: string;
  id: string;
  originalKey: string;
  requireHls?: boolean;
  renditions?: any[];
  storageType?: string | null;
  bunnyVideoId?: string | null;
  bunnyLibraryId?: string | null;
}): Promise<string | null> {
  if (video.status !== "READY") return null;

  // Bunny branch – provide CDN / iframe URL directly
  const isBunnyStorage = ((video as any).storageType?.toLowerCase?.() === "bunny") || Boolean((video as any).bunnyVideoId);
  const hasBunnyId = Boolean((video as any).bunnyVideoId);
  if (isBunnyStorage || hasBunnyId) {
    const guid = (video as any).bunnyVideoId || video.originalKey;
    if (!guid) return null;
    try {
      const { getBunnyPlaybackUrl } = await import("./bunny");
      return getBunnyPlaybackUrl(guid, { libraryId: (video as any).bunnyLibraryId || undefined });
    } catch {
      // Fallback to guid if bunny module unavailable
      return guid;
    }
  }

  if (video.requireHls || (video.renditions && video.renditions.length > 0)) {
    const rawStorageKey = video.renditions?.[0]?.storageKey;
    if (rawStorageKey) {
      return getRenditionPlaybackUrl(rawStorageKey);
    }
    const mode = (
      process.env.STREAMING_PROTOCOL ||
      process.env.NEXT_PUBLIC_STREAMING_PROTOCOL ||
      "dash"
    ).toLowerCase().trim();

    if (mode === "hls") {
      return getHlsPlaybackUrl(video.organizationId, video.id);
    }
    return getDashPlaybackUrl(video.organizationId, video.id);
  }
  return await getPresignedPlaybackUrl(video.originalKey);
}

export async function getThumbnailPlaybackUrl(video: {
  thumbnailKey?: string | null;
  storageType?: string | null;
  bunnyVideoId?: string | null;
}): Promise<string | null> {
  const st = ((video as any).storageType || "").toLowerCase();
  if ((st === "bunny" || (video as any).bunnyVideoId) && (video as any).bunnyVideoId) {
    try {
      const { getBunnyThumbnailUrl } = await import("./bunny");
      const thumb = getBunnyThumbnailUrl((video as any).bunnyVideoId);
      if (thumb) return thumb;
    } catch {}
  }
  if (video.thumbnailKey) return getPresignedPlaybackUrl(video.thumbnailKey);
  return null;
}

export function getDashPlaybackUrl(organizationId: string, videoId: string): string {
  return `/api/hls/${organizationId}/${videoId}/dash/master.mpd`;
}

export function getHlsPlaybackUrl(organizationId: string, videoId: string): string {
  return `/api/hls/${organizationId}/${videoId}/dash/master.m3u8`;
}

export async function deleteVideoFromS3(
  organizationId: string,
  videoId: string,
  originalKey?: string | null
): Promise<void> {
  const prefix = `${organizationId}/${videoId}/`;
  let continuationToken: string | undefined = undefined;

  console.log(`[S3 Delete] Starting S3 deletion for video ${videoId} (org: ${organizationId}, prefix: "${prefix}")...`);
  let totalDeleted = 0;

  do {
    const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const listResponse = await s3.send(listCommand);
    const objects = listResponse.Contents || [];

    if (objects.length > 0) {
      console.log(`[S3 Delete] Found ${objects.length} object(s) in S3 under prefix "${prefix}"`);
      const keysToDelete = objects.filter((o) => o.Key).map((obj) => ({ Key: obj.Key! }));

      try {
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: BUCKET_NAME,
          Delete: {
            Objects: keysToDelete,
            Quiet: false,
          },
          ChecksumAlgorithm: "SHA256",
        });
        const deleteRes = await s3.send(deleteCommand);

        if (deleteRes.Deleted && deleteRes.Deleted.length > 0) {
          totalDeleted += deleteRes.Deleted.length;
          console.log(`[S3 Delete] Successfully deleted batch of ${deleteRes.Deleted.length} object(s) from S3.`);
        }

        if (deleteRes.Errors && deleteRes.Errors.length > 0) {
          console.error(`[S3 Delete Error] ${deleteRes.Errors.length} object(s) failed batch delete:`, deleteRes.Errors);
          for (const errObj of deleteRes.Errors) {
            if (errObj.Key) {
              try {
                await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: errObj.Key }));
                totalDeleted++;
                console.log(`[S3 Delete Fallback] Successfully deleted key: ${errObj.Key}`);
              } catch (singleErr) {
                console.error(`[S3 Delete Fallback Error] Failed to delete key ${errObj.Key}:`, singleErr);
              }
            }
          }
        }
      } catch (batchErr) {
        console.warn(`[S3 Delete Warning] Batch delete failed, falling back to individual DeleteObjectCommand calls:`, batchErr);
        for (const obj of keysToDelete) {
          try {
            await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: obj.Key }));
            totalDeleted++;
            console.log(`[S3 Delete Fallback] Successfully deleted key: ${obj.Key}`);
          } catch (singleErr) {
            console.error(`[S3 Delete Fallback Error] Failed to delete key ${obj.Key}:`, singleErr);
          }
        }
      }
    } else {
      console.log(`[S3 Delete] No objects found in S3 under prefix "${prefix}"`);
    }

    continuationToken = listResponse.NextContinuationToken;
  } while (continuationToken);

  if (originalKey && !originalKey.startsWith(prefix)) {
    console.log(`[S3 Delete] Deleting standalone originalKey: "${originalKey}"...`);
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: originalKey }));
      totalDeleted++;
      console.log(`[S3 Delete] Successfully deleted standalone originalKey: "${originalKey}"`);
    } catch (err) {
      console.error(`[S3 Delete Error] Failed to delete originalKey "${originalKey}" from S3:`, err);
    }
  }

  console.log(`[S3 Delete Complete] Total ${totalDeleted} object(s) deleted from S3 for video ${videoId}`);
}

export async function deleteFileFromS3(key: string): Promise<void> {
  if (!key) return;
  try {
    console.log(`[S3 Delete] Deleting file from S3: "${key}"...`);
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    console.log(`[S3 Delete] Successfully deleted file: "${key}"`);
  } catch (err) {
    console.error(`[S3 Delete Error] Failed to delete file "${key}" from S3:`, err);
  }
}

export async function deleteS3Prefix(prefix: string): Promise<void> {
  if (!prefix) return;
  const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
  console.log(`[S3 Delete Prefix] Deleting prefix "${normalizedPrefix}"...`);
  let continuationToken: string | undefined = undefined;
  let totalDeleted = 0;
  do {
    const listResponse: any = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: normalizedPrefix,
        ContinuationToken: continuationToken,
      })
    );
    const objects = listResponse.Contents || [];
    if (objects.length > 0) {
      const keysToDelete = objects.filter((o: any) => o.Key).map((obj: any) => ({ Key: obj.Key! }));
      try {
        const deleteRes = await s3.send(
          new DeleteObjectsCommand({
            Bucket: BUCKET_NAME,
            Delete: { Objects: keysToDelete, Quiet: false },
            ChecksumAlgorithm: "SHA256",
          })
        );
        totalDeleted += deleteRes.Deleted?.length || 0;
        if (deleteRes.Errors && deleteRes.Errors.length > 0) {
          for (const errObj of deleteRes.Errors) {
            if (errObj.Key) {
              try {
                await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: errObj.Key }));
                totalDeleted++;
              } catch {}
            }
          }
        }
      } catch {
        for (const k of keysToDelete) {
          try {
            await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: k.Key }));
            totalDeleted++;
          } catch {}
        }
      }
    }
    continuationToken = listResponse.NextContinuationToken;
  } while (continuationToken);
  console.log(`[S3 Delete Prefix] Deleted ${totalDeleted} object(s) under prefix "${normalizedPrefix}"`);
}

export async function uploadBufferToS3(key: string, body: Buffer, contentType: string = "image/png"): Promise<void> {
  await ensureBucketExists();
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await s3.send(command);
}


