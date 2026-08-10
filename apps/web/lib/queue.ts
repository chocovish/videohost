import { Queue } from "bullmq";
import { db } from "@videohost/db";
import { parseRenditionResolutions } from "./renditions";

const redisHost = process.env.REDIS_HOST;
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

declare global {
  // eslint-disable-next-line no-var
  var transcodeQueue: Queue | undefined;
}

export const transcodeQueue =
  redisHost
    ? globalThis.transcodeQueue ||
    new Queue("video-transcode", {
      connection: {
        host: redisHost,
        port: redisPort,
        password: redisPassword,
      },
    })
    : undefined;

if (process.env.NODE_ENV !== "production" && transcodeQueue) {
  globalThis.transcodeQueue = transcodeQueue;
}

export async function addTranscodeJob(videoId: string, orgId: string) {
  const containerUrl = process.env.CONTAINER_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET_TOKEN;

  const baseUrl = process.env.APP_URL || "http://localhost:3000";
  const r2Endpoint = process.env.R2_ENDPOINT || "http://localhost:9000";
  const cdnHost = process.env.NEXT_PUBLIC_CDN_HOST || `${r2Endpoint}/videohost`;

  let triggeredViaContainer = false;

  const video = await db.video.findUnique({ where: { id: videoId } });
  const originalKey = video?.originalKey || `${orgId}/${videoId}/original.mp4`;
  const callbackUrl = `${baseUrl.replace(/\/$/, "")}/api/v1/videos/transcode-callback`;

  const region =
    (process.env.R2_REGION || process.env.S3_REGION || "").replace(/^["']|["']$/g, "").trim() ||
    r2Endpoint.match(/(?:compat\.objectstorage|objectstorage)\.([a-z0-9-]+)\.oraclecloud\.com/i)?.[1] ||
    "auto";

  const s3Config = {
    endpoint: r2Endpoint,
    accessKeyId: (process.env.R2_ACCESS_KEY_ID || "minioadmin").replace(/^["']|["']$/g, "").trim(),
    secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY || "passpass").replace(/^["']|["']$/g, "").trim(),
    bucket: (process.env.R2_BUCKET_NAME || "videohost").replace(/^["']|["']$/g, "").trim(),
    region,
    cdnHost,
  };

  const renditions = parseRenditionResolutions();
  console.log(`[Queue Dispatch] Configured HLS renditions for job (${videoId}):`, renditions.map((r) => r.resolution).join(", "));

  if (containerUrl) {
    console.log(`[Queue Dispatch] Triggering Container worker at ${containerUrl}/transcode for videoId: ${videoId}`);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (workerSecret) {
        headers["Authorization"] = `Bearer ${workerSecret}`;
        headers["x-worker-secret"] = workerSecret;
      }

      const res = await fetch(`${containerUrl.replace(/\/$/, "")}/transcode`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          videoId,
          organizationId: orgId,
          originalKey,
          callbackUrl,
          s3: s3Config,
          renditions,
        }),
      });

      if (res.ok) {
        console.log(`[Queue Dispatch] Container successfully accepted transcode job for videoId: ${videoId}`);
        triggeredViaContainer = true;
      } else {
        const errText = await res.text();
        console.error(`[Queue Dispatch] Container trigger error (${res.status}): ${errText}`);
      }
    } catch (err: any) {
      console.error(`[Queue Dispatch] Failed to contact Container worker:`, err?.message || err);
    }
  }

  // Fallback or dual-dispatch to BullMQ queue if Redis is configured and container wasn't triggered or Redis force enabled
  if (transcodeQueue && (!triggeredViaContainer || process.env.FORCE_QUEUE_DUAL_DISPATCH === "true")) {
    console.log(`[Queue Dispatch] Enqueuing job to BullMQ Redis queue for videoId: ${videoId}`);
    return await transcodeQueue.add(
      "transcode",
      {
        videoId,
        orgId,
        organizationId: orgId,
        originalKey,
        callbackUrl,
        s3: s3Config,
        renditions,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      }
    );
  }

  return { videoId, triggeredViaContainer };
}

