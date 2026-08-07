import { Queue } from "bullmq";

const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

declare global {
  // eslint-disable-next-line no-var
  var transcodeQueue: Queue | undefined;
}

export const transcodeQueue =
  globalThis.transcodeQueue ||
  new Queue("video-transcode", {
    connection: {
      host: redisHost,
      port: redisPort,
      password: redisPassword,
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.transcodeQueue = transcodeQueue;
}

export async function addTranscodeJob(videoId: string, orgId: string) {
  return await transcodeQueue.add(
    "transcode",
    { videoId, orgId },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    }
  );
}
