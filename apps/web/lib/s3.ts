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

  // Ensure public read policy and CORS headers are set on MinIO for HLS streaming & thumbnail rendering
  try {
    const publicPolicy = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: "*",
          Action: ["s3:GetObject"],
          Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
        },
      ],
    };

    await s3.send(
      new PutBucketPolicyCommand({
        Bucket: BUCKET_NAME,
        Policy: JSON.stringify(publicPolicy),
      })
    );

    await s3.send(
      new PutBucketCorsCommand({
        Bucket: BUCKET_NAME,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ["*"],
              AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
              AllowedOrigins: ["*"],
              ExposeHeaders: ["ETag"],
              MaxAgeSeconds: 3000,
            },
          ],
        },
      })
    );
  } catch (policyErr) {
    // Ignore policy errors if bucket already configured or unsupported by provider
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

export async function getPresignedPlaybackUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

export function getPublicCdnUrl(key: string): string {
  const cdnHost = process.env.NEXT_PUBLIC_CDN_HOST || "http://localhost:9000/videohost";
  return `${cdnHost}/${key}`;
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

