"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  Flame,
  TrendingDown,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  formatFull,
  formatPct,
  formatWatchTime,
} from "@/components/analytics/analytics-shared";
import { BreakdownBars, RetentionChart, TimeSeriesChart } from "@/components/analytics/analytics-charts";
import type {
  AnalyticsRangeKey,
  BreakdownEntry,
  RetentionBucket,
  TimePoint,
} from "@/lib/analytics-client";

interface DetailPayload {
  range: AnalyticsRangeKey;
  video: { id: string; title: string; durationSeconds: number | null };
  totals: {
    views: number;
    uniqueViewers: number;
    loggedInViewers: number;
    anonymousViewers: number;
    totalWatchSeconds: number;
    completions: number;
    avgWatchSeconds: number;
    avgCompletionRate: number;
    avgWatchedPerSession: number;
    completionRate: number;
  };
  timeseries: TimePoint[];
  retention: RetentionBucket[];
  insights: { dropOffBucket: number; mostRewatchedBucket: number };
  breakdowns: { devices: BreakdownEntry[]; browsers: BreakdownEntry[]; sources: BreakdownEntry[]; countries: BreakdownEntry[] };
}

interface ViewerItem {
  viewerKey: string;
  loggedIn: boolean;
  name: string;
  email: string | null;
  image: string | null;
  shortId: string | null;
  sessions: number;
  watchSeconds: number;
  avgWatchSeconds: number;
  maxCompletionRate: number;
  completed: boolean;
  firstWatchedAt: string;
  lastWatchedAt: string;
}

const VIEWER_SORTS = [
  { value: "lastWatched", label: "Recently watched" },
  { value: "watchTime", label: "Most watch time" },
  { value: "sessions", label: "Most sessions" },
];

