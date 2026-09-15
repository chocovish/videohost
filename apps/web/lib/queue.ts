import { Queue } from "bullmq";
import { db } from "@videohost/db";
import { getRenditionsForJob, parseRenditionResolutions } from "./renditions";
import { getBaseUrl } from "./utils";
import { getVideoOriginalS3Key } from "./s3";

const redisConnectionUrl = (process.env.REDIS_URL || "").replace(/^["']|["']$/g, "").trim();

declare global {
  // eslint-disable-next-line no-var
  var transcodeQueue: Queue | undefined;
}

export const transcodeQueue =
  redisConnectionUrl
    ? globalThis.transcodeQueue ||
      new Queue("video-transcode", {
        connection: {
          url: redisConnectionUrl,
        },
      })
    : undefined;

if (process.env.NODE_ENV !== "production" && transcodeQueue) {
  globalThis.transcodeQueue = transcodeQueue;
}

export async function addTranscodeJob(
  videoId: string,
  orgId: string,
  options?: { skipThumbnail?: boolean }
) {
  const containerUrl = process.env.CONTAINER_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET_TOKEN;

  const baseUrl = getBaseUrl();
  const r2Endpoint = (process.env.R2_ENDPOINT || "http://localhost:9000").replace(/^["']|["']$/g, "").trim();
  const bucketName = (process.env.R2_BUCKET_NAME || "videohost").replace(/^["']|["']$/g, "").trim();

  let triggeredViaContainer = false;

  const video = await db.video.findUnique({ where: { id: videoId } });
  const originalKey = video?.originalKey
    ? getVideoOriginalS3Key(orgId, videoId, video.originalKey)
    : `videos/${orgId}/${videoId}/original.mp4`;
  const callbackUrl = `${baseUrl}/api/v1/videos/transcode-callback`;

  const skipThumbnail =
    options?.skipThumbnail !== undefined
      ? options.skipThumbnail
      : Boolean(video?.thumbnailKey);

  const region =
    (process.env.R2_REGION || process.env.S3_REGION || "").replace(/^["']|["']$/g, "").trim() ||
    r2Endpoint.match(/(?:compat\.objectstorage|objectstorage)\.([a-z0-9-]+)\.oraclecloud\.com/i)?.[1] ||
    "auto";

  const s3Config = {
    endpoint: r2Endpoint,
    accessKeyId: (process.env.R2_ACCESS_KEY_ID || "minioadmin").replace(/^["']|["']$/g, "").trim(),
    secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY || "passpass").replace(/^["']|["']$/g, "").trim(),
    bucket: bucketName,
    region,
  };

  // Plan-aware renditions: `video.requireHls` now stores the "multiple qualities"
  // request (pro+ only). Everyone gets HLS; toggle OFF = single highest rendition
  // capped by plan (free/basic up to 1080p). The worker further caps by source
  // height, never upscales, and never adds an extra native rung.
  const allRenditions = parseRenditionResolutions();
  let planName: string | null = null;
  let planMaxResolution: string | null = null;
  try {
    const org = await db.organization.findUnique({
      where: { id: orgId },
      include: { plan: true },
    });
    planName = (org?.plan as any)?.name || null;
    planMaxResolution = (org?.plan as any)?.maxResolution || null;
  } catch (e) {
    console.warn(`[Queue Dispatch] Failed to load plan for org ${orgId}, defaulting to free caps`);
  }
  const wantsMulti = Boolean((video as any)?.requireHls);
  const renditions = getRenditionsForJob({
    allRenditions,
    planName,
    planMaxResolution,
    wantsMulti,
  });
  const rawSegmentsEnv = (process.env.STREAMING_SEGMENTS || "").replace(/["'\r\n]/g, "").trim();
  const parsedSegments = rawSegmentsEnv !== "" ? parseInt(rawSegmentsEnv, 10) : 0;
  const streamingSegments = isNaN(parsedSegments) ? 0 : parsedSegments;
  const rawWorkerCore = process.env.WORKER_CORE;
  const parsedWorkerCore = rawWorkerCore !== undefined && rawWorkerCore.trim() !== ""
    ? parseInt(rawWorkerCore.replace(/["'\r\n]/g, "").trim(), 10)
    : 0;
  const threads = isNaN(parsedWorkerCore) || parsedWorkerCore < 0 ? 0 : parsedWorkerCore;

  console.log(
    `[Queue Dispatch] Configured HLS renditions for job (${videoId}): ${renditions.map((r) => r.resolution).join(", ")} (plan=${planName || "free"}, multi=${wantsMulti}), streamingSegments: ${streamingSegments}, skipThumbnail: ${skipThumbnail}, threads: ${threads === 0 ? "0 (all cores)" : threads}`
  );

  const jobPayload = {
    videoId,
    organizationId: orgId,
    originalKey,
    callbackUrl,
    s3: s3Config,
    renditions,
    streamingSegments,
    hlsSegments: streamingSegments,
    skipThumbnail,
    generateThumbnail: !skipThumbnail,
    threads,
  };

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
        body: JSON.stringify(jobPayload),
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

    try {
      const existingJob = await transcodeQueue.getJob(videoId);
      if (existingJob) {
        const state = await existingJob.getState();
        if (state === "active" || state === "waiting" || state === "delayed" || state === "prioritized") {
          console.log(`[Queue Dispatch] Job for videoId ${videoId} is already ${state}. Skipping duplicate enqueue.`);
          return existingJob;
        }
        // If the job is in completed, failed, or unknown state, remove the stale job so a fresh attempt can be queued
        console.log(`[Queue Dispatch] Removing existing ${state} job for videoId ${videoId} before re-queuing.`);
        await existingJob.remove().catch(() => {});
      }
    } catch (e: any) {
      console.warn(`[Queue Dispatch] Warning checking existing BullMQ job for videoId ${videoId}:`, e?.message || e);
    }

    return await transcodeQueue.add(
      "transcode",
      {
        ...jobPayload,
        orgId,
      },
      {
        jobId: videoId,
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

function cleanEnv(value: string | undefined): string {
  return (value || "").replace(/^["']|["']$/g, "").trim();
}

/** Path appended to WHISPER_API_URL (which is a base URL like `http://host:port`). */
export const WHISPER_TRANSCRIPTIONS_PATH = "/v1/audio/transcriptions";

/**
 * Normalizes WHISPER_API_URL to a base URL (e.g. `http://host:port`).
 * Accepts the legacy full endpoint (`http://host:port/v1/audio/transcriptions`)
 * for backward compatibility by stripping the path suffix.
 */
export function normalizeWhisperBaseUrl(value: string | undefined): string {
  const cleaned = cleanEnv(value).replace(/\/+$/, "");
  if (!cleaned) return "";
  return cleaned.replace(/\/v1\/audio\/transcriptions\/?$/i, "").replace(/\/+$/, "");
}

/** Builds the full Whisper transcriptions endpoint from a base URL. */
export function buildWhisperTranscriptionsUrl(baseUrl: string | undefined): string {
  const base = normalizeWhisperBaseUrl(baseUrl);
  if (!base) return "";
  return `${base}${WHISPER_TRANSCRIPTIONS_PATH}`;
}

/** Whisper-compatible transcription endpoint config (server-side only). */
export function getWhisperConfig(): { url: string; apiKey: string } {
  return {
    url: normalizeWhisperBaseUrl(process.env.WHISPER_API_URL || process.env.WHISPER_API_BASE_URL),
    apiKey: cleanEnv(process.env.WHISPER_API_KEY || process.env.WHISPER_API_TOKEN),
  };
}

export interface TranscriptionJobInput {
  videoId: string;
  orgId: string;
  /** CDN link of the video's dedicated audio rendition .m3u8 (required by worker). */
  audioHlsUrl: string;
  /** CDN link of master.m3u8 — worker fallback when the audio playlist fails. */
  fallbackHlsUrl?: string;
  language: string;
  label: string;
  subtitleId: string;
  storageKey: string;
}

/** BullMQ jobId for transcription jobs on the shared "video-transcode" queue. */
export function transcriptionBullJobId(videoId: string): string {
  return `transcribe-${videoId}`;
}

/** Code attached to the error thrown when a transcription is already running. */
export const TRANSCRIPTION_ALREADY_RUNNING_CODE = "TRANSCRIPTION_ALREADY_RUNNING";

/** How long a dispatched transcription counts as in-flight without a callback. */
const TRANSCRIPTION_IN_FLIGHT_TTL_MS = 30 * 60 * 1000;

declare global {
  // eslint-disable-next-line no-var
  var transcriptionInFlight: Map<string, number> | undefined;
}

function getTranscriptionInFlight(): Map<string, number> {
  if (!globalThis.transcriptionInFlight) {
    globalThis.transcriptionInFlight = new Map<string, number>();
  }
  return globalThis.transcriptionInFlight;
}

/** Records a dispatched transcription so page reloads/second tabs stay blocked. */
export function markTranscriptionStarted(videoId: string): void {
  if (!videoId) return;
  getTranscriptionInFlight().set(videoId, Date.now());
}

/** Clears the in-flight marker (called by the transcription callback). */
export function clearTranscriptionInFlight(videoId: string): void {
  if (!videoId) return;
  getTranscriptionInFlight().delete(videoId);
}

/** True when the web layer dispatched a transcription recently (no callback yet). */
export function isTranscriptionInFlight(videoId: string): boolean {
  if (!videoId) return false;
  const startedAt = getTranscriptionInFlight().get(videoId);
  if (!startedAt) return false;
  if (Date.now() - startedAt > TRANSCRIPTION_IN_FLIGHT_TTL_MS) {
    getTranscriptionInFlight().delete(videoId);
    return false;
  }
  return true;
}

function alreadyRunningError(): Error {
  const err: any = new Error("A transcription job is already running for this video.");
  err.code = TRANSCRIPTION_ALREADY_RUNNING_CODE;
  return err;
}

/** True when a transcription job for the video is waiting/active. */
export async function hasPendingTranscriptionJob(videoId: string): Promise<boolean> {
  // Web-layer marker covers container-HTTP dispatch (no BullMQ) and survives
  // UI reloads; BullMQ covers queued jobs on the shared queue.
  if (isTranscriptionInFlight(videoId)) return true;
  if (!transcodeQueue) return false;
  try {
    const jobs = await transcodeQueue.getJobs(["waiting", "active", "delayed", "prioritized"]);
    return jobs.some(
      (j) =>
        (j.name === "transcribe" || (j.data as any)?.jobType === "transcription") &&
        (j.data as any)?.videoId === videoId
    );
  } catch (e: any) {
    console.warn(`[Queue Dispatch] Warning checking transcription jobs for videoId ${videoId}:`, e?.message || e);
    return false;
  }
}

/**
 * Enqueues a Whisper transcription job. Everything the worker needs
 * (Whisper URL/key, S3 creds, storage key, callback) travels in the payload —
 * the worker itself holds no transcription config.
 */
export async function addTranscriptionJob(input: TranscriptionJobInput) {
  const containerUrl = process.env.CONTAINER_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET_TOKEN;

  const baseUrl = getBaseUrl();
  const r2Endpoint = (process.env.R2_ENDPOINT || "http://localhost:9000").replace(/^["']|["']$/g, "").trim();
  const bucketName = (process.env.R2_BUCKET_NAME || "videohost").replace(/^["']|["']$/g, "").trim();

  const whisper = getWhisperConfig();
  if (!whisper.url || !whisper.apiKey) {
    throw new Error("Transcription service is not configured (WHISPER_API_URL / WHISPER_API_KEY).");
  }

  let triggeredViaContainer = false;

  const callbackUrl = `${baseUrl}/api/v1/videos/transcription-callback`;

  const region =
    (process.env.R2_REGION || process.env.S3_REGION || "").replace(/^["']|["']$/g, "").trim() ||
    r2Endpoint.match(/(?:compat\.objectstorage|objectstorage)\.([a-z0-9-]+)\.oraclecloud\.com/i)?.[1] ||
    "auto";

  const s3Config = {
    endpoint: r2Endpoint,
    accessKeyId: (process.env.R2_ACCESS_KEY_ID || "minioadmin").replace(/^["']|["']$/g, "").trim(),
    secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY || "passpass").replace(/^["']|["']$/g, "").trim(),
    bucket: bucketName,
    region,
  };

  const jobPayload = {
    jobType: "transcription" as const,
    videoId: input.videoId,
    organizationId: input.orgId,
    audioHlsUrl: input.audioHlsUrl,
    fallbackHlsUrl: input.fallbackHlsUrl,
    whisperUrl: buildWhisperTranscriptionsUrl(whisper.url),
    whisperApiKey: whisper.apiKey,
    responseFormat: "vtt",
    s3: s3Config,
    subtitleId: input.subtitleId,
    storageKey: input.storageKey,
    language: input.language,
    label: input.label,
    callbackUrl,
  };

  if (containerUrl) {
    console.log(`[Queue Dispatch] Triggering Container worker at ${containerUrl}/transcribe for videoId: ${input.videoId}`);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (workerSecret) {
        headers["Authorization"] = `Bearer ${workerSecret}`;
        headers["x-worker-secret"] = workerSecret;
      }

      const res = await fetch(`${containerUrl.replace(/\/$/, "")}/transcribe`, {
        method: "POST",
        headers,
        body: JSON.stringify(jobPayload),
      });

      const bodyText = await res.text().catch(() => "");
      let workerStatus: string | undefined;
      try {
        workerStatus = (JSON.parse(bodyText || "{}") as any)?.status;
      } catch {
        workerStatus = undefined;
      }

      if (workerStatus === "ALREADY_QUEUED") {
        // Worker already runs/queues a transcription for this video — treat
        // as pending (not success) so the caller gets a 409, not a new job.
        console.log(`[Queue Dispatch] Worker reports transcription already queued for videoId: ${input.videoId}`);
        markTranscriptionStarted(input.videoId);
        throw alreadyRunningError();
      }

      if (res.ok) {
        console.log(`[Queue Dispatch] Container successfully accepted transcription job for videoId: ${input.videoId}`);
        triggeredViaContainer = true;
      } else {
        console.error(`[Queue Dispatch] Container transcribe error (${res.status}): ${bodyText}`);
      }
    } catch (err: any) {
      if ((err as any)?.code === TRANSCRIPTION_ALREADY_RUNNING_CODE) throw err;
      console.error(`[Queue Dispatch] Failed to contact Container worker:`, err?.message || err);
    }
  }

  // Fallback or dual-dispatch to BullMQ queue if Redis is configured and container wasn't triggered or Redis force enabled
  if (transcodeQueue && (!triggeredViaContainer || process.env.FORCE_QUEUE_DUAL_DISPATCH === "true")) {
    console.log(`[Queue Dispatch] Enqueuing transcription job to BullMQ Redis queue for videoId: ${input.videoId}`);

    const jobId = transcriptionBullJobId(input.videoId);
    try {
      const existingJob = await transcodeQueue.getJob(jobId);
      if (existingJob) {
        const state = await existingJob.getState();
        if (state === "active" || state === "waiting" || state === "delayed" || state === "prioritized") {
          console.log(`[Queue Dispatch] Transcription job for videoId ${input.videoId} is already ${state}. Rejecting duplicate.`);
          markTranscriptionStarted(input.videoId);
          throw alreadyRunningError();
        }
        console.log(`[Queue Dispatch] Removing existing ${state} transcription job for videoId ${input.videoId} before re-queuing.`);
        await existingJob.remove().catch(() => {});
      }
    } catch (e: any) {
      if ((e as any)?.code === TRANSCRIPTION_ALREADY_RUNNING_CODE) throw e;
      console.warn(`[Queue Dispatch] Warning checking existing BullMQ transcription job for videoId ${input.videoId}:`, e?.message || e);
    }

    const job = await transcodeQueue.add(
      "transcribe",
      {
        ...jobPayload,
        orgId: input.orgId,
      },
      {
        jobId,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      }
    );
    markTranscriptionStarted(input.videoId);
    return job;
  }

  if (triggeredViaContainer) {
    markTranscriptionStarted(input.videoId);
  }

  return { videoId: input.videoId, triggeredViaContainer };
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

  // Remove any queued/delayed BullMQ jobs for this video (transcode + transcription)
  if (transcodeQueue) {
    try {
      const jobs = await transcodeQueue.getJobs(["waiting", "active", "delayed"]);
      const matching = jobs.filter((j) => (j?.data as any)?.videoId === videoId);
      await Promise.allSettled(matching.map((j) => j.remove()));
      if (matching.length > 0) {
        console.log(`[Queue Dispatch] Removed ${matching.length} BullMQ job(s) for videoId ${videoId}`);
      }
    } catch (err: any) {
      console.error(`[Queue Dispatch] Failed to remove BullMQ jobs for videoId ${videoId}:`, err?.message || err);
    }
  }
}

