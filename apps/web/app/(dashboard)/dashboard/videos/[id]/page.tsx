"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
  Trash2,
  Code,
  Clock,
  Layers,
  Share2,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  FolderInput,
  Pencil,
  FileText,
} from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import ShareModal from "@/components/ShareModal";
import MoveItemModal from "@/components/MoveItemModal";
import EditVideoModal from "@/components/EditVideoModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { formatBytes } from "@/lib/video-utils";

interface VideoDetail {
  id: string;
  title: string;
  description?: string | null;
  folderId?: string | null;
  status: string;
  progress?: number;
  requireHls?: boolean;
  durationSeconds?: number;
  sizeBytes?: number | null;
  sourceResolution?: string;
  shareAccessMode: "PUBLIC" | "RESTRICTED" | "PRIVATE";
  playbackUrl?: string;
  thumbnailUrl?: string;
  renditions: { resolution: string; bitrateKbps: number; playlistUrl: string; sizeBytes?: number }[];
  createdAt: string;
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "embed" | "renditions">("details");
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const backUrl = video?.folderId ? `/dashboard/uploaded-videos?folderId=${video.folderId}` : "/dashboard/uploaded-videos";

  const fetchVideoDetail = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await fetch(`/api/v1/videos/${id}`);
      const data = await res.json();
      if (res.ok) {
        setVideo(data);
      }
    } catch (e) {
      console.error("Failed to load video details:", e);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchVideoDetail(true);
    setIsRefreshing(false);
  };

  const handleRetryTranscode = async () => {
    setIsRetrying(true);
    try {
      const res = await fetch(`/api/v1/videos/${id}/retry`, { method: "POST" });
      if (res.ok) {
        await fetchVideoDetail(true);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to retry transcoding.");
      }
    } catch (e) {
      console.error("Retry transcode error", e);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleEditSuccess = (updatedData: any) => {
    if (updatedData) {
      setVideo((prev) => (prev ? { ...prev, ...updatedData } : prev));
    }
    fetchVideoDetail(true);
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
        <Link href="/dashboard/uploaded-videos" className="text-[hsl(var(--primary))] hover:underline mt-2 inline-block">
          Return to Uploaded Videos
        </Link>
      </div>
    );
  }

  const isHls = video.playbackUrl?.includes(".m3u8");
  const mimeType = isHls ? "application/x-mpegURL" : "video/mp4";

  const iframeEmbedCode = typeof window !== "undefined"
    ? `<iframe src="${window.location.origin}/embed/${video.id}" width="100%" height="450" frameborder="0" allowfullscreen></iframe>`
    : "";
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
        <div className="flex flex-wrap items-center gap-2">
          {video.status === "FAILED" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRetryTranscode}
              disabled={isRetrying}
              className="flex-1 sm:flex-none font-semibold min-h-[40px]"
              title="Retry transcoding job"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
              <span>{isRetrying ? "Retrying..." : "Retry Transcoding"}</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex-1 sm:flex-none font-semibold min-h-[40px]"
            title="Refresh video details"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[hsl(var(--primary))]" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditOpen(true)}
            className="flex-1 sm:flex-none font-semibold min-h-[40px]"
            title="Edit video title, description, and thumbnail"
          >
            <Pencil className="w-4 h-4 text-[hsl(var(--primary))]" />
            <span>Edit Video</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMoveOpen(true)}
            className="flex-1 sm:flex-none font-semibold min-h-[40px]"
            title="Move video to another folder"
          >
            <FolderInput className="w-4 h-4" />
            <span>Move Video</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setIsShareOpen(true)}
            className="flex-1 sm:flex-none font-semibold min-h-[40px]"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Video</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="flex-1 sm:flex-none font-semibold text-red-600 hover:bg-red-500/10 min-h-[40px]"
          >
            <Trash2 className="w-4 h-4 mr-1.5" /> Delete Video
          </Button>
        </div>
      </div>

      {video && (
        <EditVideoModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSuccess={handleEditSuccess}
          video={video}
        />
      )}

      {video && (
        <MoveItemModal
          isOpen={isMoveOpen}
          onClose={() => setIsMoveOpen(false)}
          onSuccess={fetchVideoDetail}
          itemType="video"
          itemId={video.id}
          itemName={video.title}
          currentFolderId={video.folderId || null}
        />
      )}

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
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player */}
          <div className="aspect-video w-full rounded-2xl overflow-hidden relative flex items-center justify-center bg-black shadow-lg">
            {video.playbackUrl ? (
              <VideoPlayer src={video.playbackUrl} poster={video.thumbnailUrl} className="w-full h-full rounded-2xl" />
            ) : video.status === "FAILED" ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 p-6 text-center max-w-md mx-auto">
                <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-slate-100">Transcoding Failed</p>
                  <p className="text-xs text-slate-400">
                    HLS adaptive bitrate encoding encountered an issue during processing.
                  </p>
                </div>
                <button
                  onClick={handleRetryTranscode}
                  disabled={isRetrying}
                  className="mt-2 flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors shadow-md disabled:opacity-50"
                >
                  <RotateCcw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />
                  {isRetrying ? "Requeueing Job..." : "Retry Transcoding"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 p-6 text-center max-w-sm mx-auto">
                <Clock className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
                <div className="space-y-2 w-full">
                  <p className="text-sm font-semibold text-slate-200">Video Transcoding in Progress</p>
                  <p className="text-xs text-slate-400 font-medium">Progress: {video.progress || 0}%</p>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                    <div
                      className="bg-[hsl(var(--primary))] h-2 transition-all duration-500 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, video.progress || 0))}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border border-[hsl(var(--border))] rounded-2xl bg-white dark:bg-slate-900/60 p-4 sm:p-6 shadow-xs space-y-4">
            {/* Tabs */}
            <div className="flex border-b border-[hsl(var(--border))] gap-4 sm:gap-6 text-sm font-semibold overflow-x-auto whitespace-nowrap">
              <button
                onClick={() => setActiveTab("details")}
                className={`pb-3 flex items-center gap-2 transition-colors border-b-2 shrink-0 ${activeTab === "details"
                  ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                  : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  }`}
              >
                <FileText className="w-4 h-4" /> Video Details
              </button>
              <button
                onClick={() => setActiveTab("embed")}
                className={`pb-3 flex items-center gap-2 transition-colors border-b-2 shrink-0 ${activeTab === "embed"
                  ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                  : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  }`}
              >
                <Code className="w-4 h-4" /> Embed Codes
              </button>
              <button
                onClick={() => setActiveTab("renditions")}
                className={`pb-3 flex items-center gap-2 transition-colors border-b-2 shrink-0 ${activeTab === "renditions"
                  ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                  : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  }`}
              >
                <Layers className="w-4 h-4" /> Renditions ({video.renditions?.length > 0 ? video.renditions.length : video.requireHls && video.status !== "FAILED" ? "Processing" : 0})
              </button>
            </div>

            {/* Tab 1: Video Details (Selected by default) */}
            {activeTab === "details" && (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap min-w-0 flex-1">
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[hsl(var(--foreground))] break-words">
                      {video.title}
                    </h2>
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider shrink-0">
                      {video.shareAccessMode}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditOpen(true)}
                    className="shrink-0 font-semibold gap-1.5 text-xs h-9"
                  >
                    <Pencil className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                    <span>Edit Video</span>
                  </Button>
                </div>

                {video.description ? (
                  <div className="max-h-72 overflow-y-auto text-sm text-[hsl(var(--muted-foreground))] whitespace-pre-wrap leading-relaxed pr-1">
                    {video.description}
                  </div>
                ) : (
                  <p className="text-xs text-[hsl(var(--muted-foreground))] italic">
                    No description provided. Click &ldquo;Edit Video&rdquo; to add one.
                  </p>
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
                              {rend.bitrateKbps} kbps bitrate{rend.sizeBytes ? ` (${formatBytes(rend.sizeBytes)})` : ""}
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
                ) : video.requireHls ? (
                  video.status === "FAILED" ? (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-3">
                      <div className="flex items-center justify-between gap-2 font-semibold text-red-800">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <span>Transcoding Failed (Require HLS = ON)</span>
                        </div>
                        <button
                          onClick={handleRetryTranscode}
                          disabled={isRetrying}
                          className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 shadow-xs disabled:opacity-50"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                          {isRetrying ? "Requeueing..." : "Retry Transcoding"}
                        </button>
                      </div>
                      <p className="text-red-700/90 leading-relaxed">
                        HLS transcoding failed during processing. Click the button above to retry transcoding or re-upload the video.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-3">
                      <div className="flex items-center justify-between gap-2 font-semibold text-amber-800">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                          <span>Transcoding in Progress ({video.progress || 0}%)</span>
                        </div>
                        <button
                          onClick={handleRefresh}
                          disabled={isRefreshing}
                          className="px-2.5 py-1 text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold rounded-lg transition-colors border border-amber-300 flex items-center gap-1 shrink-0"
                        >
                          <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} /> Refresh Status
                        </button>
                      </div>
                      <div className="w-full bg-amber-200/80 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-amber-600 h-2.5 transition-all duration-500 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, video.progress || 0))}%` }}
                        />
                      </div>
                      <p className="text-amber-800/90 leading-relaxed">
                        HLS transcoding is currently in progress for this video ({video.status === "QUEUED" ? "Queued" : video.status === "UPLOADING" ? "Uploading" : `Processing ${video.progress || 0}%`}). Adaptive bitrate renditions will be available here once completed. Use the Refresh button above to check latest status.
                      </p>
                    </div>
                  )
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
              <span className="text-[hsl(var(--muted-foreground))]">HLS Mode</span>
              <span className="font-semibold text-[hsl(var(--foreground))]">
                {video.requireHls ? "Required" : "Disabled (Direct)"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[hsl(var(--border))]">
              <span className="text-[hsl(var(--muted-foreground))]">Source Resolution</span>
              <span className="font-semibold text-[hsl(var(--foreground))]">{video.sourceResolution || "Probing"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[hsl(var(--border))]">
              <span className="text-[hsl(var(--muted-foreground))]">Total File Size</span>
              <span className="font-semibold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                {formatBytes(video.sizeBytes)}
                {video.requireHls && video.status !== "READY" && (
                  <span className="text-[10px] text-amber-600 font-medium bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                    Original File
                  </span>
                )}
              </span>
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
