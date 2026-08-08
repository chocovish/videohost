import http from "http";
import { Worker } from "bullmq";
import dotenv from "dotenv";
import path from "path";
import { processVideoJob } from "./transcoder";
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
    sendJsonResponse(res, 200, { status: "ok", service: "videohost-transcoder", timestamp: new Date().toISOString() });
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

        console.log(`[Worker HTTP] Received transcode request for videoId: ${videoId}`);

        // Acknowledge request immediately to prevent HTTP client timeout
        sendJsonResponse(res, 202, {
          status: "ACCEPTED",
          message: "Transcoding job started in container",
          videoId,
        });

        // Process video job asynchronously
        setImmediate(async () => {
          try {
            await processVideoJob(payload);
            console.log(`[Worker HTTP] Container finished job for videoId: ${videoId}`);
          } catch (err: any) {
            console.error(`[Worker HTTP] Async error processing videoId ${videoId}:`, err?.message || err);
          }
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
        await processVideoJob(job.data.videoId);
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

