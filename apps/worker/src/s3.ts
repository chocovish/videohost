import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  PutBucketCorsCommand,
} from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { useDockerHostForLocalhost } from "./urlUtils";

export interface S3ConfigContext {
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucket?: string;
  region?: string;
  cdnHost?: string;
}

function cleanEnv(val: string | undefined, fallback: string): string {
  if (!val) return fallback;
  const cleaned = val.replace(/["'\r\n]/g, "").trim();
  return cleaned || fallback;
}

function getRegionFromEndpoint(endpoint: string, overrideRegion?: string): string {
  if (overrideRegion && overrideRegion !== "auto") return overrideRegion;
  if (process.env.R2_REGION || process.env.S3_REGION) {
    return cleanEnv(process.env.R2_REGION || process.env.S3_REGION, "auto");
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

export function getS3ClientAndBucket(config?: S3ConfigContext) {
  const rawEndpoint = cleanEnv(config?.endpoint || process.env.R2_ENDPOINT, "http://localhost:9000");
  const endpoint = useDockerHostForLocalhost(rawEndpoint);
  const accessKeyId = cleanEnv(config?.accessKeyId || process.env.R2_ACCESS_KEY_ID, "minioadmin");
  const secretAccessKey = cleanEnv(config?.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY, "passpass");
  const bucket = cleanEnv(config?.bucket || process.env.R2_BUCKET_NAME, "videohost");
  const region = getRegionFromEndpoint(rawEndpoint, config?.region);
  const cdnHost = cleanEnv(
    config?.cdnHost || process.env.NEXT_PUBLIC_CDN_HOST,
    `${rawEndpoint.replace(/\/$/, "")}/${bucket}`
  );

  const client = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_SUPPORTED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  return { client, bucket, cdnHost };
}

export async function ensureBucketExists(config?: S3ConfigContext): Promise<void> {
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
  } catch (e) {}
}

export async function downloadFileFromS3(
  key: string,
  destinationPath: string,
  config?: S3ConfigContext
): Promise<void> {
  const { client: s3, bucket: BUCKET_NAME } = getS3ClientAndBucket(config);
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await s3.send(command);
  const stream = response.Body as Readable;

  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(destinationPath);
    stream.pipe(fileStream);
    stream.on("error", reject);
    fileStream.on("finish", resolve);
  });
}

export async function uploadFileToS3(
  filePath: string,
  key: string,
  contentType: string,
  config?: S3ConfigContext
): Promise<string> {
  await ensureBucketExists(config);
  const { client: s3, bucket: BUCKET_NAME, cdnHost } = getS3ClientAndBucket(config);

  const fileBuffer = fs.readFileSync(filePath);
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3.send(command);
  return `${cdnHost.replace(/\/$/, "")}/${key}`;
}

export async function uploadDirectoryToS3(
  dirPath: string,
  keyPrefix: string,
  config?: S3ConfigContext
): Promise<void> {
  await ensureBucketExists(config);

  const files = fs.readdirSync(dirPath, { recursive: true });

  for (const file of files) {
    const fullPath = path.join(dirPath, file.toString());
    if (fs.statSync(fullPath).isDirectory()) continue;

    const relativePath = path.relative(dirPath, fullPath).replace(/\\/g, "/");
    const s3Key = `${keyPrefix}/${relativePath}`;

    let contentType = "application/octet-stream";
    if (relativePath.endsWith(".m3u8")) contentType = "application/x-mpegURL";
    else if (relativePath.endsWith(".ts")) contentType = "video/MP2T";
    else if (relativePath.endsWith(".m4s") || relativePath.endsWith(".mp4")) contentType = "video/mp4";
    else if (relativePath.endsWith(".jpg") || relativePath.endsWith(".jpeg")) contentType = "image/jpeg";
    else if (relativePath.endsWith(".vtt")) contentType = "text/vtt";

    await uploadFileToS3(fullPath, s3Key, contentType, config);
  }
}
