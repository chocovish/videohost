import {
  S3Client,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketCorsCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { useDockerHostForLocalhost } from "./urlUtils";

export interface S3ConfigContext {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region?: string;
}

function getRegionFromEndpoint(endpoint: string, overrideRegion?: string): string {
  if (overrideRegion && overrideRegion !== "auto") return overrideRegion;
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

export function getS3ClientAndBucket(config: S3ConfigContext) {
  if (!config || !config.endpoint) {
    throw new Error("S3 configuration with endpoint is required from payload");
  }

  const rawEndpoint = config.endpoint;
  const endpoint = useDockerHostForLocalhost(rawEndpoint);
  const accessKeyId = config.accessKeyId || "minioadmin";
  const secretAccessKey = config.secretAccessKey || "passpass";
  const bucket = config.bucket || "videohost";
  const region = getRegionFromEndpoint(rawEndpoint, config.region);

  const client = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_SUPPORTED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  return { client, bucket };
}

export async function ensureBucketExists(config: S3ConfigContext): Promise<void> {
  const { client: s3, bucket: BUCKET_NAME } = getS3ClientAndBucket(config);

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
  } catch (e) { }
}

export async function downloadFileFromS3(
  key: string,
  destinationPath: string,
  config: S3ConfigContext,
  signal?: AbortSignal
): Promise<void> {
  if (signal?.aborted) throw new Error("JOB_CANCELLED");
  const { client: s3, bucket: BUCKET_NAME } = getS3ClientAndBucket(config);
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response: any = await s3.send(command, signal ? { abortSignal: signal } as any : undefined);
  const stream = response.Body as Readable;

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      try { (stream as any).destroy?.(new Error("JOB_CANCELLED")); } catch {}
      reject(new Error("JOB_CANCELLED"));
    };
    if (signal) signal.addEventListener("abort", onAbort, { once: true });

    const fileStream = fs.createWriteStream(destinationPath);
    stream.pipe(fileStream);
    stream.on("error", (err) => {
      if (signal) signal.removeEventListener("abort", onAbort);
      reject(err);
    });
    fileStream.on("finish", () => {
      if (signal) signal.removeEventListener("abort", onAbort);
      resolve();
    });
    fileStream.on("error", (err) => {
      if (signal) signal.removeEventListener("abort", onAbort);
      reject(err);
    });
  });
}

export async function uploadStreamToS3(
  stream: Readable,
  key: string,
  contentType: string,
  config: S3ConfigContext,
  signal?: AbortSignal
): Promise<string> {
  if (signal?.aborted) throw new Error("JOB_CANCELLED");
  await ensureBucketExists(config);
  const { client: s3, bucket: BUCKET_NAME } = getS3ClientAndBucket(config);

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: stream,
      ContentType: contentType,
    },
    queueSize: 4,
    partSize: 1024 * 1024 * 5, // 5MB minimum part size
    leavePartsOnError: false,
  });

  if (signal) {
    const onAbort = () => {
      try { (upload as any).abort(); } catch {}
    };
    signal.addEventListener("abort", onAbort, { once: true });
    try {
      await upload.done();
    } finally {
      signal.removeEventListener("abort", onAbort);
    }
  } else {
    await upload.done();
  }
  return key;
}

export async function uploadFileToS3(
  filePath: string,
  key: string,
  contentType: string,
  config: S3ConfigContext,
  signal?: AbortSignal
): Promise<string> {
  if (signal?.aborted) throw new Error("JOB_CANCELLED");
  const fileStream = fs.createReadStream(filePath);
  if (signal) {
    const onAbort = () => {
      try { fileStream.destroy(new Error("JOB_CANCELLED")); } catch {}
    };
    signal.addEventListener("abort", onAbort, { once: true });
    try {
      return await uploadStreamToS3(fileStream, key, contentType, config, signal);
    } finally {
      signal.removeEventListener("abort", onAbort);
    }
  }
  return uploadStreamToS3(fileStream, key, contentType, config);
}

