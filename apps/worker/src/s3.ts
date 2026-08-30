import {
  S3Client,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketCorsCommand,
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
  cdnHost?: string;
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
  const cdnHost = config.cdnHost || `${rawEndpoint}/${bucket}`;

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
  config: S3ConfigContext
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

export async function uploadStreamToS3(
  stream: Readable,
  key: string,
  contentType: string,
  config: S3ConfigContext
): Promise<string> {
  await ensureBucketExists(config);
  const { client: s3, bucket: BUCKET_NAME, cdnHost } = getS3ClientAndBucket(config);

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

  await upload.done();
  return `${cdnHost.replace(/\/$/, "")}/${key}`;
}

export async function uploadFileToS3(
  filePath: string,
  key: string,
  contentType: string,
  config: S3ConfigContext
): Promise<string> {
  const fileStream = fs.createReadStream(filePath);
  return uploadStreamToS3(fileStream, key, contentType, config);
}

export async function uploadDirectoryToS3(
  dirPath: string,
  keyPrefix: string,
  config: S3ConfigContext,
  onProgress?: (progressRatio: number) => void
): Promise<void> {
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
  let uploadedCount = 0;

  for (const fullPath of filePaths) {
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

    await uploadFileToS3(fullPath, s3Key, contentType, config);
    uploadedCount++;
    if (onProgress && totalFiles > 0) {
      onProgress(uploadedCount / totalFiles);
    }
  }
}
