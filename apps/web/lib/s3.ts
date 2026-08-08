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
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2Endpoint = process.env.R2_ENDPOINT || "http://localhost:9000";
const r2AccessKey = process.env.R2_ACCESS_KEY_ID || "minioadmin";
const r2SecretKey = process.env.R2_SECRET_ACCESS_KEY || "passpass";
const r2Bucket = process.env.R2_BUCKET_NAME || "videohost";

export const s3 = new S3Client({
  region: "auto",
  endpoint: r2Endpoint,
  credentials: {
    accessKeyId: r2AccessKey,
    secretAccessKey: r2SecretKey,
  },
  forcePathStyle: true,
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

  do {
    const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const listResponse = await s3.send(listCommand);
    const objects = listResponse.Contents || [];

    if (objects.length > 0) {
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: BUCKET_NAME,
        Delete: {
          Objects: objects.filter((o) => o.Key).map((obj) => ({ Key: obj.Key! })),
          Quiet: true,
        },
      });
      await s3.send(deleteCommand);
    }

    continuationToken = listResponse.NextContinuationToken;
  } while (continuationToken);

  if (originalKey && !originalKey.startsWith(prefix)) {
    try {
      const deleteSingleCommand = new DeleteObjectsCommand({
        Bucket: BUCKET_NAME,
        Delete: {
          Objects: [{ Key: originalKey }],
          Quiet: true,
        },
      });
      await s3.send(deleteSingleCommand);
    } catch (err) {
      console.error(`Failed to delete originalKey ${originalKey} from S3:`, err);
    }
  }
}
