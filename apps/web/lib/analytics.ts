import { db, type Prisma } from "@videohost/db";

export type AnalyticsRangeKey = "today" | "7d" | "30d" | "all";

export const ANALYTICS_RANGES: { key: AnalyticsRangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "all", label: "All time" },
];

/** Number of 5%-wide buckets in the retention heatmap. */
export const HEATMAP_BUCKETS = 20;
/** A session counts as "completed" once it reaches this fraction of duration. */
export const COMPLETION_THRESHOLD = 0.9;

/** UTC midnight of the given date. */
export function startOfUtcDay(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function parseRangeKey(raw: unknown): AnalyticsRangeKey {
  if (raw === "today" || raw === "7d" || raw === "30d" || raw === "all") return raw;
  return "7d";
}

/** Resolve an inclusive [from, to] window for a range key. `from` is UTC midnight. */
export function resolveRange(key: AnalyticsRangeKey, now = new Date()): { from: Date | null; to: Date } {
  const to = now;
  switch (key) {
    case "today":
      return { from: startOfUtcDay(now), to };
    case "7d":
      return { from: new Date(startOfUtcDay(now).getTime() - 6 * 24 * 3600 * 1000), to };
    case "30d":
      return { from: new Date(startOfUtcDay(now).getTime() - 29 * 24 * 3600 * 1000), to };
    case "all":
      return { from: null, to };
  }
}

export function dateKeyUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Fill every UTC day in [from, to] so charts never have gaps. */
export function eachDayKey(from: Date, to: Date): string[] {
  const keys: string[] = [];
  const cursor = startOfUtcDay(from).getTime();
  const end = startOfUtcDay(to).getTime();
  for (let t = cursor; t <= end; t += 24 * 3600 * 1000) {
    keys.push(new Date(t).toISOString().slice(0, 10));
  }
  // Guard against "all"-style unbounded ranges passed by mistake.
  return keys.slice(-366);
}

// ---------------------------------------------------------------------------
// Request attribution helpers (no extra dependencies)
// ---------------------------------------------------------------------------

const BOT_PATTERN = /bot|crawl|spider|slurp|mediapartners|baidu|yandex|headless|puppet|playwright|selenium|phantomjs/i;

export function isBotUserAgent(ua: string | null): boolean {
  return !!ua && BOT_PATTERN.test(ua);
}

export interface ParsedClient {
  device: string;
  browser: string;
  os: string;
}

export function parseUserAgent(ua: string | null): ParsedClient {
  const fallback = { device: "unknown", browser: "unknown", os: "unknown" };
  if (!ua) return fallback;
  const lower = ua.toLowerCase();

  let os = "unknown";
  if (lower.includes("windows")) os = "windows";
  else if (lower.includes("android")) os = "android";
  else if (lower.includes("iphone") || lower.includes("ipad") || lower.includes("ios")) os = "ios";
  else if (lower.includes("mac os") || lower.includes("macintosh")) os = "macos";
  else if (lower.includes("linux")) os = "linux";

  let device = "desktop";
  if (lower.includes("mobi") || lower.includes("android") || lower.includes("iphone")) device = "mobile";
  else if (lower.includes("ipad") || lower.includes("tablet")) device = "tablet";
  else if (lower.includes(" tv") || lower.includes("smart-tv") || lower.includes("googletv")) device = "tv";

  let browser = "other";
  if (lower.includes("edg/") || lower.includes("edge/")) browser = "edge";
  else if (lower.includes("opr/") || lower.includes("opera")) browser = "opera";
  else if (lower.includes("chrome/") && !lower.includes("chromium")) browser = "chrome";
  else if (lower.includes("crios/")) browser = "chrome";
  else if (lower.includes("firefox/") || lower.includes("fxios/")) browser = "firefox";
  else if (lower.includes("safari/") && lower.includes("version/")) browser = "safari";

  return { device, browser, os };
}

/** Best-effort country from common CDN/proxy headers. */
export function countryFromHeaders(headers: Headers): string | null {
  const candidates = [
    headers.get("x-vercel-ip-country"),
    headers.get("cf-ipcountry"),
    headers.get("x-country-code"),
    headers.get("cloudfront-viewer-country"),
  ];
  for (const c of candidates) {
    if (c && /^[A-Za-z]{2}$/.test(c.trim())) return c.trim().toUpperCase();
  }
  return null;
}

export function parseAnalyticsSource(raw: unknown): string {
  if (raw === "embed" || raw === "dashboard" || raw === "share" || raw === "api") return raw;
  return "share";
}

/** Which 5% bucket does `positionSeconds` fall into? -1 when unknown. */
export function heatmapBucketIndex(positionSeconds: number | null | undefined, durationSeconds: number | null | undefined): number {
  if (!positionSeconds || !durationSeconds || durationSeconds <= 0 || positionSeconds < 0) return -1;
  const idx = Math.floor((positionSeconds / durationSeconds) * HEATMAP_BUCKETS);
  return Math.min(HEATMAP_BUCKETS - 1, Math.max(0, idx));
}

export function emptyHeatmap(): number[] {
  return new Array(HEATMAP_BUCKETS).fill(0);
}

export function normalizeHeatmap(raw: unknown): number[] {
  const base = emptyHeatmap();
  if (!Array.isArray(raw)) return base;
  for (let i = 0; i < Math.min(raw.length, HEATMAP_BUCKETS); i++) {
    const v = Number(raw[i]);
    base[i] = Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  }
  return base;
}

export function addHeatmaps(a: number[], b: number[]): number[] {
  const out = emptyHeatmap();
  for (let i = 0; i < HEATMAP_BUCKETS; i++) out[i] = (a[i] || 0) + (b[i] || 0);
  return out;
}

type CounterMap = Record<string, number>;

function asCounterMap(raw: unknown): CounterMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: CounterMap = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(v);
    if (k && Number.isFinite(n) && n > 0) out[k] = Math.floor(n);
  }
  return out;
}

