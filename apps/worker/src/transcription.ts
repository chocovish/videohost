import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { Job } from "bullmq";
import { S3ConfigContext, deleteS3Object, uploadFileToS3 } from "./s3";
import { useDockerHostForLocalhost, useLocalhostForDockerHost } from "./urlUtils";
import { ProgressCallback, ProgressReporter } from "./progress";
import { JOB_CANCELLED_CODE, JobCancelledError } from "./transcoder";

/**
 * Payload contract for the transcription job.
 *
 * Everything the worker needs is supplied per-job by the Next.js app —
 * the worker holds no transcription config of its own (besides the shared
 * WORKER_SECRET_TOKEN used to authenticate callbacks, same as transcodes).
 *
 * - audioHlsUrl: CDN link of the video's dedicated audio rendition .m3u8
 *   (e.g. https://cdn.example.com/bucket/videos/{org}/{video}/dash/media_2.m3u8)
 * - fallbackHlsUrl: optional CDN link of master.m3u8, tried when the audio
 *   playlist fails (worker extracts the audio stream with `-map 0:a`).
 * - whisperUrl: Whisper server base URL (e.g. http://host:9000) — the
 *   `/v1/audio/transcriptions` path is appended by the worker. A full legacy
 *   endpoint ending in `/v1/audio/transcriptions` is still accepted.
 * - whisperApiKey: bearer token sent as `Authorization: Bearer <key>`
 * - storageKey: destination S3 key for the resulting .vtt file
 * - callbackUrl: Next.js transcription-callback endpoint
 */
export interface TranscriptionJobPayload {
  jobType?: "transcription";
  videoId: string;
  organizationId: string;
  audioHlsUrl?: string;
  audioUrl?: string;
  fallbackHlsUrl?: string;
  masterHlsUrl?: string;
  whisperUrl?: string;
  whisperApiUrl?: string;
  whisperApiKey?: string;
  whisperAuthToken?: string;
  whisperLanguage?: string;
  whisperModel?: string;
  responseFormat?: string;
  s3: S3ConfigContext;
  subtitleId: string;
  storageKey: string;
  language: string;
  label: string;
  callbackUrl?: string;
}

/** Queue/dedupe key for transcription jobs — one transcription per video at a time. */
export function transcriptionQueueKey(videoId: string): string {
  return `transcription:${videoId}`;
}

/** BullMQ jobId for transcription jobs on the shared "video-transcode" queue. */
export function transcriptionBullJobId(videoId: string): string {
  return `transcribe-${videoId}`;
}

interface ActiveTranscriptionEntry {
  controller: AbortController;
  command: ReturnType<typeof ffmpeg> | null;
  payload?: TranscriptionJobPayload;
  reporter?: ProgressReporter;
  done: Promise<void>;
}

// Tracks in-flight transcription jobs so they can be aborted on demand.
// Keyed by transcriptionQueueKey(videoId), separate from transcode jobs.
const activeTranscriptions = new Map<string, ActiveTranscriptionEntry>();

export function cancelActiveTranscription(videoId: string): boolean {
  const entry = activeTranscriptions.get(transcriptionQueueKey(videoId));
  if (!entry) return false;

  console.log(`[Worker Transcribe] Cancellation requested for video ${videoId}, killing ffmpeg...`);
  entry.controller.abort();
  try {
    entry.command?.kill("SIGKILL");
  } catch {}
  return true;
}

export function isTranscriptionActive(videoId: string): boolean {
  return activeTranscriptions.has(transcriptionQueueKey(videoId));
}

export function getActiveTranscriptionIds(): string[] {
  return Array.from(activeTranscriptions.keys());
}

export async function cancelAllActiveTranscriptions(timeoutMs: number = 8000): Promise<void> {
  const entries = Array.from(activeTranscriptions.values());
  const ids = getActiveTranscriptionIds();
  if (ids.length === 0) {
    console.log("[Worker Transcribe] SIGTERM cleanup: no active transcriptions");
    return;
  }
  console.log(`[Worker Transcribe] SIGTERM cleanup: cancelling ${ids.length} active transcription(s): ${ids.join(", ")}`);
  for (const entry of entries) {
    entry.controller.abort();
    try {
      entry.command?.kill("SIGKILL");
    } catch {}
  }
  const donePromises = entries.map((e) => e.done);
  const timeoutPromise = new Promise((resolve) => setTimeout(resolve, timeoutMs));
  await Promise.race([Promise.allSettled(donePromises), timeoutPromise]);
  console.log("[Worker Transcribe] SIGTERM cleanup: finished waiting for active transcriptions");
}

