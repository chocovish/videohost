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
