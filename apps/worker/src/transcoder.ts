import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { S3ConfigContext, deleteS3Object, deleteS3Prefix, downloadFileFromS3, uploadDirectoryToS3, uploadFileToS3 } from "./s3";
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
  s3: S3ConfigContext;
  renditions?: RenditionConfig[];
  streamingSegments?: number | string;
  hlsSegments?: number | string;
  skipThumbnail?: boolean;
  generateThumbnail?: boolean;
  threads?: number;
  workerCore?: number;
  workerCores?: number;
}

export const JOB_CANCELLED_CODE = "JOB_CANCELLED";

export class JobCancelledError extends Error {
  code = JOB_CANCELLED_CODE;
  constructor(videoId: string) {
    super(`Transcode job cancelled for video ${videoId}`);
    this.name = "JobCancelledError";
  }
}

interface ActiveJobEntry {
  controller: AbortController;
  command: ReturnType<typeof ffmpeg> | null;
  payload?: TranscodeJobPayload;
  reporter?: ProgressReporter;
  done: Promise<void>;
}

// Tracks in-flight transcode jobs so they can be aborted on demand
const activeJobs = new Map<string, ActiveJobEntry>();

/**
 * Cancels an actively-running transcode for a video (kills the current ffmpeg
 * process and marks the job as aborted). Returns true if a job was running.
 */
export function cancelActiveTranscode(videoId: string): boolean {
  const entry = activeJobs.get(videoId);
  if (!entry) return false;

  console.log(`[Worker] Cancellation requested for active video ${videoId}, killing ffmpeg...`);
  entry.controller.abort();
  try {
    entry.command?.kill("SIGKILL");
  } catch {}
  return true;
}

export function isTranscodeActive(videoId: string): boolean {
  return activeJobs.has(videoId);
}

export function getActiveJobIds(): string[] {
  return Array.from(activeJobs.keys());
}

export async function cancelAllActiveJobs(timeoutMs: number = 8000): Promise<void> {
  const entries = Array.from(activeJobs.values());
  const ids = getActiveJobIds();
  if (ids.length === 0) {
    console.log("[Worker] SIGTERM cleanup: no active jobs");
    return;
  }
  console.log(`[Worker] SIGTERM cleanup: cancelling ${ids.length} active job(s): ${ids.join(", ")}`);
  for (const id of ids) {
    cancelActiveTranscode(id);
  }
  // Wait for all in-flight transcode cleanups (S3 deletes + CANCELLED callbacks) to finish
  const donePromises = entries.map((e) => e.done);
  const timeoutPromise = new Promise((resolve) => setTimeout(resolve, timeoutMs));
  await Promise.race([Promise.allSettled(donePromises), timeoutPromise]);
  console.log("[Worker] SIGTERM cleanup: finished waiting for active jobs cleanup");
}

export const DEFAULT_RESOLUTION_LADDER: RenditionConfig[] = [
  { resolution: "480p", width: 854, height: 480, bitrateKbps: 1000 },
  { resolution: "720p", width: 1280, height: 720, bitrateKbps: 3000 },
  { resolution: "1080p", width: 1920, height: 1080, bitrateKbps: 5500 },
  { resolution: "1440p", width: 2560, height: 1440, bitrateKbps: 9000 },
  { resolution: "4k", width: 3840, height: 2160, bitrateKbps: 18000 },
];

export function bitrateForHeight(height: number): number {
  if (height <= 360) return 800;
  if (height <= 480) return 1000;
  if (height <= 720) return 3000;
  if (height <= 1080) return 5500;
  if (height <= 1440) return 9000;
  return 18000;
}

/**
 * Selects renditions to encode for a given source video.
 * - Never upscales: only ladder rungs at or below the source height are kept.
 * - If the source's native height is at least `minNativeGapPx` taller than the
 *   largest standard rung kept, the native resolution is added as an extra
 *   rendition (e.g. source is 850p, ladder is 480/720/1080 -> render
 *   480, 720 and the native 850p, but not a useless upscaled 1080p).
 */
