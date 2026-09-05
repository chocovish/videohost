"use client";

import { useEffect, useRef, type RefObject } from "react";

export type AnalyticsSource = "share" | "embed" | "dashboard" | "api";

interface TrackerProps {
  videoId: string;
  source: AnalyticsSource;
  /** Ref of the element wrapping the player; the tracker finds the <video> inside it. */
  containerRef: RefObject<HTMLElement | null>;
  enabled?: boolean;
}

const ANON_KEY = "vh_anon_id";
const HEARTBEAT_MS = 10_000;
const DWELL_HEARTBEAT_MS = 15_000;
const VIDEO_LOOKUP_TIMEOUT_MS = 8_000;

function uuid(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

export function getAnonymousId(): string | null {
  try {
    let id = window.localStorage.getItem(ANON_KEY);
    if (!id) {
      id = uuid();
      window.localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

interface Beacon {
  videoId: string;
  sessionId: string;
  event: "start" | "heartbeat" | "end";
  currentTime: number;
  duration: number;
  watchedDelta: number;
  anonymousId: string | null;
  source: AnalyticsSource;
}

function sendBeacon(b: Beacon, useSendBeacon = false): void {
  try {
    const payload = JSON.stringify(b);
    if (useSendBeacon && typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/track", blob);
      return;
    }
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {
      /* analytics must never break playback */
    });
  } catch {
    /* no-op */
  }
}

/**
 * Invisible playback tracker. Mount next to any player:
 *
 *   <div ref={wrapRef} className="aspect-video ...">
 *     <VideoPlayer src={...} />
 *     <VideoAnalyticsTracker videoId={id} source="share" containerRef={wrapRef} />
 *   </div>
 *
 * - Native/HLS/DASH players: binds to the underlying <video> element, starts
 *   a session on first play, and reports wall-clock watch time + position.
 * - Cross-origin iframes (Bunny embeds): position is unreadable, so it falls
 *   back to visible-dwell tracking as an approximation.
 */
export default function VideoAnalyticsTracker({ videoId, source, containerRef, enabled = true }: TrackerProps) {
  const stateRef = useRef({
    sessionId: "",
    anonymousId: null as string | null,
    started: false,
    playing: false,
    lastTick: 0,
    pendingWatched: 0,
    lastPosition: 0,
    lastDuration: 0,
    done: false,
  });

  useEffect(() => {
    if (!enabled || !videoId) return;
    const st = stateRef.current;
    st.sessionId = uuid();
    st.anonymousId = getAnonymousId();
    st.started = false;
    st.playing = false;
    st.pendingWatched = 0;
    st.done = false;

    let video: HTMLVideoElement | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let observer: MutationObserver | null = null;
    let lookupTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const base = (): Beacon => ({
      videoId,
      sessionId: st.sessionId,
      event: "heartbeat",
      currentTime: st.lastPosition,
      duration: st.lastDuration,
      watchedDelta: 0,
      anonymousId: st.anonymousId,
      source,
    });

    const flush = (event: Beacon["event"], useSendBeacon = false) => {
      if (!st.started || st.done) return;
      if (event === "end") st.done = true;
      const delta = Math.max(0, Math.min(120, Math.round(st.pendingWatched)));
      st.pendingWatched = 0;
      sendBeacon({ ...base(), event, watchedDelta: delta }, useSendBeacon);
    };

    const ensureStarted = (position: number, duration: number) => {
      if (st.started) return;
      st.started = true;
      st.lastPosition = position;
      st.lastDuration = duration;
      st.lastTick = performance.now();
      sendBeacon({ ...base(), event: "start", currentTime: position, duration, watchedDelta: 0 });
    };

    const tick = () => {
      if (!video || st.done) return;
      const now = performance.now();
      if (st.playing && !document.hidden && !video.paused && !video.seeking) {
        st.pendingWatched += Math.min(2, Math.max(0, (now - st.lastTick) / 1000));
      }
      st.lastTick = now;
      if (Number.isFinite(video.currentTime)) st.lastPosition = video.currentTime;
      if (Number.isFinite(video.duration)) st.lastDuration = video.duration;
    };

    const bindVideo = (el: HTMLVideoElement) => {
      video = el;
      st.lastPosition = Number.isFinite(el.currentTime) ? el.currentTime : 0;
      st.lastDuration = Number.isFinite(el.duration) ? el.duration : 0;

      el.addEventListener("play", () => {
        st.playing = true;
        st.lastTick = performance.now();
        ensureStarted(el.currentTime || 0, Number.isFinite(el.duration) ? el.duration : 0);
      });
      el.addEventListener("playing", () => {
        st.playing = true;
        st.lastTick = performance.now();
      });
      el.addEventListener("pause", () => {
        tick();
        st.playing = false;
        flush("heartbeat");
      });
      el.addEventListener("timeupdate", tick);
      el.addEventListener("seeked", () => {
        st.lastTick = performance.now();
        tick();
      });
      el.addEventListener("ended", () => {
        tick();
        st.playing = false;
        if (Number.isFinite(el.duration)) st.lastDuration = el.duration;
        st.lastPosition = st.lastDuration;
        flush("end");
      });

      heartbeatTimer = setInterval(() => {
        tick();
        flush("heartbeat");
      }, HEARTBEAT_MS);
    };

    /** Bunny-style cross-origin iframe fallback: dwell-time approximation. */
    const startDwellFallback = () => {
      ensureStarted(0, 0);
      let last = performance.now();
      heartbeatTimer = setInterval(() => {
        if (st.done || document.hidden) {
          last = performance.now();
          return;
        }
        const now = performance.now();
        st.pendingWatched += Math.min(30, Math.max(0, (now - last) / 1000));
        last = now;
        flush("heartbeat");
      }, DWELL_HEARTBEAT_MS);
    };

    const tryFindVideo = (): boolean => {
      const root = containerRef.current;
      if (!root) return false;
      const el = root.querySelector("video");
      if (el) {
        bindVideo(el as HTMLVideoElement);
        return true;
      }
      return false;
    };

    if (!tryFindVideo()) {
      // video.js mounts asynchronously — watch for it briefly.
      observer = new MutationObserver(() => {
        if (!disposed && tryFindVideo()) {
          observer?.disconnect();
          observer = null;
          if (lookupTimer) clearTimeout(lookupTimer);
        }
      });
      if (containerRef.current) {
        observer.observe(containerRef.current, { childList: true, subtree: true });
      }
      lookupTimer = setTimeout(() => {
        if (!disposed && !video) {
          observer?.disconnect();
          observer = null;
          startDwellFallback();
        }
      }, VIDEO_LOOKUP_TIMEOUT_MS);
    }

    const onHide = () => {
      if (document.visibilityState === "hidden") {
        tick();
        flush("end", true);
      }
    };
    const onUnload = () => {
      tick();
      flush("end", true);
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onUnload);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      disposed = true;
      tick();
      // Synchronous XHR-free final flush; failures are silently ignored.
      try {
        if (st.started && !st.done) {
          st.done = true;
          const delta = Math.max(0, Math.min(120, Math.round(st.pendingWatched)));
          sendBeacon({ ...base(), event: "end", watchedDelta: delta }, true);
        }
      } catch {
        /* no-op */
      }
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (lookupTimer) clearTimeout(lookupTimer);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onUnload);
      window.removeEventListener("beforeunload", onUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, source, enabled]);

  return null;
}
