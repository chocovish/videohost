export interface ThumbnailOption {
  blob: Blob;
  url: string;
  timestampSeconds: number;
  width: number;
  height: number;
}

export interface VideoMetadata {
  durationSeconds: number;
  sourceWidth: number;
  sourceHeight: number;
  thumbnailBlob: Blob | null;
  thumbnailUrl: string | null;
  thumbnails?: ThumbnailOption[];
  sizeBytes?: number;
  mimeType?: string;
  codec?: string;
  bitrate?: number;
  fps?: number;
  audioCodec?: string;
  formatName?: string;
}

export interface ProcessThumbnailOptions {
  maxWidth?: number; // Default 1280 (720p max width)
  maxHeight?: number; // Default 720 (720p max height)
  quality?: number; // Default 0.82 (lossy WebP compression)
}

export interface ProcessThumbnailResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
}

export interface ExtractVideoMetadataOptions {
  fallbackDuration?: number;
  thumbnailTimestamp?: number; // In seconds (single timestamp override)
  thumbnailCount?: number; // Default 4 (extract 4 distributed thumbnails)
  maxWidth?: number; // Default 1280
  maxHeight?: number; // Default 720
  quality?: number; // Default 0.82
  generateThumbnail?: boolean; // Default true
}

export type ThumbnailDrawableInput =
  | File
  | Blob
  | HTMLVideoElement
  | HTMLCanvasElement
  | HTMLImageElement
  | OffscreenCanvas
  | ImageBitmap;

/**
 * Calculates evenly distributed timestamps across a video duration for thumbnail candidates.
 */
export function calculateThumbnailTimestamps(durationSeconds: number, count: number = 4): number[] {
  if (count <= 1) {
    return [durationSeconds > 0 ? Math.min(1.0, durationSeconds / 2) : 0];
  }

  const d = Math.max(0, durationSeconds);
  if (d === 0) {
    return Array.from({ length: count }, (_, i) => i * 0.5);
  }

  if (d <= 2) {
    const step = d / (count + 1);
    return Array.from({ length: count }, (_, i) => Math.round((i + 1) * step * 100) / 100);
  }

  // 4 nicely spaced distribution ratios across video timeline: ~10%, ~35%, ~65%, ~90%
  const ratios =
    count === 4 ? [0.1, 0.35, 0.65, 0.9] : Array.from({ length: count }, (_, i) => (i + 1) / (count + 1));

  return ratios.map((r) => Math.round(d * r * 100) / 100);
}

/**
 * Reusable client-side helper to process thumbnails (auto-generated or custom uploaded):
 * 1. Resizes image or video frame so resolution NEVER exceeds 720p (1280x720 max bounds, preserving aspect ratio).
 * 2. Converts to lossy WebP format (`image/webp`) with configurable quality (default 0.82) for instant loading and small file size.
 * 3. Does 100% of processing on the client side using Canvas API / OffscreenCanvas.
 */