function isMissing(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

function resolveAudioSources(payload: TranscriptionJobPayload): { primary: string; fallback?: string } {
  const primary = (payload.audioHlsUrl || payload.audioUrl || "").trim();
  const fallback = (payload.fallbackHlsUrl || payload.masterHlsUrl || "").trim();
  return { primary, fallback: fallback || undefined };
}

function resolveWhisperUrl(payload: TranscriptionJobPayload): string {
  const raw = (payload.whisperUrl || payload.whisperApiUrl || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  // Accept both a base URL (http://host:port) and the legacy full endpoint.
  // The transcription path is prepared here.
  if (/\/v1\/audio\/transcriptions$/i.test(raw)) return raw;
  return `${raw}/v1/audio/transcriptions`;
}

function resolveWhisperKey(payload: TranscriptionJobPayload): string {
  const raw = payload.whisperApiKey ?? payload.whisperAuthToken ?? "";
  return raw.replace(/^Bearer\s+/i, "").trim();
}

function resolveResponseFormat(payload: TranscriptionJobPayload): string {
  // Callers may send padded values (e.g. "vtt   ") — always trim.
  const cleaned = (payload.responseFormat || "vtt").trim().toLowerCase();
  return cleaned || "vtt";
}

/**
 * Converts an HLS audio playlist URL to a 16kHz mono WAV file using ffmpeg,
 * then sends it to a Whisper-compatible transcription endpoint and returns
 * the resulting WebVTT text.
 */
export async function processTranscriptionJob(
  payloadInput: TranscriptionJobPayload,
  jobOrProgressCallback?: Job | ProgressCallback | { onProgress?: ProgressCallback; job?: Job }
): Promise<any> {
  // Transform localhost URLs to host.docker.internal for worker container network calls
  const payload = useDockerHostForLocalhost(payloadInput);

  const { videoId, organizationId, callbackUrl, subtitleId, storageKey } = payload;
  const orgId = organizationId || "default";
  const { primary: audioUrl, fallback: fallbackUrl } = resolveAudioSources(payload);
  const whisperUrl = resolveWhisperUrl(payload);
  const whisperApiKey = resolveWhisperKey(payload);
  const responseFormat = resolveResponseFormat(payload);

  console.log(`[Worker Transcribe] Starting transcription for videoId: ${videoId}, subtitleId: ${subtitleId}`);

  const missing: string[] = [];
  if (isMissing(videoId)) missing.push("videoId");
  if (isMissing(audioUrl)) missing.push("audioHlsUrl");
  if (isMissing(whisperUrl)) missing.push("whisperUrl");
  if (isMissing(whisperApiKey)) missing.push("whisperApiKey");
  if (isMissing(payload.s3?.endpoint)) missing.push("s3.endpoint");
  if (isMissing(payload.s3?.bucket)) missing.push("s3.bucket");
  if (isMissing(storageKey)) missing.push("storageKey");
  if (isMissing(subtitleId)) missing.push("subtitleId");
  if (isMissing(callbackUrl)) missing.push("callbackUrl");
  if (missing.length > 0) {
    throw new Error(`Transcription payload missing required field(s): ${missing.join(", ")}`);
  }

  let onProgressCallback: ProgressCallback | undefined;
  if (typeof jobOrProgressCallback === "function") {
    onProgressCallback = jobOrProgressCallback;
  } else if (jobOrProgressCallback && typeof (jobOrProgressCallback as any).updateProgress === "function") {
    const bullJob = jobOrProgressCallback as Job;
    onProgressCallback = async (progress: number) => {
      try {
        await bullJob.updateProgress(progress);
      } catch (err: any) {
        console.error(`[Worker BullMQ] Error updating transcribe job ${bullJob.id} progress (${progress}%):`, err?.message || err);
      }
    };
  } else if (jobOrProgressCallback && typeof jobOrProgressCallback === "object") {
    const opts = jobOrProgressCallback as { onProgress?: ProgressCallback; job?: Job };
    if (opts.onProgress) {
      onProgressCallback = opts.onProgress;
    } else if (opts.job && typeof opts.job.updateProgress === "function") {
      onProgressCallback = async (progress: number) => {
        try {
          await opts.job!.updateProgress(progress);
        } catch (err: any) {
          console.error(`[Worker BullMQ] Error updating transcribe job ${opts.job!.id} progress (${progress}%):`, err?.message || err);
        }
      };
    }
  }

  const reporter = new ProgressReporter(videoId, orgId, callbackUrl, onProgressCallback);
  await reporter.report(5, "PROCESSING", true);

  const queueKey = transcriptionQueueKey(videoId);
  let resolveJobDone!: () => void;
  const jobDone = new Promise<void>((resolve) => {
    resolveJobDone = resolve;
  });

  const controller = new AbortController();
  const activeEntry: ActiveTranscriptionEntry = { controller, command: null, payload, reporter, done: jobDone };
  activeTranscriptions.set(queueKey, activeEntry);

  const isCancelled = () => controller.signal.aborted;
  function assertNotCancelled(): void {
    if (isCancelled()) throw new JobCancelledError(videoId);
  }

  const tempDir = path.join(process.cwd(), "temp", `transcribe-${videoId}-${subtitleId}`);
  fs.mkdirSync(tempDir, { recursive: true });
  const wavPath = path.join(tempDir, "audio.wav").replace(/\\/g, "/");
  const vttPath = path.join(tempDir, "subtitles.vtt").replace(/\\/g, "/");
  let uploadedVtt = false;

  async function convertHlsToWav(sourceUrl: string): Promise<void> {
    console.log(`[Worker Transcribe] Converting HLS to WAV (16kHz mono): ${sourceUrl}`);
    await new Promise<void>((resolve, reject) => {
      const convertCommand = ffmpeg(sourceUrl)
        .outputOptions(["-vn", "-ac 1", "-ar 16000", "-c:a pcm_s16le"])
        .output(wavPath)
        .on("start", (cmdLine) => {
          console.log(`[Worker Transcribe FFmpeg] Executing: ${cmdLine}`);
        })
        .on("end", () => resolve())
        .on("error", (err) => reject(isCancelled() ? new JobCancelledError(videoId) : err));

      activeEntry.command = convertCommand;
      convertCommand.run();
    });
    activeEntry.command = null;
  }

  async function callWhisperApi(wavFilePath: string): Promise<string> {
    const wavBuffer = fs.readFileSync(wavFilePath);
    if (wavBuffer.length === 0) {
      throw new Error("FFmpeg produced an empty WAV file — no audio could be extracted from the HLS playlist");
    }
    console.log(`[Worker Transcribe] Sending ${(wavBuffer.length / 1024 / 1024).toFixed(2)}MB WAV to Whisper API...`);

    const form = new FormData();
    form.append("file", new Blob([wavBuffer], { type: "audio/wav" }), "audio.wav");
    form.append("response_format", responseFormat);
    const whisperLanguage = (payload.whisperLanguage || "").trim();
    if (whisperLanguage) form.append("language", whisperLanguage);
    const whisperModel = (payload.whisperModel || "").trim();
    if (whisperModel) form.append("model", whisperModel);

    let res: Response;
    try {
      res = await fetch(whisperUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${whisperApiKey}` },
        body: form,
        signal: controller.signal as any,
      });
    } catch (err: any) {
      if (isCancelled() || err?.name === "AbortError") throw new JobCancelledError(videoId);
      throw new Error(`Failed to reach Whisper API at ${whisperUrl}: ${err?.message || err}`);
    }

    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      throw new Error(`Whisper API error (HTTP ${res.status}): ${bodyText.slice(0, 500) || res.statusText}`);
    }

    const text = await res.text();
    if (!text || !text.trim()) {
      throw new Error("Whisper API returned an empty transcription");
    }
    return text;
  }

  try {
    assertNotCancelled();

    // 1. Convert the audio rendition HLS playlist to WAV
    try {
      await convertHlsToWav(audioUrl);
    } catch (err: any) {
      if (err instanceof JobCancelledError || isCancelled()) throw err;
      if (!fallbackUrl) throw err;
      console.warn(`[Worker Transcribe] Audio playlist failed (${err?.message || err}), retrying with fallback playlist...`);
      assertNotCancelled();
      await convertHlsToWav(fallbackUrl);
    }

    assertNotCancelled();
    await reporter.report(35, "PROCESSING", true);

    // 2. Transcribe via Whisper-compatible API (expects VTT back)
    const vttText = await callWhisperApi(wavPath);

    const firstLine = vttText.replace(/^\uFEFF/, "").trimStart().split(/\r?\n/, 1)[0]?.trim() || "";
    if (!firstLine.toUpperCase().startsWith("WEBVTT")) {
      throw new Error("Whisper API did not return WebVTT content (response must start with WEBVTT)");
    }

    assertNotCancelled();
    await reporter.report(65, "PROCESSING", true);

    // 3. Upload the VTT to S3
    fs.writeFileSync(vttPath, vttText, "utf-8");
    console.log(`[Worker Transcribe] Uploading VTT to S3: ${storageKey}`);
    await uploadFileToS3(vttPath, storageKey, "text/vtt", payload.s3, controller.signal);
    uploadedVtt = true;

    assertNotCancelled();
    await reporter.report(90, "PROCESSING", true);

    const sizeBytes = Buffer.byteLength(vttText, "utf-8");
    const resultLanguage = (payload.language || "en").trim() || "en";
    // Auto-generated tracks carry the language code in the name.
    const resultLabel = (payload.label || "").trim() || `Auto-generated (${resultLanguage})`;
    const rawResultPayload = {
      videoId,
      organizationId: orgId,
      subtitleId,
      storageKey,
      language: resultLanguage,
      label: resultLabel,
      status: "READY",
      progress: 100,
      sizeBytes,
    };
    const resultPayload = useLocalhostForDockerHost(rawResultPayload);

    console.log(`[Worker Transcribe] Transcription complete for ${videoId}! Posting results to callback...`);
    await reporter.report(100, "READY", true, resultPayload);

    return resultPayload;
  } catch (err: any) {
    const isCancelledError =
      err instanceof JobCancelledError ||
      err?.code === JOB_CANCELLED_CODE ||
      err?.message === "JOB_CANCELLED" ||
      isCancelled();
    if (isCancelledError) {
      console.log(`[Worker Transcribe] Transcription job for video ${videoId} was cancelled — cleaning up S3 and reporting CANCELLED`);
      if (uploadedVtt) {
        try {
          await deleteS3Object(storageKey, payload.s3);
          console.log(`[Worker Transcribe] Cleaned up S3 subtitle object for cancelled video ${videoId}`);
        } catch (cleanupErr: any) {
          console.error(`[Worker Transcribe] Failed to cleanup S3 subtitle for cancelled video ${videoId}:`, cleanupErr?.message || cleanupErr);
        }
      }
      try {
        await reporter.report(0, "CANCELLED", true, {
          videoId,
          organizationId: orgId,
          subtitleId,
          storageKey,
          status: "CANCELLED",
          progress: 0,
          error: "Transcription cancelled (worker shutdown or user cancelled)",
        });
      } catch (reportErr: any) {
        console.error(`[Worker Transcribe] Failed to report CANCELLED callback for ${videoId}:`, reportErr?.message || reportErr);
      }
      throw err instanceof JobCancelledError ? err : new JobCancelledError(videoId);
    }

    console.error(`[Worker Transcribe] Error transcribing video ${videoId}:`, err);
    const rawFailPayload = {
      videoId,
      organizationId: orgId,
      subtitleId,
      storageKey,
      status: "FAILED",
      progress: 0,
      error: err?.message || "Transcription failed",
    };
    const failPayload = useLocalhostForDockerHost(rawFailPayload);
    await reporter.report(0, "FAILED", true, failPayload);

    throw err;
  } finally {
    activeTranscriptions.delete(queueKey);
    resolveJobDone();
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log(`[Worker Transcribe] Cleaned up temp directory: ${tempDir}`);
      }
    } catch (cleanupErr: any) {
      console.error(`[Worker Transcribe] Warning: Failed to clean up temp dir ${tempDir}:`, cleanupErr?.message || cleanupErr);
    }
  }
}
