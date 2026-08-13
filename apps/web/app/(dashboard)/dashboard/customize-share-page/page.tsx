"use client";

import { useState, useEffect, useRef } from "react";
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
  Upload,
  Trash2,
  ImageIcon,
  Info,
} from "lucide-react";
import SharedContentClient, { SharePageConfigData, SharedData } from "@/app/share/[token]/shared-content-client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

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
  customLogoUrl: null,
  welcomeBannerUrl: null,
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

// Sample video item for the live preview editor
const SAMPLE_PREVIEW_DATA: SharedData = {
  type: "video",
  accessMode: "PUBLIC",
  organization: {
    name: "Acme Media Studio",
    logoUrl: null,
    slug: "acme-media",
  },
  video: {
    id: "sample-preview-video",
    title: "Product Overview & Feature Showcase 2026",
    description: "Welcome to our live video share page preview! Customize your page settings on the left to see your custom themes, uploaded welcome banner, logo, CTA button, and social options update instantly.",
    status: "READY",
    durationSeconds: 148,
    thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
    playbackUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    createdAt: new Date().toISOString(),
  },
};

export default function CustomizeSharePage() {
  const [config, setConfig] = useState<SharePageConfigData>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"theme" | "branding" | "cta" | "display">("theme");

  // Draft Image States (Base64 strings for deferred upload on Save)
  const [newCustomLogoData, setNewCustomLogoData] = useState<string | null>(null);
  const [removeCustomLogo, setRemoveCustomLogo] = useState(false);
  const [newWelcomeBannerData, setNewWelcomeBannerData] = useState<string | null>(null);
  const [removeWelcomeBanner, setRemoveWelcomeBanner] = useState(false);

  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const welcomeBannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/organization/share-config");
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig((prev) => ({
            ...prev,
            ...data.config,
          }));
        }
      }
    } catch (e) {
      console.error("Failed to load share config:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Logo image size must be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setNewCustomLogoData(result);
      setRemoveCustomLogo(false);
      // Instant local preview in live preview window
      setConfig((prev) => ({
        ...prev,
        customLogoUrl: result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setNewCustomLogoData(null);
    setRemoveCustomLogo(true);
    setConfig((prev) => ({
      ...prev,
      customLogoUrl: null,
    }));
    if (logoFileInputRef.current) {
      logoFileInputRef.current.value = "";
    }
  };

  const handleWelcomeBannerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Welcome banner image size must be less than 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setNewWelcomeBannerData(result);
      setRemoveWelcomeBanner(false);
      // Instant local preview in live preview window
      setConfig((prev) => ({
        ...prev,
        welcomeBannerUrl: result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveWelcomeBanner = () => {
    setNewWelcomeBannerData(null);
    setRemoveWelcomeBanner(true);
    setConfig((prev) => ({
      ...prev,
      welcomeBannerUrl: null,
    }));
    if (welcomeBannerInputRef.current) {
      welcomeBannerInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSavedSuccess(false);

      const payload = {
        ...config,
        newCustomLogoData,
        removeCustomLogo,
        newWelcomeBannerData,
        removeWelcomeBanner,
      };

      const res = await fetch("/api/organization/share-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig((prev) => ({
            ...prev,
            ...data.config,
          }));
        }
        setNewCustomLogoData(null);
        setRemoveCustomLogo(false);
        setNewWelcomeBannerData(null);
        setRemoveWelcomeBanner(false);

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

  const handleReset = async () => {
    if (
      !confirm(
        "Are you sure you want to reset customization settings to defaults? This will delete your custom logo and welcome banner images from storage."
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/organization/share-config", {
        method: "DELETE",
      });

      if (res.ok) {
        setConfig(DEFAULT_CONFIG);
        setNewCustomLogoData(null);
        setRemoveCustomLogo(false);
        setNewWelcomeBannerData(null);
        setRemoveWelcomeBanner(false);
        if (logoFileInputRef.current) logoFileInputRef.current.value = "";
        if (welcomeBannerInputRef.current) welcomeBannerInputRef.current.value = "";

        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-[hsl(var(--primary))] animate-spin" />
        <p className="text-sm font-semibold text-[hsl(var(--muted-foreground))]">Loading customization options...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[hsl(var(--border))]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
              <Paintbrush className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-[hsl(var(--foreground))]">
              Customize share page
            </h1>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Personalize the look, custom logo, welcome banner, call-to-action, and interactive elements of your shared video pages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[hsl(var(--primary))] hover:opacity-90 text-white font-black text-xs transition-all shadow-md shadow-[hsl(var(--primary))]/20 flex items-center gap-2 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving to Bucket...</span>
              </>
            ) : savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Saved & Uploaded!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Customization</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Split Layout: Controls Left, Live Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Controls Section (Left Column) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Navigation Tabs */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-[hsl(var(--border))] overflow-x-auto gap-1">
            <button
              onClick={() => setActiveTab("theme")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "theme"
                  ? "bg-white dark:bg-slate-950 text-[hsl(var(--foreground))] shadow-sm"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Theme</span>
            </button>
            <button
              onClick={() => setActiveTab("branding")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "branding"
                  ? "bg-white dark:bg-slate-950 text-[hsl(var(--foreground))] shadow-sm"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Branding</span>
            </button>
            <button
              onClick={() => setActiveTab("cta")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "cta"
                  ? "bg-white dark:bg-slate-950 text-[hsl(var(--foreground))] shadow-sm"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>CTA Button</span>
            </button>
            <button
              onClick={() => setActiveTab("display")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "display"
                  ? "bg-white dark:bg-slate-950 text-[hsl(var(--foreground))] shadow-sm"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Social</span>
            </button>
          </div>

          {/* TAB 1: Theme & Styling */}
          {activeTab === "theme" && (
            <div className="space-y-6 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-[hsl(var(--border))] shadow-xs">
              <div className="space-y-3">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">
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
                          ? "border-[hsl(var(--primary))] ring-2 ring-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/5"
                          : "border-[hsl(var(--border))] hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: t.primary }} />
                        <span className="w-3 h-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: t.card }} />
                        <span className="w-3 h-3 rounded-full shrink-0 border border-slate-300 dark:border-slate-700" style={{ backgroundColor: t.bg }} />
                      </div>
                      <span className="text-xs font-bold text-[hsl(var(--foreground))] truncate">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-[hsl(var(--border))]">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">
                  Custom Primary Accent Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config.accentColor || "#84cc16"}
                    onChange={(e) => setConfig((prev) => ({ ...prev, accentColor: e.target.value }))}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-[hsl(var(--border))] p-1 bg-transparent"
                  />
                  <input
                    type="text"
                    value={config.accentColor || "#84cc16"}
                    onChange={(e) => setConfig((prev) => ({ ...prev, accentColor: e.target.value }))}
                    placeholder="#84cc16"
                    className="flex-1 px-3 py-2 text-xs font-mono font-bold rounded-xl border border-[hsl(var(--border))] bg-slate-50 dark:bg-slate-950 text-[hsl(var(--foreground))]"
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {QUICK_ACCENTS.map((hex) => (
                    <button
                      key={hex}
                      onClick={() => setConfig((prev) => ({ ...prev, accentColor: hex }))}
                      className="w-6 h-6 rounded-full border border-white/20 transition-transform hover:scale-110 cursor-pointer shadow-xs"
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                </div>
              </div>

              {/* Shadcn Select for Background Visual Style */}
              <div className="space-y-3 pt-4 border-t border-[hsl(var(--border))]">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">
                  Background Visual Style
                </label>
                <Select
                  value={config.backgroundStyle || "mesh-gradient"}
                  onValueChange={(val) => setConfig((prev) => ({ ...prev, backgroundStyle: val }))}
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

              <div className="space-y-3 pt-4 border-t border-[hsl(var(--border))]">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">
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
                          ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                          : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]"
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
            <div className="space-y-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-[hsl(var(--border))] shadow-xs">
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">
                  Custom Page Header Title
                </label>
                <input
                  type="text"
                  value={config.customTitle || ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, customTitle: e.target.value }))}
                  placeholder="e.g. Acme Media Showcase (Leave empty to use Organization name)"
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-[hsl(var(--border))] bg-slate-50 dark:bg-slate-950 text-[hsl(var(--foreground))]"
                />
              </div>

              {/* Uploadable Custom Logo Image */}
              <div className="space-y-3 pt-3 border-t border-[hsl(var(--border))]">
                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">
                    Custom Logo Image
                  </label>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 mt-0.5">
                    <Info className="w-3 h-3" />
                    Recommended dimensions: 200 × 200px (Square 1:1 ratio)
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  {config.customLogoUrl ? (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 border border-[hsl(var(--border))] rounded-2xl">
                      <img
                        src={config.customLogoUrl}
                        alt="Custom Logo Preview"
                        className="w-12 h-12 rounded-xl object-cover border border-white/10 shadow-xs"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[hsl(var(--foreground))] truncate">Custom Logo Selected</p>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Will be saved to bucket on save</p>
                      </div>
                      <button
                        onClick={handleRemoveLogo}
                        className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-all cursor-pointer"
                        title="Remove custom logo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => logoFileInputRef.current?.click()}
                      className="border-2 border-dashed border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] p-4 rounded-2xl text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-950/50 hover:bg-[hsl(var(--primary))]/5 flex flex-col items-center gap-2"
                    >
                      <div className="p-2.5 rounded-xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-[hsl(var(--foreground))]">Click to upload custom logo</p>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">PNG, JPG, SVG, WebP up to 5MB</p>
                      </div>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={logoFileInputRef}
                    accept="image/*"
                    onChange={handleLogoFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Uploadable Welcome Banner Image */}
              <div className="space-y-3 pt-4 border-t border-[hsl(var(--border))]">
                <div className="space-y-0.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">
                    Welcome Banner Image
                  </label>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Recommended dimensions: 1200 × 300px (4:1 Aspect Ratio)
                  </p>
                </div>

                {config.welcomeBannerUrl ? (
                  <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-950 border border-[hsl(var(--border))] rounded-2xl">
                    <div className="w-full h-24 rounded-xl overflow-hidden bg-slate-900 border border-white/10">
                      <img
                        src={config.welcomeBannerUrl}
                        alt="Welcome Banner Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-[11px] font-bold text-[hsl(var(--muted-foreground))]">Welcome banner ready to upload</p>
                      <button
                        onClick={handleRemoveWelcomeBanner}
                        className="px-3 py-1 text-xs font-bold text-red-500 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Banner</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => welcomeBannerInputRef.current?.click()}
                    className="border-2 border-dashed border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] p-5 rounded-2xl text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-950/50 hover:bg-[hsl(var(--primary))]/5 flex flex-col items-center gap-2"
                  >
                    <div className="p-2.5 rounded-xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-[hsl(var(--foreground))]">Click to upload welcome banner image</p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">PNG, JPG, WebP up to 10MB</p>
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  ref={welcomeBannerInputRef}
                  accept="image/*"
                  onChange={handleWelcomeBannerFileSelect}
                  className="hidden"
                />
              </div>

              <div className="space-y-3 pt-3 border-t border-[hsl(var(--border))]">
                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">
                    Welcome Banner Subtitle / Tagline Text
                  </label>
                  <input
                    type="text"
                    value={config.welcomeTagline || ""}
                    onChange={(e) => setConfig((prev) => ({ ...prev, welcomeTagline: e.target.value }))}
                    placeholder="e.g. Watch our official video demos and feature announcements"
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-[hsl(var(--border))] bg-slate-50 dark:bg-slate-950 text-[hsl(var(--foreground))]"
                  />
                </div>

                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">
                      Subtitle Font Size
                    </label>
                    <span className="text-xs font-mono font-bold text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 px-2 py-0.5 rounded-md">
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
                    onValueChange={(val) =>
                      setConfig((prev) => ({ ...prev, welcomeTaglineFontSize: String(val[0]) }))
                    }
                  />
                  <div className="flex justify-between text-[10px] text-[hsl(var(--muted-foreground))] font-semibold px-0.5">
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
            <div className="space-y-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-[hsl(var(--border))] shadow-xs">
              {/* Switch for CTA */}
              <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
                <div>
                  <span className="text-xs font-black text-[hsl(var(--foreground))] block">Enable Call-to-Action Card</span>
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Prompt viewers with a direct link or booking button</span>
                </div>
                <Switch
                  checked={config.showCta ?? false}
                  onCheckedChange={(val) => setConfig((prev) => ({ ...prev, showCta: val }))}
                />
              </div>

              {config.showCta && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">
                      CTA Button Text
                    </label>
                    <input
                      type="text"
                      value={config.ctaText || ""}
                      onChange={(e) => setConfig((prev) => ({ ...prev, ctaText: e.target.value }))}
                      placeholder="e.g. Schedule a Live Demo"
                      className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-[hsl(var(--border))] bg-slate-50 dark:bg-slate-950 text-[hsl(var(--foreground))]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">
                      CTA Destination URL
                    </label>
                    <input
                      type="url"
                      value={config.ctaUrl || ""}
                      onChange={(e) => setConfig((prev) => ({ ...prev, ctaUrl: e.target.value }))}
                      placeholder="https://example.com/calendar"
                      className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-[hsl(var(--border))] bg-slate-50 dark:bg-slate-950 text-[hsl(var(--foreground))]"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 4: Social & Display Options */}
          {activeTab === "display" && (
            <div className="space-y-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-[hsl(var(--border))] shadow-xs">
              {/* Switch for Copy Link Button */}
              <div className="flex items-center justify-between py-2 border-b border-[hsl(var(--border))]">
                <div>
                  <span className="text-xs font-bold text-[hsl(var(--foreground))] block">Show Copy Link Button</span>
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))] font-medium">Quick copy share button in header</span>
                </div>
                <Switch
                  checked={config.showShareButton ?? true}
                  onCheckedChange={(val) => setConfig((prev) => ({ ...prev, showShareButton: val }))}
                />
              </div>

              {/* Switch for Social Bar */}
              <div className="flex items-center justify-between py-2 border-b border-[hsl(var(--border))]">
                <div>
                  <span className="text-xs font-bold text-[hsl(var(--foreground))] block">Show Social Sharing Bar</span>
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))] font-medium">Quick buttons for Twitter/X, LinkedIn, WhatsApp & Email</span>
                </div>
                <Switch
                  checked={config.showSocialBar ?? true}
                  onCheckedChange={(val) => setConfig((prev) => ({ ...prev, showSocialBar: val }))}
                />
              </div>

              {/* Switch for Duration Badge */}
              <div className="flex items-center justify-between py-2 border-b border-[hsl(var(--border))]">
                <div>
                  <span className="text-xs font-bold text-[hsl(var(--foreground))] block">Show Video Duration Badge</span>
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))] font-medium">Display duration runtime chip on video details</span>
                </div>
                <Switch
                  checked={config.showDuration ?? true}
                  onCheckedChange={(val) => setConfig((prev) => ({ ...prev, showDuration: val }))}
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">
                  Custom Footer Copyright Text
                </label>
                <input
                  type="text"
                  value={config.footerText || ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, footerText: e.target.value }))}
                  placeholder="e.g. © 2026 Acme Corp. All rights reserved."
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-[hsl(var(--border))] bg-slate-50 dark:bg-slate-950 text-[hsl(var(--foreground))]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Live Preview Container (Right Column) */}
        <div className="lg:col-span-7 space-y-3 sticky top-6">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              <Eye className="w-4 h-4 text-[hsl(var(--primary))]" />
              <span>Real-Time Live Preview</span>
            </div>
            <span className="text-[11px] text-[hsl(var(--muted-foreground))] font-semibold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-[hsl(var(--border))]">
              Shared Video View
            </span>
          </div>

          <div className="border border-[hsl(var(--border))] rounded-2xl overflow-hidden shadow-2xl max-h-[750px] overflow-y-auto">
            <SharedContentClient overrideConfig={config} previewData={SAMPLE_PREVIEW_DATA} />
          </div>
        </div>
      </div>
    </div>
  );
}
