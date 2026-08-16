import {
  VideoMetadata,
  extractVideoMetadataWithMediabunny,
  processThumbnail,
  ThumbnailOption,
} from "@/lib/video-utils";

export interface TrimVideoOptions {
  startTime: number; // in seconds (e.g. 2.45)
  endTime: number; // in seconds (e.g. 15.80)
  onProgress?: (percent: number, statusText: string) => void;
}

export interface FilmstripFrame {
  timestampSeconds: number;
  url: string;
}

/**
 * Extracts evenly spaced thumbnail frames across the video duration
 * to build an authentic visual filmstrip in the trimmer timeline scrubber.
 */
export async function extractFilmstripThumbnails(
  fileOrBlob: File | Blob,
  count: number = 10
): Promise<FilmstripFrame[]> {
  try {
    const { Input, BlobSource, ALL_FORMATS, CanvasSink } = await import("mediabunny");

    const input = new Input({
      source: new BlobSource(fileOrBlob),
      formats: ALL_FORMATS,
    });

    const canRead = await input.canRead();
    if (!canRead) return [];

    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack || !(await videoTrack.canDecode())) {
      return extractFilmstripWithDOM(fileOrBlob, count);
    }

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

    if (dur <= 0) return [];

    const timestamps: number[] = [];
    const step = dur / (count + 1);
    for (let i = 1; i <= count; i++) {
      timestamps.push(Math.round(i * step * 100) / 100);
    }

    const canvasSink = new CanvasSink(videoTrack);
    const frames: FilmstripFrame[] = [];

    for (const ts of timestamps) {
      try {
        const wrappedCanvas = await canvasSink.getCanvas(ts);
        if (wrappedCanvas?.canvas) {
          const processed = await processThumbnail(wrappedCanvas.canvas, {
            maxWidth: 160,
            maxHeight: 90,
            quality: 0.65,
          });
          frames.push({
            timestampSeconds: ts,
            url: processed.url,
          });
        }
      } catch (err) {
        console.warn(`Filmstrip frame extraction warning at ${ts}s:`, err);
      }
    }

    return frames;
  } catch (e) {
    console.warn("Mediabunny filmstrip extraction fallback to DOM:", e);
    return extractFilmstripWithDOM(fileOrBlob, count);
  }
}

/**
 * DOM-based fallback filmstrip frame extractor
 */
function extractFilmstripWithDOM(
  fileOrBlob: File | Blob,
  count: number = 8
): Promise<FilmstripFrame[]> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve([]);

    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(fileOrBlob);
    const frames: FilmstripFrame[] = [];
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        URL.revokeObjectURL(url);
        resolve(frames);
      }
    };

    const timeout = setTimeout(cleanup, 5000);

    video.onloadedmetadata = async () => {
      const dur = video.duration;
      if (!dur || !isFinite(dur) || dur <= 0) {
        clearTimeout(timeout);
        cleanup();
        return;
      }

      const timestamps: number[] = [];
      const step = dur / (count + 1);
      for (let i = 1; i <= count; i++) {
        timestamps.push(Math.round(i * step * 100) / 100);
      }

      let currentIdx = 0;
      video.onseeked = async () => {
        try {
          const processed = await processThumbnail(video, {
            maxWidth: 160,
            maxHeight: 90,
            quality: 0.65,
          });
          frames.push({
            timestampSeconds: timestamps[currentIdx],
            url: processed.url,
          });
        } catch {
          // ignore frame failure
        }

        currentIdx++;
        if (currentIdx < timestamps.length) {
          video.currentTime = timestamps[currentIdx];
        } else {
          clearTimeout(timeout);
          cleanup();
        }
      };

      video.currentTime = timestamps[0];
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
    };

    video.src = url;
  });
}

/**
 * Trims a recorded video in the browser.
 * Attempts ultra-fast direct stream packet copy first (NO re-encoding, near-instantaneous execution),
 * and automatically falls back to Mediabunny's Conversion engine if needed.
 */
