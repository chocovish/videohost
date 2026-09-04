"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Paintbrush,
  Save,
  RotateCcw,
  Check,
  Loader2,
  Type,
  ExternalLink,
  Share2,
  Eye,
  Palette,
  Info,
  Building2,
  Image as ImageIcon,
  ArrowRight,
  Upload,
  Trash2,
  Crop,
  LayoutTemplate,
  Link2,
} from "lucide-react";
import SharedContentClient, { SharePageConfigData, SharedData } from "@/app/share/[token]/shared-content-client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import ImageCropperModal from "@/components/ImageCropperModal";
import { normalizeBannerLink } from "@/lib/image-webp";
import {
  SHARE_THEME_PRESETS,
  getPresetFontColors,
  getContrastTextColor,
} from "@/lib/share-theme";

const THEME_PRESETS = Object.values(SHARE_THEME_PRESETS).map((p) => ({
  id: p.id,
  name: p.name,
  primary: p.primary,
  bg: p.bg,
  card: p.card,
  heading: p.heading,
  body: p.body,
  muted: p.muted,
  icon: p.icon,
  onAccent: p.onAccent,
}));

const QUICK_ACCENTS = ["#84cc16", "#06b6d4", "#ec4899", "#eab308", "#38bdf8", "#f97316", "#a855f7", "#ef4444"];

const DEFAULT_FONT_COLORS = getPresetFontColors("obsidian");

const DEFAULT_CONFIG: SharePageConfigData = {
  themePreset: "obsidian",
  ...DEFAULT_FONT_COLORS,
  backgroundStyle: "mesh-gradient",
  cardRoundness: "3xl",
  customTitle: "",
  welcomeTagline: "",
  welcomeBannerLink: "",
  showLogo: true,
  showCta: false,
  ctaText: "Book a Demo",
  ctaUrl: "https://example.com/demo",
  ctaStyle: "gradient",
  showShareButton: false,
  showSocialBar: false,
  showDuration: true,
  autoPlayMuted: false,
  footerText: "",
};

const applyPalette = (
  prev: SharePageConfigData,
  presetId: string,
  keepCustomAccent = false
): SharePageConfigData => {
  const fonts = getPresetFontColors(presetId);
  return {
    ...prev,
    themePreset: presetId,
    // Picking a palette always saves the font/icon colours that palette wants.
    ...fonts,
    // Reset accent to the palette default unless caller explicitly keeps it.
    ...(keepCustomAccent ? {} : { accentColor: fonts.accentColor }),
  };
};

const withCustomAccent = (
  prev: SharePageConfigData,
  accent: string
): SharePageConfigData => ({
  ...prev,
  accentColor: accent,
  // Keep button text readable for any custom accent via luminance contrast.
  onAccentColor: /^#[0-9a-fA-F]{6}$/.test(accent.trim())
    ? getContrastTextColor(accent.trim())
    : prev.onAccentColor,
});

