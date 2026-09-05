import { NextResponse } from "next/server";
import { db } from "@videohost/db";
import { authenticateRequest } from "@/lib/api-auth";
import {
  emptyHeatmap,
  heatmapBucketIndex,
  mergeCounterMaps,
  startOfUtcDay,
} from "@/lib/analytics";

const BATCH = 2000;

interface Bucket {
  videoId: string;
  day: Date;
  views: number;
  viewerKeys: Set<string>;
  loggedInKeys: Set<string>;
  watchSeconds: number;
  completions: number;
  devices: Record<string, number>;
  browsers: Record<string, number>;
  sources: Record<string, number>;
  countries: Record<string, number>;
  heatmap: number[];
}

/**
 * Rebuild pre-aggregated daily stats from raw watch sessions.
 * Used as a repair/backfill tool (e.g. after importing data or changing
 * rollup rules). Body: { videoId?: string } — scoped to the org.
 *
 * NOTE: the retention heatmap is approximated from each session's peak
 * position (live heartbeats distribute hits more precisely).
 */
export async function POST(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (authCtx.role !== "OWNER" && authCtx.role !== "ADMIN") {
    return NextResponse.json({ error: "Only owners/admins can rebuild analytics" }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const videoId = typeof body.videoId === "string" && body.videoId ? body.videoId : null;

  if (videoId) {
    const video = await db.video.findFirst({
      where: { id: videoId, organizationId: authCtx.orgId },
      select: { id: true },
    });
    if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const scope = { organizationId: authCtx.orgId, ...(videoId ? { videoId } : {}) };

  const buckets = new Map<string, Bucket>();
  let cursor: string | undefined;
  let sessionCount = 0;

  for (;;) {
    const sessions = await db.videoWatchSession.findMany({
      where: { ...scope, ...(cursor ? { id: { gt: cursor } } : {}) },
      orderBy: { id: "asc" },
      take: BATCH,
      select: {
        id: true,
        videoId: true,
        viewerKey: true,
        userId: true,
        startedAt: true,
        totalWatchedSeconds: true,
        maxPositionSeconds: true,
        durationSeconds: true,
        completed: true,
        device: true,
        browser: true,
        source: true,
        country: true,
      },
    });
    if (!sessions.length) break;

    for (const s of sessions) {
      const day = startOfUtcDay(s.startedAt);
      const key = `${s.videoId}|${day.toISOString()}`;
      let b = buckets.get(key);
      if (!b) {
        b = {
          videoId: s.videoId,
          day,
          views: 0,
          viewerKeys: new Set(),
          loggedInKeys: new Set(),
          watchSeconds: 0,
          completions: 0,
          devices: {},
          browsers: {},
          sources: {},
          countries: {},
          heatmap: emptyHeatmap(),
        };
        buckets.set(key, b);
      }
      b.views += 1;
      b.viewerKeys.add(s.viewerKey);
      if (s.userId) b.loggedInKeys.add(s.viewerKey);
      b.watchSeconds += s.totalWatchedSeconds || 0;
      if (s.completed) b.completions += 1;
      if (s.device) b.devices[s.device] = (b.devices[s.device] || 0) + 1;
      if (s.browser) b.browsers[s.browser] = (b.browsers[s.browser] || 0) + 1;
      if (s.source) b.sources[s.source] = (b.sources[s.source] || 0) + 1;
      if (s.country) b.countries[s.country] = (b.countries[s.country] || 0) + 1;
      const idx = heatmapBucketIndex(
        s.maxPositionSeconds > 0 ? s.maxPositionSeconds : null,
        s.durationSeconds && s.durationSeconds > 0 ? s.durationSeconds : null
      );
      if (idx >= 0) b.heatmap[idx] += 1;
    }

    sessionCount += sessions.length;
    cursor = sessions[sessions.length - 1].id;
    if (sessions.length < BATCH) break;
  }

  // Replace stats in scope with the rebuilt rows.
  await db.videoDailyStat.deleteMany({ where: scope });
  const rows = [...buckets.values()].map((b) => ({
    videoId: b.videoId,
    organizationId: authCtx.orgId,
    date: b.day,
    views: b.views,
    uniqueViewers: b.viewerKeys.size,
    loggedInViewers: b.loggedInKeys.size,
    anonymousViewers: b.viewerKeys.size - b.loggedInKeys.size,
    totalWatchSeconds: b.watchSeconds,
    completions: b.completions,
    devices: mergeCounterMaps(b.devices),
    browsers: mergeCounterMaps(b.browsers),
    sources: mergeCounterMaps(b.sources),
    countries: mergeCounterMaps(b.countries),
    heatmap: b.heatmap,
  }));
  // createMany in chunks to stay within parameter limits.
  for (let i = 0; i < rows.length; i += 500) {
    await db.videoDailyStat.createMany({ data: rows.slice(i, i + 500) });
  }

  return NextResponse.json({
    ok: true,
    sessionsScanned: sessionCount,
    daysRebuilt: rows.length,
    ...(videoId ? { videoId } : {}),
  });
}