export async function uploadDirectoryToS3(
  dirPath: string,
  keyPrefix: string,
  config: S3ConfigContext,
  onProgress?: (progressRatio: number) => void,
  signal?: AbortSignal
): Promise<void> {
  if (signal?.aborted) throw new Error("JOB_CANCELLED");
  await ensureBucketExists(config);

  const rawEntries = fs.readdirSync(dirPath, { recursive: true });
  const filePaths: string[] = [];

  for (const entry of rawEntries) {
    const fullPath = path.join(dirPath, entry.toString());
    if (!fs.statSync(fullPath).isDirectory()) {
      filePaths.push(fullPath);
    }
  }

  const totalFiles = filePaths.length;
  if (totalFiles === 0) return;

  let uploadedCount = 0;
  const concurrency = Math.min(5, totalFiles);
  let currentIndex = 0;

  async function worker(): Promise<void> {
    while (currentIndex < filePaths.length) {
      if (signal?.aborted) throw new Error("JOB_CANCELLED");
      const index = currentIndex++;
      const fullPath = filePaths[index];
      const relativePath = path.relative(dirPath, fullPath).replace(/\\/g, "/");
      const s3Key = `${keyPrefix}/${relativePath}`;

      let contentType = "application/octet-stream";
      if (relativePath.endsWith(".m3u8")) contentType = "application/x-mpegURL";
      else if (relativePath.endsWith(".mpd")) contentType = "application/dash+xml";
      else if (relativePath.endsWith(".ts")) contentType = "video/MP2T";
      else if (relativePath.endsWith(".m4s") || relativePath.endsWith(".mp4")) contentType = "video/mp4";
      else if (relativePath.endsWith(".jpg") || relativePath.endsWith(".jpeg")) contentType = "image/jpeg";
      else if (relativePath.endsWith(".webp")) contentType = "image/webp";
      else if (relativePath.endsWith(".vtt")) contentType = "text/vtt";

      await uploadFileToS3(fullPath, s3Key, contentType, config, signal);
      uploadedCount++;
      if (onProgress && totalFiles > 0) {
        onProgress(uploadedCount / totalFiles);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
}

export async function deleteS3Prefix(
  prefix: string,
  config: S3ConfigContext
): Promise<void> {
  if (!prefix) return;
  // Ensure prefix ends with / for folder deletion
  const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
  console.log(`[S3 Delete Prefix] Deleting prefix "${normalizedPrefix}"...`);
  const { client: s3, bucket: BUCKET_NAME } = getS3ClientAndBucket(config);
  let continuationToken: string | undefined = undefined;
  let totalDeleted = 0;
  do {
    const listRes: any = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: normalizedPrefix,
        ContinuationToken: continuationToken,
      })
    );
    const objects = listRes.Contents || [];
    if (objects.length > 0) {
      const keysToDelete = objects.filter((o: any) => o.Key).map((obj: any) => ({ Key: obj.Key! }));
      try {
        const delRes: any = await s3.send(
          new DeleteObjectsCommand({
            Bucket: BUCKET_NAME,
            Delete: { Objects: keysToDelete, Quiet: false },
          })
        );
        totalDeleted += delRes.Deleted?.length || keysToDelete.length;
        if (delRes.Errors && delRes.Errors.length > 0) {
          for (const e of delRes.Errors) {
            if (e.Key) {
              try {
                await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: e.Key }));
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
    continuationToken = listRes.NextContinuationToken;
  } while (continuationToken);
  console.log(`[S3 Delete Prefix] Deleted ${totalDeleted} object(s) under prefix "${normalizedPrefix}"`);
}

export async function deleteS3Object(
  key: string,
  config: S3ConfigContext
): Promise<void> {
  if (!key) return;
  try {
    const { client: s3, bucket: BUCKET_NAME } = getS3ClientAndBucket(config);
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    console.log(`[S3 Delete Object] Deleted object "${key}"`);
  } catch (err: any) {
    console.error(`[S3 Delete Object] Failed to delete object "${key}":`, err?.message || err);
  }
}
