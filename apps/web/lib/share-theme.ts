/**
 * Central share-page theme resolver.
 *
 * Each colour palette (themePreset) explicitly declares which font / icon
 * colours it wants to use. The share page (video / playlist / meeting-pass /
 * folder) must use these values instead of hard-coded `text-slate-*` classes
 * so palettes like "Minimal Light" (white background) stay readable.
 *
 * The resolved colours are persisted on SharePageConfig
 * (headingColor / bodyColor / mutedColor / iconColor / onAccentColor) whenever
 * a palette is picked in customize-share-page. Explicitly saved values always
 * win over preset defaults, and preset defaults always win over legacy
 * hard-coded fallbacks — so old configs without the new columns keep working.
 */

export interface SharePaletteDefinition {
  id: string;
  name: string;
  /** Default accent saved when the palette is picked. */
  primary: string;
  /** Page background (used for the preview dots in customize page). */
  bg: string;
  /** Card background (used for the preview dots). */
  card: string;
  /** Main headings / titles. Must contrast with `bg` + `card`. */
  heading: string;
  /** Body copy / descriptions. */
  body: string;
  /** Secondary labels, counts, "Shared Playlist", "Playlist Queue" meta, icons like Search. */
  muted: string;
  /** Faint footer / tiny labels. */
  faint: string;
  /** Neutral icons (search, chevrons, empty-state illustrations). */
  icon: string;
  /** Text colour painted on top of a solid accent button. */
  onAccent: string;
  /** Dark "island" surfaces (ticket stub, paywall, player bar, checkout summary). */
  surface: string;
  surfaceBorder: string;
  surfaceText: string;
  surfaceMuted: string;
  isLight: boolean;
}

export const SHARE_THEME_PRESETS: Record<string, SharePaletteDefinition> = {
  obsidian: {
    id: "obsidian",
    name: "Obsidian Dark",
    primary: "#84cc16",
    bg: "#0a0a0b",
    card: "#131316",
    heading: "#fafafa",
    body: "#d4d4d8",
    muted: "#a1a1aa",
    faint: "#71717a",
    icon: "#a1a1aa",
    onAccent: "#09090b",
    surface: "#101013",
    surfaceBorder: "#27272a",
    surfaceText: "#fafafa",
    surfaceMuted: "#a1a1aa",
    isLight: false,
  },
  cyberpunk: {
    id: "cyberpunk",
    name: "Neon Cyberpunk",
    primary: "#06b6d4",
    bg: "#08060f",
    card: "#130724",
    heading: "#ecfeff",
    body: "#cbd5e1",
    muted: "#94a3b8",
    faint: "#64748b",
    icon: "#94a3b8",
    onAccent: "#082f3a",
    surface: "#0d0a18",
    surfaceBorder: "#2a2140",
    surfaceText: "#ecfeff",
    surfaceMuted: "#a5f3fc",
    isLight: false,
  },
  vaporwave: {
    id: "vaporwave",
    name: "Vaporwave Glow",
    primary: "#ec4899",
    bg: "#12061f",
    card: "#1d0836",
    heading: "#fdf4ff",
    body: "#e9d5ff",
    muted: "#c4b5fd",
    faint: "#8b7ab8",
    icon: "#c4b5fd",
    onAccent: "#ffffff",
    surface: "#190a2b",
    surfaceBorder: "#3b1d5e",
    surfaceText: "#fdf4ff",
    surfaceMuted: "#e9d5ff",
    isLight: false,
  },
  gold: {
    id: "gold",
    name: "Luxury Gold",
    primary: "#eab308",
    bg: "#0c0a09",
    card: "#1c1917",
    heading: "#fffbeb",
    body: "#e7e5e4",
    muted: "#a8a29e",
    faint: "#78716c",
    icon: "#a8a29e",
    onAccent: "#1c1005",
    surface: "#141110",
    surfaceBorder: "#3a322c",
    surfaceText: "#fffbeb",
    surfaceMuted: "#d6d3d1",
    isLight: false,
  },
  ocean: {
    id: "ocean",
    name: "Ocean Breeze",
    primary: "#38bdf8",
    bg: "#04121f",
    card: "#072449",
    heading: "#f0f9ff",
    body: "#bae6fd",
    muted: "#7dd3fc",
    faint: "#4d7fa3",
    icon: "#7dd3fc",
    onAccent: "#082f49",
    surface: "#071c30",
    surfaceBorder: "#16405f",
    surfaceText: "#f0f9ff",
    surfaceMuted: "#bae6fd",
    isLight: false,
  },
  sunset: {
    id: "sunset",
    name: "Sunset Passion",
    primary: "#f97316",
    bg: "#160609",
    card: "#2d0d17",
    heading: "#fff1f2",
    body: "#fecdd3",
    muted: "#fda4af",
    faint: "#9c6770",
    icon: "#fda4af",
    onAccent: "#ffffff",
    surface: "#200a10",
    surfaceBorder: "#4c1a26",
    surfaceText: "#fff1f2",
    surfaceMuted: "#fecdd3",
    isLight: false,
  },
  "minimal-light": {
    id: "minimal-light",
    name: "Minimal Light",
    primary: "#2563eb",
    bg: "#f8fafc",
    card: "#ffffff",
    heading: "#0f172a",
    body: "#475569",
    muted: "#64748b",
    faint: "#94a3b8",
    icon: "#64748b",
    onAccent: "#ffffff",
    surface: "#ffffff",
    surfaceBorder: "#e2e8f0",
    surfaceText: "#0f172a",
    surfaceMuted: "#475569",
    isLight: true,
  },
};

