import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { S3ConfigContext, downloadFileFromS3, uploadDirectoryToS3, uploadFileToS3 } from "./s3";
import { useDockerHostForLocalhost, useLocalhostForDockerHost } from "./urlUtils";
import {
  ProgressReporter,
  calculateTranscodeProgress,
  calculateUploadProgress,
  parseTimemarkToSeconds,
} from "./progress";

export interface RenditionConfig {
  resolution: string;
  width: number;
  height: number;
  bitrateKbps: number;
}

export interface TranscodeJobPayload {
  videoId: string;
  organizationId: string;
  originalKey: string;
  callbackUrl?: string;
  s3?: S3ConfigContext;
  renditions?: RenditionConfig[];
}

export const DEFAULT_RESOLUTION_LADDER: RenditionConfig[] = [
  { resolution: "480p", width: 854, height: 480, bitrateKbps: 1000 },
  { resolution: "720p", width: 1280, height: 720, bitrateKbps: 3000 },
  { resolution: "1080p", width: 1920, height: 1080, bitrateKbps: 5500 },
  { resolution: "1440p", width: 2560, height: 1440, bitrateKbps: 9000 },
  { resolution: "4k", width: 3840, height: 2160, bitrateKbps: 18000 },
];

export function parseEnvRenditions(): RenditionConfig[] {
  const envResolutions = process.env.HLS_RENDITION_RESOLUTIONS;
  if (!envResolutions) return DEFAULT_RESOLUTION_LADDER;

  const standardMap: Record<string, RenditionConfig> = {
    "360": { resolution: "360p", width: 640, height: 360, bitrateKbps: 800 },
    "360p": { resolution: "360p", width: 640, height: 360, bitrateKbps: 800 },
    "480": { resolution: "480p", width: 854, height: 480, bitrateKbps: 1000 },
    "480p": { resolution: "480p", width: 854, height: 480, bitrateKbps: 1000 },
    "720": { resolution: "720p", width: 1280, height: 720, bitrateKbps: 3000 },
    "720p": { resolution: "720p", width: 1280, height: 720, bitrateKbps: 3000 },
    "1080": { resolution: "1080p", width: 1920, height: 1080, bitrateKbps: 5500 },
    "1080p": { resolution: "1080p", width: 1920, height: 1080, bitrateKbps: 5500 },
    "1440": { resolution: "1440p", width: 2560, height: 1440, bitrateKbps: 9000 },
    "1440p": { resolution: "1440p", width: 2560, height: 1440, bitrateKbps: 9000 },
    "2160": { resolution: "4k", width: 3840, height: 2160, bitrateKbps: 18000 },
    "2160p": { resolution: "4k", width: 3840, height: 2160, bitrateKbps: 18000 },
    "4k": { resolution: "4k", width: 3840, height: 2160, bitrateKbps: 18000 },
  };

  const tokens = envResolutions
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const parsed: RenditionConfig[] = [];
  for (const token of tokens) {
    if (standardMap[token]) {
      parsed.push(standardMap[token]);
    } else {
      const numMatch = token.match(/^(\d+)/);
      if (numMatch) {
        const height = parseInt(numMatch[1], 10);
        let width = Math.round((height * 16) / 9);
        if (width % 2 !== 0) width += 1;

        let bitrateKbps = 1500;
        if (height <= 360) bitrateKbps = 800;
        else if (height <= 480) bitrateKbps = 1000;
        else if (height <= 720) bitrateKbps = 3000;
        else if (height <= 1080) bitrateKbps = 5500;
        else if (height <= 1440) bitrateKbps = 9000;
        else bitrateKbps = 18000;

        parsed.push({ resolution: `${height}p`, width, height, bitrateKbps });
      }
    }
  }

  return parsed.length > 0 ? parsed : DEFAULT_RESOLUTION_LADDER;
}

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

  const reporter = new ProgressReporter(videoId, organizationId || "default", callbackUrl);
  await reporter.report(0, "PROCESSING", true);

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

    // Determine initial rendition candidates from payload or env or default ladder
    const candidateRenditions =
      Array.isArray(payload.renditions) && payload.renditions.length > 0
        ? payload.renditions
        : parseEnvRenditions();

    // 3. Filter resolution ladder — NO UPSCALING (keep 480p fallback if video is smaller)
    const targetRenditions = candidateRenditions.filter(
      (r) => r.height <= height || r.resolution === "480p" || r.resolution === "480"
    );
    console.log(`[Worker] Generating renditions: ${targetRenditions.map((r) => r.resolution).join(", ")}`);

    const hlsOutputDir = path.join(tempDir, "hls");
    fs.mkdirSync(hlsOutputDir, { recursive: true });

    const totalRenditions = targetRenditions.length;

    // 4. Transcode each rendition to HLS playlist & segments
    for (let i = 0; i < totalRenditions; i++) {
      const rend = targetRenditions[i];
      const renditionDir = path.join(hlsOutputDir, rend.resolution);
      fs.mkdirSync(renditionDir, { recursive: true });

      const playlistPath = path.join(renditionDir, "prog.m3u8");

      console.log(`[Worker] Encoding rendition ${rend.resolution} (${i + 1}/${totalRenditions})...`);

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
          .on("progress", (p) => {
            const elapsed = parseTimemarkToSeconds(p.timemark);
            const renditionPercent = duration > 0 ? (elapsed / duration) * 100 : p.percent || 0;
            const overallTranscodeProgress = calculateTranscodeProgress(i, totalRenditions, renditionPercent);
            reporter.report(overallTranscodeProgress, "PROCESSING");
          })
          .on("end", () => {
            const completedTranscodeProgress = calculateTranscodeProgress(i + 1, totalRenditions, 100);
            reporter.report(completedTranscodeProgress, "PROCESSING");
            resolve();
          })
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

    // 6. Generate Thumbnail (thumbnail-{unique}.webp)
    const unique = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const thumbFileName = `thumbnail-${unique}.webp`;
    const thumbnailPath = path.join(tempDir, thumbFileName);
    await new Promise<void>((resolve, reject) => {
      const seekTime = isFinite(duration) && duration > 0 ? Math.min(1.0, duration / 2) : 0;
      ffmpeg(inputPath)
        .seekInput(seekTime)
        .frames(1)
        .outputOptions([
          "-vf", "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease",
          "-c:v", "libwebp",
          "-quality", "82",
        ])
        .output(thumbnailPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    });

    // 7. Upload HLS structure & thumbnail to R2 (20% of total progress)
    const orgId = organizationId || "default";
    const s3HlsPrefix = `${orgId}/${videoId}/hls`;
    const s3ThumbKey = `${orgId}/${videoId}/${thumbFileName}`;

    console.log(`[Worker] Uploading HLS renditions to R2 under ${s3HlsPrefix}...`);
    await uploadDirectoryToS3(hlsOutputDir, s3HlsPrefix, payload.s3, (uploadRatio) => {
      const uploadProgress = calculateUploadProgress(uploadRatio * 0.9);
      reporter.report(uploadProgress, "PROCESSING");
    });

    console.log(`[Worker] Uploading thumbnail (${thumbFileName}) to R2...`);
    const thumbnailUrl = await uploadFileToS3(thumbnailPath, s3ThumbKey, "image/webp", payload.s3);
    const finalUploadProgress = calculateUploadProgress(1.0);
    await reporter.report(finalUploadProgress, "PROCESSING");

    // Get original file size
    const originalSizeBytes = fs.statSync(inputPath).size;

    const renditionsResult = targetRenditions.map((r) => {
      const renditionDir = path.join(hlsOutputDir, r.resolution);
      let renditionSizeBytes = 0;
      if (fs.existsSync(renditionDir)) {
        const files = fs.readdirSync(renditionDir);
        for (const file of files) {
          const filePath = path.join(renditionDir, file);
          const stat = fs.statSync(filePath);
          if (stat.isFile()) renditionSizeBytes += stat.size;
        }
      }
      return {
        resolution: r.resolution,
        bitrateKbps: r.bitrateKbps,
        storageKey: `${s3HlsPrefix}/${r.resolution}/prog.m3u8`,
        sizeBytes: renditionSizeBytes,
      };
    });

    // Helper to calculate total HLS output directory size
    function calculateDirSize(dirPath: string): number {
      let total = 0;
      if (!fs.existsSync(dirPath)) return 0;
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          total += calculateDirSize(fullPath);
        } else if (entry.isFile()) {
          total += fs.statSync(fullPath).size;
        }
      }
      return total;
    }

    const totalHlsSizeBytes = calculateDirSize(hlsOutputDir);
    const combinedSizeBytes = originalSizeBytes + totalHlsSizeBytes;

    console.log(
      `[Worker] Size stats for ${videoId}: Original=${originalSizeBytes} B, HLS=${totalHlsSizeBytes} B, Combined=${combinedSizeBytes} B`
    );

    const rawResultPayload = {
      videoId,
      organizationId: orgId,
      status: "READY",
      progress: 100,
      durationSeconds: duration,
      sourceWidth: width,
      sourceHeight: height,
      thumbnailUrl: s3ThumbKey,
      renditions: renditionsResult,
      originalSizeBytes,
      totalHlsSizeBytes,
      combinedSizeBytes,
    };

    const resultPayload = useLocalhostForDockerHost(rawResultPayload);

    console.log(`[Worker] Transcoding complete for ${videoId}! Posting results to callback...`);
    await reporter.report(100, "READY", true, resultPayload);

    return resultPayload;
  } catch (err: any) {
    console.error(`[Worker] Error transcoding video ${videoId}:`, err);
    const rawFailPayload = {
      videoId,
      organizationId: payload.organizationId,
      status: "FAILED",
      progress: 0,
      error: err?.message || "Transcoding failed",
    };
    const failPayload = useLocalhostForDockerHost(rawFailPayload);
    await reporter.report(0, "FAILED", true, failPayload);

    throw err;
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

