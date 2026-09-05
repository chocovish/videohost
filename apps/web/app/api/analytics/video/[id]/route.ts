import { NextResponse } from "next/server";
import { db } from "@videohost/db";
import { authenticateRequest } from "@/lib/api-auth";
import {
  addHeatmaps,
  countDistinctViewers,
  dateKeyUTC,
  eachDayKey,
  emptyHeatmap,
  mergeCounterMaps,
  normalizeHeatmap,
  parseRangeKey,
  resolveRange,
  startOfUtcDay,
  sumStatRows,
  topEntries,
} from "@/lib/analytics";

/**
 * Per-video analytics detail: headline totals, daily series, retention
 * heatmap (share of viewers reaching each 5% segment), and breakdowns.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authCtx = await authenticateRequest(req);
  if (!authCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const video = await db.video.findFirst({
    where: { id, organizationId: authCtx.orgId },
    select: { id: true, title: true, durationSeconds: true },
  });
  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  const url = new URL(req.url);
  const rangeKey = parseRangeKey(url.searchParams.get("range"));
  const { from, to } = resolveRange(rangeKey);

  const statWhere = {
    videoId: id,
    ...(from ? { date: { gte: from, lte: to } } : {}),
  };
  const sessionWhere = {
    videoId: id,
    ...(from ? { startedAt: { gte: from, lte: to } } : {}),
  };

  const [rows, exactUniques, sessionAgg] = await Promise.all([
    db.videoDailyStat.findMany({ where: statWhere, orderBy: { date: "asc" } }),
    countDistinctViewers(sessionWhere),
    db.videoWatchSession.aggregate({
      where: sessionWhere,
      _avg: { completionRate: true, totalWatchedSeconds: true },
      _count: { _all: true },
    }),
  ]);

  const summed = sumStatRows(rows);
  const avgWatchSeconds = summed.views > 0 ? summed.totalWatchSeconds / summed.views : 0;

  const seriesFrom = from || (rows.length ? rows[0].date : startOfUtcDay(to));
  const byDay = new Map<string, { views: number; uniqueViewers: number; watchSeconds: number; completions: number }>();
  for (const r of rows) {
    const key = dateKeyUTC(r.date);
    const cur = byDay.get(key) || { views: 0, uniqueViewers: 0, watchSeconds: 0, completions: 0 };
    cur.views += r.views;
    cur.uniqueViewers += r.uniqueViewers;
    cur.watchSeconds += r.totalWatchSeconds;
    cur.completions += r.completions;
    byDay.set(key, cur);
  }
  const timeseries = eachDayKey(seriesFrom, to).map((date) => ({
    date,
    ...(byDay.get(date) || { views: 0, uniqueViewers: 0, watchSeconds: 0, completions: 0 }),
  }));

  // Retention: aggregate heatmap hits across the range, normalized by views.
  let heatmap = emptyHeatmap();
  for (const r of rows) heatmap = addHeatmaps(heatmap, normalizeHeatmap(r.heatmap));
  const heatmapPeak = Math.max(1, ...heatmap);
  const retention = heatmap.map((hits, i) => ({
    bucket: i,
    // Segment label, e.g. bucket 0 covers 0–5% of the video.
    fromPercent: i * 5,
    toPercent: (i + 1) * 5,
    hits,
    // Share of views that reached this segment (can exceed 1 on rewatches).
    reachRate: summed.views > 0 ? Math.round((hits / summed.views) * 1000) / 1000 : 0,
    // Relative intensity for chart scaling.
    intensity: Math.round((hits / heatmapPeak) * 1000) / 1000,
  }));
  const dropOffBucket = retention.reduce((min, r, i) => {
    if (i === 0) return 0;
    return r.hits < retention[min].hits ? i : min;
  }, 0);

  return NextResponse.json({
    range: rangeKey,
    from: from?.toISOString() || null,
    to: to.toISOString(),
    video: { id: video.id, title: video.title, durationSeconds: video.durationSeconds },
    totals: {
      ...summed,
      uniqueViewers: exactUniques,
      avgWatchSeconds: Math.round(avgWatchSeconds * 10) / 10,
      avgCompletionRate: Math.round((sessionAgg._avg.completionRate || 0) * 1000) / 1000,
      avgWatchedPerSession: Math.round((sessionAgg._avg.totalWatchedSeconds || 0) * 10) / 10,
      completionRate: summed.views > 0 ? Math.round((summed.completions / summed.views) * 1000) / 1000 : 0,
    },
    timeseries,
    retention,
    insights: {
      dropOffBucket,
      mostRewatchedBucket: retention.reduce((max, r, i) => (r.hits > retention[max].hits ? i : max), 0),
    },
    breakdowns: {
      devices: topEntries(mergeCounterMaps(...rows.map((r) => r.devices))),
      browsers: topEntries(mergeCounterMaps(...rows.map((r) => r.browsers))),
      sources: topEntries(mergeCounterMaps(...rows.map((r) => r.sources))),
      countries: topEntries(mergeCounterMaps(...rows.map((r) => r.countries))),
    },
  });
}
