import sharp from "sharp";
import {
  deleteFileFromS3,
  uploadBufferToS3,
  getPresignedPlaybackUrl,
} from "@/lib/s3";

export interface ParsedBase64Image {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

/**
 * Parse a `data:image/...;base64,...` string into buffer + metadata.
 * Returns null when the input is not a valid base64 image data URL.
 * Shared by organization logo/cover, share-page banner/logo and offering covers
 * so validation stays consistent everywhere.
 */
export function parseBase64Image(
  dataString: string
): ParsedBase64Image | null {
  if (!dataString || typeof dataString !== "string") return null;
  const matches = dataString.match(
    /^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$/
  );
  if (!matches || matches.length !== 3) return null;

  const contentType = matches[1];
  const base64Data = matches[2];
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64Data, "base64");
  } catch {
    return null;
  }
  if (buffer.length === 0) return null;

  let extension = "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg"))
    extension = "jpg";
  else if (contentType.includes("svg")) extension = "svg";
  else if (contentType.includes("webp")) extension = "webp";
  else if (contentType.includes("gif")) extension = "gif";

  return { buffer, contentType, extension };
}

/**
 * Only plain S3 keys should ever be deleted from storage.
 * Absolute http(s) URLs, data URLs and root-relative paths are
 * passthrough values (legacy / external assets) and must be skipped.
 */
export function isDeletableS3Key(key?: string | null): boolean {
  if (!key || typeof key !== "string") return false;
  const trimmed = key.trim();
  if (!trimmed) return false;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("//")
  ) {
    return false;
  }
  return true;
}

/**
 * Safely delete a previously stored S3 object.
 * No-op for empty / external URLs so callers can use it unconditionally
 * for consistent cleanup when replacing or removing images.
 */
export async function deleteOldImage(key?: string | null): Promise<void> {
  if (!isDeletableS3Key(key)) return;
  await deleteFileFromS3(key as string);
}

// ---------------------------------------------------------------------------
// Shared resize / compress / WebP optimization.
// Every branding upload (org logo/cover, share-page banner header/logo,
// offerings avatar/banner/covers) funnels through `uploadBase64Image` below,
// so optimizing there guarantees consistent output everywhere with one code
// path. The client cropper also exports WebP to keep upload payloads small;
// the server re-optimizes as the source of truth.
// ---------------------------------------------------------------------------

export type BrandingImagePresetName =
  | "logo"
  | "avatar"
  | "organization-cover"
  | "banner-header"
  | "welcome-banner"
  | "offerings-banner"
  | "offering-cover"
  | "item-cover"
  | "generic";

interface BrandingImagePreset {
  maxWidth: number;
  maxHeight: number;
  quality: number;
}

const IMAGE_PRESETS: Record<BrandingImagePresetName, BrandingImagePreset> = {
  // 1:1 squares
  logo: { maxWidth: 512, maxHeight: 512, quality: 82 },
  avatar: { maxWidth: 512, maxHeight: 512, quality: 82 },
  // 3:1 org cover
  "organization-cover": { maxWidth: 1200, maxHeight: 400, quality: 80 },
  // 5:1 share-page banner header (2000x400)
  "banner-header": { maxWidth: 2000, maxHeight: 400, quality: 80 },
  "welcome-banner": { maxWidth: 2000, maxHeight: 400, quality: 80 },
  // Offerings hub banner (supports 3:1 or wide 16:9)
  "offerings-banner": { maxWidth: 1920, maxHeight: 640, quality: 80 },
  // 16:9 cards
  "offering-cover": { maxWidth: 1280, maxHeight: 720, quality: 80 },
  "item-cover": { maxWidth: 1280, maxHeight: 720, quality: 80 },
  // Fallback cap for unknown callers
  generic: { maxWidth: 1600, maxHeight: 1600, quality: 80 },
};

export function getImagePreset(
  name?: BrandingImagePresetName | null
): BrandingImagePreset {
  if (name && IMAGE_PRESETS[name]) return IMAGE_PRESETS[name];
  return IMAGE_PRESETS.generic;
}

