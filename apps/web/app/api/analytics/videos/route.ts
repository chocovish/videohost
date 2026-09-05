import { NextResponse } from "next/server";
import { db } from "@videohost/db";
import { authenticateRequest } from "@/lib/api-auth";
import { resolveThumbnailUrl } from "@/lib/storage";
import { parseRangeKey, resolveRange } from "@/lib/analytics";

const PAGE_LIMIT = 50;

type SortKey = "views" | "watchSeconds" | "uniqueViewers" | "completions";

/**
 * Per-video analytics table for the organization, sorted leaderboard-style.
 * Params: ?range=today|7d|30d|all&sort=views|watchSeconds|uniqueViewers|completions&q=search
 */
export async function GET(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const rangeKey = parseRangeKey(url.searchParams.get("range"));
  const { from, to } = resolveRange(rangeKey);
  const sortParam = url.searchParams.get("sort");
  const sort: SortKey =
    sortParam === "watchSeconds" || sortParam === "uniqueViewers" || sortParam === "completions"
      ? sortParam
      : "views";
  const q = (url.searchParams.get("q") || "").trim();

  const statWhere = {
    organizationId: authCtx.orgId,
    ...(from ? { date: { gte: from, lte: to } } : {}),
  };

  const grouped = await db.videoDailyStat.groupBy({
    by: ["videoId"],
    where: statWhere,
    _sum: { views: true, uniqueViewers: true, totalWatchSeconds: true, completions: true },
  });

  const sumField: Record<SortKey, "views" | "uniqueViewers" | "totalWatchSeconds" | "completions"> = {
    views: "views",
    uniqueViewers: "uniqueViewers",
    watchSeconds: "totalWatchSeconds",
    completions: "completions",
  };
  const field = sumField[sort];
  grouped.sort((a, b) => (b._sum[field] || 0) - (a._sum[field] || 0));

  const videoIds = grouped.map((g) => g.videoId);
  const videos = videoIds.length
    ? await db.video.findMany({
        where: {
          id: { in: videoIds },
          organizationId: authCtx.orgId,
          ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
        },
        select: { id: true, title: true, durationSeconds: true, thumbnailKey: true, organizationId: true, originalKey: true, storageType: true, bunnyVideoId: true, createdAt: true },
      })
    : [];
  const videoById = new Map(videos.map((v) => [v.id, v]));

  // Keep videos matching the search; drop deleted ones from the table.
  const filtered = grouped.filter((g) => videoById.has(g.videoId));
  const page = filtered.slice(0, PAGE_LIMIT);

  const items = await Promise.all(
    page.map(async (g) => {
      const v = videoById.get(g.videoId)!;
      let thumbnailUrl: string | null = null;
      try {
        thumbnailUrl = await resolveThumbnailUrl(v as never);
      } catch {
        thumbnailUrl = null;
      }
      const views = g._sum.views || 0;
      const watchSeconds = g._sum.totalWatchSeconds || 0;
      return {
        videoId: g.videoId,
        title: v.title,
        thumbnailUrl,
        durationSeconds: v.durationSeconds,
        createdAt: v.createdAt,
        views,
        uniqueViewers: g._sum.uniqueViewers || 0,
        watchSeconds,
        avgWatchSeconds: views > 0 ? Math.round((watchSeconds / views) * 10) / 10 : 0,
        completions: g._sum.completions || 0,
        completionRate: views > 0 ? Math.round(((g._sum.completions || 0) / views) * 1000) / 1000 : 0,
      };
    })
  );

  return NextResponse.json({
    range: rangeKey,
    from: from?.toISOString() || null,
    to: to.toISOString(),
    total: filtered.length,
    items,
  });
}
