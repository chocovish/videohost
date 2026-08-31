/**
 * Bunny.net Stream Provider
 * ---------------------------------------------------------------------------
 * Professional, debuggable, and isolated implementation for Bunny Stream.
 *
 * Environment:
 *   VIDEO_STORAGE=bunny            → enable Bunny path
 *   BUNNY_LIBRARY_ID               → numeric library id (required for bunny)
 *   BUNNY_API_KEY                  → Stream API key for that library (AccessKey)
 *   BUNNY_CDN_HOSTNAME             → optional pull-zone hostname e.g. vz-xxxx.b-cdn.net
 *                                   used to construct HLS / thumbnail URLs
 *   BUNNY_EMBED_HOSTNAME           → optional, default iframe.mediadelivery.net
 *
 * Storage model:
 *   - One collection per organization (named after org.slug)
 *   - Collection GUID stored on Organization.bunnyCollectionId
 *   - Each video gets a Bunny GUID stored on Video.bunnyVideoId
 *   - Video.storageType = "bunny" distinguishes from legacy S3
 *
 * All functions log with prefix [Bunny] for debuggability and throw typed
 * errors so callers can return actionable HTTP responses.
 * ---------------------------------------------------------------------------
 */

import { createHash } from "crypto";
import { db } from "@videohost/db";

const BUNNY_BASE_URL = "https://video.bunnycdn.com";
const DEFAULT_EMBED_HOST = "iframe.mediadelivery.net";

// ---------------------------------------------------------------------------
// Env helpers
// ---------------------------------------------------------------------------

function cleanEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.replace(/^["']|["']$/g, "").trim();
  return trimmed || undefined;
}

export function isBunnyEnabled(): boolean {
  const flag = cleanEnv(process.env.VIDEO_STORAGE)?.toLowerCase();
  return flag === "bunny";
}

export interface BunnyConfig {
  libraryId: string;
  apiKey: string;
  cdnHostname?: string;
  embedHostname: string;
}

export function getBunnyConfig(): BunnyConfig {
  const libraryId = cleanEnv(process.env.BUNNY_LIBRARY_ID || process.env.BUNNY_STREAM_LIBRARY_ID);
  const apiKey = cleanEnv(process.env.BUNNY_API_KEY || process.env.BUNNY_STREAM_API_KEY);
  const cdnHostname = cleanEnv(process.env.BUNNY_CDN_HOSTNAME || process.env.BUNNY_PULL_ZONE);
  const embedHostname = cleanEnv(process.env.BUNNY_EMBED_HOSTNAME) || DEFAULT_EMBED_HOST;

  if (!libraryId || !apiKey) {
    throw new Error(
      `[Bunny] Missing configuration: BUNNY_LIBRARY_ID and BUNNY_API_KEY must be set when VIDEO_STORAGE=bunny. ` +
        `Got libraryId=${libraryId ? "set" : "missing"}, apiKey=${apiKey ? "set" : "missing"}`
    );
  }

  return { libraryId, apiKey, cdnHostname, embedHostname };
}

function bunnyHeaders(apiKey: string, extra?: Record<string, string>): Record<string, string> {
  return {
    AccessKey: apiKey,
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Types – mirroring Bunny Stream API shapes (subset)
// ---------------------------------------------------------------------------

export interface BunnyCollection {
  videoLibraryId: number;
  guid: string;
  name: string;
  videoCount: number;
  totalSize: number;
}

export interface BunnyVideo {
  videoLibraryId: number;
  guid: string;
  title: string;
  dateUploaded: string;
  views: number;
  isPublic: boolean;
  length: number;
  status: number; // 0=queued,1=processing,2=... 4=finished etc.
  framerate: number;
  width: number;
  height: number;
  availableResolutions?: string | null;
  thumbnailCount: number;
  encodeProgress: number;
  storageSize: number;
  collectionId?: string | null;
  thumbnailFileName?: string | null;
}

// ---------------------------------------------------------------------------
// Low-level fetch wrapper – always logs
// ---------------------------------------------------------------------------

async function bunnyFetch(
  url: string,
  options: RequestInit & { apiKey: string }
): Promise<Response> {
  const { apiKey, ...rest } = options as any;
  const headers = {
    ...(rest.headers || {}),
    AccessKey: apiKey,
  };
  console.log(`[Bunny Fetch] ${rest.method || "GET"} ${url}`);
  const res = await fetch(url, { ...rest, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[Bunny Fetch Error] ${res.status} ${res.statusText} – ${body} – URL: ${url}`);
  }
  return res;
}

// ---------------------------------------------------------------------------
// Collection management
// ---------------------------------------------------------------------------

/**
 * Create a Bunny collection. Returns the collection GUID.
 */
export async function createBunnyCollection(
  name: string,
  config?: BunnyConfig
): Promise<BunnyCollection> {
  const cfg = config || getBunnyConfig();
  const url = `${BUNNY_BASE_URL}/library/${cfg.libraryId}/collections`;

  console.log(`[Bunny] Creating collection "${name}" in library ${cfg.libraryId}…`);

  const res = await bunnyFetch(url, {
    apiKey: cfg.apiKey,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`[Bunny] Failed to create collection "${name}" – ${res.status}: ${errorText}`);
  }

  const data = (await res.json()) as BunnyCollection;
  console.log(`[Bunny] Collection created: name="${data.name}" guid=${data.guid}`);
  return data;
}

/**
 * List collections (paginated) and try to find one by name.
 * Bunny API returns all collections at GET /library/{id}/collections
 * No pagination params documented, but we handle gracefully.
 */
export async function findBunnyCollectionByName(
  name: string,
  config?: BunnyConfig
): Promise<BunnyCollection | null> {
  const cfg = config || getBunnyConfig();
  const url = `${BUNNY_BASE_URL}/library/${cfg.libraryId}/collections`;

  console.log(`[Bunny] Listing collections to find "${name}"…`);

  const res = await bunnyFetch(url, {
    apiKey: cfg.apiKey,
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[Bunny] Failed to list collections – ${res.status}: ${errText}`);
  }

  const payload = await res.json();
  // API returns either array directly or { items: [...] } depending on version
  const items: BunnyCollection[] = Array.isArray(payload) ? payload : payload.items || payload.collections || [];

  const found = items.find((c) => c.name === name || c.guid === name) || null;
  if (found) {
    console.log(`[Bunny] Found existing collection "${name}" → guid=${found.guid}`);
  } else {
    console.log(`[Bunny] No existing collection found for "${name}"`);
  }
  return found;
}

/**
 * Ensure an organization has a Bunny collection.
 * Returns the collection GUID and persists it to Organization.bunnyCollectionId.
 *
 * Concurrency-safe: uses DB unique constraint + re-read on conflict.
 */
export async function ensureBunnyCollectionForOrg(
  organizationId: string
): Promise<{ collectionId: string; collectionName: string }> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, slug: true, bunnyCollectionId: true, bunnyCollectionName: true },
  });

  if (!org) {
    throw new Error(`[Bunny] Organization not found: ${organizationId}`);
  }

  if (org.bunnyCollectionId) {
    console.log(`[Bunny] Org ${organizationId} already has collectionId=${org.bunnyCollectionId}`);
    return { collectionId: org.bunnyCollectionId, collectionName: org.bunnyCollectionName || org.slug };
  }

  const cfg = getBunnyConfig();
  const slugBasedName = org.slug; // requirement: named with org slug
  console.log(`[Bunny] Ensuring collection for org ${org.slug} (${organizationId}) with name "${slugBasedName}"`);

  // First try to see if a collection with that name already exists in Bunny
  // (covers case where previous DB write failed after Bunny creation)
  let collectionGuid: string | null = null;

  try {
    const existing = await findBunnyCollectionByName(slugBasedName, cfg);
    if (existing?.guid) {
      collectionGuid = existing.guid;
    }
  } catch (err: any) {
    console.warn(`[Bunny] Could not list collections to check duplicate – will attempt create: ${err?.message}`);
  }

  if (!collectionGuid) {
    const created = await createBunnyCollection(slugBasedName, cfg);
    collectionGuid = created.guid;
  }

  if (!collectionGuid) {
    throw new Error(`[Bunny] Failed to resolve collection GUID for org ${org.slug}`);
  }

  // Persist to DB – handle race where another request already wrote it
  try {
    const updated = await db.organization.update({
      where: { id: organizationId },
      data: {
        bunnyCollectionId: collectionGuid,
        bunnyCollectionName: slugBasedName,
      },
      select: { bunnyCollectionId: true },
    });
    console.log(`[Bunny] Saved collectionId=${updated.bunnyCollectionId} to org ${organizationId}`);
  } catch (err: any) {
    // Unique violation means another concurrent request won – re-read
    if (err?.code === "P2002" || String(err?.message).includes("Unique constraint")) {
      const fresh = await db.organization.findUnique({
        where: { id: organizationId },
        select: { bunnyCollectionId: true, bunnyCollectionName: true },
      });
      if (fresh?.bunnyCollectionId) {
        console.log(`[Bunny] Race: org ${organizationId} already had collectionId=${fresh.bunnyCollectionId} after conflict`);
        return {
          collectionId: fresh.bunnyCollectionId,
          collectionName: fresh.bunnyCollectionName || slugBasedName,
        };
      }
    }
    console.error(`[Bunny] Failed to save collectionId to org ${organizationId}:`, err);
    throw err;
  }

  return { collectionId: collectionGuid, collectionName: slugBasedName };
}

