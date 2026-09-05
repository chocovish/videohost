"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Clock, Eye, Search, Target, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EmptyAnalytics,
  RangeSelector,
  StatCard,
  formatCompact,
  formatFull,
  formatPct,
  formatWatchTime,
} from "@/components/analytics/analytics-shared";
import { BreakdownBars, TimeSeriesChart } from "@/components/analytics/analytics-charts";
import type {
  AnalyticsRangeKey,
  BreakdownEntry,
  TimePoint,
} from "@/lib/analytics-client";

interface OverviewPayload {
  range: AnalyticsRangeKey;
  totals: {
    views: number;
    uniqueViewers: number;
    loggedInViewers: number;
    anonymousViewers: number;
    totalWatchSeconds: number;
    completions: number;
    avgWatchSeconds: number;
    completionRate: number;
  };
  timeseries: TimePoint[];
  breakdowns: { devices: BreakdownEntry[]; browsers: BreakdownEntry[]; sources: BreakdownEntry[]; countries: BreakdownEntry[] };
}

interface VideoRow {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  views: number;
  uniqueViewers: number;
  watchSeconds: number;
  avgWatchSeconds: number;
  completions: number;
  completionRate: number;
}

export default function AnalyticsOverviewPage() {
  const [range, setRange] = useState<AnalyticsRangeKey>("7d");
  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [videosLoading, setVideosLoading] = useState(true);
  const [sort, setSort] = useState("views");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  const fetchOverview = useCallback(async (r: AnalyticsRangeKey) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/overview?range=${r}`);
      if (res.ok) setOverview(await res.json());
    } catch (e) {
      console.error("Failed to load analytics overview:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVideos = useCallback(async (r: AnalyticsRangeKey, s: string, q: string) => {
    setVideosLoading(true);
    try {
      const res = await fetch(
        `/api/analytics/videos?range=${r}&sort=${encodeURIComponent(s)}&q=${encodeURIComponent(q)}`
      );
      if (res.ok) {
        const data = await res.json();
        setVideos(data.items || []);
      }
    } catch (e) {
      console.error("Failed to load video analytics:", e);
    } finally {
      setVideosLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview(range);
  }, [range, fetchOverview]);

  useEffect(() => {
    const t = setTimeout(() => fetchVideos(range, sort, search), search ? 350 : 0);
    return () => clearTimeout(t);
  }, [range, sort, search, fetchVideos]);

  const t = overview?.totals;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Views, watch time, audience retention and viewer insights across your videos.
          </p>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {/* KPI cards */}
      {loading || !t ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={Eye} label="Views" value={formatFull(t.views)} sub={`${formatFull(t.uniqueViewers)} unique viewers`} />
          <StatCard
            icon={Users}
            label="Unique viewers"
            value={formatFull(t.uniqueViewers)}
            sub={`${formatFull(t.loggedInViewers)} logged in · ${formatFull(t.anonymousViewers)} anonymous`}
          />
          <StatCard
            icon={Clock}
            label="Total watch time"
            value={formatWatchTime(t.totalWatchSeconds)}
            sub={`Avg ${formatWatchTime(t.avgWatchSeconds)} per view`}
          />
          <StatCard
            icon={Target}
            label="Completion rate"
            value={formatPct(t.completionRate)}
            sub={`${formatFull(t.completions)} completions (${formatCompact(t.views)} views)`}
          />
        </div>
      )}

      {/* Timeseries */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-2xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">Performance over time</h2>
          <p className="text-xs text-muted-foreground">Daily views, viewers, watch time and completions.</p>
        </div>
        {loading || !overview ? (
          <Skeleton className="h-56 w-full rounded-xl" />
        ) : overview.timeseries.length === 0 || overview.timeseries.every((d) => d.views === 0) ? (
          <EmptyAnalytics
            title="No views in this range yet"
            hint="Share a video link or embed and watch the numbers roll in. Tracking starts automatically on every player."
          />
        ) : (
          <TimeSeriesChart data={overview.timeseries} />
        )}
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {(
          [
            { title: "Devices", key: "devices" },
            { title: "Watch sources", key: "sources" },
            { title: "Top countries", key: "countries" },
          ] as const
        ).map((b) => (
          <div key={b.key} className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">{b.title}</h2>
              <p className="text-xs text-muted-foreground">Where your audience watches from.</p>
            </div>
            {loading || !overview ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <BreakdownBars items={overview.breakdowns[b.key]} />
            )}
          </div>
        ))}
      </div>

      {/* Per-video table */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-foreground">Videos</h2>
            <p className="text-xs text-muted-foreground">Ranked by performance in the selected range.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearch(e.target.value);
                }}
                placeholder="Search videos…"
                className="h-8 pl-8 text-xs w-44 sm:w-52"
              />
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v ?? "views")}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="views">Sort: Views</SelectItem>
                <SelectItem value="watchSeconds">Sort: Watch time</SelectItem>
                <SelectItem value="uniqueViewers">Sort: Viewers</SelectItem>
                <SelectItem value="completions">Sort: Completions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {videosLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <EmptyAnalytics
            title="No video activity in this range"
            hint="Views appear here once someone presses play on a share link, embed or dashboard preview."
          />
        ) : (
          <div className="border border-border rounded-xl overflow-x-auto">
            <Table className="text-left text-xs min-w-[640px]">
              <TableHeader className="bg-muted/60 text-muted-foreground font-semibold">
                <TableRow>
                  <TableHead className="py-3 px-4">Video</TableHead>
                  <TableHead className="py-3 px-4 text-right">Views</TableHead>
                  <TableHead className="py-3 px-4 text-right">Viewers</TableHead>
                  <TableHead className="py-3 px-4 text-right">Watch time</TableHead>
                  <TableHead className="py-3 px-4 text-right">Completion</TableHead>
                  <TableHead className="py-3 px-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos.map((v) => (
                  <TableRow key={v.videoId} className="hover:bg-muted/30">
                    <TableCell className="py-2.5 px-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-20 aspect-video rounded-lg overflow-hidden bg-muted shrink-0 border border-border relative">
                          {v.thumbnailUrl ? (
                            <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BarChart3 className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <span className="font-semibold text-foreground truncate max-w-56 sm:max-w-72" title={v.title}>
                          {v.title}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 px-4 text-right font-bold text-foreground tabular-nums">
                      {formatFull(v.views)}
                    </TableCell>
                    <TableCell className="py-2.5 px-4 text-right tabular-nums text-muted-foreground">
                      {formatFull(v.uniqueViewers)}
                    </TableCell>
                    <TableCell className="py-2.5 px-4 text-right tabular-nums text-muted-foreground">
                      {formatWatchTime(v.watchSeconds)}
                    </TableCell>
                    <TableCell className="py-2.5 px-4 text-right tabular-nums text-muted-foreground">
                      {formatPct(v.completionRate)}
                    </TableCell>
                    <TableCell className="py-2.5 px-4 text-right">
                      <Link
                        href={`/dashboard/analytics/${v.videoId}`}
                        className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 px-3 text-xs font-medium transition-colors"
                      >
                        Details
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
