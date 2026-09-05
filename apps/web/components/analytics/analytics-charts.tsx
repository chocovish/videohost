"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDayLabel, formatFull } from "./analytics-shared";
import type { BreakdownEntry, RetentionBucket, TimePoint } from "@/lib/analytics-client";

// ---------------------------------------------------------------------------
// TimeSeriesChart — dependency-free SVG line/area chart with hover inspection
// ---------------------------------------------------------------------------

type MetricKey = "views" | "uniqueViewers" | "watchSeconds" | "completions";

const METRICS: { key: MetricKey; label: string; color: string }[] = [
  { key: "views", label: "Views", color: "#84cc16" },
  { key: "uniqueViewers", label: "Unique viewers", color: "#38bdf8" },
  { key: "watchSeconds", label: "Watch time", color: "#f59e0b" },
  { key: "completions", label: "Completions", color: "#a78bfa" },
];

function niceMax(raw: number): number {
  if (raw <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * pow;
}

const W = 720;
const H = 220;
const PAD = { l: 44, r: 12, t: 12, b: 26 };

export function TimeSeriesChart({ data }: { data: TimePoint[] }) {
  const [metric, setMetric] = useState<MetricKey>("views");
  const [hover, setHover] = useState<number | null>(null);
  const active = METRICS.find((m) => m.key === metric)!;

  const { points, yMax, xTicks } = useMemo(() => {
    const vals = data.map((d) => d[metric] || 0);
    const yMax = niceMax(Math.max(...vals, 0));
    const iw = W - PAD.l - PAD.r;
    const ih = H - PAD.t - PAD.b;
    const points = vals.map((v, i) => ({
      x: data.length === 1 ? PAD.l + iw / 2 : PAD.l + (i / (data.length - 1)) * iw,
      y: PAD.t + ih - (v / yMax) * ih,
      v,
    }));
    const xTicks = data
      .map((d, i) => ({ d: d.date, i }))
      .filter((_, i) => {
        const step = Math.max(1, Math.ceil(data.length / 6));
        return i % step === 0 || i === data.length - 1;
      });
    return { points, yMax, xTicks };
  }, [data, metric]);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${points[points.length - 1]?.x ?? 0},${H - PAD.b} L${points[0]?.x ?? 0},${H - PAD.b} Z`;
  const gridVals = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(yMax * f));

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - x);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setHover(best);
  };

  const metricValue = (d: TimePoint) => {
    if (metric === "watchSeconds") {
      const s = d.watchSeconds;
      if (s >= 3600) return `${(s / 3600).toFixed(1)}h`;
      if (s >= 60) return `${Math.round(s / 60)}m`;
      return `${s}s`;
    }
    return formatFull(d[metric]);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {METRICS.map((m) => (
          <Button
            key={m.key}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setMetric(m.key);
              setHover(null);
            }}
            className={`h-7 px-2.5 text-xs font-semibold gap-1.5 ${
              metric === m.key
                ? "bg-muted text-foreground border border-border"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
            {m.label}
          </Button>
        ))}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto select-none"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={`ag-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={active.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={active.color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {gridVals.map((g, gi) => {
            const y = PAD.t + (H - PAD.t - PAD.b) * (1 - g / yMax);
            return (
              <g key={`grid-${gi}`}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} className="stroke-border" strokeDasharray="3 3" />
                <text x={PAD.l - 6} y={y + 3.5} textAnchor="end" fontSize="10" className="fill-muted-foreground tabular-nums">
                  {formatFull(g)}
                </text>
              </g>
            );
          })}

          {xTicks.map((t) => {
            const p = points[t.i];
            if (!p) return null;
            return (
              <text key={t.d} x={p.x} y={H - 8} textAnchor="middle" fontSize="10" className="fill-muted-foreground">
                {formatDayLabel(t.d)}
              </text>
            );
          })}

          {points.length > 0 && <path d={area} fill={`url(#ag-${metric})`} />}
          {points.length > 0 && (
            <path d={line} fill="none" stroke={active.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          )}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hover === i ? 4.5 : 0}
              fill={active.color}
              stroke="var(--card)"
              strokeWidth="2"
            />
          ))}
          {hover !== null && points[hover] && (
            <line
              x1={points[hover].x}
              x2={points[hover].x}
              y1={PAD.t}
              y2={H - PAD.b}
              className="stroke-muted-foreground"
              strokeDasharray="2 2"
            />
          )}
        </svg>

        {hover !== null && data[hover] && (
          <div
            className="absolute z-10 pointer-events-none -translate-x-1/2 rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md whitespace-nowrap"
            style={{
              left: `${Math.min(88, Math.max(12, (points[hover].x / W) * 100))}%`,
              top: "0",
            }}
          >
            <p className="font-semibold text-foreground">{formatDayLabel(data[hover].date)}</p>
            <p className="text-muted-foreground tabular-nums">
              {active.label}: <span className="font-bold text-foreground">{metricValue(data[hover])}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RetentionChart — which 5% segments of the video get watched
// ---------------------------------------------------------------------------

export function RetentionChart({
  retention,
  dropOffBucket,
  mostRewatchedBucket,
}: {
  retention: RetentionBucket[];
  dropOffBucket: number;
  mostRewatchedBucket: number;
}) {
  if (!retention.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-[3px] h-36 sm:h-44" role="img" aria-label="Audience retention by video segment">
        {retention.map((r) => {
          const isDrop = r.bucket === dropOffBucket && r.hits > 0;
          const isTop = r.bucket === mostRewatchedBucket && r.hits > 0;
          return (
            <div key={r.bucket} className="group relative flex-1 h-full flex items-end min-w-0">
              <div
                className={`w-full rounded-t-[3px] transition-all ${
                  isDrop ? "bg-amber-500/90" : isTop ? "bg-primary" : "bg-primary/45 group-hover:bg-primary/80"
                }`}
                style={{ height: `${Math.max(3, r.intensity * 100)}%`, opacity: r.hits === 0 ? 0.25 : 1 }}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10 rounded-lg border border-border bg-popover px-2 py-1 text-[11px] shadow-md whitespace-nowrap">
                <p className="font-bold text-foreground tabular-nums">
                  {r.fromPercent}–{r.toPercent}% of video
                </p>
                <p className="text-muted-foreground tabular-nums">
                  {formatFull(r.hits)} views · {(r.reachRate * 100).toFixed(0)}% reach
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground font-medium tabular-nums">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-primary inline-block" /> Views reaching segment
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-amber-500/90 inline-block" /> Steepest drop-off
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BreakdownBars — device / browser / source / country splits
// ---------------------------------------------------------------------------

const KEY_LABELS: Record<string, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  tv: "TV",
  unknown: "Unknown",
  other: "Other",
  chrome: "Chrome",
  safari: "Safari",
  firefox: "Firefox",
  edge: "Edge",
  opera: "Opera",
  share: "Share page",
  embed: "Embeds",
  dashboard: "Dashboard",
  api: "API",
};

export function prettyKey(key: string): string {
  if (KEY_LABELS[key]) return KEY_LABELS[key];
  if (/^[A-Z]{2}$/.test(key)) {
    try {
      const name = new Intl.DisplayNames(["en"], { type: "region" }).of(key);
      if (name) return `${name} (${key})`;
    } catch {
      /* fall through */
    }
    return key;
  }
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function BreakdownBars({ items }: { items: BreakdownEntry[] }) {
  if (!items.length) {
    return <p className="text-xs text-muted-foreground italic py-2">No data yet for this range.</p>;
  }
  return (
    <div className="space-y-2.5">
      {items.map((it) => (
        <div key={it.key} className="space-y-1">
          <div className="flex items-center justify-between text-xs gap-2">
            <span className="font-medium text-foreground truncate">{prettyKey(it.key)}</span>
            <span className="text-muted-foreground tabular-nums shrink-0">
              {formatFull(it.value)} · {(it.share * 100).toFixed(0)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.max(2, it.share * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
