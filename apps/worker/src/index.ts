import { Worker } from "bullmq";
import dotenv from "dotenv";
import { processVideoJob } from "./transcoder";

dotenv.config();

const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

console.log(`[Worker Service] Starting transcode worker queue listener...`);
console.log(`[Worker Service] Connecting to Redis at ${redisHost}:${redisPort}`);

const worker = new Worker(
  "video-transcode",
  async (job) => {
    console.log(`[Worker Service] Received job ${job.id} for videoId: ${job.data.videoId}`);
    await processVideoJob(job.data.videoId);
  },
  {
    connection: {
      host: redisHost,
      port: redisPort,
      password: redisPassword,
    },
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || "2", 10),
  }
);

worker.on("completed", (job) => {
  console.log(`[Worker Service] Job ${job.id} completed successfully!`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker Service] Job ${job?.id} failed with error: ${err.message}`);
});
