"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, Copy, Check, Trash2, Code, Clock, Layers, Share2 } from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import ShareModal from "@/components/ShareModal";

interface VideoDetail {
  id: string;
  title: string;
  description?: string;
  folderId?: string | null;
  status: string;
  durationSeconds?: number;
  sourceResolution?: string;
  shareAccessMode: "PUBLIC" | "RESTRICTED" | "PRIVATE";
  playbackUrl?: string;
  thumbnailUrl?: string;
  renditions: { resolution: string; bitrateKbps: number; playlistUrl: string }[];
  createdAt: string;
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"player" | "embed" | "renditions">("player");
  const [isShareOpen, setIsShareOpen] = useState(false);

  const backUrl = video?.folderId ? `/dashboard?folderId=${video.folderId}` : "/dashboard";

  const fetchVideoDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/videos/${id}`);
      const data = await res.json();
      if (res.ok) {
        setVideo(data);
      }
    } catch (e) {
      console.error("Failed to load video details:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideoDetail();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this video and all its transcoded renditions?")) return;
    try {
      const res = await fetch(`/api/v1/videos/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push(backUrl);
      }
    } catch (e) {
      console.error("Delete error", e);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 bg-slate-200 rounded-lg animate-pulse" />
        <div className="h-96 w-full bg-slate-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold">Video not found</h2>
        <Link href="/dashboard" className="text-[hsl(var(--primary))] hover:underline mt-2 inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isHls = video.playbackUrl?.includes(".m3u8");
  const mimeType = isHls ? "application/x-mpegURL" : "video/mp4";

  const iframeEmbedCode = `<iframe src="${window.location.origin}/embed/${video.id}" width="100%" height="450" frameborder="0" allowfullscreen></iframe>`;
  const scriptEmbedCode = `<link href="https://vjs.zencdn.net/8/video-js.css" rel="stylesheet" />
<video-js id="player-${video.id}" class="vjs-big-play-centered" controls preload="auto">
  <source src="${video.playbackUrl}" type="${mimeType}">
</video-js>
<script src="https://vjs.zencdn.net/8/video.js"></script>`;

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href={backUrl}
          className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Videos
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsShareOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold bg-[hsl(var(--primary))] text-white hover:opacity-90 rounded-xl transition-colors shadow-xs min-h-[40px]"
          >
            <Share2 className="w-4 h-4" /> Share Video
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-500/10 rounded-xl transition-colors min-h-[40px]"
          >
            <Trash2 className="w-4 h-4" /> Delete Video
          </button>
        </div>
      </div>

      {video && (
        <ShareModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          targetType="video"
          targetId={video.id}
          targetName={video.title}
          onAccessModeChange={(newMode) => {
            setVideo((prev) => (prev ? { ...prev, shareAccessMode: newMode } : prev));
          }}
        />
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Player and Tabs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="border border-[hsl(var(--border))] rounded-2xl bg-white p-4 sm:p-6 shadow-xs space-y-4">
            {/* Tabs */}
            <div className="flex border-b border-[hsl(var(--border))] gap-4 sm:gap-6 text-sm font-semibold overflow-x-auto whitespace-nowrap">
              <button
                onClick={() => setActiveTab("player")}
                className={`pb-3 flex items-center gap-2 transition-colors border-b-2 shrink-0 ${
                  activeTab === "player"
                    ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                    : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                <Play className="w-4 h-4" /> Player Preview
              </button>
              <button
                onClick={() => setActiveTab("embed")}
                className={`pb-3 flex items-center gap-2 transition-colors border-b-2 shrink-0 ${
                  activeTab === "embed"
                    ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                    : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                <Code className="w-4 h-4" /> Embed Codes
              </button>
              <button
                onClick={() => setActiveTab("renditions")}
                className={`pb-3 flex items-center gap-2 transition-colors border-b-2 shrink-0 ${
                  activeTab === "renditions"
                    ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                    : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                <Layers className="w-4 h-4" /> Renditions ({video.renditions?.length || 0})
              </button>
            </div>

            {/* Tab 1: Video Player */}
            {activeTab === "player" && (
              <div className="aspect-video w-full bg-black rounded-xl overflow-hidden relative">
                {video.playbackUrl ? (
                  <VideoPlayer src={video.playbackUrl} poster={video.thumbnailUrl} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 p-4 text-center">
                    <Clock className="w-8 h-8 animate-spin" />
                    <p className="text-sm font-medium">Video is currently processing...</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Embed Code */}
            {activeTab === "embed" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                    <span>IFRAME EMBED (RECOMMENDED)</span>
                    <button
                      onClick={() => copyToClipboard(iframeEmbedCode, "iframe")}
                      className="text-[hsl(var(--primary))] flex items-center gap-1 hover:underline p-1"
                    >
                      {copiedType === "iframe" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedType === "iframe" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 text-slate-200 text-xs rounded-xl overflow-x-auto font-mono whitespace-pre-wrap break-all">
                    {iframeEmbedCode}
                  </pre>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                    <span>DIRECT VIDEO.JS EMBED</span>
                    <button
                      onClick={() => copyToClipboard(scriptEmbedCode, "script")}
                      className="text-[hsl(var(--primary))] flex items-center gap-1 hover:underline p-1"
                    >
                      {copiedType === "script" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedType === "script" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 text-slate-200 text-xs rounded-xl overflow-x-auto font-mono whitespace-pre-wrap break-all">
                    {scriptEmbedCode}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 3: Transcoded Renditions Ladder */}
            {activeTab === "renditions" && (
              <div className="space-y-4">
                {video.renditions?.length > 0 ? (
                  <>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Adaptive bitrate renditions packaged into fMP4 / HLS streams:
                    </p>
                    <div className="divide-y divide-[hsl(var(--border))]">
                      {video.renditions.map((rend) => (
                        <div key={rend.resolution} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                          <div className="flex items-center gap-3">
                            <span className="font-bold px-2.5 py-1 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] rounded-lg">
                              {rend.resolution}
                            </span>
                            <span className="text-xs text-[hsl(var(--muted-foreground))] font-mono">
                              {rend.bitrateKbps} kbps bitrate
                            </span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(rend.playlistUrl, rend.resolution)}
                            className="text-xs text-[hsl(var(--primary))] hover:underline font-medium self-start sm:self-auto"
                          >
                            {copiedType === rend.resolution ? "Copied URL" : "Copy Playlist URL"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-800">Direct Playback Mode (Require HLS = OFF)</p>
                    <p>
                      HLS transcoding was disabled for this video upon upload. The original video file is stored in Cloudflare R2 and served directly.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Metadata Sidebar */}
        <div className="space-y-6">
          {/* Asset Info Card */}
          <div className="glass-card rounded-2xl p-6 border border-[hsl(var(--border))] space-y-3 text-xs">
            <h3 className="font-bold text-sm text-[hsl(var(--foreground))] uppercase tracking-wider mb-2">
              Asset Metadata
            </h3>
            <div className="flex justify-between py-1 border-b border-[hsl(var(--border))]">
              <span className="text-[hsl(var(--muted-foreground))]">Video ID</span>
              <span className="font-mono text-[hsl(var(--foreground))]">{video.id}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[hsl(var(--border))]">
              <span className="text-[hsl(var(--muted-foreground))]">Share Access</span>
              <span className="font-bold text-[hsl(var(--foreground))] uppercase">{video.shareAccessMode}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[hsl(var(--border))]">
              <span className="text-[hsl(var(--muted-foreground))]">Source Resolution</span>
              <span className="font-semibold text-[hsl(var(--foreground))]">{video.sourceResolution || "Probing"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[hsl(var(--border))]">
              <span className="text-[hsl(var(--muted-foreground))]">Uploaded On</span>
              <span className="text-[hsl(var(--foreground))]">{new Date(video.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
