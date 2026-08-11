import ysFixWebmDuration from "fix-webm-duration";

export interface VideoMetadata {
  durationSeconds: number;
  sourceWidth: number;
  sourceHeight: number;
  thumbnailBlob: Blob | null;
  thumbnailUrl: string | null;
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

    const captureFrame = () => {
      clearTimeout(timeoutId);
      try {
        const canvas = document.createElement("canvas");
        const maxDim = 720;
        const originalWidth = video.videoWidth || 640;
        const originalHeight = video.videoHeight || 360;
        const scale = Math.min(1, maxDim / Math.max(originalWidth, originalHeight));

        canvas.width = Math.round(originalWidth * scale);
        canvas.height = Math.round(originalHeight * scale);

        const ctx = canvas.getContext("2d");
        if (ctx && canvas.width > 0 && canvas.height > 0) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              const thumbUrl = blob ? URL.createObjectURL(blob) : null;
              cleanupAndResolve({
                durationSeconds: getValidDuration(),
                sourceWidth: originalWidth,
                sourceHeight: originalHeight,
                thumbnailBlob: blob,
                thumbnailUrl: thumbUrl,
              });
            },
            "image/jpeg",
            0.7
          );
          return;
        }
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
