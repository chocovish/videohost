import { NextResponse } from "next/server";
import { db } from "@videohost/db";
import { authenticateRequest } from "@/lib/api-auth";
import { parseRangeKey, resolveRange } from "@/lib/analytics";

const PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

type SortKey = "lastWatched" | "watchTime" | "sessions";

/**
 * "Who watched" — viewers grouped by stable viewer identity with per-viewer
 * totals. Logged-in viewers resolve to name/email/avatar; anonymous viewers
 * show as Anonymous + short id.
 *
 * Params: ?range=today|7d|30d|all&sort=lastWatched|watchTime|sessions&page=1&limit=20
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
  const sortParam = url.searchParams.get("sort");
  const sort: SortKey =
    sortParam === "watchTime" || sortParam === "sessions" ? sortParam : "lastWatched";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(url.searchParams.get("limit")) || PAGE_SIZE));

  const where = {
    videoId: id,
    ...(from ? { startedAt: { gte: from, lte: to } } : {}),
  };

  const groups = await db.videoWatchSession.groupBy({
    by: ["viewerKey"],
    where,
    _count: { _all: true },
    _sum: { totalWatchedSeconds: true },
    _max: { lastHeartbeatAt: true, completionRate: true, maxPositionSeconds: true, userId: true },
    _min: { startedAt: true },
  });

  const total = groups.length;

  const sorted = [...groups].sort((a, b) => {
    if (sort === "watchTime") return (b._sum.totalWatchedSeconds || 0) - (a._sum.totalWatchedSeconds || 0);
    if (sort === "sessions") return b._count._all - a._count._all;
    return (
      new Date(b._max.lastHeartbeatAt || 0).getTime() - new Date(a._max.lastHeartbeatAt || 0).getTime()
    );
  });
  const pageGroups = sorted.slice((page - 1) * limit, page * limit);

  // Resolve logged-in identities in one batch.
  const userIds = [...new Set(pageGroups.map((g) => g._max.userId).filter((v): v is string => !!v))];
  const users = userIds.length
    ? await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true, image: true },
      })
    : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  // Snapshot fallback for users deleted since watching.
  const snapshots = pageGroups.length
    ? await db.videoWatchSession.findMany({
        where: { videoId: id, viewerKey: { in: pageGroups.map((g) => g.viewerKey) } },
        select: { viewerKey: true, viewerName: true, viewerEmail: true },
        orderBy: { startedAt: "desc" },
      })
    : [];
  const snapshotByKey = new Map<string, { viewerName: string | null; viewerEmail: string | null }>();
  for (const s of snapshots) {
    if (!snapshotByKey.has(s.viewerKey)) {
      snapshotByKey.set(s.viewerKey, { viewerName: s.viewerName, viewerEmail: s.viewerEmail });
    }
  }

  const duration = video.durationSeconds || 0;
  const items = pageGroups.map((g) => {
    const user = g._max.userId ? userById.get(g._max.userId) : undefined;
    const snap = snapshotByKey.get(g.viewerKey);
    const loggedIn = Boolean(g._max.userId || user);
    const watchSeconds = g._sum.totalWatchedSeconds || 0;
    return {
      viewerKey: g.viewerKey,
      loggedIn,
      name: user?.name || snap?.viewerName || (loggedIn ? "Member" : "Anonymous viewer"),
      email: user?.email || snap?.viewerEmail || null,
      image: user?.image || null,
      shortId: loggedIn ? null : g.viewerKey.replace(/^anon:/, "").slice(0, 8),
      sessions: g._count._all,
      watchSeconds,
      avgWatchSeconds: g._count._all > 0 ? Math.round((watchSeconds / g._count._all) * 10) / 10 : 0,
      maxCompletionRate: Math.round((g._max.completionRate || 0) * 1000) / 1000,
      maxPositionSeconds: Math.round((g._max.maxPositionSeconds || 0) * 10) / 10,
      completed: duration > 0 ? (g._max.maxPositionSeconds || 0) / duration >= 0.9 : (g._max.completionRate || 0) >= 0.9,
      firstWatchedAt: g._min.startedAt,
      lastWatchedAt: g._max.lastHeartbeatAt,
    };
  });

  return NextResponse.json({
    range: rangeKey,
    from: from?.toISOString() || null,
    to: to.toISOString(),
    video: { id: video.id, title: video.title },
    total,
    page,
    limit,
    pageCount: Math.max(1, Math.ceil(total / limit)),
    items,
  });
}
