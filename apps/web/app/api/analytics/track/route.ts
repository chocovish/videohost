import { NextResponse } from "next/server";
import { db } from "@videohost/db";
import { auth } from "@/lib/auth";
import {
  COMPLETION_THRESHOLD,
  countryFromHeaders,
  heatmapBucketIndex,
  isBotUserAgent,
  parseAnalyticsSource,
  parseUserAgent,
  rollupDailyStat,
  startOfUtcDay,
} from "@/lib/analytics";

type TrackEvent = "start" | "heartbeat" | "end";

const UUID_RE = /^[0-9a-fA-F-]{8,64}$/;
const ANON_RE = /^[A-Za-z0-9_-]{8,64}$/;
const SESSION_RE = /^[A-Za-z0-9_-]{8,64}$/;

function isValidId(v: unknown, re: RegExp): v is string {
  return typeof v === "string" && re.test(v);
}

function clampNumber(v: unknown, min: number, max: number, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * Public playback-beacon endpoint. Viewers are usually anonymous (share links
 * / embeds), so this route requires no auth — it attaches the logged-in user
 * only when a session cookie happens to be present.
 *
 * Body: {
 *   videoId: string,
 *   sessionId: string,      // client uuid per player mount
 *   event: "start" | "heartbeat" | "end",
 *   currentTime?: number,   // seconds, current playback position
 *   duration?: number,      // seconds, video duration as known by the player
 *   watchedDelta?: number,  // seconds actually watched since the last beacon
 *   anonymousId?: string,   // stable uuid persisted in viewer localStorage
 *   source?: "share" | "embed" | "dashboard" | "api"
 * }
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const videoId = body.videoId;
  const sessionId = body.sessionId;
  if (typeof videoId !== "string" || !videoId) {
    return NextResponse.json({ error: "videoId is required" }, { status: 400 });
  }
  if (!isValidId(sessionId, SESSION_RE)) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const event: TrackEvent =
    body.event === "heartbeat" || body.event === "end" ? body.event : "start";

  // Ignore crawlers/bots so analytics reflect real viewers.
  const ua = req.headers.get("user-agent");
  if (isBotUserAgent(ua)) return NextResponse.json({ ok: true, ignored: "bot" });

  const video = await db.video.findUnique({
    where: { id: videoId },
    select: { id: true, organizationId: true },
  });
  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  // Optional identity: logged-in viewers are recorded with name/email.
  let userId: string | null = null;
  let viewerName: string | null = null;
  let viewerEmail: string | null = null;
  try {
    const session = await auth();
    const sid = session?.user?.id;
    if (sid) {
      const u = await db.user.findUnique({
        where: { id: sid },
        select: { id: true, name: true, email: true, isBlocked: true },
      });
      if (u && !u.isBlocked) {
        userId = u.id;
        viewerName = u.name;
        viewerEmail = u.email;
      }
    }
  } catch {
    // Anonymous viewing — identity stays null.
  }

  // Prefer strict UUIDs (what the client tracker generates); fall back to a
  // wider charset so non-standard ids still stay distinct per viewer.
  const anonymousId = isValidId(body.anonymousId, UUID_RE)
    ? (body.anonymousId as string)
    : isValidId(body.anonymousId, ANON_RE)
      ? (body.anonymousId as string)
      : null;
  const viewerKey = userId ? `user:${userId}` : `anon:${anonymousId || "unknown"}`;

  const currentTime = clampNumber(body.currentTime, 0, 24 * 3600);
  const duration = clampNumber(body.duration, 0, 24 * 3600);
  // Clamp so a backgrounded tab or tampered client can't inflate watch time.
  const watchedDelta = Math.floor(clampNumber(body.watchedDelta, 0, 120));
  const source = parseAnalyticsSource(body.source);
  const referrer = req.headers.get("referer")?.slice(0, 500) || null;
  const country = countryFromHeaders(req.headers);
  const client = parseUserAgent(ua);
  const now = new Date();
  const day = startOfUtcDay(now);
  const bucketIndex = heatmapBucketIndex(
    currentTime > 0 ? currentTime : null,
    duration > 0 ? duration : null
  );

  const completionRate =
    duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  const existing = await db.videoWatchSession.findUnique({ where: { sessionId } });

  if (existing) {
    if (existing.videoId !== videoId) {
      return NextResponse.json({ error: "sessionId already bound to another video" }, { status: 400 });
    }
    const justCompleted = !existing.completed && completionRate >= COMPLETION_THRESHOLD;
    const updated = await db.videoWatchSession.update({
      where: { sessionId },
      data: {
        lastHeartbeatAt: now,
        totalWatchedSeconds: { increment: watchedDelta },
        maxPositionSeconds: Math.max(existing.maxPositionSeconds, currentTime),
        durationSeconds: duration > 0 ? duration : existing.durationSeconds,
        completed: justCompleted ? true : existing.completed,
        completionRate: Math.max(existing.completionRate, completionRate),
        // Backfill identity if the viewer logged in mid-playback.
        userId: existing.userId || userId,
        viewerKey: existing.userId ? existing.viewerKey : viewerKey,
        viewerName: existing.viewerName || viewerName,
        viewerEmail: existing.viewerEmail || viewerEmail,
        country: existing.country || country,
        referrer: existing.referrer || referrer,
      },
    });

    await rollupDailyStat({
      videoId,
      organizationId: video.organizationId,
      userId: updated.userId,
      viewerKey: updated.viewerKey,
      viewerName: updated.viewerName,
      viewerEmail: updated.viewerEmail,
      sessionId,
      day,
      isNewSession: false,
      isNewViewerToday: false,
      watchedDeltaSeconds: watchedDelta,
      justCompleted,
      device: null,
      browser: null,
      source: null,
      country: null,
      bucketIndex,
    });

    return NextResponse.json({ ok: true, session: sessionId, watchedSeconds: updated.totalWatchedSeconds });
  }

  // New session → counts as one view. Check whether this viewer already
  // watched this video today to maintain the unique-viewer counter.
  const priorToday = await db.videoWatchSession.findFirst({
    where: { videoId, viewerKey, startedAt: { gte: day } },
    select: { id: true },
  });
  const isNewViewerToday = !priorToday;

  const completed = completionRate >= COMPLETION_THRESHOLD;
  await db.videoWatchSession.create({
    data: {
      videoId,
      organizationId: video.organizationId,
      userId,
      viewerKey,
      viewerName,
      viewerEmail,
      sessionId,
      startedAt: now,
      lastHeartbeatAt: now,
      totalWatchedSeconds: watchedDelta,
      maxPositionSeconds: currentTime,
      durationSeconds: duration > 0 ? duration : null,
      completed,
      completionRate,
      device: client.device,
      browser: client.browser,
      os: client.os,
      country,
      referrer,
      source,
    },
  });

  await rollupDailyStat({
    videoId,
    organizationId: video.organizationId,
    userId,
    viewerKey,
    viewerName,
    viewerEmail,
    sessionId,
    day,
    isNewSession: true,
    isNewViewerToday,
    watchedDeltaSeconds: watchedDelta,
    justCompleted: completed,
    device: client.device,
    browser: client.browser,
    source,
    country,
    bucketIndex,
  });

  return NextResponse.json({ ok: true, session: sessionId, watchedSeconds: watchedDelta });
}
