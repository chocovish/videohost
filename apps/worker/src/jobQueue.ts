import { ProgressReporter } from "./progress";
import { TranscodeJobPayload } from "./transcoder";

type JobRunner = () => Promise<void>;

interface QueueEntry {
  videoId: string;
  payload?: TranscodeJobPayload;
  run: JobRunner;
  resolve: () => void;
  reject: (err: unknown) => void;
}

function getMaxConcurrentJobs(): number {
  const raw = process.env.WORKER_MAX_CONCURRENT_JOBS ?? process.env.MAX_CONCURRENT_JOBS;
  const parsed = parseInt((raw || "").replace(/["'\r\n]/g, "").trim(), 10);
  return isNaN(parsed) || parsed < 1 ? 2 : parsed;
}

const pending: QueueEntry[] = [];
let active = 0;
const activeVideoIds = new Set<string>();

export function isJobQueuedOrActive(videoId: string): boolean {
  return activeVideoIds.has(videoId) || pending.some((e) => e.videoId === videoId);
}

/**
 * Removes a job from the pending queue before it starts.
 * Returns true if a queued entry was removed, false if the job was not queued
 * (either already active or unknown).
 */
export function cancelQueuedJob(videoId: string): boolean {
  const idx = pending.findIndex((e) => e.videoId === videoId);
  if (idx === -1) return false;

  const [entry] = pending.splice(idx, 1);
  console.log(`[Job Queue] Cancelled queued video ${videoId} (${pending.length} remaining)`);
  // Settle the caller's promise — cancellation is not an error at queue level
  entry.resolve();
  return true;
}

export function getQueueStats(): { active: number; queued: number; maxConcurrent: number } {
  return {
    active,
    queued: pending.length,
    maxConcurrent: getMaxConcurrentJobs(),
  };
}

export async function shutdownQueue(): Promise<void> {
  if (pending.length > 0) {
    console.log(`[Job Queue] SIGTERM shutdown: discarding ${pending.length} pending job(s)`);
    const entries = [...pending];
    pending.length = 0;
    for (const entry of entries) {
      if (entry.payload?.callbackUrl) {
        try {
          const reporter = new ProgressReporter(
            entry.videoId,
            entry.payload.organizationId || "default",
            entry.payload.callbackUrl
          );
          await reporter.report(0, "CANCELLED", true, {
            videoId: entry.videoId,
            organizationId: entry.payload.organizationId || "default",
            status: "CANCELLED",
            progress: 0,
            error: "Transcoding cancelled (worker shutdown before processing started)",
          });
        } catch (e: any) {
          console.error(`[Job Queue] Failed to send CANCELLED callback for queued video ${entry.videoId}:`, e?.message || e);
        }
      }
      try { entry.resolve(); } catch {}
    }
  }
}

/**
 * Enqueues a job and resolves/rejects only once the job finishes running.
 * At most WORKER_MAX_CONCURRENT_JOBS jobs run at the same time.
 */
export function enqueueJob(videoId: string, run: JobRunner, payload?: TranscodeJobPayload): Promise<void> {
  const stats = getQueueStats();
  console.log(
    `[Job Queue] Queued video ${videoId} (position ${stats.queued + 1}, ${stats.active}/${stats.maxConcurrent} active)`
  );

  return new Promise<void>((resolve, reject) => {
    pending.push({ videoId, payload, run, resolve, reject });
    drain();
  });
}

function drain(): void {
  const max = getMaxConcurrentJobs();
  while (active < max && pending.length > 0) {
    const entry = pending.shift()!;
    active++;
    activeVideoIds.add(entry.videoId);

    console.log(`[Job Queue] Starting video ${entry.videoId} (${active}/${max} active, ${pending.length} queued)`);

    entry
      .run()
      // Decrement bookkeeping BEFORE settling the caller's promise so queue
      // stats are accurate by the time anyone observes completion.
      .finally(() => {
        active--;
        activeVideoIds.delete(entry.videoId);
        console.log(`[Job Queue] Finished video ${entry.videoId} (${active}/${max} active, ${pending.length} queued)`);
        drain();
      })
      .then(() => {
        entry.resolve();
      })
      .catch((err) => {
        console.error(`[Job Queue] Video ${entry.videoId} failed:`, err?.message || err);
        entry.reject(err);
      });
  }
}
