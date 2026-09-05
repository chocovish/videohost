import type { SharedData, SharedVideoItem } from "./types";

/** Canonical episode URL — video id in the path, playlist id in the query. */
export function buildPlaylistVideoUrl(videoId: string, playlistId: string): string {
  return `/share/${videoId}?playlistId=${encodeURIComponent(playlistId)}`;
}

/** Canonical playlist overview URL. */
export function buildPlaylistUrl(playlistId: string): string {
  return `/share/${encodeURIComponent(playlistId)}`;
}

/** Index of the currently-playing video inside the playlist queue. */
export function getPlaylistIndex(
  videos: SharedVideoItem[] | undefined,
  videoId: string | undefined
): number {
  if (!videos || !videoId) return 0;
  const idx = videos.findIndex((v) => v.id === videoId);
  return idx >= 0 ? idx : 0;
}

/** Previous / next videos around the current one (null at the edges). */
export function getPlaylistNeighbors(
  videos: SharedVideoItem[] | undefined,
  videoId: string | undefined
): { prev: SharedVideoItem | null; next: SharedVideoItem | null; index: number } {
  const list = videos ?? [];
  const index = getPlaylistIndex(list, videoId);
  return {
    prev: index > 0 ? list[index - 1] : null,
    next: index < list.length - 1 ? list[index + 1] : null,
    index,
  };
}

/** Filter the queue by title (case-insensitive). */
export function filterPlaylistQueue(
  videos: SharedVideoItem[],
  query: string
): SharedVideoItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return videos;
  return videos.filter((v) => v.title.toLowerCase().includes(q));
}

/** Whether the playlist queue is paywalled for this visitor. */
export function isPlaylistLocked(data: SharedData | null | undefined): boolean {
  return data?.accessMode === "PURCHASABLE" && !data?.isPurchased;
}
