/**
 * Shared types for the public share page (`/share/[token]`).
 *
 * Moved verbatim out of `shared-content-client.tsx` so every feature view
 * (video / playlist / folder / meeting) and every hook imports from one place.
 * `shared-content-client.tsx` re-exports these to preserve its public API.
 */

export interface SharePageConfigData {
  themePreset?: string;
  accentColor?: string;
  headingColor?: string | null;
  bodyColor?: string | null;
  mutedColor?: string | null;
  iconColor?: string | null;
  onAccentColor?: string | null;
  backgroundStyle?: string;
  cardRoundness?: string;
  customTitle?: string | null;
  welcomeTagline?: string | null;
  welcomeTaglineFontSize?: string | null;
  showLogo?: boolean;
  customLogoUrl?: string | null;
  welcomeBannerUrl?: string | null;
  welcomeBannerLink?: string | null;
  showCta?: boolean;
  ctaText?: string | null;
  ctaUrl?: string | null;
  ctaStyle?: string;
  showShareButton?: boolean;
  showSocialBar?: boolean;
  showDuration?: boolean;
  autoPlayMuted?: boolean;
  footerText?: string | null;
}

export interface SharedSubtitle {
  id: string;
  label: string;
  language: string;
  src: string;
  isDefault: boolean;
}

export interface SharedVideoItem {
  id: string;
  itemId?: string;
  order?: number;
  title: string;
  description?: string;
  status: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
  playbackUrl?: string;
  subtitles?: SharedSubtitle[];
  createdAt: string;
}

export interface CountryPrice {
  countryCode: string;
  countryName: string;
  amount: number;
  currency: string;
}

export interface SharedData {
  type: "video" | "folder" | "playlist" | "meeting";
  accessMode?: string;
  isPurchased?: boolean;
  isLoggedIn?: boolean;
  price?: number | null;
  currency?: string;
  countryPricing?: CountryPrice[];
  detectedCountryCode?: string;
  itemTitle?: string;
  joinUrl?: string;
  organization: {
    name: string;
    logoUrl?: string | null;
    /** @deprecated No longer rendered on share pages — banner header (welcomeBannerUrl) is used instead. Kept for API backwards-compat. */
    coverUrl?: string | null;
    slug: string;
  };
  sharePageConfig?: SharePageConfigData | null;
  parentFolder?: {
    id: string;
    name: string;
  } | null;
  meeting?: {
    id: string;
    title: string;
    description?: string | null;
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
    status: string;
    isInstant: boolean;
    recordOnStart: boolean;
    allowGuests?: boolean;
    createdAt: string;
    createdBy?: {
      name: string;
      image?: string | null;
    };
  };
  video?: {
    id: string;
    title: string;
    description?: string;
    status: string;
    durationSeconds?: number;
    thumbnailUrl?: string;
    playbackUrl?: string;
    subtitles?: SharedSubtitle[];
    createdAt: string;
  };
  playlist?: {
    id: string;
    title: string;
    description?: string;
    itemCount: number;
    totalDurationSeconds: number;
    thumbnailUrl?: string | null;
    createdAt: string;
  };
  rootFolder?: {
    id: string;
    name: string;
  };
  currentFolder?: {
    id: string;
    name: string;
    parentId?: string | null;
  };
  videos?: SharedVideoItem[];
  subfolders?: Array<{
    id: string;
    name: string;
  }>;
}

export interface SharedContentClientProps {
  overrideConfig?: SharePageConfigData;
  previewData?: SharedData;
}

/** Error payload returned by `GET /api/share/[token]`. */
export interface ShareErrorState {
  code: string;
  message?: string;
  userEmail?: string;
  organizationName?: string;
  itemTitle?: string;
  itemDescription?: string | null;
  type?: string;
}

/** Normalised price for the visitor's billing country. */
export interface PriceInfo {
  amount: number;
  currency: string;
  isFree: boolean;
  formatted: string;
}