export function selectTargetRenditions(
  candidates: RenditionConfig[],
  sourceWidth: number,
  sourceHeight: number,
  minNativeGapPx: number = 100
): RenditionConfig[] {
  const sorted = [...candidates].sort((a, b) => a.height - b.height);
  if (sorted.length === 0) return [];

  const aspectRatio = sourceWidth > 0 && sourceHeight > 0 ? sourceWidth / sourceHeight : 16 / 9;

  function makeEven(val: number): number {
    const rounded = Math.round(val);
    return rounded % 2 === 0 ? rounded : rounded + 1;
  }

  const allowed = sorted
    .filter((r) => r.height <= sourceHeight)
    .map((r) => ({
      ...r,
      width: makeEven(r.height * aspectRatio),
    }));

  // Video is smaller than the smallest rung — fall back to the smallest rung
  if (allowed.length === 0) {
    const fallback = sorted[0];
    return [{ ...fallback, width: makeEven(fallback.height * aspectRatio) }];
  }

  const largest = allowed[allowed.length - 1];
  const nativeGap = sourceHeight - largest.height;

  if (nativeGap >= minNativeGapPx) {
    let width = makeEven(sourceWidth);
    let height = sourceHeight % 2 !== 0 ? sourceHeight - 1 : sourceHeight;

    // Guard against duplicate heights after even-rounding
    if (!allowed.some((r) => r.height === height)) {
      allowed.push({
        resolution: `${height}p`,
        width,
        height,
        bitrateKbps: bitrateForHeight(height),
      });
    }
  }

  return allowed;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export function computeTargetDAR(
  sourceWidth: number,
  sourceHeight: number,
  sarString?: string
): { darNum: number; darDen: number } {
  let sNum = 1;
  let sDen = 1;
  if (sarString && typeof sarString === "string") {
    const parts = sarString.split(/[:/]/).map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] > 0 && parts[1] > 0) {
      sNum = parts[0];
      sDen = parts[1];
    }
  }
  const w = sourceWidth > 0 ? sourceWidth : 1280;
  const h = sourceHeight > 0 ? sourceHeight : 720;
  const totalNum = w * sNum;
  const totalDen = h * sDen;
  const g = gcd(totalNum, totalDen);
  return {
    darNum: totalNum / g,
    darDen: totalDen / g,
  };
}

export function computeRenditionSAR(
  rendWidth: number,
  rendHeight: number,
  darNum: number,
  darDen: number
): string {
  const sarNum = darNum * rendHeight;
  const sarDen = darDen * rendWidth;
  const g = gcd(sarNum, sarDen);
  return `${sarNum / g}/${sarDen / g}`;
}

export async function probeVideo(filePath: string): Promise<{
  width: number;
  height: number;
  duration: number;
  hasAudio: boolean;
  sar?: string;
}> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const videoStream = metadata.streams.find((s) => s.codec_type === "video");
      const audioStream = metadata.streams.find((s) => s.codec_type === "audio");
      const width = videoStream?.width || 1280;
      const height = videoStream?.height || 720;
      const duration = Math.round(metadata.format.duration || 0);
      const hasAudio = !!audioStream;
      const sar = videoStream?.sample_aspect_ratio;
      resolve({ width, height, duration, hasAudio, sar });
    });
  });
}