export default function CustomizeSharePage() {
  const [config, setConfig] = useState<SharePageConfigData>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"theme" | "branding" | "cta" | "display">("theme");

  const [orgData, setOrgData] = useState<{
    name: string;
    logoUrl?: string | null;
    slug: string;
  }>({
    name: "My Organization",
    logoUrl: null,
    slug: "my-org",
  });

  // Banner Header image state (stored as SharePageConfig.welcomeBannerKey).
  // Uses the shared branding-image helper on the API side so replaced/removed
  // banners are always deleted from storage.
  const [newBannerData, setNewBannerData] = useState<string | null>(null);
  const [removeBanner, setRemoveBanner] = useState(false);
  const [isBannerCropperOpen, setIsBannerCropperOpen] = useState(false);
  const [rawBannerImage, setRawBannerImage] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState("");
  const bannerFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const [resConfig, resOrg] = await Promise.all([
        fetch("/api/organization/share-config"),
        fetch("/api/organization"),
      ]);

      if (resConfig.ok) {
        const data = await resConfig.json();
        if (data.config) {
          const presetId = data.config.themePreset || "obsidian";
          const paletteFallback = getPresetFontColors(presetId);
          const withFallback = (v: unknown, fb: string) =>
            typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v.trim()) ? v : fb;
          setConfig((prev) => ({
            ...prev,
            ...data.config,
            accentColor: withFallback(data.config.accentColor, paletteFallback.accentColor),
            headingColor: withFallback(data.config.headingColor, paletteFallback.headingColor),
            bodyColor: withFallback(data.config.bodyColor, paletteFallback.bodyColor),
            mutedColor: withFallback(data.config.mutedColor, paletteFallback.mutedColor),
            iconColor: withFallback(data.config.iconColor, paletteFallback.iconColor),
            onAccentColor: withFallback(data.config.onAccentColor, paletteFallback.onAccentColor),
          }));
        }
        setNewBannerData(null);
        setRemoveBanner(false);
      }

      if (resOrg.ok) {
        const orgJson = await resOrg.json();
        if (orgJson.organization) {
          setOrgData({
            name: orgJson.organization.name || "My Organization",
            logoUrl: orgJson.organization.logoUrl || null,
            slug: orgJson.organization.slug || "my-org",
          });
        }
      }
    } catch (e) {
      console.error("Failed to load share config or organization data:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleBannerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setBannerError("Please select a valid image file (PNG, JPG, WebP)");
      setTimeout(() => setBannerError(""), 4000);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setBannerError("Banner image size must be under 10MB");
      setTimeout(() => setBannerError(""), 4000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setRawBannerImage(event.target.result as string);
        setIsBannerCropperOpen(true);
      }
    };
    reader.readAsDataURL(file);

    if (bannerFileInputRef.current) {
      bannerFileInputRef.current.value = "";
    }
  };

  const handleBannerCropComplete = (croppedBase64: string) => {
    setNewBannerData(croppedBase64);
    setRemoveBanner(false);
    setBannerError("");
    // Sync into config so the live preview updates instantly.
    setConfig((prev) => ({ ...prev, welcomeBannerUrl: croppedBase64 }));
    setIsBannerCropperOpen(false);
  };

  const handleRemoveBanner = () => {
    setNewBannerData(null);
    setRemoveBanner(true);
    setConfig((prev) => ({ ...prev, welcomeBannerUrl: null }));
  };

  const handleSave = async () => {
    // Validate the optional banner link before touching the network.
    const rawLink = (config.welcomeBannerLink || "").trim();
    if (rawLink && !normalizeBannerLink(rawLink)) {
      setBannerError("Please enter a valid banner link URL (e.g. https://example.com/sale).");
      return;
    }
    setBannerError("");
    try {
      setSaving(true);
      setSavedSuccess(false);

      // Strip resolved URLs (may hold local data-URL previews) — the API
      // only needs theme fields plus banner mutation flags. This avoids
      // sending the cropped base64 twice.
      const { welcomeBannerUrl, customLogoUrl, ...restConfig } = config;

      const res = await fetch("/api/organization/share-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...restConfig,
          newWelcomeBannerData: newBannerData,
          removeWelcomeBanner: removeBanner,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig((prev) => ({
            ...prev,
            ...data.config,
          }));
        }
        setNewBannerData(null);
        setRemoveBanner(false);

        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        alert("Failed to save customization. Please try again.");
      }
    } catch (e) {
      console.error("Failed to save share config:", e);
      alert("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const handleReset = () => {
    setIsResetConfirmOpen(true);
  };

  const handleExecuteReset = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/organization/share-config", {
        method: "DELETE",
      });

      if (res.ok) {
        setConfig(DEFAULT_CONFIG);
        setNewBannerData(null);
        setRemoveBanner(false);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
        setIsResetConfirmOpen(false);
      } else {
        alert("Failed to reset customization. Please try again.");
      }
    } catch (e) {
      console.error("Failed to reset share config:", e);
      alert("An error occurred while resetting.");
    } finally {
      setSaving(false);
    }
  };

  const previewData: SharedData = {
    type: "video",
    accessMode: "PUBLIC",
    organization: {
      name: orgData.name,
      logoUrl: orgData.logoUrl,
      slug: orgData.slug,
    },
    video: {
      id: "sample-preview-video",
      title: "Product Overview & Feature Showcase 2026",
      description: "Welcome to our live video share page preview! Customize your page settings on the left to see your custom themes, welcome banner, logo, CTA button, and social options update instantly.",
      status: "READY",
      durationSeconds: 148,
      thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
      playbackUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      createdAt: new Date().toISOString(),
    },
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm font-semibold text-muted-foreground">Loading customization options...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Paintbrush className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Customize share page
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Personalize the look, custom logo, banner header, call-to-action, and interactive elements of your shared video pages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            className="text-xs font-semibold gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="font-bold text-xs gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving to Bucket...</span>
              </>
            ) : savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved & Uploaded!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Customization</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Split Layout: Controls Left, Live Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Controls Section (Left Column) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Navigation Tabs */}
          <div className="flex items-center p-1 bg-muted rounded-2xl border border-border overflow-x-auto gap-1">
            <Button
              type="button"
              variant={activeTab === "theme" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("theme")}
              className="flex-1 rounded-xl text-xs font-bold gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Theme</span>
            </Button>
            <Button
              type="button"
              variant={activeTab === "branding" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("branding")}
              className="flex-1 rounded-xl text-xs font-bold gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Type className="w-3.5 h-3.5" />
              <span>Branding</span>
            </Button>
            <Button
              type="button"
              variant={activeTab === "cta" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("cta")}
              className="flex-1 rounded-xl text-xs font-bold gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>CTA Button</span>
            </Button>
            <Button
              type="button"
              variant={activeTab === "display" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("display")}
              className="flex-1 rounded-xl text-xs font-bold gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Social</span>
            </Button>
          </div>

          {/* TAB 1: Theme & Styling */}
          {activeTab === "theme" && (
            <div className="space-y-6 bg-card p-5 rounded-2xl border border-border shadow-xs">
              <div className="space-y-3">
                <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground block">
                  Theme Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {THEME_PRESETS.map((t) => (
                    <Button
                      key={t.id}
                      type="button"
                      variant="outline"
                      onClick={() => setConfig((prev) => applyPalette(prev, t.id))}
                      className={`h-auto w-full p-3 rounded-xl border text-left flex-col items-stretch gap-2 cursor-pointer ${
                        config.themePreset === t.id
                          ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                          : "bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: t.primary }} />
                        <span className="w-3 h-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: t.card }} />
                        <span className="w-3 h-3 rounded-full shrink-0 border border-border" style={{ backgroundColor: t.bg }} />
                        <span className="w-3 h-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: t.heading }} title="Heading text" />
                        <span className="w-3 h-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: t.muted }} title="Muted text" />
                      </div>
                      <span className="text-xs font-bold text-foreground truncate">{t.name}</span>
                      <span className="text-[10px] font-semibold text-muted-foreground truncate">
                        Aa <span style={{ color: t.heading }}>Hd</span>{" "}
                        <span style={{ color: t.body }}>Bd</span>{" "}
                        <span style={{ color: t.muted }}>Mt</span>
                      </span>
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Picking a palette saves its matching heading, body, muted, icon and
                  button-text colours so titles like the playlist header and
                  “Playlist Queue” stay readable on every background.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-border">
                <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground block">
                  Custom Primary Accent Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config.accentColor || "#84cc16"}
                    onChange={(e) => setConfig((prev) => withCustomAccent(prev, e.target.value))}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-border p-1 bg-transparent"
                  />
                  <Input
                    type="text"
                    value={config.accentColor || "#84cc16"}
                    onChange={(e) => setConfig((prev) => withCustomAccent(prev, e.target.value))}
                    placeholder="#84cc16"
                    className="flex-1 font-mono font-bold text-xs"
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {QUICK_ACCENTS.map((hex) => (
                    <Button
                      key={hex}
                      type="button"
                      size="icon-xs"
                      onClick={() => setConfig((prev) => withCustomAccent(prev, hex))}
                      className="rounded-full border-border/60 transition-transform hover:scale-110 cursor-pointer shadow-xs"
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground block">
                    Text & Icon Colours (Auto from Palette)
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => setConfig((prev) => applyPalette(prev, prev.themePreset || "obsidian", true))}
                    className="text-xs font-bold cursor-pointer"
                    title="Reset text colours to the selected palette defaults"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset to palette</span>
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: "headingColor", label: "Headings / Titles", fallback: "#0f172a" },
                    { key: "bodyColor", label: "Body / Descriptions", fallback: "#475569" },
                    { key: "mutedColor", label: "Muted labels / Queue meta", fallback: "#64748b" },
                    { key: "iconColor", label: "Neutral icons", fallback: "#64748b" },
                    { key: "onAccentColor", label: "Text on accent button", fallback: "#ffffff" },
                  ].map((row) => (
                    <div key={row.key} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border">
                      <input
                        type="color"
                        value={(config as any)[row.key] || row.fallback}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, [row.key]: e.target.value }))
                        }
                        className="w-9 h-9 rounded-lg cursor-pointer border border-border p-0.5 bg-transparent shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground truncate">{row.label}</p>
                        <p className="text-[11px] font-mono text-muted-foreground truncate">
                          {(config as any)[row.key] || row.fallback}
                        </p>
                      </div>
                      <span
                        className="text-sm font-black px-2 py-1 rounded-md border border-border shrink-0"
                        style={{
                          backgroundColor: row.key === "onAccentColor" ? config.accentColor : undefined,
                          color:
                            row.key === "onAccentColor"
                              ? (config as any)[row.key] || row.fallback
                              : (config as any)[row.key] || row.fallback,
                        }}
                        title="Preview"
                      >
                        Aa
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  These are saved with your palette and used instead of hard-coded
                  colours on video, playlist and meeting-pass share pages.
                </p>
              </div>

              {/* Shadcn Select for Background Visual Style */}
              <div className="space-y-3 pt-4 border-t border-border">
                <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground block">
                  Background Visual Style
                </label>
                <Select
                  value={config.backgroundStyle || "mesh-gradient"}
                  onValueChange={(val) => setConfig((prev) => ({ ...prev, backgroundStyle: val || undefined }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select background style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mesh-gradient">Soft Gradient Wash (Subtle)</SelectItem>
                    <SelectItem value="obsidian-aura">Spotlight Wash (Subtle)</SelectItem>
                    <SelectItem value="neon-grid">Dot Grid Overlay</SelectItem>
                    <SelectItem value="glassmorphism">Soft Top Wash</SelectItem>
                    <SelectItem value="minimal-solid">Clean Solid (No Effects)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 pt-4 border-t border-border">
                <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground block">
                  Card & Player Shape Roundness
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "square", label: "Square" },
                    { id: "xl", label: "Curved" },
                    { id: "3xl", label: "Round 3XL" },
                    { id: "pill", label: "Pill Shape" },
                  ].map((r) => (
                    <Button
                      key={r.id}
                      type="button"
                      variant={config.cardRoundness === r.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setConfig((prev) => ({ ...prev, cardRoundness: r.id }))}
                      className={`rounded-xl text-xs font-bold text-center cursor-pointer ${
                        config.cardRoundness === r.id ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {r.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Header & Branding */}
          {activeTab === "branding" && (
            <div className="space-y-5 bg-card p-5 rounded-2xl border border-border shadow-xs">
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground block">
                  Custom Page Header Title
                </label>
                <Input
                  type="text"
                  value={config.customTitle || ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, customTitle: e.target.value }))}
                  placeholder="e.g. Acme Media Showcase (Leave empty to use Organization name)"
                />
              </div>

              {/* Organization Level Unified Branding Card (logo only) */}
              <div className="space-y-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-primary" /> Organization Branding & Assets
                    </label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Managed globally in Organization Settings
                    </p>
                  </div>
                  <Link
                    href="/dashboard/settings"
                    className={buttonVariants({ variant: "outline", size: "xs" }) + " font-bold cursor-pointer"}
                  >
                    <span>Org Settings</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-4">
                  {/* Current Active Logo Preview */}
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-card border border-border">
                    <div className="w-10 h-10 rounded-lg border border-border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                      {orgData.logoUrl ? (
                        <img
                          src={orgData.logoUrl}
                          alt="Org Logo"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-extrabold text-xs text-primary">
                          {orgData.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-foreground block truncate">Logo</span>
                      <span className="text-xs text-muted-foreground">1:1 Square</span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground flex items-start gap-1.5 leading-relaxed">
                    <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>
                      Logo uploads have been centralized to <strong>Organization Settings</strong> to ensure consistent branding across your share links, video embeds, and offerings catalog.
                    </span>
                  </div>

                  <Link
                    href="/dashboard/settings"
                    className={buttonVariants({ variant: "outline", size: "sm" }) + " w-full font-bold cursor-pointer"}
                  >
                    <span>Upload or Change Logo in Org Settings</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Banner Header — custom share-page banner (reuses ImageCropperModal 5:1 flow) */}
              <div className="space-y-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <LayoutTemplate className="w-4 h-4 text-primary" /> Banner Header
                    </label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Custom banner shown at the top of your share pages
                    </p>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground font-semibold">
                    5:1 Banner
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
                  <div className="flex flex-col items-center justify-center p-3 bg-card border border-border rounded-2xl space-y-3">
                    <div className="relative group w-full aspect-[5/1] rounded-2xl border border-border bg-muted shadow-xs overflow-hidden flex items-center justify-center">
                      {config.welcomeBannerUrl ? (
                        <img
                          src={config.welcomeBannerUrl}
                          alt="Share page banner header"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-muted/50 text-muted-foreground space-y-2 p-4 text-center">
                          <ImageIcon className="w-8 h-8 opacity-40 text-primary" />
                          <span className="text-xs font-semibold text-muted-foreground">
                            No banner header uploaded yet (Optional)
                          </span>
                        </div>
                      )}

                      <div
                        onClick={() => bannerFileInputRef.current?.click()}
                        className="absolute inset-0 bg-background/80 text-foreground flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-xs"
                        title="Click to upload or crop banner header"
                      >
                        <Crop className="w-6 h-6 text-primary" />
                        <span className="text-xs font-bold">Change & Crop Banner Header</span>
                      </div>
                    </div>

                    <div className="w-full flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => bannerFileInputRef.current?.click()}
                          className="rounded-xl text-primary border-primary/30 hover:bg-primary hover:text-primary-foreground cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          {config.welcomeBannerUrl ? "Change Banner" : "Upload Banner"}
                        </Button>

                        {config.welcomeBannerUrl && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="xs"
                            onClick={handleRemoveBanner}
                            className="rounded-xl cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </Button>
                        )}
                      </div>

                      <span className="text-xs font-mono text-muted-foreground">
                        Recommended: 2000×400px (5:1)
                      </span>
                    </div>

                    <input
                      type="file"
                      ref={bannerFileInputRef}
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleBannerFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Optional click-through link — opens in a new tab */}
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-primary" /> Banner Link (Optional)
                    </label>
                    <Input
                      type="url"
                      value={config.welcomeBannerLink || ""}
                      onChange={(e) => {
                        setBannerError("");
                        setConfig((prev) => ({ ...prev, welcomeBannerLink: e.target.value }));
                      }}
                      placeholder="e.g. https://example.com/sale (opens in a new tab when the banner is clicked)"
                    />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      When set, clicking the banner on your share pages opens this link in a new tab.
                    </p>
                  </div>

                  {bannerError && (
                    <p className="text-xs font-semibold text-destructive">{bannerError}</p>
                  )}

                  <div className="text-xs text-muted-foreground flex items-start gap-1.5 leading-relaxed">
                    <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>
                      This banner header is displayed on your shared video pages instead of the organization cover photo. Replacing or removing it deletes the previous file from storage. Remember to <strong>Save Customization</strong> to apply changes.
                    </span>
                  </div>
                </div>
              </div>

              {/* Welcome Subtitle & Font Size Slider */}
              <div className="space-y-3 pt-3 border-t border-border">
                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground block">
                    Welcome Banner Subtitle / Tagline Text
                  </label>
                  <Input
                    type="text"
                    value={config.welcomeTagline || ""}
                    onChange={(e) => setConfig((prev) => ({ ...prev, welcomeTagline: e.target.value }))}
                    placeholder="e.g. Watch our official video demos and feature announcements"
                  />
                </div>

                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground block">
                      Subtitle Font Size
                    </label>
                    <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      {(() => {
                        const val = config.welcomeTaglineFontSize;
                        if (!val) return 24;
                        if (val === "sm") return 14;
                        if (val === "md") return 16;
                        if (val === "lg") return 18;
                        if (val === "xl") return 24;
                        if (val === "2xl") return 36;
                        const parsed = parseInt(val, 10);
                        return isNaN(parsed) ? 24 : parsed;
                      })()}px
                    </span>
                  </div>
                  <Slider
                    value={[
                      (() => {
                        const val = config.welcomeTaglineFontSize;
                        if (!val) return 24;
                        if (val === "sm") return 14;
                        if (val === "md") return 16;
                        if (val === "lg") return 18;
                        if (val === "xl") return 24;
                        if (val === "2xl") return 36;
                        const parsed = parseInt(val, 10);
                        return isNaN(parsed) ? 24 : parsed;
                      })(),
                    ]}
                    min={12}
                    max={48}
                    step={1}
                    onValueChange={(val) => {
                      const num = Array.isArray(val) ? val[0] : val;
                      setConfig((prev) => ({ ...prev, welcomeTaglineFontSize: String(num) }));
                    }}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground font-semibold px-0.5">
                    <span>12px (Small)</span>
                    <span>24px (Default)</span>
                    <span>48px (Large)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Call-To-Action (CTA) */}
          {activeTab === "cta" && (
            <div className="space-y-5 bg-card p-5 rounded-2xl border border-border shadow-xs">
              {/* Switch for CTA */}
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <span className="text-xs font-black text-foreground block">Enable Call-to-Action Card</span>
                  <span className="text-xs text-muted-foreground">Prompt viewers with a direct link or booking button</span>
                </div>
                <Switch
                  checked={config.showCta ?? false}
                  onCheckedChange={(val) => setConfig((prev) => ({ ...prev, showCta: val }))}
                />
              </div>

              {config.showCta && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground block">
                      CTA Button Text
                    </label>
                    <Input
                      type="text"
                      value={config.ctaText || ""}
                      onChange={(e) => setConfig((prev) => ({ ...prev, ctaText: e.target.value }))}
                      placeholder="e.g. Schedule a Live Demo"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground block">
                      CTA Destination URL
                    </label>
                    <Input
                      type="url"
                      value={config.ctaUrl || ""}
                      onChange={(e) => setConfig((prev) => ({ ...prev, ctaUrl: e.target.value }))}
                      placeholder="https://example.com/calendar"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 4: Social & Display Options */}
          {activeTab === "display" && (
            <div className="space-y-4 bg-card p-5 rounded-2xl border border-border shadow-xs">
              {/* Switch for Copy Link Button */}
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <span className="text-xs font-bold text-foreground block">Show Copy Link Button</span>
                  <span className="text-xs text-muted-foreground font-medium">Quick copy share button in header</span>
                </div>
                <Switch
                  checked={config.showShareButton ?? true}
                  onCheckedChange={(val) => setConfig((prev) => ({ ...prev, showShareButton: val }))}
                />
              </div>

              {/* Switch for Social Bar */}
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <span className="text-xs font-bold text-foreground block">Show Social Sharing Bar</span>
                  <span className="text-xs text-muted-foreground font-medium">Quick buttons for Twitter/X, LinkedIn, WhatsApp & Email</span>
                </div>
                <Switch
                  checked={config.showSocialBar ?? true}
                  onCheckedChange={(val) => setConfig((prev) => ({ ...prev, showSocialBar: val }))}
                />
              </div>

              {/* Switch for Duration Badge */}
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <span className="text-xs font-bold text-foreground block">Show Video Duration Badge</span>
                  <span className="text-xs text-muted-foreground font-medium">Display duration runtime chip on video details</span>
                </div>
                <Switch
                  checked={config.showDuration ?? true}
                  onCheckedChange={(val) => setConfig((prev) => ({ ...prev, showDuration: val }))}
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground block">
                  Custom Footer Copyright Text
                </label>
                <Input
                  type="text"
                  value={config.footerText || ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, footerText: e.target.value }))}
                  placeholder="e.g. © 2026 Acme Corp. All rights reserved."
                />
              </div>
            </div>
          )}
        </div>

        {/* Live Preview Container (Right Column) */}
        <div className="lg:col-span-7 space-y-3 sticky top-6">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              <Eye className="w-4 h-4 text-primary" />
              <span>Real-Time Live Preview</span>
            </div>
            <span className="text-xs text-muted-foreground font-semibold bg-muted px-2.5 py-1 rounded-full border border-border">
              Shared Video View
            </span>
          </div>

          <div className="border border-border rounded-2xl overflow-hidden shadow-2xl max-h-[750px] overflow-y-auto">
            <SharedContentClient overrideConfig={config} previewData={previewData} />
          </div>
        </div>
      </div>

      {/* Reset Customization Confirmation Dialog */}
      <ConfirmDialog
        open={isResetConfirmOpen}
        onOpenChange={setIsResetConfirmOpen}
        title="Reset Customization to Defaults?"
        description="Are you sure you want to reset all theme and layout settings to defaults?"
        variant="danger"
        confirmText="Reset to Defaults"
        cancelText="Cancel"
        isLoading={saving}
        onConfirm={handleExecuteReset}
      />

      {/* Banner Header Cropper (5:1) — reused from Organization Settings */}
      <ImageCropperModal
        isOpen={isBannerCropperOpen}
        onClose={() => setIsBannerCropperOpen(false)}
        imageSrc={rawBannerImage}
        onCropComplete={handleBannerCropComplete}
        aspectRatio="5:1"
        title="Crop Banner Header (5:1 Banner)"
        description="Position and zoom your share-page banner header (Recommended: 2000×400px 5:1 ratio)."
      />
    </div>
  );
}
