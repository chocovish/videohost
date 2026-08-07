import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { db } from "@videohost/db";
import { downloadFileFromS3, uploadDirectoryToS3, uploadFileToS3 } from "./s3";

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

export async function processVideoJob(videoId: string): Promise<void> {
  console.log(`[Worker] Starting transcoding for videoId: ${videoId}`);

  const video = await db.video.findUnique({
    where: { id: videoId },
    include: { organization: true },
  });

  if (!video) {
    throw new Error(`Video not found: ${videoId}`);
  }

  await db.video.update({
    where: { id: videoId },
    data: { status: "PROCESSING" },
  });

  const tempDir = path.join(process.cwd(), "temp", videoId);
  fs.mkdirSync(tempDir, { recursive: true });

  const inputPath = path.join(tempDir, "original.mp4");

  try {
    // 1. Download original file from R2
    console.log(`[Worker] Downloading source video: ${video.originalKey}`);
    await downloadFileFromS3(video.originalKey, inputPath);

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
    const orgId = video.organizationId;
    const s3HlsPrefix = `${orgId}/${videoId}/hls`;
    const s3ThumbKey = `${orgId}/${videoId}/thumbnail.jpg`;

    console.log(`[Worker] Uploading HLS renditions to R2 under ${s3HlsPrefix}...`);
    await uploadDirectoryToS3(hlsOutputDir, s3HlsPrefix);

    console.log(`[Worker] Uploading thumbnail to R2...`);
    const thumbnailUrl = await uploadFileToS3(thumbnailPath, s3ThumbKey, "image/jpeg");

    // 8. Update DB records
    await db.videoRendition.deleteMany({ where: { videoId } });

    for (const rend of targetRenditions) {
      await db.videoRendition.create({
        data: {
          videoId,
          resolution: rend.resolution,
          bitrateKbps: rend.bitrateKbps,
          storageKey: `${s3HlsPrefix}/${rend.resolution}/prog.m3u8`,
          sizeBytes: BigInt(0),
        },
      });
    }

    await db.video.update({
      where: { id: videoId },
      data: {
        status: "READY",
        durationSeconds: duration,
        sourceWidth: width,
        sourceHeight: height,
        thumbnailUrl,
      },
    });

    console.log(`[Worker] Video ${videoId} successfully transcoded and status set to READY!`);

    // 9. Dispatch Webhook if registered
    await triggerWebhooks(orgId, "video.ready", {
      videoId,
      title: video.title,
      durationSeconds: duration,
      thumbnailUrl,
    });
  } catch (err: any) {
    console.error(`[Worker] Error transcoding video ${videoId}:`, err);
    await db.video.update({
      where: { id: videoId },
      data: { status: "FAILED" },
    });

    await triggerWebhooks(video.organizationId, "video.failed", {
      videoId,
      error: err?.message || "Transcoding failed",
    });

    throw err;
  } finally {
    // Cleanup temporary local dir
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

async function triggerWebhooks(orgId: string, event: string, payload: object) {
  try {
    const webhooks = await db.webhook.findMany({
      where: {
        organizationId: orgId,
        events: { has: event },
      },
    });

    for (const wh of webhooks) {
      console.log(`[Webhook Dispatch] Sending ${event} to ${wh.url}`);
      fetch(wh.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() }),
      }).catch((e) => console.error(`[Webhook Dispatch Error]`, e));
    }
  } catch (e) {
    console.error("[Webhook Trigger Error]", e);
  }
}
