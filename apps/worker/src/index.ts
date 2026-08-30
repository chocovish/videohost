import http from "http";
import { cancelActiveTranscode, processVideoJob } from "./transcoder";
import { cancelQueuedJob, enqueueJob, getQueueStats, isJobQueuedOrActive } from "./jobQueue";
import { useDockerHostForLocalhost, useLocalhostForDockerHost } from "./urlUtils";

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

// 1. Create HTTP Server for Webhook triggers / Docker container
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

        const removedFromQueue = cancelQueuedJob(videoId);
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