export interface SharePageColorConfig {
  themePreset?: string | null;
  accentColor?: string | null;
  headingColor?: string | null;
  bodyColor?: string | null;
  mutedColor?: string | null;
  iconColor?: string | null;
  onAccentColor?: string | null;
}

/** Backwards-compatible accent defaults per preset (mirrors legacy resolver). */
const LEGACY_DEFAULT_ACCENTS: Record<string, string> = {
  obsidian: "#e4e4e7",
  cyberpunk: "#22d3ee",
  vaporwave: "#f472b6",
  gold: "#fbbf24",
  ocean: "#38bdf8",
  sunset: "#fb923c",
  "minimal-light": "#2563eb",
};

function isValidHex(color?: string | null): color is string {
  if (!color || typeof color !== "string") return false;
  return /^#[0-9a-fA-F]{6}$/.test(color.trim());
}

/** Pick readable text (white vs near-black) for a solid background hex. */
export function getContrastTextColor(bgHex: string): "#ffffff" | "#09090b" {
  const hex = bgHex.replace("#", "");
  if (hex.length !== 6) return "#09090b";
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  // W3C-ish threshold: light backgrounds get dark text, dark get white.
  return luminance > 0.45 ? "#09090b" : "#ffffff";
}

export function getSharePreset(presetId?: string | null): SharePaletteDefinition {
  if (presetId && SHARE_THEME_PRESETS[presetId]) return SHARE_THEME_PRESETS[presetId];
  return SHARE_THEME_PRESETS.obsidian;
}

/** Colours a palette wants to save when the user picks it. */
export function getPresetFontColors(presetId?: string | null) {
  const preset = getSharePreset(presetId);
  return {
    accentColor: preset.primary,
    headingColor: preset.heading,
    bodyColor: preset.body,
    mutedColor: preset.muted,
    iconColor: preset.icon,
    onAccentColor: preset.onAccent,
  };
}

export interface ResolvedShareTheme {
  preset: SharePaletteDefinition;
  presetId: string;
  isLight: boolean;
  accentHex: string;
  onAccentHex: string;
  headingHex: string;
  bodyHex: string;
  mutedHex: string;
  faintHex: string;
  iconHex: string;
  surfaceHex: string;
  surfaceBorderHex: string;
  surfaceTextHex: string;
  surfaceMutedHex: string;
  // Tailwind helpers (kept for layout/borders that can't be inline styles)
  bgClass: string;
  cardBgClass: string;
  headerBgClass: string;
  strongText: string;
  mutedText: string;
  faintText: string;
  dividerBorder: string;
  softSurface: string;
}

