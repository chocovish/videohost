import { useLocalhostForDockerHost } from "./urlUtils";

export interface ProgressReportPayload {
  videoId: string;
  organizationId?: string;
  status: "PROCESSING" | "READY" | "FAILED";
  progress: number;
  [key: string]: any;
}

export class ProgressReporter {
  private videoId: string;
  private organizationId: string;
  private callbackUrl?: string;
  private lastReportedProgress: number = -1;
  private lastReportedTime: number = 0;
  private minProgressDelta: number = 5;
  private minTimeDeltaMs: number = 5 * 60 * 1000; // 5 minutes
  private isSending: boolean = false;

  constructor(videoId: string, organizationId: string = "default", callbackUrl?: string) {
    this.videoId = videoId;
    this.organizationId = organizationId;
    this.callbackUrl = callbackUrl;
  }

  /**
   * Reports progress if forced or if progress has increased by >= 5% or 5 minutes have elapsed.
   */
  public async report(
    currentProgress: number,
    status: "PROCESSING" | "READY" | "FAILED" = "PROCESSING",
    force: boolean = false,
    extraData: Record<string, any> = {}
  ): Promise<void> {
    const progress = Math.min(100, Math.max(0, Math.floor(currentProgress)));
    const now = Date.now();

    const progressDelta = Math.abs(progress - this.lastReportedProgress);
    const timeDelta = now - this.lastReportedTime;

    const shouldReport =
      force ||
      this.lastReportedProgress === -1 ||
      progress === 100 ||
      status !== "PROCESSING" ||
      progressDelta >= this.minProgressDelta ||
      timeDelta >= this.minTimeDeltaMs;

    if (!shouldReport) return;
    if (this.isSending && !force) return;

    this.lastReportedProgress = progress;
    this.lastReportedTime = now;

    if (!this.callbackUrl) {
      console.log(`[ProgressReporter] videoId: ${this.videoId} progress: ${progress}% (No callbackUrl)`);
      return;
    }

    const rawPayload: ProgressReportPayload = {
      videoId: this.videoId,
      organizationId: this.organizationId,
      status,
      progress,
      ...extraData,
    };

    const payload = useLocalhostForDockerHost(rawPayload);
    console.log(`[ProgressReporter] Reporting progress ${progress}% for video ${this.videoId} (${status})`);

    const workerSecret = process.env.WORKER_SECRET_TOKEN;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (workerSecret) {
      headers["Authorization"] = `Bearer ${workerSecret}`;
      headers["x-worker-secret"] = workerSecret;
    }

    this.isSending = true;
    try {
      const res = await fetch(this.callbackUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        console.error(`[ProgressReporter Error] HTTP ${res.status} from ${this.callbackUrl}: ${errorText}`);
      } else {
        console.log(`[ProgressReporter] Successfully posted ${progress}% callback to ${this.callbackUrl}`);
      }
    } catch (err: any) {
      console.error(`[ProgressReporter Error] Failed to post callback to ${this.callbackUrl}:`, err?.message || err);
    } finally {
      this.isSending = false;
    }
  }
}

/**
 * Calculates overall transcoding progress.
 * Transcoding total weight = 80%.
 * If there are N renditions, each completed rendition accounts for (80 / N)%.
 * Intra-rendition progress (0-100%) scales the current rendition's share.
 */
export function calculateTranscodeProgress(
  renditionIndex: number,
  totalRenditions: number,
  renditionPercent: number
): number {
  if (totalRenditions <= 0) return 80;
  const clampedRenditionPercent = Math.min(100, Math.max(0, renditionPercent));
  const completedWeight = (renditionIndex / totalRenditions) * 80;
  const currentWeight = (clampedRenditionPercent / 100) * (80 / totalRenditions);
  return Math.min(80, completedWeight + currentWeight);
}

/**
 * Calculates upload phase progress.
 * Upload phase spans from 80% to 100% (weight = 20%).
 */
export function calculateUploadProgress(uploadRatio: number): number {
  const clampedRatio = Math.min(1, Math.max(0, uploadRatio));
  return 80 + clampedRatio * 20;
}

/**
 * Utility to parse ffmpeg timemark string "HH:MM:SS.ms" into seconds.
 */
export function parseTimemarkToSeconds(timemark: string | undefined): number {
  if (!timemark) return 0;
  const parts = timemark.split(":");
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(timemark) || 0;
}
