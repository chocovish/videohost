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
} from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDuration } from "@/lib/video-utils";

interface SharedData {
  type: "video" | "folder";
  accessMode?: string;
  organization: {
    name: string;
    logoUrl?: string | null;
    slug: string;
  };
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

export default function SharedContentClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = params.token as string;
  const subfolderId = searchParams.get("subfolderId");

  const [data, setData] = useState<SharedData | null>(null);
  const [loading, setLoading] = useState(true);
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
    fetchSharedContent();
  }, [token, subfolderId]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubfolderClick = (folderId: string) => {
    router.push(`/share/${token}?subfolderId=${folderId}`);
  };

  const handleBackToRoot = () => {
    router.push(`/share/${token}`);
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

  // 3. LOGGED IN BUT ACCESS DENIED (EMAIL NOT IN ALLOWED LIST)
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

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col selection:bg-lime-500 selection:text-black font-sans antialiased">
      {/* Premium Glass Header */}
      <header className="sticky top-0 z-50 bg-[#030712]/70 backdrop-blur-2xl border-b border-white/[0.08] shadow-lg shadow-black/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          {/* Organization Branding ONLY (Video title removed per explicit instruction) */}
          <div className="flex items-center gap-3">
            {organization.logoUrl ? (
              <img
                src={organization.logoUrl}
                alt={organization.name}
                className="w-10 h-10 rounded-xl object-cover border border-white/10 shadow-md"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lime-400 to-lime-600 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-lime-500/20 ring-1 ring-lime-400/40">
                {organization.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-100 tracking-tight flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-lime-400" />
                  {organization.name}
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
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-xs font-bold text-slate-200 transition-all flex items-center gap-1.5 shadow-md active:scale-95"
              title="Copy link to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-lime-400" />
                  <span className="text-lime-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            <div className="hidden sm:flex px-3 py-1.5 rounded-full bg-lime-500/10 border border-lime-500/20 text-xs font-extrabold text-lime-400 items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Shared Portal</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* SINGLE VIDEO SHARE VIEW */}
        {isVideo && data.video && (
          <div className="relative group max-w-5xl mx-auto space-y-6">
            {/* Backdrop Ambient Aura */}
            <div className="absolute -inset-1 bg-gradient-to-r from-lime-500/20 via-emerald-500/10 to-teal-500/20 rounded-3xl blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-1000 -z-10 pointer-events-none" />

            {/* Video Player Card */}
            <div className="bg-slate-900/90 border border-white/10 rounded-3xl overflow-hidden p-2 sm:p-3 shadow-2xl shadow-black/80 backdrop-blur-xl ring-1 ring-white/10">
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 shadow-inner">
                {data.video.playbackUrl ? (
                  <VideoPlayer src={data.video.playbackUrl} poster={data.video.thumbnailUrl} />
                ) : (
                  <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-6 border border-slate-800">
                    <Film className="w-12 h-12 mb-2 text-slate-600 animate-pulse" />
                    <p className="text-sm font-semibold">Video is processing or unplayable.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Video Detail Card */}
            <div className="bg-slate-900/60 border border-white/[0.08] backdrop-blur-2xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 bg-lime-500/10 border border-lime-500/20 text-lime-400 text-xs font-extrabold rounded-full flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5" /> Shared Video
                    </span>
                    {data.video.durationSeconds && (
                      <span className="px-3 py-1 bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-semibold rounded-full flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-lime-400" />
                        {formatDuration(data.video.durationSeconds)}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight leading-snug">
                    {data.video.title}
                  </h1>
                </div>

                <button
                  onClick={handleCopyLink}
                  className="self-start sm:self-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold rounded-xl border border-slate-700/80 transition-all flex items-center gap-2 text-xs shadow-md active:scale-95 shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-lime-400" />
                      <span>Link Copied</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 text-lime-400" />
                      <span>Share Video</span>
                    </>
                  )}
                </button>
              </div>

              {data.video.description && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Description</h3>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{data.video.description}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-800/60 gap-3">
                <div className="flex items-center gap-2">
                  <span>Hosted by</span>
                  <span className="font-bold text-slate-200 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/40">
                    {organization.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-lime-400" />
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
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 bg-slate-900/60 backdrop-blur-xl border border-white/[0.08] px-4 py-3 rounded-2xl shadow-md">
              <button
                onClick={handleBackToRoot}
                className="hover:text-lime-400 font-bold flex items-center gap-2 transition-colors group"
              >
                <div className="p-1.5 bg-lime-500/10 text-lime-400 rounded-lg group-hover:scale-110 transition-transform">
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
                      className="flex items-center gap-3.5 p-4 bg-slate-900/70 hover:bg-slate-800/80 border border-white/[0.08] hover:border-lime-500/40 rounded-2xl transition-all duration-300 text-left group shadow-lg hover:-translate-y-1 hover:shadow-xl hover:shadow-lime-500/5 backdrop-blur-md"
                    >
                      <div className="p-3 bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-400 rounded-xl border border-amber-500/20 group-hover:scale-110 transition-transform duration-300">
                        <Folder className="w-5 h-5 fill-amber-500/30" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-200 group-hover:text-lime-400 transition-colors truncate">
                          {sf.name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-semibold">Folder</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-lime-400 group-hover:translate-x-0.5 transition-all" />
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
                <div className="py-16 text-center bg-slate-900/40 border border-white/[0.08] rounded-3xl backdrop-blur-md">
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
                      className={`group relative bg-slate-900/70 border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-lime-500/40 hover:shadow-2xl hover:shadow-lime-500/10 backdrop-blur-md ${
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
                            <div className="p-3.5 bg-lime-500 text-slate-950 rounded-full shadow-xl shadow-lime-500/30 scale-90 group-hover:scale-100 transition-transform duration-300">
                              <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
                            </div>
                          </div>
                        )}

                        {vid.durationSeconds && (
                          <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-slate-950/80 backdrop-blur-md text-[11px] font-extrabold text-slate-200 rounded-md border border-slate-800/80 shadow-md">
                            {formatDuration(vid.durationSeconds)}
                          </span>
                        )}
                      </div>

                      {/* Content Info */}
                      <div className="p-4 space-y-1.5">
                        <h3 className="text-sm font-bold text-slate-200 group-hover:text-lime-400 transition-colors line-clamp-1">
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

      {/* Video Modal Player for Shared Folder View */}
      <Dialog open={!!(selectedVideo && selectedVideo.playbackUrl)} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-slate-900/95 border-white/10 text-slate-100 backdrop-blur-2xl rounded-3xl shadow-2xl">
          <DialogHeader className="p-4 sm:p-5 border-b border-slate-800/80 text-left bg-slate-900/80 flex items-center justify-between">
            <DialogTitle className="text-base text-slate-100 font-extrabold truncate pr-6 flex items-center gap-2">
              <Film className="w-4 h-4 text-lime-400 shrink-0" />
              <span className="truncate">{selectedVideo?.title}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="p-2 sm:p-4 bg-slate-950">
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 ring-1 ring-white/10 shadow-2xl">
              {selectedVideo && selectedVideo.playbackUrl && (
                <VideoPlayer src={selectedVideo.playbackUrl} poster={selectedVideo.thumbnailUrl} />
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
