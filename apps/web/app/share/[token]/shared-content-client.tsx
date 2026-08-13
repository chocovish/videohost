"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Film,
  Folder,
  ChevronRight,
  Clock,
  Play,
  Share2,
  Building2,
  AlertTriangle,
  Sparkles,
  Lock,
  LogIn,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  UserX,
  Copy,
  Check,
  ExternalLink,
  ArrowUpRight,
  Mail,
  Send,
  Globe,
} from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDuration } from "@/lib/video-utils";

export interface SharePageConfigData {
  themePreset?: string;
  accentColor?: string;
  backgroundStyle?: string;
  cardRoundness?: string;
  customTitle?: string | null;
  welcomeTagline?: string | null;
  welcomeTaglineFontSize?: string | null;
  showLogo?: boolean;
  customLogoUrl?: string | null;
  welcomeBannerUrl?: string | null;
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

export interface SharedData {
  type: "video" | "folder";
  accessMode?: string;
  organization: {
    name: string;
    logoUrl?: string | null;
    slug: string;
  };
  sharePageConfig?: SharePageConfigData | null;
  video?: {
    id: string;
    title: string;
    description?: string;
    status: string;
    durationSeconds?: number;
    thumbnailUrl?: string;
    playbackUrl?: string;
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
  videos?: Array<{
    id: string;
    title: string;
    description?: string;
    status: string;
    durationSeconds?: number;
    thumbnailUrl?: string;
    playbackUrl?: string;
    createdAt: string;
  }>;
  subfolders?: Array<{
    id: string;
    name: string;
  }>;
}

interface SharedContentClientProps {
  overrideConfig?: SharePageConfigData;
  previewData?: SharedData;
}

export default function SharedContentClient({
  overrideConfig,
  previewData,
}: SharedContentClientProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = params?.token as string;
  const subfolderId = searchParams?.get("subfolderId");

  const [data, setData] = useState<SharedData | null>(previewData || null);
  const [loading, setLoading] = useState(!previewData);
  const [copied, setCopied] = useState(false);
  const [errorState, setErrorState] = useState<{
    code: string;
    message?: string;
    userEmail?: string;
    organizationName?: string;
    itemTitle?: string;
    type?: string;
  } | null>(null);

  // Selected video for folder preview modal
  const [selectedVideo, setSelectedVideo] = useState<{
    id: string;
    title: string;
    description?: string;
    playbackUrl?: string | null;
    thumbnailUrl?: string;
  } | null>(null);

  const fetchSharedContent = async () => {
    if (previewData) return;
    try {
      setLoading(true);
      setErrorState(null);

      const url = subfolderId
        ? `/api/share/${token}?subfolderId=${subfolderId}`
        : `/api/share/${token}`;

      const res = await fetch(url);
      const result = await res.json();

      if (!res.ok) {
        setErrorState({
          code: result.error || "UNKNOWN_ERROR",
          message: result.message,
          userEmail: result.userEmail,
          organizationName: result.organization?.name,
          itemTitle: result.itemTitle,
          type: result.type,
        });
        return;
      }

      setData(result);
    } catch (err: any) {
      setErrorState({
        code: "FETCH_FAILED",
        message: err.message || "Failed to load shared content.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!previewData && token) {
      fetchSharedContent();
    }
  }, [token, subfolderId, previewData]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubfolderClick = (folderId: string) => {
    if (previewData) return;
    router.push(`/share/${token}?subfolderId=${folderId}`);
  };

  const handleBackToRoot = () => {
    if (previewData) return;
    router.push(`/share/${token}`);
  };

  // Merge database config with live preview override config
  const config: SharePageConfigData = {
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
    ...data?.sharePageConfig,
    ...overrideConfig,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-lime-500 selection:text-black">
        <div className="flex flex-col items-center gap-4 p-8 bg-slate-900/50 border border-white/5 rounded-3xl backdrop-blur-2xl shadow-2xl">
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 border-4 border-lime-500/20 border-t-lime-500 rounded-full animate-spin" />
            <Sparkles className="w-5 h-5 text-lime-400 absolute animate-pulse" />
          </div>
          <p className="text-sm font-bold text-slate-300 tracking-wide">Loading shared portal...</p>
        </div>
      </div>
    );
  }

  // 1. PRIVATE CONTENT ACCESS BLOCKED
  if (errorState?.code === "PRIVATE_CONTENT") {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-lime-500 selection:text-black relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-md w-full p-8 bg-slate-900/80 border border-white/10 rounded-3xl shadow-2xl shadow-black/80 space-y-6 text-center backdrop-blur-2xl relative z-10">
          <div className="p-4 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 shadow-lg inline-flex mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          {errorState.organizationName && (
            <span className="inline-block text-xs font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3.5 py-1 rounded-full border border-amber-500/20">
              {errorState.organizationName}
            </span>
          )}

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">Private Access</h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              The owner of <span className="font-semibold text-slate-200">"{errorState.itemTitle || "this item"}"</span> has set access to Private. Link sharing is currently disabled.
            </p>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-4 border-t border-slate-800/80">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>VideoHost Protected Portal</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. AUTHENTICATION REQUIRED (NOT LOGGED IN)
  if (errorState?.code === "LOGIN_REQUIRED") {
    const callbackUrl = `/share/${token}${subfolderId ? `?subfolderId=${subfolderId}` : ""}`;
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-lime-500 selection:text-black relative overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-lime-500/10 blur-[140px] rounded-full pointer-events-none" />
        <div className="max-w-md w-full p-8 bg-slate-900/80 border border-white/10 rounded-3xl shadow-2xl shadow-black/80 space-y-6 backdrop-blur-2xl relative z-10">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="p-4 bg-lime-500/10 text-lime-400 rounded-2xl border border-lime-500/20 shadow-lg shadow-lime-500/10">
              <Lock className="w-8 h-8" />
            </div>

            {errorState.organizationName && (
              <span className="text-xs font-extrabold uppercase tracking-wider text-lime-400 bg-lime-500/10 px-3.5 py-1 rounded-full border border-lime-500/20">
                {errorState.organizationName}
              </span>
            )}

            <h1 className="text-2xl font-black text-slate-100 tracking-tight">
              Authentication Required
            </h1>

            <p className="text-sm text-slate-400 leading-relaxed">
              Access to <span className="font-semibold text-slate-200">"{errorState.itemTitle || "this content"}"</span> is restricted. Please sign in with your authorized email address.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => router.push(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)}
              className="w-full py-3.5 px-4 bg-lime-500 hover:bg-lime-400 text-slate-950 font-black rounded-xl shadow-lg shadow-lime-500/25 transition-all flex items-center justify-center gap-2 text-sm active:scale-98"
            >
              <LogIn className="w-4 h-4" />
              Sign In to Access
            </button>

            <button
              onClick={() => router.push(`/auth/register?mode=viewer&callbackUrl=${encodeURIComponent(callbackUrl)}`)}
              className="w-full py-3.5 px-4 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700/80 transition-all flex items-center justify-center gap-2 text-sm active:scale-98"
            >
              <UserPlus className="w-4 h-4 text-lime-400" />
              Create Free Viewer Account
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-3 border-t border-slate-800/80">
            <ShieldCheck className="w-4 h-4 text-lime-400" />
            <span>Secure VideoHost Sharing Portal</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. LOGGED IN BUT ACCESS DENIED
  if (errorState?.code === "ACCESS_DENIED") {
    const callbackUrl = `/share/${token}${subfolderId ? `?subfolderId=${subfolderId}` : ""}`;
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-lime-500 selection:text-black relative overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-500/10 blur-[140px] rounded-full pointer-events-none" />
        <div className="max-w-md w-full p-8 bg-slate-900/80 border border-white/10 rounded-3xl shadow-2xl shadow-black/80 space-y-6 text-center backdrop-blur-2xl relative z-10">
          <div className="p-4 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20 shadow-lg inline-flex mx-auto">
            <UserX className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">Access Denied</h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Signed in as <span className="font-bold text-slate-200">{errorState.userEmail}</span>, but this email address has not been granted access to <span className="font-semibold text-slate-200">"{errorState.itemTitle || "this item"}"</span>.
            </p>
          </div>

          <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs text-slate-300 font-medium">
            If you were invited using a different email address, please switch accounts.
          </div>

          <div className="pt-2">
            <button
              onClick={() => signOut({ callbackUrl: `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}` })}
              className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700/80 transition-all flex items-center justify-center gap-2 text-sm active:scale-98"
            >
              <LogIn className="w-4 h-4 text-lime-400" />
              Sign in with Different Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. UNHANDLED ERROR / LINK NOT FOUND
  if (errorState || !data) {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-lime-500 selection:text-black">
        <div className="max-w-md w-full p-8 bg-slate-900/80 border border-white/10 rounded-3xl shadow-2xl text-center space-y-4 backdrop-blur-2xl">
          <div className="inline-flex p-4 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-slate-100">Unable to load shared content</h1>
          <p className="text-sm text-slate-400">{errorState?.message || "This share link is invalid or expired."}</p>
        </div>
      </div>
    );
  }

  const { organization } = data;
  const isVideo = data.type === "video";

  // Dynamic Theme Preset Class & Style Mapping
  const preset = config.themePreset || "obsidian";

  let bgClass = "bg-[#030712] text-slate-100";
  let cardBgClass = "bg-slate-900/80 border-white/10 shadow-2xl";
  let headerBgClass = "bg-[#030712]/75 border-white/[0.08]";
  let accentHex = config.accentColor || "#84cc16";

  if (preset === "cyberpunk") {
    bgClass = "bg-[#070312] text-slate-100";
    cardBgClass = "bg-[#0f0724]/90 border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)]";
    headerBgClass = "bg-[#070312]/80 border-cyan-500/20";
    if (!config.accentColor || config.accentColor === "#84cc16") accentHex = "#06b6d4";
  } else if (preset === "vaporwave") {
    bgClass = "bg-[#0f041c] text-purple-100";
    cardBgClass = "bg-[#1d0836]/90 border-pink-500/30 shadow-[0_0_40px_rgba(236,72,153,0.15)]";
    headerBgClass = "bg-[#0f041c]/80 border-pink-500/20";
    if (!config.accentColor || config.accentColor === "#84cc16") accentHex = "#ec4899";
  } else if (preset === "gold") {
    bgClass = "bg-[#0c0a09] text-stone-100";
    cardBgClass = "bg-[#1c1917]/90 border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.15)]";
    headerBgClass = "bg-[#0c0a09]/80 border-amber-500/20";
    if (!config.accentColor || config.accentColor === "#84cc16") accentHex = "#eab308";
  } else if (preset === "ocean") {
    bgClass = "bg-[#021124] text-sky-100";
    cardBgClass = "bg-[#072449]/90 border-sky-400/30 shadow-[0_0_40px_rgba(56,189,248,0.15)]";
    headerBgClass = "bg-[#021124]/80 border-sky-400/20";
    if (!config.accentColor || config.accentColor === "#84cc16") accentHex = "#38bdf8";
  } else if (preset === "sunset") {
    bgClass = "bg-[#17050b] text-rose-50";
    cardBgClass = "bg-[#2d0d17]/90 border-orange-500/30 shadow-[0_0_40px_rgba(249,115,22,0.15)]";
    headerBgClass = "bg-[#17050b]/80 border-orange-500/20";
    if (!config.accentColor || config.accentColor === "#84cc16") accentHex = "#f97316";
  } else if (preset === "minimal-light") {
    bgClass = "bg-slate-50 text-slate-900";
    cardBgClass = "bg-white border-slate-200/90 shadow-xl shadow-slate-200/50";
    headerBgClass = "bg-white/80 border-slate-200";
    if (!config.accentColor || config.accentColor === "#84cc16") accentHex = "#2563eb";
  }

  // Card roundness
  let roundnessClass = "rounded-3xl";
  if (config.cardRoundness === "xl") roundnessClass = "rounded-xl";
  if (config.cardRoundness === "pill") roundnessClass = "rounded-[2.5rem]";
  if (config.cardRoundness === "square") roundnessClass = "rounded-none";

  // Display logo URL
  const logoUrlToDisplay = config.customLogoUrl || organization.logoUrl;
  // Display page title
  const displayTitle = config.customTitle || organization.name;

  // Current page URL for social sharing
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareTitle = data.video?.title ? `${data.video.title} — ${displayTitle}` : displayTitle;

  return (
    <div
      className={`min-h-screen flex flex-col selection:bg-lime-500 selection:text-black font-sans antialiased transition-colors duration-500 relative ${bgClass}`}
    >
      {/* Background Aura Effects */}
      {config.backgroundStyle === "mesh-gradient" && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div
            className="absolute -top-32 left-1/4 w-[500px] h-[500px] rounded-full blur-[140px] opacity-25 animate-pulse"
            style={{ backgroundColor: accentHex }}
          />
          <div
            className="absolute top-1/3 -right-20 w-[450px] h-[450px] rounded-full blur-[160px] opacity-20"
            style={{ backgroundColor: accentHex }}
          />
        </div>
      )}

      {config.backgroundStyle === "obsidian-aura" && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[180px] opacity-20"
            style={{ backgroundColor: accentHex }}
          />
        </div>
      )}