export async function processThumbnail(
  input: ThumbnailDrawableInput,
  options: ProcessThumbnailOptions = {}
): Promise<ProcessThumbnailResult> {
  const maxWidth = options.maxWidth ?? 1280;
  const maxHeight = options.maxHeight ?? 720;
  const quality = options.quality ?? 0.82;

  let sourceWidth = 0;
  let sourceHeight = 0;
  let drawableSource: CanvasImageSource;
  let cleanupObjectURL: string | null = null;

  if (typeof window !== "undefined" && input instanceof HTMLVideoElement) {
    sourceWidth = input.videoWidth || 640;
    sourceHeight = input.videoHeight || 360;
    drawableSource = input;
  } else if (typeof window !== "undefined" && input instanceof HTMLCanvasElement) {
    sourceWidth = input.width || 640;
    sourceHeight = input.height || 360;
    drawableSource = input;
  } else if (typeof OffscreenCanvas !== "undefined" && input instanceof OffscreenCanvas) {
    sourceWidth = input.width || 640;
    sourceHeight = input.height || 360;
    drawableSource = input as unknown as CanvasImageSource;
  } else if (typeof window !== "undefined" && input instanceof HTMLImageElement) {
    sourceWidth = input.naturalWidth || input.width || 640;
    sourceHeight = input.naturalHeight || input.height || 360;
    drawableSource = input;
  } else if (input instanceof File || input instanceof Blob) {
    const objectUrl = URL.createObjectURL(input);
    cleanupObjectURL = objectUrl;
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image for thumbnail processing"));
      img.src = objectUrl;
    });
    sourceWidth = img.naturalWidth || img.width || 640;
    sourceHeight = img.naturalHeight || img.height || 360;
    drawableSource = img;
  } else {
    throw new Error("Unsupported thumbnail input type");
  }

  try {
    if (sourceWidth <= 0 || sourceHeight <= 0) {
      throw new Error("Invalid source dimensions for thumbnail generation");
    }

    // Resolution should NEVER exceed 720p (1280x720 bounds preserving aspect ratio)
    let scale = 1;
    if (sourceWidth > maxWidth || sourceHeight > maxHeight) {
      scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
    }

    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

    let blob: Blob;

    if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to acquire 2D canvas context");
      }

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(drawableSource, 0, 0, targetWidth, targetHeight);

      blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error("Failed to encode thumbnail to lossy WebP"));
          },
          "image/webp",
          quality
        );
      });
    } else if (typeof OffscreenCanvas !== "undefined") {
      const offscreen = new OffscreenCanvas(targetWidth, targetHeight);
      const ctx = offscreen.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to acquire Offscreen 2D canvas context");
      }
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(drawableSource, 0, 0, targetWidth, targetHeight);
      blob = await offscreen.convertToBlob({ type: "image/webp", quality });
    } else {
      throw new Error("Canvas context is not supported in current environment");
    }

    const url = URL.createObjectURL(blob);
    return {
      blob,
      url,
      width: targetWidth,
      height: targetHeight,
    };
  } finally {
    if (cleanupObjectURL) {
      URL.revokeObjectURL(cleanupObjectURL);
    }
  }
}

export async function compressAndResizeImage(
  fileOrBlob: File | Blob,
  maxWidth = 1280,
  maxHeight = 720,
  quality = 0.82
): Promise<{ blob: Blob; url: string }> {
  const result = await processThumbnail(fileOrBlob, { maxWidth, maxHeight, quality });
  return { blob: result.blob, url: result.url };
}

export async function fixWebmDuration(blob: Blob, targetMimeType?: string): Promise<Blob> {
  return repairVideoContainer(blob, targetMimeType);
}

export async function repairVideoContainer(blob: Blob, targetMimeType?: string): Promise<Blob> {
  const mime = (targetMimeType || blob.type || "video/webm").toLowerCase();
  const isMp4 = mime.includes("mp4") || mime.includes("avc") || mime.includes("h264") || mime.includes("isom");
  const outMime = isMp4 ? "video/mp4" : "video/webm";

  try {
    const {
      Input,
      Output,
      WebMOutputFormat,
      Mp4OutputFormat,
      BufferTarget,
      BlobSource,
      ALL_FORMATS,
      Conversion,
    } = await import("mediabunny");

    const input = new Input({
      source: new BlobSource(blob),
      formats: ALL_FORMATS,
    });

    const outputFormat = isMp4 ? new Mp4OutputFormat() : new WebMOutputFormat();
    const target = new BufferTarget();

    const output = new Output({
      format: outputFormat,
      target,
    });

    const conversion = await Conversion.init({ input, output });
    if (conversion.isValid) {
      await conversion.execute();
      const buffer = target.buffer;
      if (buffer && buffer.byteLength > 0) {
        return new Blob([buffer], { type: outMime });
      }
    }
  } catch (err) {
    console.warn("Mediabunny video container indexing encountered an issue:", err);
  }

  return blob;
}

/**
 * Extract video metadata and 4 candidate frame thumbnails using Mediabunny.
 * Probes container, tracks, resolution, duration, bitrate, codec and renders
 * crisp WebP thumbnail frames via Mediabunny's CanvasSink.
 */
