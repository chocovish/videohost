export interface RenditionConfig {
  resolution: string;
  width: number;
  height: number;
  bitrateKbps: number;
}

export const STANDARD_RENDITION_LADDER: Record<string, RenditionConfig> = {
  "360": { resolution: "360p", width: 640, height: 360, bitrateKbps: 800 },
  "360p": { resolution: "360p", width: 640, height: 360, bitrateKbps: 800 },
  "480": { resolution: "480p", width: 854, height: 480, bitrateKbps: 1000 },
  "480p": { resolution: "480p", width: 854, height: 480, bitrateKbps: 1000 },
  "720": { resolution: "720p", width: 1280, height: 720, bitrateKbps: 3000 },
  "720p": { resolution: "720p", width: 1280, height: 720, bitrateKbps: 3000 },
  "1080": { resolution: "1080p", width: 1920, height: 1080, bitrateKbps: 5500 },
  "1080p": { resolution: "1080p", width: 1920, height: 1080, bitrateKbps: 5500 },
  "1440": { resolution: "1440p", width: 2560, height: 1440, bitrateKbps: 9000 },
  "1440p": { resolution: "1440p", width: 2560, height: 1440, bitrateKbps: 9000 },
  "2160": { resolution: "4k", width: 3840, height: 2160, bitrateKbps: 18000 },
  "2160p": { resolution: "4k", width: 3840, height: 2160, bitrateKbps: 18000 },
  "4k": { resolution: "4k", width: 3840, height: 2160, bitrateKbps: 18000 },
};

export const DEFAULT_HLS_RESOLUTIONS_ENV = "480,720,1080,1440,2160";

export function bitrateForHeight(height: number): number {
  if (height <= 360) return 800;
  if (height <= 480) return 1000;
  if (height <= 720) return 3000;
  if (height <= 1080) return 5500;
  if (height <= 1440) return 9000;
  return 18000;
}

export function parseMaxHeight(maxResolution?: string | null): number | null {
  if (!maxResolution) return null;
  const token = String(maxResolution).trim().toLowerCase();
  if (token === "4k" || token === "2160" || token === "2160p") return 2160;
  const numMatch = token.match(/^(\d+)/);
  if (numMatch) {
    const h = parseInt(numMatch[1], 10);
    if (Number.isFinite(h) && h > 0) return h;
  }
  return null;
}

/**
 * Plan-capped max output height.
 * Free/Basic cap at 1080p; Pro/Enterprise allow up to 4K.
 * Respects a custom Plan.maxResolution when present.
 */
export function getPlanMaxHeight(planName?: string | null, planMaxResolution?: string | null): number {
  const custom = parseMaxHeight(planMaxResolution);
  if (custom !== null) return custom;
  const plan = (planName || "free").toLowerCase();
  if (plan === "pro" || plan === "enterprise") return 2160;
  return 1080;
}

export function allowsMultiQuality(planName?: string | null): boolean {
  const plan = (planName || "free").toLowerCase();
  return plan === "pro" || plan === "enterprise";
}

export function filterRenditionsByMaxHeight(renditions: RenditionConfig[], maxHeight: number): RenditionConfig[] {
  return [...renditions].sort((a, b) => a.height - b.height).filter((r) => r.height <= maxHeight);
}

export function getSingleHighestRendition(renditions: RenditionConfig[], maxHeight: number): RenditionConfig[] {
  const capped = filterRenditionsByMaxHeight(renditions, maxHeight);
  if (capped.length === 0) {
    const sorted = [...renditions].sort((a, b) => a.height - b.height);
    if (sorted.length === 0) {
      const h = maxHeight > 0 ? maxHeight : 1080;
      const w = h % 2 === 0 ? h : h + 1;
      return [{ resolution: `${h}p`, width: w, height: h, bitrateKbps: bitrateForHeight(h) }];
    }
    return [sorted[sorted.length - 1]];
  }
  return [capped[capped.length - 1]];
}

/**
 * Builds the job renditions list based on plan + multi-quality toggle.
 * - Multi (pro+ with toggle ON): every ladder rung at or below the plan cap.
 *   The worker further caps by source height (no upscaling, no extra native rung).
 * - Single (toggle OFF or free/basic): only the single highest rung at or below the plan cap.
 *   The worker renders that rung or lower when the source is smaller (never upscales).
 */
export function getRenditionsForJob(options: {
  allRenditions: RenditionConfig[];
  planName?: string | null;
  planMaxResolution?: string | null;
  wantsMulti?: boolean;
}): RenditionConfig[] {
  const { allRenditions, planName, planMaxResolution, wantsMulti } = options;
  const maxHeight = getPlanMaxHeight(planName, planMaxResolution);
  if (wantsMulti && allowsMultiQuality(planName)) {
    const multi = filterRenditionsByMaxHeight(allRenditions, maxHeight);
    if (multi.length > 0) return multi;
    return getSingleHighestRendition(allRenditions, maxHeight);
  }
  return getSingleHighestRendition(allRenditions, maxHeight);
}

export function parseRenditionResolutions(envResolutions?: string): RenditionConfig[] {
  const rawEnv = envResolutions || process.env.RENDITION_RESOLUTIONS || process.env.HLS_RENDITION_RESOLUTIONS || DEFAULT_HLS_RESOLUTIONS_ENV;
  const tokens = rawEnv
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const renditions: RenditionConfig[] = [];

  for (const token of tokens) {
    if (STANDARD_RENDITION_LADDER[token]) {
      renditions.push(STANDARD_RENDITION_LADDER[token]);
    } else {
      const numMatch = token.match(/^(\d+)/);
      if (numMatch) {
        const height = parseInt(numMatch[1], 10);
        let width = Math.round((height * 16) / 9);
        if (width % 2 !== 0) width += 1;

        let bitrateKbps = 1500;
        if (height <= 360) bitrateKbps = 800;
        else if (height <= 480) bitrateKbps = 1000;
        else if (height <= 720) bitrateKbps = 3000;
        else if (height <= 1080) bitrateKbps = 5500;
        else if (height <= 1440) bitrateKbps = 9000;
        else bitrateKbps = 18000;

        renditions.push({
          resolution: `${height}p`,
          width,
          height,
          bitrateKbps,
        });
      }
    }
  }

  if (renditions.length === 0) {
    return [
      STANDARD_RENDITION_LADDER["480p"],
      STANDARD_RENDITION_LADDER["720p"],
      STANDARD_RENDITION_LADDER["1080p"],
      STANDARD_RENDITION_LADDER["1440p"],
      STANDARD_RENDITION_LADDER["4k"],
    ];
  }

  return renditions;
}
