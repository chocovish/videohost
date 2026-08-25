import http from "http";
import { Worker, UnrecoverableError } from "bullmq";
import dotenv from "dotenv";
import path from "path";
import { JOB_CANCELLED_CODE, cancelActiveTranscode, isTranscodeActive, processVideoJob } from "./transcoder";
import { cancelQueuedJob, enqueueJob, getQueueStats, isJobQueuedOrActive } from "./jobQueue";
import { useDockerHostForLocalhost, useLocalhostForDockerHost } from "./urlUtils";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

function getEnvString(val: string | undefined): string | undefined {
  if (!val) return undefined;
  const cleaned = val.replace(/["'\r\n]/g, "").trim();
  return cleaned || undefined;
}

function getEnvInt(val: string | undefined, fallback: number): number {
  if (!val) return fallback;
  const cleaned = val.replace(/["'\r\n]/g, "").trim();
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? fallback : parsed;
}

const PORT = getEnvInt(process.env.PORT, 8080);
const WORKER_SECRET_TOKEN = getEnvString(process.env.WORKER_SECRET_TOKEN);

// Helper to write JSON response with localhost conversion
function sendJsonResponse(res: http.ServerResponse, statusCode: number, data: any) {
  const converted = useLocalhostForDockerHost(data);
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(converted));
}

// 1. Create HTTP Server for Docker Container / Webhook triggers
const server = http.createServer(async (req, res) => {
  const url = req.url || "/";
  const method = req.method || "GET";

  // Health check endpoint
  if (method === "GET" && (url === "/health" || url === "/")) {
    sendJsonResponse(res, 200, {
      status: "ok",
      service: "videohost-transcoder",
      queue: getQueueStats(),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Queue stats endpoint
  if (method === "GET" && url === "/stats") {
    sendJsonResponse(res, 200, { queue: getQueueStats() });
    return;
  }

  // Transcode trigger endpoint
  if (method === "POST" && (url === "/transcode" || url === "/api/transcode" || url === "/process")) {
    // Check Authorization token if configured
    if (WORKER_SECRET_TOKEN) {
      const authHeader = req.headers["authorization"];
      const secretHeader = req.headers["x-worker-secret"];
      const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : secretHeader;

      if (token !== WORKER_SECRET_TOKEN) {
        console.warn(`[Worker HTTP] Unauthorized trigger attempt from ${req.socket.remoteAddress}`);
        sendJsonResponse(res, 401, { error: "Unauthorized: invalid worker secret token" });
        return;
      }
    }

    let bodyStr = "";
    req.on("data", (chunk) => {
      bodyStr += chunk;
    });

    req.on("end", async () => {
      try {
        const rawPayload = JSON.parse(bodyStr || "{}");
        const payload = useDockerHostForLocalhost(rawPayload);
        const videoId = payload.videoId;

        if (!videoId) {
          sendJsonResponse(res, 400, { error: "videoId is required" });
          return;
        }

        console.log(`[Worker HTTP] Received transcode request for videoId: ${videoId}:`, JSON.stringify(payload, null, 2));

        // Reject duplicate submissions for the same video while queued/active
        if (isJobQueuedOrActive(videoId)) {
          const queue = getQueueStats();
          sendJsonResponse(res, 202, {
            status: "ALREADY_QUEUED",
            message: "Transcode job for this video is already queued or in progress",
            videoId,
            queue,
          });
          return;
        }

        // Acknowledge request immediately; the job runs through the bounded
        // internal queue so at most WORKER_MAX_CONCURRENT_JOBS videos are
        // processed at the same time.
        sendJsonResponse(res, 202, {
          status: "ACCEPTED",
          message: "Transcoding job queued",
          videoId,
          queue: getQueueStats(),
        });

        // Process video job through the queue asynchronously
        setImmediate(() => {
          enqueueJob(videoId, () => processVideoJob(payload))
            .then(() => {
              console.log(`[Worker HTTP] Container finished job for videoId: ${videoId}`);
            })
            .catch((err: any) => {
              console.error(`[Worker HTTP] Async error processing videoId ${videoId}:`, err?.message || err);
            });
        });
      } catch (err: any) {
        sendJsonResponse(res, 400, { error: "Invalid JSON payload" });
      }
    });
    return;
  }

  // Cancel a queued or in-progress transcode job
  if (method === "POST" && (url === "/cancel" || url === "/api/cancel")) {
    // Same auth as /transcode
    if (WORKER_SECRET_TOKEN) {
      const authHeader = req.headers["authorization"];
      const secretHeader = req.headers["x-worker-secret"];
      const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : secretHeader;

      if (token !== WORKER_SECRET_TOKEN) {
        console.warn(`[Worker HTTP] Unauthorized cancel attempt from ${req.socket.remoteAddress}`);
        sendJsonResponse(res, 401, { error: "Unauthorized: invalid worker secret token" });
        return;
      }
    }

    let bodyStr = "";
    req.on("data", (chunk) => {
      bodyStr += chunk;
    });

    req.on("end", () => {
      try {
        const payload = JSON.parse(bodyStr || "{}");
        const videoId = payload.videoId;

        if (!videoId) {
          sendJsonResponse(res, 400, { error: "videoId is required" });
          return;
        }

        // First remove it from the pending queue (before it starts)
        const removedFromQueue = cancelQueuedJob(videoId);
        // Then abort the active encode if it is already running
        const abortedActive = cancelActiveTranscode(videoId);

        console.log(
          `[Worker HTTP] Cancel for videoId ${videoId}: queued=${removedFromQueue}, active=${abortedActive}`
        );

        if (!removedFromQueue && !abortedActive && !isJobQueuedOrActive(videoId)) {
          sendJsonResponse(res, 404, {
            status: "NOT_FOUND",
            message: "No queued or active transcode job found for this video",
            videoId,
            queue: getQueueStats(),
          });
          return;
        }

        sendJsonResponse(res, 200, {
          status: "CANCELLED",
          message: removedFromQueue
            ? "Job removed from queue"
            : "Active transcode aborted",
          videoId,
          removedFromQueue,
          abortedActive,
          queue: getQueueStats(),
        });
      } catch (err: any) {
        sendJsonResponse(res, 400, { error: "Invalid JSON payload" });
      }
    });
    return;
  }

  // 404 for unknown endpoints
  sendJsonResponse(res, 404, { error: "Not Found" });
});

server.listen(PORT, () => {
  console.log(`[Worker Service] Container HTTP Server listening on port ${PORT}`);
});

// 2. Optional BullMQ Worker listener (if Redis host is configured and REDIS_DISABLED is not true)
const redisHost = getEnvString(process.env.REDIS_HOST);
const redisDisabled = process.env.DISABLE_REDIS === "true" || process.env.DISABLE_REDIS === '"true"';

if (redisHost && !redisDisabled) {
  const redisPort = getEnvInt(process.env.REDIS_PORT, 6379);
  const redisPassword = getEnvString(process.env.REDIS_PASSWORD);

  console.log(`[Worker Service] Starting optional BullMQ worker connecting to Redis at ${redisHost}:${redisPort}`);

  try {
    const worker = new Worker(
      "video-transcode",
      async (job) => {
        console.log(`[Worker Service] [Queue] Received job ${job.id} for videoId: ${job.data.videoId}`);
        // Route BullMQ jobs through the same bounded internal queue so the
        // global concurrency cap holds regardless of how jobs arrive.
        try {
          await enqueueJob(job.data.videoId, () => processVideoJob(job.data));
        } catch (err: any) {
          if (err?.code === JOB_CANCELLED_CODE || err?.name === "JobCancelledError") {
            console.log(`[Worker Service] [Queue] Job ${job.id} was cancelled — will not retry`);
            throw new UnrecoverableError(`Job cancelled for video ${job.data.videoId}`);
          }
          throw err;
        }
      },
      {
        connection: {
          host: redisHost,
          port: redisPort,
          password: redisPassword,
        },
        concurrency: getEnvInt(process.env.WORKER_CONCURRENCY, 2),
      }
    );

    worker.on("completed", (job) => {
      console.log(`[Worker Service] [Queue] Job ${job.id} completed successfully!`);
    });

    worker.on("failed", (job, err) => {
      console.error(`[Worker Service] [Queue] Job ${job?.id} failed with error: ${err.message}`);
    });
  } catch (e: any) {
    console.warn(`[Worker Service] Failed to initialize BullMQ worker:`, e?.message);
  }
}