export async function extractVideoMetadataWithMediabunny(
  fileOrBlob: File | Blob,
  options: ExtractVideoMetadataOptions = {}
): Promise<VideoMetadata> {
  const sizeBytes = fileOrBlob.size;
  const mimeType = fileOrBlob.type || undefined;
  const fallbackDuration = options.fallbackDuration ?? 0;
  const shouldGenerateThumb = options.generateThumbnail !== false;
  const targetThumbnailCount = options.thumbnailCount ?? 4;

  try {
    const { Input, BlobSource, ALL_FORMATS, CanvasSink } = await import("mediabunny");

    const input = new Input({
      source: new BlobSource(fileOrBlob),
      formats: ALL_FORMATS,
    });

    const canRead = await input.canRead();
    if (!canRead) {
      throw new Error("Mediabunny format parser cannot read this media container");
    }

    // 1. Duration probing (Metadata first, computeDuration fallback)
    let durationSeconds = 0;
    try {
      const metaDur = await input.getDurationFromMetadata();
      if (typeof metaDur === "number" && isFinite(metaDur) && metaDur > 0) {
        durationSeconds = Math.round(metaDur * 100) / 100;
      }
    } catch {
      // ignore
    }

    if (durationSeconds <= 0) {
      try {
        const computedDur = await input.computeDuration();
        if (typeof computedDur === "number" && isFinite(computedDur) && computedDur > 0) {
          durationSeconds = Math.round(computedDur * 100) / 100;
        }
      } catch {
        // ignore
      }
    }

    if (durationSeconds <= 0 && fallbackDuration > 0) {
      durationSeconds = Math.round(fallbackDuration * 100) / 100;
    }

    // 2. Video Track Info
    let sourceWidth = 0;
    let sourceHeight = 0;
    let codec: string | undefined = undefined;
    let bitrate: number | undefined = undefined;
    let fps: number | undefined = undefined;
    const thumbnails: ThumbnailOption[] = [];
    let thumbnailBlob: Blob | null = null;
    let thumbnailUrl: string | null = null;

    const videoTrack = await input.getPrimaryVideoTrack();
    if (videoTrack) {
      try {
        sourceWidth = (await videoTrack.getDisplayWidth()) || 0;
        sourceHeight = (await videoTrack.getDisplayHeight()) || 0;
      } catch {
        // ignore
      }

      try {
        codec = (await videoTrack.getCodec()) || undefined;
      } catch {
        // ignore
      }

      try {
        const br = await videoTrack.getBitrate();
        if (typeof br === "number" && br > 0) {
          bitrate = br;
        }
      } catch {
        // ignore
      }

      try {
        const frameStats = await videoTrack.computeFrameRateMetrics?.({ targetPacketCount: 64 });
        if (frameStats?.bestGuessFrameRate) {
          fps = Math.round(frameStats.bestGuessFrameRate * 100) / 100;
        }
      } catch {
        // ignore
      }

      // 3. Extract 4 Thumbnail candidates using CanvasSink
      if (shouldGenerateThumb && (await videoTrack.canDecode())) {
        try {
          const canvasSink = new CanvasSink(videoTrack);
          const timestamps =
            options.thumbnailTimestamp !== undefined
              ? [options.thumbnailTimestamp]
              : calculateThumbnailTimestamps(durationSeconds, targetThumbnailCount);

          for (const ts of timestamps) {
            try {
              const wrappedCanvas = await canvasSink.getCanvas(ts);
              if (wrappedCanvas?.canvas) {
                const processed = await processThumbnail(wrappedCanvas.canvas, {
                  maxWidth: options.maxWidth ?? 1280,
                  maxHeight: options.maxHeight ?? 720,
                  quality: options.quality ?? 0.82,
                });
                thumbnails.push({
                  blob: processed.blob,
                  url: processed.url,
                  timestampSeconds: ts,
                  width: processed.width,
                  height: processed.height,
                });
              }
            } catch (frameErr) {
              console.warn(`Mediabunny failed frame at ${ts}s:`, frameErr);
            }
          }

          if (thumbnails.length > 0) {
            thumbnailBlob = thumbnails[0].blob;
            thumbnailUrl = thumbnails[0].url;
          }
        } catch (thumbErr) {
          console.warn("Mediabunny CanvasSink multi-thumbnail extraction warning:", thumbErr);
        }
      }
    }

    // 4. Audio Track Info
    let audioCodec: string | undefined = undefined;
    try {
      const audioTrack = (await input.getAudioTracks())[0];
      if (audioTrack) {
        audioCodec = (await audioTrack.getCodec()) || undefined;
      }
    } catch {
      // ignore
    }

    // 5. Container format name
    let formatName: string | undefined = undefined;
    try {
      const fmt = await input.getFormat();
      formatName = fmt?.name;
    } catch {
      // ignore
    }

    // Fallback if dimensions or thumbnails were not available from Mediabunny WebCodecs
    if ((!thumbnailBlob || sourceWidth === 0 || sourceHeight === 0) && typeof window !== "undefined") {
      try {
        const domFallback = await extractVideoMetadataWithDOM(fileOrBlob, fallbackDuration, targetThumbnailCount);
        if (sourceWidth === 0) sourceWidth = domFallback.sourceWidth;
        if (sourceHeight === 0) sourceHeight = domFallback.sourceHeight;
        if (durationSeconds === 0) durationSeconds = domFallback.durationSeconds;
        if (!thumbnailBlob && domFallback.thumbnailBlob) {
          thumbnailBlob = domFallback.thumbnailBlob;
          thumbnailUrl = domFallback.thumbnailUrl;
        }
        if (thumbnails.length === 0 && domFallback.thumbnails && domFallback.thumbnails.length > 0) {
          thumbnails.push(...domFallback.thumbnails);
        }
      } catch {
        // ignore
      }
    }

    return {
      durationSeconds: Math.round(durationSeconds),
      sourceWidth,
      sourceHeight,
      thumbnailBlob,
      thumbnailUrl,
      thumbnails: thumbnails.length > 0 ? thumbnails : undefined,
      sizeBytes,
      mimeType,
      codec,
      bitrate,
      fps,
      audioCodec,
      formatName,
    };
  } catch (err) {
    console.warn("Mediabunny metadata extraction encountered an issue, falling back to DOM decoder:", err);
    return extractVideoMetadataWithDOM(fileOrBlob, fallbackDuration, targetThumbnailCount);
  }
}