export function mergeCounterMaps(...maps: unknown[]): CounterMap {
  const out: CounterMap = {};
  for (const m of maps) {
    for (const [k, v] of Object.entries(asCounterMap(m))) {
      out[k] = (out[k] || 0) + v;
    }
  }
  return out;
}

export function topEntries(map: CounterMap, limit = 8): { key: string; value: number; share: number }[] {
  const total = Object.values(map).reduce((s, v) => s + v, 0);
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, value]) => ({ key, value, share: total > 0 ? value / total : 0 }));
}

// ---------------------------------------------------------------------------
// Incremental daily-stat rollup (keeps dashboards fast — no session scans)
// ---------------------------------------------------------------------------

export interface TrackedEvent {
  videoId: string;
  organizationId: string;
  userId: string | null;
  viewerKey: string;
  viewerName: string | null;
  viewerEmail: string | null;
  sessionId: string;
  day: Date;
  isNewSession: boolean;
  isNewViewerToday: boolean;
  watchedDeltaSeconds: number;
  justCompleted: boolean;
  device: string | null;
  browser: string | null;
  source: string | null;
  country: string | null;
  bucketIndex: number;
}

/**
 * Incrementally update the VideoDailyStat row. Called on session start and
 * on every heartbeat/end so "today" is always live without a cron job.
 *
 * Core counters use atomic increments. The heatmap array and JSON breakdowns
 * are merged read-modify-write in a best-effort follow-up step — a lost
 * update under heavy concurrency only drops a single heartbeat hit, which is
 * statistically negligible for analytics.
 */
