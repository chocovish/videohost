"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Paintbrush,
  Sparkles,
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
} from "lucide-react";
import SharedContentClient, { SharePageConfigData, SharedData } from "@/app/share/[token]/shared-content-client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const THEME_PRESETS = [
  { id: "obsidian", name: "Obsidian Dark", primary: "#84cc16", bg: "#030712", card: "#0f172a" },
  { id: "cyberpunk", name: "Neon Cyberpunk", primary: "#06b6d4", bg: "#070312", card: "#0f0724" },
  { id: "vaporwave", name: "Vaporwave Glow", primary: "#ec4899", bg: "#0f041c", card: "#1d0836" },
  { id: "gold", name: "Luxury Gold", primary: "#eab308", bg: "#0c0a09", card: "#1c1917" },
  { id: "ocean", name: "Ocean Breeze", primary: "#38bdf8", bg: "#021124", card: "#072449" },
  { id: "sunset", name: "Sunset Passion", primary: "#f97316", bg: "#17050b", card: "#2d0d17" },
  { id: "minimal-light", name: "Minimal Light", primary: "#2563eb", bg: "#f8fafc", card: "#ffffff" },
];

const QUICK_ACCENTS = ["#84cc16", "#06b6d4", "#ec4899", "#eab308", "#38bdf8", "#f97316", "#a855f7", "#ef4444"];

