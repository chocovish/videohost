"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ANALYTICS_RANGES, type AnalyticsRangeKey } from "@/lib/analytics-client";

export { ANALYTICS_RANGES };
export type { AnalyticsRangeKey };

export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatFull(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("en").format(Math.round(n));
}

export function formatWatchTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${formatFull(h)}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function formatPct(rate: number): string {
  if (!Number.isFinite(rate)) return "0%";
  return `${(rate * 100).toFixed(rate * 100 >= 10 ? 0 : 1)}%`;
}

export function formatDayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function RangeSelector({
  value,
  onChange,
}: {
  value: AnalyticsRangeKey;
  onChange: (r: AnalyticsRangeKey) => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/70 border border-border/60">
      {ANALYTICS_RANGES.map((r) => (
        <Button
          key={r.key}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(r.key)}
          className={
            value === r.key
              ? "bg-card text-foreground shadow-xs border border-border/60 hover:bg-card hover:text-foreground h-7 px-3 text-xs font-semibold"
              : "text-muted-foreground hover:text-foreground border border-transparent shadow-none h-7 px-3 text-xs font-medium"
          }
        >
          {r.label}
        </Button>
      ))}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-1.5 shadow-2xs">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-primary" /> {label}
      </span>
      <p className="text-2xl font-black text-foreground tracking-tight tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function EmptyAnalytics({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="py-14 text-center border border-dashed border-border rounded-2xl space-y-2 p-6 bg-muted/20">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground max-w-md mx-auto">{hint}</p>
    </div>
  );
}
