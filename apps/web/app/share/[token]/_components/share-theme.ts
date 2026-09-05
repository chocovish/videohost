import { resolveShareTheme, type ResolvedShareTheme } from "@/lib/share-theme";
import { getRoundnessClass, mergeShareConfig } from "./utils";
import type { SharePageConfigData, SharedData } from "./types";

/**
 * Fully-derived presentation model for the share page.
 * Views receive ONE `theme` prop instead of ~20 individual colour strings,
 * so adding a new palette token never changes a component signature.
 */
export interface ShareTheme extends ResolvedShareTheme {
  config: SharePageConfigData;
  roundnessClass: string;
  displayTitle: string;
  logoUrlToDisplay?: string | null;
  shareUrl: string;
  shareTitle: string;
}

const DEFAULT_CONFIG: SharePageConfigData = {
  themePreset: "obsidian",
  accentColor: "#84cc16",
  backgroundStyle: "mesh-gradient",
  cardRoundness: "3xl",
  showLogo: true,
  showCta: false,
  ctaText: "Schedule a Call",
  ctaUrl: "https://example.com",
  ctaStyle: "gradient",
  showShareButton: false,
  showSocialBar: false,
  showDuration: true,
  autoPlayMuted: false,
};

function buildShareTitle(data: SharedData, displayTitle: string): string {
  if (data.video?.title) return `${data.video.title} — ${displayTitle}`;
  if (data.playlist?.title) return `${data.playlist.title} (Playlist) — ${displayTitle}`;
  if (data.meeting?.title) return `${data.meeting.title} (Meeting) — ${displayTitle}`;
  return displayTitle;
}

/**
 * Merge DB + preview config and resolve every derived value
 * (palette, roundness, titles, share URLs) in one place.
 */
export function buildShareTheme(
  data: SharedData,
  overrideConfig?: SharePageConfigData
): ShareTheme {
  const config = mergeShareConfig<SharePageConfigData>(
    data.sharePageConfig,
    overrideConfig,
    DEFAULT_CONFIG
  );
  const resolved = resolveShareTheme(config);
  const displayTitle = config.customTitle || data.organization.name;
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  return {
    ...resolved,
    config,
    roundnessClass: getRoundnessClass(config.cardRoundness),
    displayTitle,
    logoUrlToDisplay: config.customLogoUrl || data.organization.logoUrl,
    shareUrl,
    shareTitle: buildShareTitle(data, displayTitle),
  };
}
