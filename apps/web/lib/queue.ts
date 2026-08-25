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
  const cdnHost = `${r2Endpoint}/${process.env.R2_BUCKET_NAME}`;

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
  const rawSegments = parseInt(process.env.STREAMING_SEGMENTS || process.env.HLS_SEGMENTS || "0", 10);
  const hlsSegments = isNaN(rawSegments) ? 0 : rawSegments;
  console.log(
    `[Queue Dispatch] Configured HLS renditions for job (${videoId}): ${renditions.map((r) => r.resolution).join(", ")}, streamingSegments: ${hlsSegments}`
  );

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
          hlsSegments,
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
        hlsSegments,
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

/**
 * Requests cancellation of a queued or in-progress transcode job for a video.
 * Best-effort: contacts the container worker's /cancel endpoint and removes any
 * pending BullMQ jobs for the video.
 */
export async function cancelTranscodeJob(videoId: string): Promise<void> {
  const containerUrl = process.env.CONTAINER_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET_TOKEN;

  if (containerUrl) {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (workerSecret) {
        headers["Authorization"] = `Bearer ${workerSecret}`;
        headers["x-worker-secret"] = workerSecret;
      }

      const res = await fetch(`${containerUrl.replace(/\/$/, "")}/cancel`, {
        method: "POST",
        headers,
        body: JSON.stringify({ videoId }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        console.log(`[Queue Dispatch] Worker accepted cancel for videoId ${videoId}:`, JSON.stringify(data));
      } else if (res.status === 404) {
        console.log(`[Queue Dispatch] No active job on worker for videoId ${videoId}`);
      } else {
        console.error(`[Queue Dispatch] Worker cancel error (${res.status}) for videoId ${videoId}`);
      }
    } catch (err: any) {
      console.error(`[Queue Dispatch] Failed to contact worker cancel endpoint:`, err?.message || err);
    }
  }

  // Remove any queued/delayed BullMQ jobs for this video
  if (transcodeQueue) {
    try {
      const jobs = await transcodeQueue.getJobs(["waiting", "active", "delayed"]);
      const matching = jobs.filter((j) => j?.data?.videoId === videoId);
      await Promise.allSettled(matching.map((j) => j.remove()));
      if (matching.length > 0) {
        console.log(`[Queue Dispatch] Removed ${matching.length} BullMQ job(s) for videoId ${videoId}`);
      }
    } catch (err: any) {
      console.error(`[Queue Dispatch] Failed to remove BullMQ jobs for videoId ${videoId}:`, err?.message || err);
    }
  }
}