/**
 * Dedicated utility function to generate multiple video thumbnails using Mediabunny.
 */
export async function extractMultipleThumbnailsWithMediabunny(
  fileOrBlob: File | Blob,
  count: number = 4,
  options?: ProcessThumbnailOptions
): Promise<ThumbnailOption[]> {
  try {
    const { Input, BlobSource, ALL_FORMATS, CanvasSink } = await import("mediabunny");

    const input = new Input({
      source: new BlobSource(fileOrBlob),
      formats: ALL_FORMATS,
    });

    const canRead = await input.canRead();
    if (!canRead) return [];

    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack || !(await videoTrack.canDecode())) return [];

    let dur = 0;
    try {
      dur = (await input.getDurationFromMetadata()) || 0;
    } catch {
      dur = 0;
    }
    if (dur <= 0) {
      try {
        dur = (await input.computeDuration()) || 0;
      } catch {
        dur = 0;
      }
    }

    const timestamps = calculateThumbnailTimestamps(dur, count);
    const canvasSink = new CanvasSink(videoTrack);
    const results: ThumbnailOption[] = [];

    for (const ts of timestamps) {
      try {
        const wrappedCanvas = await canvasSink.getCanvas(ts);
        if (wrappedCanvas?.canvas) {
          const processed = await processThumbnail(wrappedCanvas.canvas, options);
          results.push({
            blob: processed.blob,
            url: processed.url,
            timestampSeconds: ts,
            width: processed.width,
            height: processed.height,
          });
        }
      } catch {
        // ignore frame failure
      }
    }

    return results;
  } catch (e) {
    console.warn("Failed to generate multiple video thumbnails with Mediabunny:", e);
    return [];
  }
}

/**
 * Dedicated utility function to generate a single video thumbnail using Mediabunny.
 */
export async function generateVideoThumbnailWithMediabunny(
  fileOrBlob: File | Blob,
  timestampSeconds?: number,
  options?: ProcessThumbnailOptions
): Promise<ProcessThumbnailResult | null> {
  const list = await extractMultipleThumbnailsWithMediabunny(fileOrBlob, 1, options);
  if (list.length > 0) {
    return {
      blob: list[0].blob,
      url: list[0].url,
      width: list[0].width,
      height: list[0].height,
    };
  }
  return null;
}

/**
 * Fallback metadata and multiple thumbnail extractor using DOM HTMLVideoElement.
 */
