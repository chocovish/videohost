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

export async function downloadFileFromS3(key: string, destinationPath: string): Promise<void> {
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

export async function uploadFileToS3(filePath: string, key: string, contentType: string): Promise<string> {
  await ensureBucketExists();

  const fileBuffer = fs.readFileSync(filePath);
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3.send(command);
  const publicCdn = process.env.NEXT_PUBLIC_CDN_HOST || "http://localhost:9000/videohost";
  return `${publicCdn}/${key}`;
}

export async function uploadDirectoryToS3(dirPath: string, keyPrefix: string): Promise<void> {
  await ensureBucketExists();

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

    await uploadFileToS3(fullPath, s3Key, contentType);
  }
}
