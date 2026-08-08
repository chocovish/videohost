"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  Film,
  Folder,
  ChevronRight,
  Clock,
  Play,
  X,
  Share2,
  Building2,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";

interface SharedData {
  type: "video" | "folder";
  organization: {
    name: string;
    logoUrl?: string | null;
    slug: string;
  };
  message?: string | null;
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

export default function SharedPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = params.token as string;
  const subfolderId = searchParams.get("subfolderId");

  const [data, setData] = useState<SharedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
      const url = subfolderId
        ? `/api/share/${token}?subfolderId=${subfolderId}`
        : `/api/share/${token}`;

      const res = await fetch(url);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to load shared content.");
      }

      setData(result);
    } catch (err: any) {
      setError(err.message || "Shared link not found or expired.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedContent();
  }, [token, subfolderId]);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleSubfolderClick = (folderId: string) => {
    router.push(`/share/${token}?subfolderId=${folderId}`);
  };

  const handleBackToRoot = () => {
    router.push(`/share/${token}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-lime-500/20 border-t-lime-500 rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-400">Loading shared content...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full p-8 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl text-center space-y-4">
          <div className="inline-flex p-3 bg-red-500/10 text-red-400 rounded-2xl">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-100">Unable to load shared content</h1>
          <p className="text-sm text-slate-400">{error || "This share link is invalid or expired."}</p>
        </div>
      </div>
    );
  }

  const { organization, message } = data;
  const isVideo = data.type === "video";

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-lime-500 selection:text-black">
      {/* Organization Branding Header */}
      <header className="sticky top-0 z-40 bg-[#070b14]/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {organization.logoUrl ? (
              <img
                src={organization.logoUrl}
                alt={organization.name}
                className="w-10 h-10 rounded-xl object-cover border border-slate-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lime-400 to-lime-600 flex items-center justify-center text-slate-950 font-black text-lg shadow-md shadow-lime-500/20">
                {organization.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-lime-400 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> {organization.name}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-100">
                {isVideo ? data.video?.title : data.currentFolder?.name}
              </p>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-lime-400" />
            <span>Shared Portal</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Personal Message Quote Banner */}
        {message && (
          <div className="p-4 bg-slate-900/60 border border-lime-500/30 rounded-2xl flex items-start gap-3 shadow-lg">
            <div className="p-2 bg-lime-500/10 text-lime-400 rounded-xl shrink-0 mt-0.5">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-lime-400 uppercase tracking-wider">
                Note from sender
              </p>
              <p className="text-sm text-slate-200 mt-0.5 italic">"{message}"</p>
            </div>
          </div>
        )}

        {/* SINGLE VIDEO SHARE VIEW */}
        {isVideo && data.video && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="glass-card bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden p-2 sm:p-4 shadow-2xl">
              {data.video.playbackUrl ? (
                <VideoPlayer src={data.video.playbackUrl} poster={data.video.thumbnailUrl} />
              ) : (
                <div className="aspect-video w-full bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-6 rounded-xl border border-slate-800">
                  <Film className="w-12 h-12 mb-2 text-slate-600 animate-pulse" />
                  <p className="text-sm font-semibold">Video is processing or unplayable.</p>
                </div>
              )}
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-extrabold text-slate-100">{data.video.title}</h1>
                {data.video.durationSeconds && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-slate-300 text-xs font-semibold rounded-full border border-slate-700">
                    <Clock className="w-3.5 h-3.5 text-lime-400" />
                    {formatDuration(data.video.durationSeconds)}
                  </span>
                )}
              </div>

              {data.video.description && (
                <p className="text-sm text-slate-400 leading-relaxed">{data.video.description}</p>
              )}

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                <span>Hosted by {organization.name}</span>
                <span>Shared link access</span>
              </div>
            </div>
          </div>
        )}

        {/* FOLDER SHARE VIEW */}
        {!isVideo && data.currentFolder && (
          <div className="space-y-6">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-900/60 border border-slate-800 px-4 py-3 rounded-2xl">
              <button
                onClick={handleBackToRoot}
                className="hover:text-lime-400 font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Folder className="w-4 h-4 text-lime-400" />
                {data.rootFolder?.name || "Shared Folder"}
              </button>
              {subfolderId && (
                <>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                  <span className="font-bold text-slate-100">{data.currentFolder.name}</span>
                </>
              )}
            </div>

            {/* Subfolders Grid */}
            {data.subfolders && data.subfolders.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Folders
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {data.subfolders.map((sf) => (
                    <button
                      key={sf.id}
                      onClick={() => handleSubfolderClick(sf.id)}
                      className="flex items-center gap-3 p-4 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-lime-500/40 rounded-2xl transition-all text-left group"
                    >
                      <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl group-hover:scale-110 transition-transform">
                        <Folder className="w-5 h-5 fill-amber-500/20" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-200 group-hover:text-lime-400 transition-colors truncate">
                          {sf.name}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-lime-400 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Videos Grid */}
            <div className="space-y-3">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Videos ({data.videos?.length || 0})
              </h2>

              {!data.videos || data.videos.length === 0 ? (
                <div className="py-16 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
                  <Film className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-400">No videos in this folder yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {data.videos.map((vid) => (
                    <div
                      key={vid.id}
                      onClick={() => vid.playbackUrl && setSelectedVideo(vid)}
                      className={`group relative bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all hover:-translate-y-1 hover:border-lime-500/40 ${
                        vid.playbackUrl ? "cursor-pointer" : "opacity-60 cursor-not-allowed"
                      }`}
                    >
                      {/* Thumbnail Container */}
                      <div className="aspect-video bg-slate-950 relative overflow-hidden flex items-center justify-center">
                        {vid.thumbnailUrl ? (
                          <img
                            src={vid.thumbnailUrl}
                            alt={vid.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <Film className="w-10 h-10 text-slate-700" />
                        )}

                        {vid.playbackUrl && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-xs">
                            <div className="p-3 bg-lime-500 text-slate-950 rounded-full shadow-lg scale-90 group-hover:scale-100 transition-transform">
                              <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
                            </div>
                          </div>
                        )}

                        {vid.durationSeconds && (
                          <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 backdrop-blur-md text-[11px] font-bold text-slate-200 rounded-md">
                            {formatDuration(vid.durationSeconds)}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-1">
                        <h3 className="text-sm font-bold text-slate-200 group-hover:text-lime-400 transition-colors line-clamp-1">
                          {vid.title}
                        </h3>
                        {vid.description && (
                          <p className="text-xs text-slate-400 line-clamp-2">{vid.description}</p>
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

      {/* Video Modal Player for Shared Folder view */}
      {selectedVideo && selectedVideo.playbackUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-slate-100 truncate pr-4">{selectedVideo.title}</h2>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 sm:p-4 bg-black">
              <VideoPlayer src={selectedVideo.playbackUrl} poster={selectedVideo.thumbnailUrl} />
            </div>
            {selectedVideo.description && (
              <div className="p-4 bg-slate-900 border-t border-slate-800">
                <p className="text-xs text-slate-400">{selectedVideo.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