export async function trimVideo(
  fileOrBlob: File | Blob,
  options: TrimVideoOptions
): Promise<{
  blob: Blob;
  file: File;
  previewUrl: string;
  metadata: VideoMetadata;
}> {
  const { startTime, endTime, onProgress } = options;

  if (startTime < 0 || endTime <= startTime) {
    throw new Error("Invalid trim range. Start time must be less than end time.");
  }

  onProgress?.(5, "Initializing fast trimming engine...");

  const {
    Input,
    Output,
    WebMOutputFormat,
    Mp4OutputFormat,
    BufferTarget,
    BlobSource,
    ALL_FORMATS,
    Conversion,
    EncodedVideoPacketSource,
    EncodedAudioPacketSource,
    EncodedPacketSink,
  } = await import("mediabunny");

  const input = new Input({
    source: new BlobSource(fileOrBlob),
    formats: ALL_FORMATS,
  });

  const canRead = await input.canRead();
  if (!canRead) {
    throw new Error("Unable to parse recorded video container for trimming.");
  }

  const mime = (fileOrBlob.type || "video/webm").toLowerCase();
  const isMp4 = mime.includes("mp4") || mime.includes("avc") || mime.includes("h264") || mime.includes("isom");
  const outMime = isMp4 ? "video/mp4" : "video/webm";

  let finalBuffer: ArrayBuffer | null = null;

  // --- ATTEMPT 1: FAST DIRECT STREAM COPY (Zero Re-encoding, Instantaneous) ---
  try {
    onProgress?.(15, "Performing direct stream copy (no re-encoding)...");
    const fastTarget = new BufferTarget();
    const fastOutput = new Output({
      format: isMp4 ? new Mp4OutputFormat() : new WebMOutputFormat(),
      target: fastTarget,
    });

    const videoTrack = await input.getPrimaryVideoTrack();
    const audioTrack = await input.getPrimaryAudioTrack();

    let videoSource: any = null;
    let audioSource: any = null;

    if (videoTrack) {
      const videoCodec = await videoTrack.getCodec();
      if (videoCodec) {
        videoSource = new EncodedVideoPacketSource(videoCodec);
        fastOutput.addVideoTrack(videoSource);
      }
    }

    if (audioTrack) {
      const audioCodec = await audioTrack.getCodec();
      if (audioCodec) {
        audioSource = new EncodedAudioPacketSource(audioCodec);
        fastOutput.addAudioTrack(audioSource);
      }
    }

    if (videoSource || audioSource) {
      await fastOutput.start();

      let baseTimestamp = startTime;

      // Copy Video Packets
      if (videoTrack && videoSource) {
        const videoSink = new EncodedPacketSink(videoTrack);
        let startKeyPacket: any = null;
        try {
          startKeyPacket = await videoSink.getKeyPacket(startTime);
        } catch {
          // fallback to first packet
        }

        if (startKeyPacket && typeof startKeyPacket.timestamp === "number") {
          baseTimestamp = Math.min(startTime, startKeyPacket.timestamp);
        }

        const videoDecoderConfig = await videoTrack.getDecoderConfig();
        const vMeta = videoDecoderConfig ? { decoderConfig: videoDecoderConfig } : undefined;
        let isFirstVideo = true;

        for await (const packet of videoSink.packets(startKeyPacket || undefined)) {
          if (packet.timestamp >= endTime) break;
          const adjustedTimestamp = Math.max(0, packet.timestamp - baseTimestamp);
          const modPacket = packet.clone({ timestamp: adjustedTimestamp });
          await videoSource.add(modPacket, isFirstVideo ? vMeta : undefined);
          isFirstVideo = false;
        }
      }

      // Copy Audio Packets
      if (audioTrack && audioSource) {
        const audioSink = new EncodedPacketSink(audioTrack);
        let startAudioPacket: any = null;
        try {
          startAudioPacket = await audioSink.getPacket(baseTimestamp);
        } catch {
          // ignore
        }

        const audioDecoderConfig = await audioTrack.getDecoderConfig();
        const aMeta = audioDecoderConfig ? { decoderConfig: audioDecoderConfig } : undefined;
        let isFirstAudio = true;

        for await (const packet of audioSink.packets(startAudioPacket || undefined)) {
          if (packet.timestamp >= endTime) break;
          const adjustedTimestamp = Math.max(0, packet.timestamp - baseTimestamp);
          const modPacket = packet.clone({ timestamp: adjustedTimestamp });
          await audioSource.add(modPacket, isFirstAudio ? aMeta : undefined);
          isFirstAudio = false;
        }
      }

      await fastOutput.finalize();

      if (fastTarget.buffer && fastTarget.buffer.byteLength > 0) {
        finalBuffer = fastTarget.buffer;
        onProgress?.(90, "Fast direct stream copy succeeded!");
      }
    }
  } catch (fastCopyErr) {
    console.warn("Direct stream copy encountered an issue, falling back to full Conversion pipeline:", fastCopyErr);
    finalBuffer = null;
  }

  // --- ATTEMPT 2: FULL CONVERSION PIPELINE FALLBACK ---
  if (!finalBuffer) {
    onProgress?.(25, "Encoding trimmed video frames...");
    const fallbackTarget = new BufferTarget();
    const fallbackOutput = new Output({
      format: isMp4 ? new Mp4OutputFormat() : new WebMOutputFormat(),
      target: fallbackTarget,
    });

    const conversion = await Conversion.init({
      input,
      output: fallbackOutput,
      trim: {
        start: startTime,
        end: endTime,
      },
    });

    if (!conversion.isValid) {
      throw new Error("Conversion configuration is invalid for trimmed video output.");
    }

    conversion.onProgress = (pct) => {
      const p = Math.min(92, Math.round(25 + pct * 65));
      onProgress?.(p, `Processing trimmed frames (${Math.round(pct * 100)}%)...`);
    };

    await conversion.execute();

    if (!fallbackTarget.buffer || fallbackTarget.buffer.byteLength === 0) {
      throw new Error("Trimming completed but produced empty output buffer.");
    }

    finalBuffer = fallbackTarget.buffer;
  }

  onProgress?.(94, "Finalizing container indexing & thumbnails...");

  const trimmedBlob = new Blob([finalBuffer], { type: outMime });

  const originalName = fileOrBlob instanceof File ? fileOrBlob.name : "Studio Recording.webm";
  const ext = isMp4 ? ".mp4" : ".webm";
  const nameBase = originalName.replace(/\.[^/.]+$/, "").replace(/\s*\(Trimmed(\s*\d+)?\)$/, "");
  const trimmedName = `${nameBase} (Trimmed)${ext}`;
  const trimmedFile = new File([trimmedBlob], trimmedName, { type: outMime });

  const previewUrl = URL.createObjectURL(trimmedBlob);
  const trimmedDuration = Math.max(0.1, endTime - startTime);

  let metadata: VideoMetadata;
  try {
    metadata = await extractVideoMetadataWithMediabunny(trimmedFile, {
      fallbackDuration: trimmedDuration,
      thumbnailCount: 4,
    });
  } catch (err) {
    console.warn("Trimmed video metadata extraction warning:", err);
    metadata = {
      durationSeconds: Math.round(trimmedDuration),
      sourceWidth: 1920,
      sourceHeight: 1080,
      thumbnailBlob: null,
      thumbnailUrl: null,
      sizeBytes: trimmedFile.size,
      mimeType: outMime,
    };
  }

  onProgress?.(100, "Trimming complete!");

  return {
    blob: trimmedBlob,
    file: trimmedFile,
    previewUrl,
    metadata,
  };
}

export function formatTimecode(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
    return "00:00.0";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${tenths}`;
}