export function resolveShareTheme(config?: SharePageColorConfig | null): ResolvedShareTheme {
  const presetId = config?.themePreset || "obsidian";
  const preset = getSharePreset(presetId);
  const isLight = preset.isLight;

  // Accent: explicit custom value wins; legacy "#84cc16" means "use preset default".
  // Mirrors the previous inline resolver so existing configs keep rendering identically.
  const rawAccent = config?.accentColor?.trim() || "";
  const rawIsDefault =
    !rawAccent || !isValidHex(rawAccent) || rawAccent.toLowerCase() === "#84cc16";
  const accentHex = rawIsDefault
    ? LEGACY_DEFAULT_ACCENTS[presetId] || preset.primary
    : rawAccent;

  // Font / icon colours: explicitly saved values win, otherwise palette defaults.
  // This is the core fix — never fall back to a hard-coded slate that clashes.
  const headingHex = isValidHex(config?.headingColor) ? config!.headingColor!.trim() : preset.heading;
  const bodyHex = isValidHex(config?.bodyColor) ? config!.bodyColor!.trim() : preset.body;
  const mutedHex = isValidHex(config?.mutedColor) ? config!.mutedColor!.trim() : preset.muted;
  const iconHex = isValidHex(config?.iconColor) ? config!.iconColor!.trim() : preset.icon;
  const faintHex = preset.faint;

  let onAccentHex = preset.onAccent;
  if (isValidHex(config?.onAccentColor)) {
    onAccentHex = config!.onAccentColor!.trim();
  } else if (rawIsDefault) {
    onAccentHex = preset.onAccent;
  } else {
    // Custom accent picker: derive readable button text from luminance.
    onAccentHex = getContrastTextColor(accentHex);
  }

  let bgClass = "bg-[#0a0a0b] text-zinc-100";
  let cardBgClass = "bg-white/[0.03] border-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.3)]";
  let headerBgClass = "bg-[#0a0a0b]/80 border-white/10";

  if (presetId === "cyberpunk") {
    bgClass = "bg-[#08060f] text-slate-100";
    headerBgClass = "bg-[#08060f]/80 border-white/10";
  } else if (presetId === "vaporwave") {
    bgClass = "bg-[#12061f] text-purple-50";
    headerBgClass = "bg-[#12061f]/80 border-white/10";
    cardBgClass = "bg-white/[0.04] border-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.3)]";
  } else if (presetId === "gold") {
    bgClass = "bg-[#0c0a09] text-stone-100";
    headerBgClass = "bg-[#0c0a09]/80 border-white/10";
  } else if (presetId === "ocean") {
    bgClass = "bg-[#04121f] text-sky-50";
    headerBgClass = "bg-[#04121f]/80 border-white/10";
  } else if (presetId === "sunset") {
    bgClass = "bg-[#160609] text-rose-50";
    headerBgClass = "bg-[#160609]/80 border-white/10";
  } else if (isLight) {
    bgClass = "bg-[#fafafa] text-slate-900";
    cardBgClass = "bg-white border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)]";
    headerBgClass = "bg-white/80 border-slate-200";
  }

  const mutedText = isLight ? "text-slate-500" : "text-zinc-400";
  const faintText = isLight ? "text-slate-400" : "text-zinc-500";
  const strongText = isLight ? "text-slate-900" : "text-white";
  const dividerBorder = isLight ? "border-slate-200" : "border-white/10";
  const softSurface = isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/10";

  return {
    preset,
    presetId,
    isLight,
    accentHex,
    onAccentHex,
    headingHex,
    bodyHex,
    mutedHex,
    faintHex,
    iconHex,
    surfaceHex: preset.surface,
    surfaceBorderHex: preset.surfaceBorder,
    surfaceTextHex: preset.surfaceText,
    surfaceMutedHex: preset.surfaceMuted,
    bgClass,
    cardBgClass,
    headerBgClass,
    strongText,
    mutedText,
    faintText,
    dividerBorder,
    softSurface,
  };
}