const DEFAULT_CONFIG: SharePageConfigData = {
  themePreset: "obsidian",
  accentColor: "#84cc16",
  backgroundStyle: "mesh-gradient",
  cardRoundness: "3xl",
  customTitle: "",
  welcomeTagline: "",
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

export default function CustomizeSharePage() {
  const [config, setConfig] = useState<SharePageConfigData>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"theme" | "branding" | "cta" | "display">("theme");

  const [orgData, setOrgData] = useState<{
    name: string;
    logoUrl?: string | null;
    coverUrl?: string | null;
    slug: string;
  }>({
    name: "My Organization",
    logoUrl: null,
    coverUrl: null,
    slug: "my-org",
  });

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
          setConfig((prev) => ({
            ...prev,
            ...data.config,
          }));
        }
      }

      if (resOrg.ok) {
        const orgJson = await resOrg.json();
        if (orgJson.organization) {
          setOrgData({
            name: orgJson.organization.name || "My Organization",
            logoUrl: orgJson.organization.logoUrl || null,
            coverUrl: orgJson.organization.coverUrl || null,
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

  const handleSave = async () => {
    try {
      setSaving(true);
      setSavedSuccess(false);

      const res = await fetch("/api/organization/share-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig((prev) => ({
            ...prev,
            ...data.config,
          }));
        }

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
      coverUrl: orgData.coverUrl,
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
            Personalize the look, custom logo, welcome banner, call-to-action, and interactive elements of your shared video pages.
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
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-border overflow-x-auto gap-1">
            <button
              onClick={() => setActiveTab("theme")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "theme"
                  ? "bg-white dark:bg-slate-950 text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Theme</span>
            </button>
            <button
              onClick={() => setActiveTab("branding")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "branding"
                  ? "bg-white dark:bg-slate-950 text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Branding</span>
            </button>
            <button
              onClick={() => setActiveTab("cta")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "cta"
                  ? "bg-white dark:bg-slate-950 text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>CTA Button</span>
            </button>
            <button
              onClick={() => setActiveTab("display")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "display"
                  ? "bg-white dark:bg-slate-950 text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Social</span>
            </button>
          </div>

          {/* TAB 1: Theme & Styling */}
          {activeTab === "theme" && (
            <div className="space-y-6 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-border shadow-2xs">
              <div className="space-y-3">
                <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground block">
                  Theme Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {THEME_PRESETS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          themePreset: t.id,
                          accentColor: t.primary,
                        }))
                      }
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-2 cursor-pointer ${
                        config.themePreset === t.id
                          ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                          : "border-border hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: t.primary }} />
                        <span className="w-3 h-3 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: t.card }} />
                        <span className="w-3 h-3 rounded-full shrink-0 border border-slate-300 dark:border-slate-700" style={{ backgroundColor: t.bg }} />
                      </div>
                      <span className="text-xs font-bold text-foreground truncate">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-border">
                <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground block">
                  Custom Primary Accent Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config.accentColor || "#84cc16"}
                    onChange={(e) => setConfig((prev) => ({ ...prev, accentColor: e.target.value }))}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-border p-1 bg-transparent"
                  />
                  <input
                    type="text"
                    value={config.accentColor || "#84cc16"}
                    onChange={(e) => setConfig((prev) => ({ ...prev, accentColor: e.target.value }))}
                    placeholder="#84cc16"
                    className="flex-1 px-3 py-2 text-xs font-mono font-bold rounded-xl border border-border bg-slate-50 dark:bg-slate-950 text-foreground"
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {QUICK_ACCENTS.map((hex) => (
                    <button
                      key={hex}
                      onClick={() => setConfig((prev) => ({ ...prev, accentColor: hex }))}
                      className="w-6 h-6 rounded-full border border-white/20 transition-transform hover:scale-110 cursor-pointer shadow-2xs"
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                </div>
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
                    <SelectItem value="mesh-gradient">Mesh Gradient (Animated Glow Bulbs)</SelectItem>
                    <SelectItem value="obsidian-aura">Obsidian Spotlight Aura</SelectItem>
                    <SelectItem value="neon-grid">Neon Dot Grid Overlay</SelectItem>
                    <SelectItem value="glassmorphism">Glassmorphism Frosted Backdrop</SelectItem>
                    <SelectItem value="minimal-solid">Minimalist Clean Solid</SelectItem>
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
                    <button
                      key={r.id}
                      onClick={() => setConfig((prev) => ({ ...prev, cardRoundness: r.id }))}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        config.cardRoundness === r.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Header & Branding */}
          {activeTab === "branding" && (
            <div className="space-y-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-border shadow-2xs">
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground block">
                  Custom Page Header Title
                </label>
                <input
                  type="text"
                  value={config.customTitle || ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, customTitle: e.target.value }))}
                  placeholder="e.g. Acme Media Showcase (Leave empty to use Organization name)"
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-border bg-slate-50 dark:bg-slate-950 text-foreground"
                />
              </div>

              {/* Organization Level Unified Branding Card */}
              <div className="space-y-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-primary" /> Organization Branding & Assets
                    </label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Managed globally in Organization Settings
                    </p>
                  </div>
                  <Link
                    href="/dashboard/settings"
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all border border-primary/20"
                  >
                    <span>Org Settings</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-4">
                  {/* Current Active Assets Preview Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* Logo (1:1) */}
                    <div className="sm:col-span-4 flex items-center gap-2.5 p-2.5 rounded-xl bg-card border border-border">
                      <div className="w-10 h-10 rounded-lg border border-border bg-slate-900 overflow-hidden flex items-center justify-center shrink-0">
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
                        <span className="text-[11px] font-bold text-foreground block truncate">Logo</span>
                        <span className="text-[10px] text-muted-foreground">1:1 Square</span>
                      </div>
                    </div>

                    {/* Cover Banner (3:1) */}
                    <div className="sm:col-span-8 flex items-center gap-2.5 p-2.5 rounded-xl bg-card border border-border">
                      <div className="w-20 h-10 rounded-lg border border-border bg-slate-900 overflow-hidden flex items-center justify-center shrink-0">
                        {orgData.coverUrl ? (
                          <img
                            src={orgData.coverUrl}
                            alt="Org Cover"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-muted-foreground opacity-50" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-foreground block truncate">Cover Photo</span>
                        <span className="text-[10px] text-muted-foreground">Header Banner</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-muted-foreground flex items-start gap-1.5 leading-relaxed">
                    <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>
                      Logo and cover banner uploads have been centralized to <strong>Organization Settings</strong> to ensure consistent branding across your share links, video embeds, and offerings catalog.
                    </span>
                  </div>

                  <Link
                    href="/dashboard/settings"
                    className="w-full py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 border border-primary/20"
                  >
                    <span>Upload or Change Logo & Cover in Org Settings</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Welcome Subtitle & Font Size Slider */}
              <div className="space-y-3 pt-3 border-t border-border">
                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground block">
                    Welcome Banner Subtitle / Tagline Text
                  </label>
                  <input
                    type="text"
                    value={config.welcomeTagline || ""}
                    onChange={(e) => setConfig((prev) => ({ ...prev, welcomeTagline: e.target.value }))}
                    placeholder="e.g. Watch our official video demos and feature announcements"
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-border bg-slate-50 dark:bg-slate-950 text-foreground"
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
                  <div className="flex justify-between text-[10px] text-muted-foreground font-semibold px-0.5">
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
            <div className="space-y-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-border shadow-2xs">
              {/* Switch for CTA */}
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <span className="text-xs font-black text-foreground block">Enable Call-to-Action Card</span>
                  <span className="text-[11px] text-muted-foreground">Prompt viewers with a direct link or booking button</span>
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
                    <input
                      type="text"
                      value={config.ctaText || ""}
                      onChange={(e) => setConfig((prev) => ({ ...prev, ctaText: e.target.value }))}
                      placeholder="e.g. Schedule a Live Demo"
                      className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-border bg-slate-50 dark:bg-slate-950 text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground block">
                      CTA Destination URL
                    </label>
                    <input
                      type="url"
                      value={config.ctaUrl || ""}
                      onChange={(e) => setConfig((prev) => ({ ...prev, ctaUrl: e.target.value }))}
                      placeholder="https://example.com/calendar"
                      className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-border bg-slate-50 dark:bg-slate-950 text-foreground"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 4: Social & Display Options */}
          {activeTab === "display" && (
            <div className="space-y-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-border shadow-2xs">
              {/* Switch for Copy Link Button */}
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <span className="text-xs font-bold text-foreground block">Show Copy Link Button</span>
                  <span className="text-[11px] text-muted-foreground font-medium">Quick copy share button in header</span>
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
                  <span className="text-[11px] text-muted-foreground font-medium">Quick buttons for Twitter/X, LinkedIn, WhatsApp & Email</span>
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
                  <span className="text-[11px] text-muted-foreground font-medium">Display duration runtime chip on video details</span>
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
                <input
                  type="text"
                  value={config.footerText || ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, footerText: e.target.value }))}
                  placeholder="e.g. © 2026 Acme Corp. All rights reserved."
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-border bg-slate-50 dark:bg-slate-950 text-foreground"
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
            <span className="text-[11px] text-muted-foreground font-semibold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-border">
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
    </div>
  );
}