export async function processVideoJob(payloadInput: TranscodeJobPayload): Promise<any> {
  // Transform incoming payload URLs with localhost to host.docker.internal for worker container network calls
  const payload = useDockerHostForLocalhost(payloadInput);

  const { videoId, organizationId, originalKey, callbackUrl } = payload;
  const rawThreads =
    typeof payload.threads === "number"
      ? payload.threads
      : typeof payload.workerCore === "number"
      ? payload.workerCore
      : typeof payload.workerCores === "number"
      ? payload.workerCores
      : 0;
  const threadCount = isNaN(rawThreads) || rawThreads < 0 ? 0 : rawThreads;

  console.log(`[Worker Stateless] Starting transcoding for videoId: ${videoId}, key: ${originalKey}`);
  console.log(
    `[Worker Stateless] Using ${threadCount === 0 ? "all available cores (threads=0)" : `${threadCount} thread(s)`} for transcoding`
  );
  console.log(`[Worker Stateless] Received job payload:`, JSON.stringify(payload, null, 2));

  const reporter = new ProgressReporter(videoId, organizationId || "default", callbackUrl);
  await reporter.report(0, "PROCESSING", true);

  // Register the job for cancellation support (store payload/reporter for SIGTERM cleanup)
  let resolveJobDone!: () => void;
  const jobDone = new Promise<void>((resolve) => {
    resolveJobDone = resolve;
  });

  const controller = new AbortController();
  const activeEntry: ActiveJobEntry = { controller, command: null, payload, reporter, done: jobDone };
  activeJobs.set(videoId, activeEntry);

  const isCancelled = () => controller.signal.aborted;
  function assertNotCancelled(): void {
    if (isCancelled()) throw new JobCancelledError(videoId);
  }

  const tempDir = path.join(process.cwd(), "temp", videoId);
  fs.mkdirSync(tempDir, { recursive: true });

  const inputPath = path.join(tempDir, "original.mp4").replace(/\\/g, "/");
  let s3ThumbKey: string | null = null;

  try {
    assertNotCancelled();

    // 1. Download original file from R2/S3
    console.log(`[Worker] Downloading source video: ${originalKey}`);
    await downloadFileFromS3(originalKey, inputPath, payload.s3, controller.signal);

    assertNotCancelled();

    // 2. Probe metadata
    const { width, height, duration, hasAudio, sar } = await probeVideo(inputPath);
    console.log(
      `[Worker] Video probed: ${width}x${height}, duration: ${duration}s, hasAudio: ${hasAudio}, sar: ${sar || "1:1"}`
    );

    // Determine initial rendition candidates from payload or default ladder
    const candidateRenditions =
      Array.isArray(payload.renditions) && payload.renditions.length > 0
        ? payload.renditions
        : DEFAULT_RESOLUTION_LADDER;

    // 3. Select renditions — NO UPSCALING, plus native rendition when gap >= 100px
    const targetRenditions = selectTargetRenditions(candidateRenditions, width, height);
    console.log(`[Worker] Generating renditions: ${targetRenditions.map((r) => r.resolution).join(", ")}`);

    const dashOutputDir = path.join(tempDir, "dash");
    fs.mkdirSync(dashOutputDir, { recursive: true });

    const masterManifestPath = path.join(dashOutputDir, "master.mpd").replace(/\\/g, "/");
    const totalRenditions = targetRenditions.length;

    // 4. Transcode all renditions into a single DASH manifest (master.mpd)
    const { darNum, darDen } = computeTargetDAR(width, height, sar);

    const filterParts: string[] = [];
    if (totalRenditions > 1) {
      filterParts.push(
        `[0:v]split=${totalRenditions}${targetRenditions.map((_, i) => `[v${i}]`).join("")}`
      );
    }
    targetRenditions.forEach((rend, i) => {
      const inputLabel = totalRenditions > 1 ? `[v${i}]` : `[0:v]`;
      filterParts.push(
        `${inputLabel}scale=${rend.width}:${rend.height}:flags=bicubic,setdar=${darNum}/${darDen}:max=1000000[o${i}]`
      );
    });
    const filterComplex = filterParts.join(";");

    const rawSegments = payload.streamingSegments ?? payload.hlsSegments;
    let parsedSegments = 0;
    if (typeof rawSegments === "number") {
      parsedSegments = isNaN(rawSegments) ? 0 : rawSegments;
    } else if (typeof rawSegments === "string") {
      const p = parseInt(rawSegments.replace(/["'\r\n]/g, "").trim(), 10);
      parsedSegments = isNaN(p) ? 0 : p;
    }

    const isSingleFile = parsedSegments <= 0;
    const segDuration = isSingleFile ? 6 : Math.max(1, Math.round(parsedSegments));

    console.log(
      `[Worker] Packaging mode: ${isSingleFile ? "Single-File (-single_file 1, byte-range stream_*.mp4)" : `Chunked Segments (${segDuration}s chunk-stream*.m4s)`} for ${totalRenditions} representation(s)...`
    );

    const dashPackagingOptions = isSingleFile
      ? [
          `-seg_duration ${segDuration}`,
          `-window_size 0`,
          `-extra_window_size 10`,
          `-single_file 1`,
          `-single_file_name stream_$RepresentationID$.mp4`,
          `-hls_playlist 1`,
          `-hls_master_name master.m3u8`,
        ]
      : [
          `-seg_duration ${segDuration}`,
          `-window_size 0`,
          `-extra_window_size 10`,
          `-init_seg_name init-stream$RepresentationID$.m4s`,
          `-media_seg_name chunk-stream$RepresentationID$-$Number%05d$.m4s`,
          `-hls_playlist 1`,
          `-hls_master_name master.m3u8`,
        ];

    await new Promise<void>((resolve, reject) => {
      const stderrLines: string[] = [];
      const encodeCommand = ffmpeg(inputPath)
        .inputOptions([
          `-threads ${threadCount}`,
        ])
        .outputOptions([
          `-threads ${threadCount}`,
          `-preset veryfast`,
          `-crf 24`,
          `-pix_fmt yuv420p`,
          `-filter_complex ${filterComplex}`,
          ...targetRenditions.map((_, i) => `-map [o${i}]`),
          `-map 0:a?`,
          `-c:v libx264`,
          `-flags +cgop`,
          `-force_key_frames expr:gte(t,n_forced*${segDuration})`,
          `-x264-params scenecut=0:open_gop=0`,
          `-fps_mode:v passthrough`,
          ...targetRenditions.flatMap((r, i) => [
            `-b:v:${i} ${r.bitrateKbps}k`,
            `-maxrate:v:${i} ${Math.round(r.bitrateKbps * 1.2)}k`,
            `-bufsize:v:${i} ${Math.round(r.bitrateKbps * 2)}k`,
          ]),
          `-c:a aac`,
          `-b:a 128k`,
          `-f dash`,
          ...dashPackagingOptions,
        ])
        .addOutputOption(
          "-adaptation_sets",
          hasAudio ? "id=0,streams=v id=1,streams=a" : "id=0,streams=v"
        )
        .output(masterManifestPath)
        .on("start", (cmdLine) => {
          console.log(`[Worker FFmpeg] Executing: ${cmdLine}`);
        })
        .on("stderr", (stderrLine) => {
          stderrLines.push(stderrLine);
          if (stderrLines.length > 50) stderrLines.shift();
        })
        .on("progress", (p) => {
          const elapsed = parseTimemarkToSeconds(p.timemark);
          const transcodePercent = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : p.percent || 0;
          const overallTranscodeProgress = calculateTranscodeProgress(0, 1, transcodePercent);
          reporter.report(overallTranscodeProgress, "PROCESSING");
        })
        .on("end", () => {
          reporter.report(calculateTranscodeProgress(1, 1, 100), "PROCESSING");
          resolve();
        })
        .on("error", (err) => {
          console.error(`[Worker FFmpeg Error] Last stderr output:\n${stderrLines.join("\n")}`);
          reject(isCancelled() ? new JobCancelledError(videoId) : err);
        });

      activeEntry.command = encodeCommand;
      encodeCommand.run();
    });

    assertNotCancelled();

    // Clean up any absolute local directory prefixes in master.mpd if present
    if (fs.existsSync(masterManifestPath)) {
      let masterManifest = fs.readFileSync(masterManifestPath, "utf-8");
      const dashOutputDirForward = dashOutputDir.replace(/\\/g, "/");
      const dashOutputDirBack = dashOutputDir.replace(/\//g, "\\");
      masterManifest = masterManifest
        .split(`${dashOutputDir}${path.sep}`)
        .join("")
        .split(`${dashOutputDir}/`)
        .join("")
        .split(`${dashOutputDirForward}/`)
        .join("")
        .split(`${dashOutputDirBack}\\`)
        .join("")
        .split(`${dashOutputDirForward}`)
        .join("")
        .split(`${dashOutputDirBack}`)
        .join("");
      fs.writeFileSync(masterManifestPath, masterManifest);
    }

    // Clean up any absolute local directory prefixes in master.m3u8 if present
    const masterM3u8Path = path.join(dashOutputDir, "master.m3u8");
    if (fs.existsSync(masterM3u8Path)) {
      let masterM3u8 = fs.readFileSync(masterM3u8Path, "utf-8");
      const dashOutputDirForward = dashOutputDir.replace(/\\/g, "/");
      const dashOutputDirBack = dashOutputDir.replace(/\//g, "\\");
      masterM3u8 = masterM3u8
        .split(`${dashOutputDir}${path.sep}`)
        .join("")
        .split(`${dashOutputDir}/`)
        .join("")
        .split(`${dashOutputDirForward}/`)
        .join("")
        .split(`${dashOutputDirBack}\\`)
        .join("")
        .split(`${dashOutputDirForward}`)
        .join("")
        .split(`${dashOutputDirBack}`)
        .join("");
      fs.writeFileSync(masterM3u8Path, masterM3u8);
    }

    // 6. Generate Thumbnail (thumbnail-{unique}.webp) if not skipped
    const shouldGenerateThumbnail =
      payload.skipThumbnail === true || payload.generateThumbnail === false
        ? false
        : true;

    const orgId = organizationId || "default";
    const s3DashPrefix = `${orgId}/${videoId}/dash`;
    s3ThumbKey = null;

    if (shouldGenerateThumbnail) {
      const unique = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const thumbFileName = `thumbnail-${unique}.webp`;
      const thumbnailPath = path.join(tempDir, thumbFileName).replace(/\\/g, "/");
      await new Promise<void>((resolve, reject) => {
        const seekTime = isFinite(duration) && duration > 0 ? Math.min(1.0, duration / 2) : 0;
        const thumbCommand = ffmpeg(inputPath)
          .seekInput(seekTime)
          .frames(1)
          .outputOptions([
            "-threads", String(threadCount),
            "-vf", "scale='min(1280,iw)':-2:flags=bicubic",
            "-c:v", "libwebp",
            "-compression_level", "4",
            "-quality", "82",
          ])
          .output(thumbnailPath)
          .on("end", () => resolve())
          .on("error", (err) => reject(isCancelled() ? new JobCancelledError(videoId) : err));

        activeEntry.command = thumbCommand;
        thumbCommand.run();
      });

      assertNotCancelled();

      s3ThumbKey = `${orgId}/${videoId}/${thumbFileName}`;
      console.log(`[Worker] Uploading thumbnail (${thumbFileName}) to R2...`);
      await uploadFileToS3(thumbnailPath, s3ThumbKey, "image/webp", payload.s3, controller.signal);
    } else {
      console.log(`[Worker] Skipping thumbnail generation for videoId: ${videoId} (thumbnail already set)`);
    }

    // 7. Upload DASH structure to R2 (20% of total progress)
    console.log(`[Worker] Uploading DASH renditions to R2 under ${s3DashPrefix}...`);
    await uploadDirectoryToS3(dashOutputDir, s3DashPrefix, payload.s3, (uploadRatio) => {
      const uploadProgress = calculateUploadProgress(uploadRatio * 0.9);
      reporter.report(uploadProgress, "PROCESSING");
    }, controller.signal);

    const finalUploadProgress = calculateUploadProgress(1.0);
    await reporter.report(finalUploadProgress, "PROCESSING");

    assertNotCancelled();

    // Get original file size
    const originalSizeBytes = fs.statSync(inputPath).size;

    // Helper to calculate total and per-stream sizes in dashOutputDir
    function calculateDashStreamSizes(dirPath: string): { streamSizes: Map<number, number>; totalSize: number } {
      const streamSizes = new Map<number, number>();
      let totalSize = 0;
      if (!fs.existsSync(dirPath)) return { streamSizes, totalSize };

      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          totalSize += stat.size;
          const singleMatch = file.match(/^stream_(\d+)\.mp4$/);
          const chunkMatch = file.match(/^(?:init|chunk)-stream(\d+)/);
          const match = singleMatch || chunkMatch;
          if (match) {
            const streamId = parseInt(match[1], 10);
            const current = streamSizes.get(streamId) || 0;
            streamSizes.set(streamId, current + stat.size);
          }
        }
      }
      return { streamSizes, totalSize };
    }

    const { streamSizes, totalSize: totalDashSizeBytes } = calculateDashStreamSizes(dashOutputDir);
    const combinedSizeBytes = originalSizeBytes + totalDashSizeBytes;

    // Allocate audio stream separately if present
    const audioStreamIndex = totalRenditions;
    const audioSizeBytes = hasAudio ? (streamSizes.get(audioStreamIndex) || 0) : 0;

    const renditionsResult = targetRenditions.map((r, i) => {
      const videoStreamSize = streamSizes.get(i) || 0;
      return {
        resolution: r.resolution,
        width: r.width,
        height: r.height,
        bitrateKbps: r.bitrateKbps,
        storageKey: s3DashPrefix,
        sizeBytes: videoStreamSize,
      };
    });

    if (hasAudio) {
      renditionsResult.push({
        resolution: "Audio (AAC)",
        width: 0,
        height: 0,
        bitrateKbps: 128,
        storageKey: s3DashPrefix,
        sizeBytes: audioSizeBytes,
      });
    }

    console.log(
      `[Worker] Size stats for ${videoId}: Original=${originalSizeBytes} B, DASH=${totalDashSizeBytes} B, Combined=${combinedSizeBytes} B`
    );
    renditionsResult.forEach((r) => {
      console.log(`[Worker] Rendition ${r.resolution}: ${r.sizeBytes} B`);
    });

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
      totalRenditionSizeBytes: totalDashSizeBytes,
      combinedSizeBytes,
    };

    const resultPayload = useLocalhostForDockerHost(rawResultPayload);

    console.log(`[Worker] Transcoding complete for ${videoId}! Posting results to callback...`);
    await reporter.report(100, "READY", true, resultPayload);

    return resultPayload;
  } catch (err: any) {
    const isCancelledError =
      err instanceof JobCancelledError ||
      err?.code === JOB_CANCELLED_CODE ||
      err?.message === "JOB_CANCELLED" ||
      isCancelled();
    if (isCancelledError) {
      console.log(`[Worker] Transcode job for video ${videoId} was cancelled — cleaning up S3 and reporting CANCELLED`);
      // Delete any partially uploaded dash data and thumbnail (best-effort)
      const orgIdForCleanup = payload.organizationId || organizationId || "default";
      const dashPrefix = `${orgIdForCleanup}/${videoId}/dash`;
      try {
        await deleteS3Prefix(dashPrefix, payload.s3);
        console.log(`[Worker] Cleaned up S3 dash prefix for cancelled video ${videoId}`);
      } catch (cleanupErr: any) {
        console.error(`[Worker] Failed to cleanup S3 prefix for cancelled video ${videoId}:`, cleanupErr?.message || cleanupErr);
      }
      if (s3ThumbKey) {
        try {
          await deleteS3Object(s3ThumbKey, payload.s3);
          console.log(`[Worker] Cleaned up S3 thumbnail object for cancelled video ${videoId}`);
        } catch (thumbCleanupErr: any) {
          console.error(`[Worker] Failed to cleanup S3 thumbnail for cancelled video ${videoId}:`, thumbCleanupErr?.message || thumbCleanupErr);
        }
      }
      // Notify webapp that processing was cancelled (so UI can show retry)
      try {
        const cancelledPayload = {
          videoId,
          organizationId: orgIdForCleanup,
          status: "CANCELLED" as const,
          progress: 0,
          error: "Transcoding cancelled (worker shutdown or user cancelled)",
        };
        await reporter.report(0, "CANCELLED", true, cancelledPayload);
      } catch (reportErr: any) {
        console.error(`[Worker] Failed to report CANCELLED callback for ${videoId}:`, reportErr?.message || reportErr);
      }
      throw err instanceof JobCancelledError ? err : new JobCancelledError(videoId);
    }

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
    activeJobs.delete(videoId);
    resolveJobDone();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}