export async function rollupDailyStat(e: TrackedEvent): Promise<void> {
  // NOTE: breakdown counters and heatmap hits are merged in the follow-up
  // step below, never in `create` — otherwise a row created by this same
  // event would count them twice.
  await db.videoDailyStat.upsert({
    where: { videoId_date: { videoId: e.videoId, date: e.day } },
    create: {
      videoId: e.videoId,
      organizationId: e.organizationId,
      date: e.day,
      views: e.isNewSession ? 1 : 0,
      uniqueViewers: e.isNewViewerToday ? 1 : 0,
      loggedInViewers: e.isNewViewerToday && e.userId ? 1 : 0,
      anonymousViewers: e.isNewViewerToday && !e.userId ? 1 : 0,
      totalWatchSeconds: e.watchedDeltaSeconds,
      completions: e.justCompleted ? 1 : 0,
    },
    update: {
      ...(e.isNewSession ? { views: { increment: 1 } } : {}),
      ...(e.isNewViewerToday
        ? {
            uniqueViewers: { increment: 1 },
            ...(e.userId ? { loggedInViewers: { increment: 1 } } : { anonymousViewers: { increment: 1 } }),
          }
        : {}),
      ...(e.watchedDeltaSeconds > 0 ? { totalWatchSeconds: { increment: e.watchedDeltaSeconds } } : {}),
      ...(e.justCompleted ? { completions: { increment: 1 } } : {}),
    },
  });

  // Heatmap hits + breakdown counters (best-effort merge, see note above).
  const needsHeatmap = e.bucketIndex >= 0;
  const needsBreakdown = e.isNewSession && Boolean(e.device || e.browser || e.source || e.country);
  if (needsHeatmap || needsBreakdown) {
    try {
      const row = await db.videoDailyStat.findUnique({
        where: { videoId_date: { videoId: e.videoId, date: e.day } },
        select: { heatmap: true, devices: true, browsers: true, sources: true, countries: true },
      });
      if (row) {
        const heatmap = normalizeHeatmap(row.heatmap);
        if (needsHeatmap) heatmap[e.bucketIndex] += 1;
        await db.videoDailyStat.update({
          where: { videoId_date: { videoId: e.videoId, date: e.day } },
          data: {
            ...(needsHeatmap ? { heatmap } : {}),
            ...(needsBreakdown && e.device ? { devices: mergeCounterMaps(row.devices, { [e.device]: 1 }) } : {}),
            ...(needsBreakdown && e.browser ? { browsers: mergeCounterMaps(row.browsers, { [e.browser]: 1 }) } : {}),
            ...(needsBreakdown && e.source ? { sources: mergeCounterMaps(row.sources, { [e.source]: 1 }) } : {}),
            ...(needsBreakdown && e.country ? { countries: mergeCounterMaps(row.countries, { [e.country]: 1 }) } : {}),
          },
        });
      }
    } catch (err) {
      // Breakdown/heatmap data is best-effort; core counters already persisted.
      console.error("[analytics] stat merge failed:", err);
    }
  }
}

// ---------------------------------------------------------------------------
// Read helpers shared by the query APIs
// ---------------------------------------------------------------------------

export interface StatTotals {
  views: number;
  uniqueViewers: number;
  loggedInViewers: number;
  anonymousViewers: number;
  totalWatchSeconds: number;
  completions: number;
}

export function sumStatRows(rows: { views: number; uniqueViewers: number; loggedInViewers: number; anonymousViewers: number; totalWatchSeconds: number; completions: number }[]): StatTotals {
  return rows.reduce<StatTotals>(
    (acc, r) => ({
      views: acc.views + r.views,
      uniqueViewers: acc.uniqueViewers + r.uniqueViewers,
      loggedInViewers: acc.loggedInViewers + (r.loggedInViewers || 0),
      anonymousViewers: acc.anonymousViewers + (r.anonymousViewers || 0),
      totalWatchSeconds: acc.totalWatchSeconds + r.totalWatchSeconds,
      completions: acc.completions + r.completions,
    }),
    { views: 0, uniqueViewers: 0, loggedInViewers: 0, anonymousViewers: 0, totalWatchSeconds: 0, completions: 0 }
  );
}

/**
 * Exact unique-viewer count from sessions. Daily-stat uniques are
 * per-video-per-day, so cross-video / cross-day ranges need the source of
 * truth. Only viewer keys are selected to keep this cheap.
 */
export async function countDistinctViewers(where: Prisma.VideoWatchSessionWhereInput): Promise<number> {
  const rows = await db.videoWatchSession.findMany({
    where,
    select: { viewerKey: true },
    distinct: ["viewerKey"],
  });
  return rows.length;
}

export function formatWatchSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
