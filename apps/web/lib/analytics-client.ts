// Client-safe analytics constants (lib/analytics.ts is server-only — it pulls in the pg pool).

export type AnalyticsRangeKey = "today" | "7d" | "30d" | "all";

export const ANALYTICS_RANGES: { key: AnalyticsRangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "all", label: "All time" },
];

export interface TimePoint {
  date: string;
  views: number;
  uniqueViewers: number;
  watchSeconds: number;
  completions: number;
}

export interface BreakdownEntry {
  key: string;
  value: number;
  share: number;
}

export interface RetentionBucket {
  bucket: number;
  fromPercent: number;
  toPercent: number;
  hits: number;
  reachRate: number;
  intensity: number;
}
