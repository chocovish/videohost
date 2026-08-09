import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { S3ConfigContext, downloadFileFromS3, uploadDirectoryToS3, uploadFileToS3 } from "./s3";
import { useDockerHostForLocalhost, useLocalhostForDockerHost } from "./urlUtils";

export interface TranscodeJobPayload {
  videoId: string;
  organizationId: string;
  originalKey: string;
  callbackUrl?: string;
  s3?: S3ConfigContext;
}

export interface RenditionConfig {
  resolution: "480p" | "720p" | "1080p" | "1440p" | "4k";
  width: number;
  height: number;
  bitrateKbps: number;
}

export const RESOLUTION_LADDER: RenditionConfig[] = [
  { resolution: "480p", width: 854, height: 480, bitrateKbps: 1000 },
  { resolution: "720p", width: 1280, height: 720, bitrateKbps: 3000 },
  { resolution: "1080p", width: 1920, height: 1080, bitrateKbps: 5500 },
  { resolution: "1440p", width: 2560, height: 1440, bitrateKbps: 9000 },
  { resolution: "4k", width: 3840, height: 2160, bitrateKbps: 18000 },
];

export async function probeVideo(filePath: string): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const videoStream = metadata.streams.find((s) => s.codec_type === "video");
      const width = videoStream?.width || 1280;
      const height = videoStream?.height || 720;
      const duration = Math.round(metadata.format.duration || 0);
      resolve({ width, height, duration });
    });
  });
}