      {config.backgroundStyle === "neon-grid" && (
        <div
          className="fixed inset-0 pointer-events-none z-0 opacity-15"
          style={{
            backgroundImage: `radial-gradient(${accentHex} 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
      )}

      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-2xl border-b shadow-lg transition-all ${headerBgClass}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrlToDisplay ? (
              <img
                src={logoUrlToDisplay}
                alt={displayTitle}
                className="w-10 h-10 rounded-xl object-cover border border-white/10 shadow-md"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-950 font-black text-lg shadow-lg ring-1 ring-white/20"
                style={{ backgroundColor: accentHex }}
              >
                {displayTitle.substring(0, 2).toUpperCase()}
              </div>
            )}

            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-tight flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" style={{ color: accentHex }} />
                  {displayTitle}
                </span>
                {!isVideo && data.currentFolder && (
                  <span className="hidden sm:inline-block text-xs font-bold text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700/60">
                    {data.currentFolder.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {config.showShareButton && (
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-xs font-bold text-slate-200 transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                title="Copy link to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" style={{ color: accentHex }} />
                    <span style={{ color: accentHex }}>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            )}

            <div
              className="hidden sm:flex px-3 py-1.5 rounded-full border text-xs font-extrabold items-center gap-1.5"
              style={{
                backgroundColor: `${accentHex}15`,
                borderColor: `${accentHex}30`,
                color: accentHex,
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Shared Portal</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        {/* Welcome Banner Image & Subtitle Banner */}
        {(config.welcomeBannerUrl || config.welcomeTagline) && (
          <div className="max-w-4xl mx-auto space-y-4 text-center">
            {config.welcomeBannerUrl && (
              <div className={`w-full overflow-hidden border border-white/10 shadow-2xl max-h-72 bg-slate-900 ${roundnessClass}`}>
                <img
                  src={config.welcomeBannerUrl}
                  alt="Welcome Banner"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            {config.welcomeTagline && (
              <div className="py-2">
                {(() => {
                  const val = config.welcomeTaglineFontSize || "24";
                  let fontSizePx = "24px";
                  let weightClass = "font-black";

                  if (val === "sm") { fontSizePx = "14px"; weightClass = "font-semibold"; }
                  else if (val === "md") { fontSizePx = "16px"; weightClass = "font-bold"; }
                  else if (val === "lg") { fontSizePx = "18px"; weightClass = "font-extrabold"; }
                  else if (val === "xl") { fontSizePx = "24px"; weightClass = "font-black"; }
                  else if (val === "2xl") { fontSizePx = "36px"; weightClass = "font-black"; }
                  else {
                    const parsed = parseInt(val, 10);
                    if (!isNaN(parsed) && parsed > 0) {
                      fontSizePx = `${parsed}px`;
                      if (parsed <= 14) weightClass = "font-semibold";
                      else if (parsed <= 18) weightClass = "font-bold";
                      else if (parsed >= 28) weightClass = "font-black";
                      else weightClass = "font-extrabold";
                    }
                  }

                  return (
                    <h2
                      className={`tracking-tight ${weightClass}`}
                      style={{ fontSize: fontSizePx }}
                    >
                      {config.welcomeTagline}
                    </h2>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* SINGLE VIDEO SHARE VIEW */}
        {isVideo && data.video && (
          <div className="relative group max-w-5xl mx-auto space-y-6">
            {/* Ambient Backlight */}
            <div
              className="absolute -inset-1 rounded-3xl blur-2xl opacity-40 group-hover:opacity-80 transition-opacity duration-1000 -z-10 pointer-events-none"
              style={{ backgroundColor: accentHex }}
            />

            {/* Video Player Card */}
            <div className={`p-2 sm:p-3 backdrop-blur-xl ring-1 ring-white/10 ${cardBgClass} ${roundnessClass}`}>
              <div className="aspect-video w-full rounded-xl overflow-hidden shadow-inner">
                {data.video.playbackUrl ? (
                  <VideoPlayer src={data.video.playbackUrl} poster={data.video.thumbnailUrl} className="w-full h-full rounded-xl" />
                ) : (
                  <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-6 border border-slate-800">
                    <Film className="w-12 h-12 mb-2 text-slate-600 animate-pulse" />
                    <p className="text-sm font-semibold">Video is processing or unplayable.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Video Detail & Controls Card */}
            <div className={`p-6 sm:p-8 space-y-6 backdrop-blur-2xl ${cardBgClass} ${roundnessClass}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="px-3 py-1 text-xs font-extrabold rounded-full flex items-center gap-1.5 border"
                      style={{
                        backgroundColor: `${accentHex}15`,
                        borderColor: `${accentHex}30`,
                        color: accentHex,
                      }}
                    >
                      <Film className="w-3.5 h-3.5" /> Shared Video
                    </span>
                    {config.showDuration && data.video.durationSeconds && (
                      <span className="px-3 py-1 bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-semibold rounded-full flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" style={{ color: accentHex }} />
                        {formatDuration(data.video.durationSeconds)}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
                    {data.video.title}
                  </h1>
                </div>

                {config.showShareButton && (
                  <button
                    onClick={handleCopyLink}
                    className="self-start sm:self-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold rounded-xl border border-slate-700/80 transition-all flex items-center gap-2 text-xs shadow-md active:scale-95 shrink-0 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" style={{ color: accentHex }} />
                        <span>Link Copied</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" style={{ color: accentHex }} />
                        <span>Share Video</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {data.video.description && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Description</h3>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{data.video.description}</p>
                </div>
              )}

              {/* Call-to-Action (CTA) Card (if enabled) */}
              {config.showCta && config.ctaUrl && (
                <div
                  className="p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all shadow-lg"
                  style={{
                    backgroundColor: `${accentHex}10`,
                    borderColor: `${accentHex}40`,
                  }}
                >
                  <div className="space-y-1 text-center sm:text-left">
                    <h4 className="font-extrabold text-base tracking-tight">Interested in learning more?</h4>
                    <p className="text-xs text-slate-300">Click below to take the next step with {displayTitle}.</p>
                  </div>
                  <a
                    href={config.ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 rounded-xl text-slate-950 font-black text-sm transition-all flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 shrink-0"
                    style={{ backgroundColor: accentHex }}
                  >
                    <span>{config.ctaText || "Learn More"}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}

              {/* Social Sharing Bar */}
              {config.showSocialBar && (
                <div className="space-y-2 pt-2 border-t border-slate-800/60">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Share video to</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 text-slate-200"
                    >
                      <Globe className="w-3.5 h-3.5 text-sky-400" />
                      <span>X / Twitter</span>
                    </a>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 text-slate-200"
                    >
                      <Globe className="w-3.5 h-3.5 text-blue-500" />
                      <span>LinkedIn</span>
                    </a>
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareTitle + " " + shareUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 text-slate-200"
                    >
                      <Send className="w-3.5 h-3.5 text-emerald-400" />
                      <span>WhatsApp</span>
                    </a>
                    <a
                      href={`mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareUrl)}`}
                      className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 text-slate-200"
                    >
                      <Mail className="w-3.5 h-3.5 text-amber-400" />
                      <span>Email</span>
                    </a>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-800/60 gap-3">
                <div className="flex items-center gap-2">
                  <span>Hosted by</span>
                  <span className="font-bold bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/40">
                    {displayTitle}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <ShieldCheck className="w-4 h-4" style={{ color: accentHex }} />
                  <span>Encrypted Link Access</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FOLDER SHARE VIEW */}
        {!isVideo && data.currentFolder && (
          <div className="space-y-6">
            {/* Floating Breadcrumb Bar */}
            <div className={`flex items-center gap-2 text-xs sm:text-sm text-slate-400 backdrop-blur-xl px-4 py-3 border ${cardBgClass} ${roundnessClass}`}>
              <button
                onClick={handleBackToRoot}
                className="hover:text-lime-400 font-bold flex items-center gap-2 transition-colors group cursor-pointer"
              >
                <div
                  className="p-1.5 rounded-lg group-hover:scale-110 transition-transform"
                  style={{
                    backgroundColor: `${accentHex}15`,
                    color: accentHex,
                  }}
                >
                  <Folder className="w-4 h-4" />
                </div>
                <span>{data.rootFolder?.name || "Shared Folder"}</span>
              </button>
              {subfolderId && (
                <>
                  <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="font-extrabold text-slate-100 bg-slate-800/60 px-3 py-1 rounded-lg border border-slate-700/50">
                    {data.currentFolder.name}
                  </span>
                </>
              )}
            </div>

            {/* Subfolders Section */}
            {data.subfolders && data.subfolders.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Folders ({data.subfolders.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {data.subfolders.map((sf) => (
                    <button
                      key={sf.id}
                      onClick={() => handleSubfolderClick(sf.id)}
                      className={`flex items-center gap-3.5 p-4 border transition-all duration-300 text-left group shadow-lg hover:-translate-y-1 backdrop-blur-md cursor-pointer ${cardBgClass} ${roundnessClass}`}
                    >
                      <div className="p-3 bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-400 rounded-xl border border-amber-500/20 group-hover:scale-110 transition-transform duration-300">
                        <Folder className="w-5 h-5 fill-amber-500/30" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold group-hover:text-lime-400 transition-colors truncate">
                          {sf.name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-semibold">Folder</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Videos Grid Section */}
            <div className="space-y-3">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Videos ({data.videos?.length || 0})
              </h2>

              {!data.videos || data.videos.length === 0 ? (
                <div className={`py-16 text-center border backdrop-blur-md ${cardBgClass} ${roundnessClass}`}>
                  <Film className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-pulse" />
                  <p className="text-sm font-bold text-slate-300">No videos in this folder</p>
                  <p className="text-xs text-slate-400 mt-1">Check back later for new updates.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {data.videos.map((vid) => (
                    <div
                      key={vid.id}
                      onClick={() => vid.playbackUrl && setSelectedVideo(vid)}
                      className={`group relative border overflow-hidden shadow-xl transition-all duration-300 hover:-translate-y-1.5 backdrop-blur-md ${cardBgClass} ${roundnessClass} ${
                        vid.playbackUrl ? "cursor-pointer" : "opacity-60 cursor-not-allowed"
                      }`}
                    >
                      {/* Thumbnail Box */}
                      <div className="aspect-video bg-slate-950 relative overflow-hidden flex items-center justify-center">
                        {vid.thumbnailUrl ? (
                          <img
                            src={vid.thumbnailUrl}
                            alt={vid.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          />
                        ) : (
                          <Film className="w-10 h-10 text-slate-700" />
                        )}

                        {vid.playbackUrl && (
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-[2px]">
                            <div
                              className="p-3.5 text-slate-950 rounded-full shadow-xl scale-90 group-hover:scale-100 transition-transform duration-300"
                              style={{ backgroundColor: accentHex }}
                            >
                              <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
                            </div>
                          </div>
                        )}

                        {config.showDuration && vid.durationSeconds && (
                          <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-slate-950/80 backdrop-blur-md text-[11px] font-extrabold text-slate-200 rounded-md border border-slate-800/80 shadow-md">
                            {formatDuration(vid.durationSeconds)}
                          </span>
                        )}
                      </div>

                      {/* Content Info */}
                      <div className="p-4 space-y-1.5">
                        <h3 className="text-sm font-bold group-hover:opacity-90 transition-colors line-clamp-1">
                          {vid.title}
                        </h3>
                        {vid.description ? (
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{vid.description}</p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No description</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer Text */}
      <footer className="py-6 border-t border-slate-800/40 text-center text-xs text-slate-400 relative z-10">
        <p>{config.footerText || `© ${new Date().getFullYear()} ${displayTitle}. Powered by VideoHost.`}</p>
      </footer>

      {/* Video Modal Player for Shared Folder View */}
      <Dialog open={!!(selectedVideo && selectedVideo.playbackUrl)} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-slate-900/95 border-white/10 text-slate-100 backdrop-blur-2xl rounded-3xl shadow-2xl">
          <DialogHeader className="p-4 sm:p-5 border-b border-slate-800/80 text-left bg-slate-900/80 flex items-center justify-between">
            <DialogTitle className="text-base text-slate-100 font-extrabold truncate pr-6 flex items-center gap-2">
              <Film className="w-4 h-4 text-lime-400 shrink-0" />
              <span className="truncate">{selectedVideo?.title}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="p-2 sm:p-4">
            <div className="aspect-video w-full rounded-xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
              {selectedVideo && selectedVideo.playbackUrl && (
                <VideoPlayer src={selectedVideo.playbackUrl} poster={selectedVideo.thumbnailUrl} className="w-full h-full rounded-xl" />
              )}
            </div>
          </div>
          {selectedVideo?.description && (
            <div className="p-4 sm:p-5 bg-slate-900/90 border-t border-slate-800/80">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1">Description</h4>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedVideo.description}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
