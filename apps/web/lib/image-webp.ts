/**
 * Shared client-side image export helper.
 * Every cropped/uploaded image in the app (org logo/cover, share-page banner
 * header, offerings avatar/banner/covers) goes through the cropper, so
 * converting to WebP here guarantees smaller uploads everywhere with a
 * single code path.
 */

export const WEBP_EXPORT_QUALITY = 0.82;

/**
 * Export a canvas to a `data:image/webp` URL at the given quality.
 * Falls back to PNG on browsers without WebP canvas support.
 */
export function canvasToWebPDataUrl(
  canvas: HTMLCanvasElement,
  quality: number = WEBP_EXPORT_QUALITY
): string {
  try {
    const webp = canvas.toDataURL("image/webp", quality);
    if (webp && webp.startsWith("data:image/webp")) {
      return webp;
    }
  } catch {
    // ignore and fall through to PNG
  }
  return canvas.toDataURL("image/png");
}

/**
 * Detect whether a base64 data URL is already WebP.
 */
export function isWebPDataUrl(dataUrl?: string | null): boolean {
  return Boolean(dataUrl?.startsWith("data:image/webp"));
}

/**
 * Shared banner-link normalizer (client-safe: no Node-only imports).
 * Used by the customize-share-page form (validation) and the share-config
 * API (sanitize before persist) so both sides agree on one code path.
 *
 * Returns a safe absolute http(s) URL, or null when empty/unsafe/invalid.
 * A missing scheme is treated as https (e.g. `acme.com/sale`).
 * Dangerous schemes (`javascript:`, `data:`, …) are rejected.
 */
export function normalizeBannerLink(raw?: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^(javascript|data|vbscript|file|blob):/i.test(trimmed)) return null;
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return withScheme;
  } catch {
    return null;
  }
}