export async function processVideoJob(payloadInput: TranscodeJobPayload | string): Promise<any> {
  const rawPayload: TranscodeJobPayload =
    typeof payloadInput === "string"
      ? {
          videoId: payloadInput,
          organizationId: "default",
          originalKey: `default/${payloadInput}/original.mp4`,
        }
      : payloadInput;

  // Transform incoming payload URLs with localhost to host.docker.internal for worker container network calls
  const payload = useDockerHostForLocalhost(rawPayload);

  const { videoId, organizationId, originalKey, callbackUrl } = payload;
  console.log(`[Worker Stateless] Starting transcoding for videoId: ${videoId}, key: ${originalKey}`);
  console.log(`[Worker Stateless] Received job payload:`, JSON.stringify(payload, null, 2));

  const tempDir = path.join(process.cwd(), "temp", videoId);
  fs.mkdirSync(tempDir, { recursive: true });

  const inputPath = path.join(tempDir, "original.mp4");

  try {
    // 1. Download original file from R2/S3
    console.log(`[Worker] Downloading source video: ${originalKey}`);
    await downloadFileFromS3(originalKey, inputPath, payload.s3);

    // 2. Probe metadata
    const { width, height, duration } = await probeVideo(inputPath);
    console.log(`[Worker] Video probed: ${width}x${height}, duration: ${duration}s`);

    // 3. Filter resolution ladder — NO UPSCALING
    const targetRenditions = RESOLUTION_LADDER.filter((r) => r.height <= height || r.resolution === "480p");
    console.log(`[Worker] Generating renditions: ${targetRenditions.map((r) => r.resolution).join(", ")}`);

    const hlsOutputDir = path.join(tempDir, "hls");
    fs.mkdirSync(hlsOutputDir, { recursive: true });

    // 4. Transcode each rendition to HLS playlist & segments
    for (const rend of targetRenditions) {
      const renditionDir = path.join(hlsOutputDir, rend.resolution);
      fs.mkdirSync(renditionDir, { recursive: true });

      const playlistPath = path.join(renditionDir, "prog.m3u8");

      console.log(`[Worker] Encoding rendition ${rend.resolution}...`);
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .outputOptions([
            `-vf scale=w=${rend.width}:h=${rend.height}:force_original_aspect_ratio=decrease,pad=${rend.width}:${rend.height}:(ow-iw)/2:(oh-ih)/2`,
            `-c:v libx264`,
            `-b:v ${rend.bitrateKbps}k`,
            `-maxrate ${Math.round(rend.bitrateKbps * 1.2)}k`,
            `-bufsize ${Math.round(rend.bitrateKbps * 2)}k`,
            `-c:a aac`,
            `-b:a 128k`,
            `-hls_time 6`,
            `-hls_playlist_type vod`,
            `-hls_segment_filename ${path.join(renditionDir, "seq_%03d.ts")}`,
          ])
          .output(playlistPath)
          .on("end", () => resolve())
          .on("error", (err) => reject(err))
          .run();
      });
    }

    // 5. Generate Master Playlist (master.m3u8)
    let masterPlaylistContent = "#EXTM3U\n#EXT-X-VERSION:3\n";
    for (const rend of targetRenditions) {
      const bandwidth = rend.bitrateKbps * 1000;
      masterPlaylistContent += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${rend.width}x${rend.height}\n`;
      masterPlaylistContent += `${rend.resolution}/prog.m3u8\n`;
    }
    fs.writeFileSync(path.join(hlsOutputDir, "master.m3u8"), masterPlaylistContent);

    // 6. Generate Thumbnail (thumbnail.jpg)
    const thumbnailPath = path.join(tempDir, "thumbnail.jpg");
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          count: 1,
          timestamps: [Math.max(1, Math.floor(duration / 2))],
          filename: "thumbnail.jpg",
          folder: tempDir,
          size: "640x360",
        })
        .on("end", () => resolve())
        .on("error", (err) => reject(err));
    });

    // 7. Upload HLS structure & thumbnail to R2
    const orgId = organizationId || "default";
    const s3HlsPrefix = `${orgId}/${videoId}/hls`;
    const s3ThumbKey = `${orgId}/${videoId}/thumbnail.jpg`;

    console.log(`[Worker] Uploading HLS renditions to R2 under ${s3HlsPrefix}...`);
    await uploadDirectoryToS3(hlsOutputDir, s3HlsPrefix, payload.s3);

    console.log(`[Worker] Uploading thumbnail to R2...`);
    const thumbnailUrl = await uploadFileToS3(thumbnailPath, s3ThumbKey, "image/jpeg", payload.s3);

    const renditionsResult = targetRenditions.map((r) => ({
      resolution: r.resolution,
      bitrateKbps: r.bitrateKbps,
      storageKey: `${s3HlsPrefix}/${r.resolution}/prog.m3u8`,
    }));

    const rawResultPayload = {
      videoId,
      organizationId: orgId,
      status: "READY",
      durationSeconds: duration,
      sourceWidth: width,
      sourceHeight: height,
      thumbnailUrl,
      renditions: renditionsResult,
    };

    // When responding back, ensure URLs respond with localhost
    const resultPayload = useLocalhostForDockerHost(rawResultPayload);

    console.log(`[Worker] Transcoding complete for ${videoId}! Posting results to callback...`);

    if (callbackUrl) {
      const workerSecret = process.env.WORKER_SECRET_TOKEN;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (workerSecret) {
        headers["Authorization"] = `Bearer ${workerSecret}`;
        headers["x-worker-secret"] = workerSecret;
      }

      console.log(`[Worker] Posting callback payload to ${callbackUrl}:`, JSON.stringify(resultPayload, null, 2));

      try {
        const res = await fetch(callbackUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(resultPayload),
        });

        if (!res.ok) {
          const errorText = await res.text().catch(() => "");
          console.error(`[Worker Callback Error] HTTP ${res.status} ${res.statusText} from ${callbackUrl}: ${errorText}`);
        } else {
          console.log(`[Worker] Successfully posted callback payload to ${callbackUrl} (status: ${res.status})`);
        }
      } catch (cbErr: any) {
        console.error(`[Worker Callback Error] Failed to post to ${callbackUrl}:`, cbErr?.message || cbErr);
      }
    }

    return resultPayload;
  } catch (err: any) {
    console.error(`[Worker] Error transcoding video ${videoId}:`, err);
    const rawFailPayload = {
      videoId,
      organizationId: payload.organizationId,
      status: "FAILED",
      error: err?.message || "Transcoding failed",
    };
    const failPayload = useLocalhostForDockerHost(rawFailPayload);

    if (callbackUrl) {
      const workerSecret = process.env.WORKER_SECRET_TOKEN;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (workerSecret) {
        headers["Authorization"] = `Bearer ${workerSecret}`;
        headers["x-worker-secret"] = workerSecret;
      }

      console.log(`[Worker] Posting failure callback payload to ${callbackUrl}:`, JSON.stringify(failPayload, null, 2));

      try {
        const res = await fetch(callbackUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(failPayload),
        });

        if (!res.ok) {
          const errorText = await res.text().catch(() => "");
          console.error(`[Worker Callback Error] HTTP ${res.status} ${res.statusText} from failure callback ${callbackUrl}: ${errorText}`);
        } else {
          console.log(`[Worker] Successfully posted failure callback payload to ${callbackUrl} (status: ${res.status})`);
        }
      } catch (cbErr: any) {
        console.error(`[Worker Callback Error] Failed to post failure callback to ${callbackUrl}:`, cbErr?.message || cbErr);
      }
    }

    throw err;
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}