// ---------------------------------------------------------------------------
// Video lifecycle
// ---------------------------------------------------------------------------

export interface CreateBunnyVideoParams {
  title: string;
  collectionId?: string | null;
  thumbnailTime?: number; // ms
}

export async function createBunnyVideo(
  params: CreateBunnyVideoParams,
  config?: BunnyConfig
): Promise<BunnyVideo> {
  const cfg = config || getBunnyConfig();
  const url = `${BUNNY_BASE_URL}/library/${cfg.libraryId}/videos`;

  console.log(`[Bunny] Creating video "${params.title}" (collectionId=${params.collectionId || "none"})`);

  const res = await bunnyFetch(url, {
    apiKey: cfg.apiKey,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      title: params.title,
      collectionId: params.collectionId || undefined,
      thumbnailTime: params.thumbnailTime,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[Bunny] Create video failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as BunnyVideo;
  console.log(`[Bunny] Video created: guid=${data.guid} title="${data.title}"`);
  return data;
}

export async function getBunnyVideo(
  videoGuid: string,
  config?: BunnyConfig
): Promise<BunnyVideo | null> {
  const cfg = config || getBunnyConfig();
  const url = `${BUNNY_BASE_URL}/library/${cfg.libraryId}/videos/${videoGuid}`;

  const res = await bunnyFetch(url, {
    apiKey: cfg.apiKey,
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[Bunny] Get video ${videoGuid} failed (${res.status}): ${errText}`);
  }

  return (await res.json()) as BunnyVideo;
}

export async function deleteBunnyVideo(
  videoGuid: string,
  config?: BunnyConfig
): Promise<void> {
  const cfg = config || getBunnyConfig();
  const url = `${BUNNY_BASE_URL}/library/${cfg.libraryId}/videos/${videoGuid}`;

  console.log(`[Bunny Delete] Deleting video guid=${videoGuid} from library ${cfg.libraryId}`);

  const res = await bunnyFetch(url, {
    apiKey: cfg.apiKey,
    method: "DELETE",
  });

  if (!res.ok && res.status !== 404) {
    const errText = await res.text();
    console.error(`[Bunny Delete Error] Failed to delete ${videoGuid}: ${res.status} – ${errText}`);
    throw new Error(`[Bunny] Delete video failed (${res.status}): ${errText}`);
  }

  console.log(`[Bunny Delete] Deleted bunny video ${videoGuid} (status ${res.status})`);
}

/**
 * Upload binary video data to Bunny for a previously created video GUID.
 * Used by the server-side proxy (so the API key never leaves the server).
 */
export async function uploadBunnyVideoBinary(
  videoGuid: string,
  data: Buffer | Uint8Array | ReadableStream | Blob,
  contentTypeOrConfig?: string | BunnyConfig,
  maybeConfig?: BunnyConfig
): Promise<void> {
  // Overload: (guid, data, contentType?, config?)
  let contentType = "video/mp4";
  let cfg: BunnyConfig;

  if (typeof contentTypeOrConfig === "object" && contentTypeOrConfig !== null && "libraryId" in contentTypeOrConfig) {
    cfg = contentTypeOrConfig as BunnyConfig;
  } else {
    if (typeof contentTypeOrConfig === "string" && contentTypeOrConfig) contentType = contentTypeOrConfig;
    cfg = maybeConfig || getBunnyConfig();
  }

  const url = `${BUNNY_BASE_URL}/library/${cfg.libraryId}/videos/${videoGuid}`;

  console.log(`[Bunny Upload] PUT binary to ${videoGuid} (${contentType}, ${data instanceof Buffer ? `${data.byteLength} bytes` : "stream"})`);

  const body: any = data instanceof Buffer ? data : data;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      AccessKey: cfg.apiKey,
      "Content-Type": contentType,
    },
    body: body as any,
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[Bunny Upload Error] PUT ${videoGuid} failed ${res.status}: ${errText}`);
    throw new Error(`[Bunny] Upload video binary failed (${res.status}): ${errText}`);
  }

  console.log(`[Bunny Upload] Video binary uploaded successfully for guid=${videoGuid}`);
}

/**
 * Upload thumbnail image for a Bunny video.
 * Accepts a Buffer; posts to POST /library/{id}/videos/{guid}/thumbnail
 */
export async function uploadBunnyThumbnail(
  videoGuid: string,
  imageBuffer: Buffer,
  contentType: string = "image/jpeg",
  config?: BunnyConfig
): Promise<void> {
  const cfg = config || getBunnyConfig();
  const url = `${BUNNY_BASE_URL}/library/${cfg.libraryId}/videos/${videoGuid}/thumbnail`;

  console.log(`[Bunny Thumbnail] Uploading thumbnail for guid=${videoGuid} (${contentType}, ${imageBuffer.byteLength} bytes)`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      AccessKey: cfg.apiKey,
      "Content-Type": contentType,
    },
    body: imageBuffer as any,
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[Bunny Thumbnail Error] Failed for ${videoGuid}: ${res.status} – ${errText}`);
    throw new Error(`[Bunny] Thumbnail upload failed (${res.status}): ${errText}`);
  }

  console.log(`[Bunny Thumbnail] Thumbnail uploaded for guid=${videoGuid}`);
}

// ---------------------------------------------------------------------------
// TUS resumable upload helpers (for direct browser uploads)
// ---------------------------------------------------------------------------

/**
 * Generate Bunny TUS signature:
 *   SHA256(libraryId + apiKey + expiration + videoId)
 */
export function generateBunnyTusSignature(
  libraryId: string,
  apiKey: string,
  expirationUnixSeconds: number,
  videoId: string
): string {
  return createHash("sha256")
    .update(`${libraryId}${apiKey}${expirationUnixSeconds}${videoId}`)
    .digest("hex");
}

export interface BunnyTusCredentials {
  videoId: string;
  libraryId: string;
  expirationTime: number;
  signature: string;
  tusEndpoint: string;
}

export function createBunnyTusCredentials(
  videoGuid: string,
  expiresInSeconds: number = 86400,
  config?: BunnyConfig
): BunnyTusCredentials {
  const cfg = config || getBunnyConfig();
  const expirationTime = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const signature = generateBunnyTusSignature(cfg.libraryId, cfg.apiKey, expirationTime, videoGuid);
  return {
    videoId: videoGuid,
    libraryId: cfg.libraryId,
    expirationTime,
    signature,
    tusEndpoint: "https://video.bunnycdn.com/tusupload",
  };
}

// ---------------------------------------------------------------------------
// Playback URL helpers
// ---------------------------------------------------------------------------

export function getBunnyPlaybackUrl(
  videoGuid: string,
  opts?: { cdnHostname?: string; libraryId?: string; embed?: boolean }
): string {
  const cfg = (() => {
    try {
      return getBunnyConfig();
    } catch {
      return null;
    }
  })();

  const libraryId = opts?.libraryId || cfg?.libraryId || "";
  const cdnHostname = opts?.cdnHostname || cfg?.cdnHostname;

  // Prefer HLS playlist when CDN hostname is configured — returns 200 in browser
  // (Bunny blocks Referer-less requests, but browser sends Origin/Referer: taped.in/localhost, so HLS is playable via HlsJsVideo).
  // Fall back to iframe embed only when CDN hostname is missing.
  if (!opts?.embed && cdnHostname) {
    return `https://${cdnHostname.replace(/^https?:\/\//, "")}/${videoGuid}/playlist.m3u8`;
  }

  // Fallback to iframe embed URL — works without CDN hostname and bypasses Referer block
  if (libraryId) {
    return `https://${cfg?.embedHostname || DEFAULT_EMBED_HOST}/embed/${libraryId}/${videoGuid}`;
  }

  // Last resort: return guid as-is (caller will prefix)
  return videoGuid;
}

export function getBunnyThumbnailUrl(
  videoGuid: string,
  cdnHostname?: string
): string | null {
  const cfg = (() => {
    try {
      return getBunnyConfig();
    } catch {
      return null;
    }
  })();

  const host = cdnHostname || cfg?.cdnHostname;
  if (!host) return null;
  // Bunny thumbnail endpoint: https://{cdnHostname}/{guid}/thumbnail.jpg  or preview.webp
  return `https://${host.replace(/^https?:\/\//, "")}/${videoGuid}/thumbnail.jpg`;
}

export function getBunnyIframeUrl(videoGuid: string, libraryId?: string, config?: BunnyConfig): string {
  const cfg = config || (() => {
    try { return getBunnyConfig(); } catch { return null as any; }
  })();
  const libId = libraryId || cfg?.libraryId;
  const host = cfg?.embedHostname || DEFAULT_EMBED_HOST;
  if (!libId) return `https://${host}/embed/unknown/${videoGuid}`;
  return `https://${host}/embed/${libId}/${videoGuid}`;
}

// ---------------------------------------------------------------------------
// Unified helpers used by routes
// ---------------------------------------------------------------------------

/**
 * High-level: prepare a Bunny video for upload.
 *  1) Ensure collection for org
 *  2) Create video in Bunny
 *  3) Return GUID + TUS credentials
 */
export async function prepareBunnyVideoForUpload(
  organizationId: string,
  title: string
): Promise<{
  videoGuid: string;
  collectionId: string;
  collectionName: string;
  tus: BunnyTusCredentials;
  libraryId: string;
}> {
  const { collectionId, collectionName } = await ensureBunnyCollectionForOrg(organizationId);
  const bunnyVideo = await createBunnyVideo({ title, collectionId });
  const cfg = getBunnyConfig();
  const tus = createBunnyTusCredentials(bunnyVideo.guid, 86400, cfg);

  console.log(`[Bunny] Prepared video for org ${organizationId}: guid=${bunnyVideo.guid}, collection=${collectionId}`);

  return {
    videoGuid: bunnyVideo.guid,
    collectionId,
    collectionName,
    tus,
    libraryId: cfg.libraryId,
  };
}
