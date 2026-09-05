import { NextResponse } from "next/server";
import { db } from "@videohost/db";
import { authenticateRequest } from "@/lib/api-auth";
import { resolveThumbnailUrl } from "@/lib/storage";
import {
  countDistinctViewers,
  dateKeyUTC,
  eachDayKey,
  mergeCounterMaps,
  parseRangeKey,
  resolveRange,
  startOfUtcDay,
  sumStatRows,
  topEntries,
} from "@/lib/analytics";

const TOP_VIDEOS_LIMIT = 8;

/**
 * Organization-level analytics overview.
 * Reads pre-aggregated VideoDailyStat rows (fast for any range); the headline
 * unique-viewer count is exact (distinct viewer keys from sessions) while the
 * per-day chart series sums daily uniques (returning visitors across days may
 * be counted more than once in the chart).
 */
export async function GET(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const rangeKey = parseRangeKey(url.searchParams.get("range"));
  const { from, to } = resolveRange(rangeKey);

  const statWhere = {
    organizationId: authCtx.orgId,
    ...(from ? { date: { gte: from, lte: to } } : {}),
  };
  const sessionWhere = {
    organizationId: authCtx.orgId,
    ...(from ? { startedAt: { gte: from, lte: to } } : {}),
  };

  const [rows, exactUniques, groupedByVideo] = await Promise.all([
    db.videoDailyStat.findMany({ where: statWhere }),
    countDistinctViewers(sessionWhere),
    db.videoDailyStat.groupBy({
      by: ["videoId"],
      where: statWhere,
      _sum: { views: true, uniqueViewers: true, totalWatchSeconds: true, completions: true },
      orderBy: { _sum: { views: "desc" } },
      take: TOP_VIDEOS_LIMIT,
    }),
  ]);

  const totals = sumStatRows(rows);
  const avgWatchSeconds = totals.views > 0 ? totals.totalWatchSeconds / totals.views : 0;
  const completionRate = totals.views > 0 ? totals.completions / totals.views : 0;

  // Daily timeseries with zero-filled gaps.
  const seriesFrom = from || rows.reduce<Date | null>((min, r) => (!min || r.date < min ? r.date : min), null) || startOfUtcDay(to);
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

  // Top videos with resolved thumbnails.
  const videoIds = groupedByVideo.map((g) => g.videoId);
  const videos = videoIds.length
    ? await db.video.findMany({
        where: { id: { in: videoIds }, organizationId: authCtx.orgId },
        select: { id: true, title: true, durationSeconds: true, thumbnailKey: true, organizationId: true, originalKey: true, storageType: true, bunnyVideoId: true },
      })
    : [];
  const videoById = new Map(videos.map((v) => [v.id, v]));
  const topVideos = await Promise.all(
    groupedByVideo.map(async (g) => {
      const v = videoById.get(g.videoId);
      let thumbnailUrl: string | null = null;
      try {
        thumbnailUrl = v ? await resolveThumbnailUrl(v as never) : null;
      } catch {
        thumbnailUrl = null;
      }
      return {
        videoId: g.videoId,
        title: v?.title || "Deleted video",
        durationSeconds: v?.durationSeconds ?? null,
        thumbnailUrl,
        views: g._sum.views || 0,
        uniqueViewers: g._sum.uniqueViewers || 0,
        watchSeconds: g._sum.totalWatchSeconds || 0,
        completions: g._sum.completions || 0,
      };
    })
  );

  return NextResponse.json({
    range: rangeKey,
    from: from?.toISOString() || null,
    to: to.toISOString(),
    totals: {
      ...totals,
      uniqueViewers: exactUniques,
      avgWatchSeconds: Math.round(avgWatchSeconds * 10) / 10,
      completionRate: Math.round(completionRate * 1000) / 1000,
    },
    timeseries,
    topVideos,
    breakdowns: {
      devices: topEntries(mergeCounterMaps(...rows.map((r) => r.devices))),
      browsers: topEntries(mergeCounterMaps(...rows.map((r) => r.browsers))),
      sources: topEntries(mergeCounterMaps(...rows.map((r) => r.sources))),
      countries: topEntries(mergeCounterMaps(...rows.map((r) => r.countries))),
    },
  });
}
