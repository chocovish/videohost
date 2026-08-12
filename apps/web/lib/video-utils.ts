import ysFixWebmDuration from "fix-webm-duration";

export interface VideoMetadata {
  durationSeconds: number;
  sourceWidth: number;
  sourceHeight: number;
  thumbnailBlob: Blob | null;
  thumbnailUrl: string | null;
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

/**
 * Reusable client-side helper to process thumbnails (auto-generated or custom uploaded):
 * 1. Resizes image or video frame so resolution NEVER exceeds 720p (1280x720 max bounds, preserving aspect ratio).
 * 2. Converts to lossy WebP format (`image/webp`) with configurable quality (default 0.82) for instant loading and small file size.
 * 3. Does 100% of processing on the client side using Canvas API.
 */
export async function processThumbnail(
  input: File | Blob | HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
  options: ProcessThumbnailOptions = {}
): Promise<ProcessThumbnailResult> {
  const maxWidth = options.maxWidth ?? 1280;
  const maxHeight = options.maxHeight ?? 720;
  const quality = options.quality ?? 0.82;

  let sourceWidth = 0;
  let sourceHeight = 0;
  let drawableSource: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement;
  let cleanupObjectURL: string | null = null;

  if (typeof window !== "undefined" && input instanceof HTMLVideoElement) {
    sourceWidth = input.videoWidth || 640;
    sourceHeight = input.videoHeight || 360;
    drawableSource = input;
  } else if (typeof window !== "undefined" && input instanceof HTMLCanvasElement) {
    sourceWidth = input.width || 640;
    sourceHeight = input.height || 360;
    drawableSource = input;
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

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error("Failed to encode thumbnail to lossy WebP"));
        },
        "image/webp",
        quality
      );
    });

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

export function fixWebmDuration(blob: Blob, durationMs: number): Promise<Blob> {
  return new Promise((resolve) => {
    try {
      ysFixWebmDuration(blob, durationMs, (fixedBlob: Blob) => {
        resolve(fixedBlob);
      });
    } catch (err) {
      console.warn("Failed to fix WebM duration header:", err);
      resolve(blob);
    }
  });
}

export function extractVideoMetadataAndThumbnail(
  file: File | Blob,
  fallbackDuration: number = 0
): Promise<VideoMetadata> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    let resolved = false;

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
        thumbnailBlob: null,
        thumbnailUrl: null,
      });
    }, 4000);

    const captureFrame = async () => {
      clearTimeout(timeoutId);
      try {
        const originalWidth = video.videoWidth || 640;
        const originalHeight = video.videoHeight || 360;

        const processed = await processThumbnail(video, {
          maxWidth: 1280,
          maxHeight: 720,
          quality: 0.82,
        });

        cleanupAndResolve({
          durationSeconds: getValidDuration(),
          sourceWidth: originalWidth,
          sourceHeight: originalHeight,
          thumbnailBlob: processed.blob,
          thumbnailUrl: processed.url,
        });
        return;
      } catch (e) {
        console.warn("Failed canvas thumbnail rendering:", e);
      }

      cleanupAndResolve({
        durationSeconds: getValidDuration(),
        sourceWidth: video.videoWidth || 0,
        sourceHeight: video.videoHeight || 0,
        thumbnailBlob: null,
        thumbnailUrl: null,
      });
    };

    video.onloadedmetadata = () => {
      if (video.duration === Infinity) {
        video.currentTime = 1e101;
        video.ontimeupdate = () => {
          video.ontimeupdate = null;
          if (video.duration === Infinity) {
            video.currentTime = 0;
          }
          captureFrame();
        };
      } else {
        const dur = video.duration || 0;
        const seekTime = isFinite(dur) && dur > 0 ? Math.min(1.0, dur / 2) : 0;
        if (seekTime > 0) {
          video.currentTime = seekTime;
        } else {
          captureFrame();
        }
      }
    };

    video.onseeked = () => {
      captureFrame();
    };

    video.onerror = () => {
      clearTimeout(timeoutId);
      cleanupAndResolve({
        durationSeconds: getValidDuration(),
        sourceWidth: 0,
        sourceHeight: 0,
        thumbnailBlob: null,
        thumbnailUrl: null,
      });
    };

    video.src = url;
  });
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
