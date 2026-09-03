import { getPresignedPlaybackUrl, getPublicCdnUrl, uploadBufferToS3, deleteFileFromS3 } from "./s3";
import { db } from "@videohost/db";

export interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  src: string;
  isDefault: boolean;
}

export interface SubtitleRecord {
  id: string;
  label: string;
  language: string;
  storageKey: string;
  sizeBytes: number;
  isDefault: boolean;
  createdAt: Date;
}

export const SUBTITLE_MAX_BYTES = 5 * 1024 * 1024; // 5MB – VTT files are tiny
export const SUBTITLE_CONTENT_TYPE = "text/vtt";

export function getSubtitleS3Key(
  organizationId: string,
  videoId: string,
  subtitleId: string,
  language: string
): string {
  const safeLang = (language || "und").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 12) || "und";
  return `videos/${organizationId}/${videoId}/subtitles/${subtitleId}-${safeLang}.vtt`;
}

export function normalizeSubtitleLanguage(input?: string | null): string {
  if (!input) return "en";
  const cleaned = input.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!cleaned) return "en";
  // Accept "en", "en-US", "eng" etc. – keep short BCP-47 form
  return cleaned.slice(0, 12);
}

export function normalizeSubtitleLabel(label?: string | null, language?: string | null): string {
  const trimmed = (label || "").trim().slice(0, 80);
  if (trimmed) return trimmed;
  const lang = (language || "en").toUpperCase();
  return lang;
}

/** Minimal WebVTT sanity check – must start with WEBVTT header. */
export function validateVttContent(text: string): { ok: boolean; error?: string } {
  if (!text || !text.trim()) return { ok: false, error: "Subtitle file is empty." };
  const firstLine = text.replace(/^\uFEFF/, "").trimStart().split(/\r?\n/, 1)[0]?.trim() || "";
  if (!firstLine.toUpperCase().startsWith("WEBVTT")) {
    return { ok: false, error: "Invalid subtitle file: must be WebVTT format (file must start with WEBVTT)." };
  }
  return { ok: true };
}

export async function uploadSubtitleBuffer(key: string, body: Buffer): Promise<void> {
  await uploadBufferToS3(key, body, SUBTITLE_CONTENT_TYPE);
}

export async function deleteSubtitleFile(key: string): Promise<void> {
  if (!key) return;
  await deleteFileFromS3(key);
}

/** Public (CDN) or presigned URL for a stored VTT key. Tracks need CORS-enabled GET. */
export async function getSubtitlePlaybackUrl(storageKey: string): Promise<string> {
  if (!storageKey) return "";
  if (storageKey.startsWith("http://") || storageKey.startsWith("https://")) return storageKey;
  // Prefer public CDN URL when configured (stable, cacheable); else presigned.
  const cdn = getPublicCdnUrl(storageKey);
  // getPublicCdnUrl always returns something; if no CDN is configured it falls
  // back to the raw endpoint URL which may still need signing – use presigned then.
  const hasCdn = Boolean(
    (process.env.CDN_URL || process.env.NEXT_PUBLIC_CDN_URL || "").trim()
  );
  if (hasCdn) return cdn;
  return getPresignedPlaybackUrl(storageKey);
}

export async function toSubtitleTracks(
  subtitles: Array<{ id: string; label: string; language: string; storageKey: string; isDefault: boolean }>
): Promise<SubtitleTrack[]> {
  return Promise.all(
    subtitles.map(async (s) => ({
      id: s.id,
      label: s.label,
      language: s.language,
      src: await getSubtitlePlaybackUrl(s.storageKey),
      isDefault: s.isDefault,
    }))
  );
}

/**
 * UNIFIED subtitle fetchers – pass a video id, get subtitles back.
 * Use these everywhere instead of hand-rolled `db.videoSubtitle`
 * queries + mapping, so the query/mapping logic lives in one place.
 */

/** Raw subtitle rows for a video, oldest first (for management UIs). */
export async function listVideoSubtitles(videoId: string): Promise<SubtitleRecord[]> {
  return db.videoSubtitle.findMany({
    where: { videoId },
    orderBy: { createdAt: "asc" },
  });
}

/** Player-ready tracks (with playable `src` urls) for a video. */
export async function getVideoSubtitleTracks(videoId: string): Promise<SubtitleTrack[]> {
  const rows = await listVideoSubtitles(videoId);
  return toSubtitleTracks(rows);
}

/**
 * Same as getVideoSubtitleTracks but never throws – returns [] on failure.
 * Use in playback payloads (video detail, share, embed) so a subtitle
 * problem can never break video playback/pages.
 */
export async function getVideoSubtitleTracksSafe(videoId: string): Promise<SubtitleTrack[]> {
  try {
    return await getVideoSubtitleTracks(videoId);
  } catch (e) {
    console.warn(`[Subtitles] Failed to load tracks for video ${videoId}, serving without subtitles:`, e);
    return [];
  }
}