export default function VideoAnalyticsPage() {
  const params = useParams();
  const id = params.id as string;

  const [range, setRange] = useState<AnalyticsRangeKey>("30d");
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [viewers, setViewers] = useState<ViewerItem[]>([]);
  const [viewersLoading, setViewersLoading] = useState(true);
  const [viewerSort, setViewerSort] = useState("lastWatched");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [viewerTotal, setViewerTotal] = useState(0);

  const fetchDetail = useCallback(async (videoId: string, r: AnalyticsRangeKey) => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`/api/analytics/video/${videoId}?range=${r}`);
      if (res.status === 404) {
        setNotFound(true);
        setDetail(null);
        return;
      }
      if (res.ok) setDetail(await res.json());
    } catch (e) {
      console.error("Failed to load video analytics:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchViewers = useCallback(async (videoId: string, r: AnalyticsRangeKey, s: string, p: number) => {
    setViewersLoading(true);
    try {
      const res = await fetch(
        `/api/analytics/video/${videoId}/viewers?range=${r}&sort=${s}&page=${p}&limit=20`
      );
      if (res.ok) {
        const data = await res.json();
        setViewers(data.items || []);
        setPageCount(data.pageCount || 1);
        setViewerTotal(data.total || 0);
      }
    } catch (e) {
      console.error("Failed to load viewers:", e);
    } finally {
      setViewersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDetail(id, range);
  }, [id, range, fetchDetail]);

  useEffect(() => {
    setPage(1);
  }, [id, range, viewerSort]);

  useEffect(() => {
    fetchViewers(id, range, viewerSort, page);
  }, [id, range, viewerSort, page, fetchViewers]);

  const totals = detail?.totals;
  const dropOff = detail ? detail.retention[detail.insights.dropOffBucket] : null;
  const top = detail ? detail.retention[detail.insights.mostRewatchedBucket] : null;

  if (notFound) {
    return (
      <div className="text-center py-16 space-y-2">
        <h2 className="text-xl font-bold">Video not found</h2>
        <Link href="/dashboard/analytics" className="text-primary hover:underline mt-2 inline-block text-sm">
          Return to Analytics
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <Link
            href="/dashboard/analytics"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Analytics
          </Link>
          {loading || !detail ? (
            <Skeleton className="h-7 w-64 rounded-lg" />
          ) : (
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
              {detail.video.title}
            </h1>
          )}
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {loading || !totals ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={Eye} label="Views" value={formatFull(totals.views)} sub={`${formatFull(totals.completions)} completions`} />
          <StatCard
            icon={Users}
            label="Unique viewers"
            value={formatFull(totals.uniqueViewers)}
            sub={`${formatFull(totals.loggedInViewers)} logged in · ${formatFull(totals.anonymousViewers)} anonymous`}
          />
          <StatCard
            icon={Clock}
            label="Total watch time"
            value={formatWatchTime(totals.totalWatchSeconds)}
            sub={`Avg ${formatWatchTime(totals.avgWatchSeconds)} per view`}
          />
          <StatCard
            icon={CheckCircle2}
            label="Avg. watched"
            value={formatPct(totals.avgCompletionRate)}
            sub={`${formatPct(totals.completionRate)} of views completed`}
          />
        </div>
      )}

      {/* Performance + retention */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-2xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-foreground">Performance over time</h2>
            <p className="text-xs text-muted-foreground">Daily views, viewers, watch time and completions.</p>
          </div>
          {loading || !detail ? (
            <Skeleton className="h-56 w-full rounded-xl" />
          ) : detail.timeseries.every((d) => d.views === 0) ? (
            <EmptyAnalytics
              title="No views in this range yet"
              hint="Share this video's link or embed and new plays will appear here automatically."
            />
          ) : (
            <TimeSeriesChart data={detail.timeseries} />
          )}
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-2xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-foreground">Audience retention</h2>
            <p className="text-xs text-muted-foreground">Which parts of the video get watched, rewatched or skipped.</p>
          </div>
          {loading || !detail ? (
            <Skeleton className="h-44 w-full rounded-xl" />
          ) : totals && totals.views === 0 ? (
            <EmptyAnalytics title="No retention data yet" hint="Retention builds up as viewers watch this video." />
          ) : (
            <>
              <RetentionChart
                retention={detail.retention}
                dropOffBucket={detail.insights.dropOffBucket}
                mostRewatchedBucket={detail.insights.mostRewatchedBucket}
              />
              {dropOff && top && totals && totals.views > 0 && (
                <div className="grid grid-cols-1 gap-2 pt-1">
                  <div className="flex items-start gap-2 text-xs rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5">
                    <TrendingDown className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span className="text-foreground/90">
                      Steepest drop-off at <strong>{dropOff.fromPercent}–{dropOff.toPercent}%</strong> of the video —
                      viewers stop watching around this point.
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-xs rounded-xl bg-primary/10 border border-primary/20 p-2.5">
                    <Flame className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground/90">
                      Most watched segment: <strong>{top.fromPercent}–{top.toPercent}%</strong> with{" "}
                      {formatFull(top.hits)} views reaching it.
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {(
          [
            { title: "Devices", key: "devices" },
            { title: "Browsers", key: "browsers" },
            { title: "Sources", key: "sources" },
            { title: "Countries", key: "countries" },
          ] as const
        ).map((b) => (
          <div key={b.key} className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-3">
            <h2 className="text-sm font-bold text-foreground">{b.title}</h2>
            {loading || !detail ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <BreakdownBars items={detail.breakdowns[b.key]} />
            )}
          </div>
        ))}
      </div>

      {/* Who watched */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-foreground">Who watched {viewerTotal > 0 && <span className="text-muted-foreground font-medium">({formatFull(viewerTotal)})</span>}</h2>
            <p className="text-xs text-muted-foreground">
              Logged-in viewers are identified by name and email; everyone else appears as anonymous.
            </p>
          </div>
          <Select value={viewerSort} onValueChange={(v) => setViewerSort(v ?? "lastWatched")}>
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIEWER_SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {viewersLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : viewers.length === 0 ? (
          <EmptyAnalytics
            title="No viewers in this range"
            hint="Once someone watches this video, their watch time and progress will show up here."
          />
        ) : (
          <>
            <div className="border border-border rounded-xl overflow-x-auto">
              <Table className="text-left text-xs min-w-[720px]">
                <TableHeader className="bg-muted/60 text-muted-foreground font-semibold">
                  <TableRow>
                    <TableHead className="py-3 px-4">Viewer</TableHead>
                    <TableHead className="py-3 px-4 text-right">Sessions</TableHead>
                    <TableHead className="py-3 px-4 text-right">Watch time</TableHead>
                    <TableHead className="py-3 px-4 text-right">Watched</TableHead>
                    <TableHead className="py-3 px-4 text-right">Status</TableHead>
                    <TableHead className="py-3 px-4 text-right">Last watched</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewers.map((v) => (
                    <TableRow key={v.viewerKey} className="hover:bg-muted/30">
                      <TableCell className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="w-8 h-8 shrink-0">
                            {v.image && <AvatarImage src={v.image} alt={v.name} />}
                            <AvatarFallback className="text-[11px] font-bold">
                              {(v.name || "?").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate flex items-center gap-1.5">
                              {v.name}
                              {!v.loggedIn && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-medium">
                                  Anonymous
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono truncate">
                              {v.email || (v.shortId ? `anon-${v.shortId}` : "—")}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-right tabular-nums text-muted-foreground">
                        {v.sessions}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-right font-bold text-foreground tabular-nums">
                        {formatWatchTime(v.watchSeconds)}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-right tabular-nums text-muted-foreground">
                        {formatPct(v.maxCompletionRate)}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-right">
                        {v.completed ? (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Completed
                          </Badge>
                        ) : (
                          <Badge variant="outline">Partial</Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-right text-muted-foreground whitespace-nowrap">
                        {new Date(v.lastWatchedAt).toLocaleDateString()}{" "}
                        {new Date(v.lastWatchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="tabular-nums">
                Page {page} of {pageCount}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