/**
 * Resize (fit inside max bounds, never enlarge), compress and convert a
 * raster buffer to WebP. Returns the optimized buffer + metadata.
 * Falls back to the original buffer when sharp fails (e.g. corrupt input)
 * so uploads never break because of optimization.
 */
export async function optimizeImageToWebP(
  input: Buffer,
  presetName?: BrandingImagePresetName | null,
  qualityOverride?: number
): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
  const preset = getImagePreset(presetName);
  const quality = qualityOverride ?? preset.quality;
  try {
    const output = await sharp(input, { animated: true })
      .rotate()
      .resize({
        width: preset.maxWidth,
        height: preset.maxHeight,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality, effort: 4 })
      .toBuffer();
    return { buffer: output, contentType: "image/webp", extension: "webp" };
  } catch (err) {
    console.warn("[branding-image] sharp optimization failed, using original:", err);
    return { buffer: input, contentType: "image/png", extension: "png" };
  }
}

/**
 * Upload a base64 data-URL image to S3 under
 * `{folder}/{organizationId}/{prefix}-{timestamp}.webp`.
 * The image is always resized, compressed and converted to WebP (except
 * SVG vectors which pass through untouched) via the shared optimizer above.
 * Returns the new S3 key. Throws when the payload is invalid.
 */
export async function uploadBase64Image(opts: {
  organizationId: string;
  base64Data: string;
  folder: string;
  filenamePrefix: string;
  preset?: BrandingImagePresetName;
  quality?: number;
}): Promise<string> {
  const { organizationId, base64Data, folder, filenamePrefix, preset, quality } =
    opts;
  const parsed = parseBase64Image(base64Data);
  if (!parsed) {
    throw new Error(
      "Invalid image format. Please upload a valid PNG, JPG, WebP, GIF or SVG."
    );
  }

  // SVG vectors are already tiny — store as-is without rasterizing.
  if (parsed.extension === "svg" || parsed.contentType.includes("svg")) {
    const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
    const timestamp = Date.now();
    const key = `${cleanFolder}/${organizationId}/${filenamePrefix}-${timestamp}.svg`;
    await uploadBufferToS3(key, parsed.buffer, "image/svg+xml");
    return key;
  }

  const optimized = await optimizeImageToWebP(parsed.buffer, preset, quality);

  const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
  const timestamp = Date.now();
  const key = `${cleanFolder}/${organizationId}/${filenamePrefix}-${timestamp}.${optimized.extension}`;
  await uploadBufferToS3(key, optimized.buffer, optimized.contentType);
  return key;
}

/**
 * Replace helper: deletes the old S3 object (if any) then uploads the new
 * base64 image (resized/compressed/WebP). Guarantees stale banner/logo/cover
 * files never linger in storage when users upload a replacement.
 * Returns the new S3 key.
 */
export async function replaceS3Image(opts: {
  oldKey?: string | null;
  organizationId: string;
  base64Data: string;
  folder: string;
  filenamePrefix: string;
  preset?: BrandingImagePresetName;
  quality?: number;
}): Promise<string> {
  const {
    oldKey,
    organizationId,
    base64Data,
    folder,
    filenamePrefix,
    preset,
    quality,
  } = opts;
  await deleteOldImage(oldKey);
  return uploadBase64Image({
    organizationId,
    base64Data,
    folder,
    filenamePrefix,
    preset,
    quality,
  });
}

/**
 * Resolve an S3 key to a playable/signed URL.
 * Returns null for empty keys or signing failures so API routes
 * can share identical fallback behaviour.
 */
export async function resolveImageUrl(
  key?: string | null
): Promise<string | null> {
  if (!key) return null;
  try {
    const url = await getPresignedPlaybackUrl(key);
    return url || null;
  } catch (e) {
    console.error("Error signing image URL:", e);
    return null;
  }
}