export function extractVideoMetadataWithDOM(
  file: File | Blob,
  fallbackDuration: number = 0,
  thumbnailCount: number = 4
): Promise<VideoMetadata> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      return resolve({
        durationSeconds: fallbackDuration || 0,
        sourceWidth: 0,
        sourceHeight: 0,
        thumbnailBlob: null,
        thumbnailUrl: null,
        sizeBytes: file.size,
        mimeType: file.type,
      });
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    let resolved = false;
    const thumbnails: ThumbnailOption[] = [];

    const cleanupAndResolve = (result: VideoMetadata) => {
      if (!resolved) {
        resolved = true;
        URL.revokeObjectURL(url);
        resolve(result);
      }
    };

    const getValidDuration = (): number => {
      if (
        typeof video.duration === "number" &&
        isFinite(video.duration) &&
        !isNaN(video.duration) &&
        video.duration > 0
      ) {
        return Math.round(video.duration);
      }
      if (
        typeof video.currentTime === "number" &&
        isFinite(video.currentTime) &&
        video.currentTime > 0 &&
        video.currentTime < 1e5
      ) {
        return Math.round(video.currentTime);
      }
      if (
        typeof fallbackDuration === "number" &&
        isFinite(fallbackDuration) &&
        !isNaN(fallbackDuration) &&
        fallbackDuration > 0
      ) {
        return Math.round(fallbackDuration);
      }
      return 0;
    };

    const timeoutId = setTimeout(() => {
      cleanupAndResolve({
        durationSeconds: getValidDuration(),
        sourceWidth: video.videoWidth || 0,
        sourceHeight: video.videoHeight || 0,
        thumbnailBlob: thumbnails[0]?.blob || null,
        thumbnailUrl: thumbnails[0]?.url || null,
        thumbnails: thumbnails.length > 0 ? thumbnails : undefined,
        sizeBytes: file.size,
        mimeType: file.type,
      });
    }, 6000);

    let timestamps: number[] = [];
    let currentSeekIdx = 0;

    const captureNextSeekFrame = async () => {
      try {
        const originalWidth = video.videoWidth || 640;
        const originalHeight = video.videoHeight || 360;
        const ts = timestamps[currentSeekIdx] || 0;

        const processed = await processThumbnail(video, {
          maxWidth: 1280,
          maxHeight: 720,
          quality: 0.82,
        });

        thumbnails.push({
          blob: processed.blob,
          url: processed.url,
          timestampSeconds: ts,
          width: processed.width,
          height: processed.height,
        });
      } catch (e) {
        console.warn("DOM frame capture warning:", e);
      }

      currentSeekIdx++;
      if (currentSeekIdx < timestamps.length) {
        video.currentTime = timestamps[currentSeekIdx];
      } else {
        clearTimeout(timeoutId);
        cleanupAndResolve({
          durationSeconds: getValidDuration(),
          sourceWidth: video.videoWidth || 0,
          sourceHeight: video.videoHeight || 0,
          thumbnailBlob: thumbnails[0]?.blob || null,
          thumbnailUrl: thumbnails[0]?.url || null,
          thumbnails: thumbnails.length > 0 ? thumbnails : undefined,
          sizeBytes: file.size,
          mimeType: file.type,
        });
      }
    };

    video.onloadedmetadata = () => {
      const dur = getValidDuration();
      timestamps = calculateThumbnailTimestamps(dur, thumbnailCount);
      if (timestamps.length > 0) {
        video.currentTime = timestamps[0];
      } else {
        captureNextSeekFrame();
      }
    };

    video.onseeked = () => {
      captureNextSeekFrame();
    };

    video.onerror = () => {
      clearTimeout(timeoutId);
      cleanupAndResolve({
        durationSeconds: getValidDuration(),
        sourceWidth: 0,
        sourceHeight: 0,
        thumbnailBlob: null,
        thumbnailUrl: null,
        sizeBytes: file.size,
        mimeType: file.type,
      });
    };

    video.src = url;
  });
}

/**
 * Universal video metadata and 4-thumbnail extractor.
 * Defaults to high-performance Mediabunny WebCodecs pipeline with fallback.
 */
export function extractVideoMetadataAndThumbnail(
  file: File | Blob,
  fallbackDuration: number = 0
): Promise<VideoMetadata> {
  return extractVideoMetadataWithMediabunny(file, { fallbackDuration, thumbnailCount: 4 });
}

export function formatDuration(sec?: number): string {
  if (sec === undefined || sec === null || !isFinite(sec) || isNaN(sec) || sec < 0) {
    return "0:00";
  }
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function formatBytes(bytes?: number | bigint | string | null): string {
  if (bytes === undefined || bytes === null) return "Not available";
  const num = typeof bytes === "bigint" ? Number(bytes) : typeof bytes === "string" ? parseFloat(bytes) : bytes;
  if (isNaN(num) || num < 0) return "Not available";
  if (num === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return `${parseFloat((num / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
