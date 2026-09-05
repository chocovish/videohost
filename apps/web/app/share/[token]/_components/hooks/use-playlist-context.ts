"use client";

import { useEffect, useState } from "react";
import type { SharedData } from "../types";

interface UsePlaylistContextResult {
  playlistData: SharedData | null;
  loading: boolean;
}

/**
 * Resolves the `?playlistId=` queue for an episode page.
 *
 * - When the current page already IS that playlist (overview), reuse it —
 *   no extra request.
 * - Otherwise fetch `/api/share/:playlistId` once so the bottom drawer,
 *   prev/next buttons and "back to playlist" link have the full queue.
 * - Returns `null` when there is no playlist param or the fetch fails;
 *   callers then fall back to the plain single-video view.
 */
export function usePlaylistContext(
  playlistId: string | null,
  currentData: SharedData | null
): UsePlaylistContextResult {
  const [fetched, setFetched] = useState<SharedData | null>(null);
  const [loading, setLoading] = useState(false);

  const isCurrentPlaylist =
    !!playlistId &&
    currentData?.type === "playlist" &&
    currentData.playlist?.id === playlistId;

  useEffect(() => {
    if (!playlistId || isCurrentPlaylist) {
      setFetched(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch(`/api/share/${encodeURIComponent(playlistId)}`)
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as SharedData;
      })
      .then((json) => {
        if (cancelled) return;
        setFetched(json && json.type === "playlist" ? json : null);
      })
      .catch(() => {
        if (!cancelled) setFetched(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [playlistId, isCurrentPlaylist]);

  if (isCurrentPlaylist && currentData) {
    return { playlistData: currentData, loading: false };
  }

  return { playlistData: fetched, loading };
}
