"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
  CheckCircle2,
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
  DollarSign,
  Receipt,
  ShoppingBag,
  Volume2,
  Video as VideoIcon,
} from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import ShareModal from "@/components/ShareModal";
import MoveItemModal from "@/components/MoveItemModal";
import EditVideoModal from "@/components/EditVideoModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

import { formatBytes } from "@/lib/video-utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatMoney } from "@/lib/utils";

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
  shareAccessMode: "PUBLIC" | "RESTRICTED" | "PRIVATE" | "PURCHASABLE";
  price?: number | null;
  currency?: string | null;
  countryPricing?: any;
  playbackUrl?: string;
  thumbnailUrl?: string;
  storageType?: string | null;
  bunnyVideoId?: string | null;
  renditions: { resolution: string; bitrateKbps: number; playlistUrl: string; sizeBytes?: number }[];
  createdAt: string;
}

interface BunnyRenditionsData {
  guid: string;
  title: string;
  status: number;
  encodeProgress: number;
  isPublic: boolean;
  storageSize: number;
  length: number;
  width: number;
  height: number;
  framerate: number;
  views: number;
  dateUploaded: string;
  thumbnailCount: number;
  thumbnailFileName?: string | null;
  collectionId?: string | null;
  availableResolutionsRaw: string | null;
  availableResolutions: string[];
  local: {
    id: string;
    title: string;
    status: string;
    progress?: number | null;
    sizeBytes: number | null;
    durationSeconds?: number | null;
    sourceResolution: string | null;
    bunnyVideoId: string | null;
    bunnyLibraryId: string | null;
    storageType: string | null;
  };
  synced?: boolean;
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
  const [activeTab, setActiveTab] = useState<"details" | "embed" | "renditions" | "purchases">("details");
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Video purchases state
  const [purchases, setPurchases] = useState<any[]>([]);
  const [purchasesStats, setPurchasesStats] = useState<{
    totalRevenue: number;
    salesCount: number;
    basePrice?: number | null;
    currency?: string;
    shareAccessMode?: string;
  } | null>(null);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  // Bunny renditions state – lazy fetched when renditions tab is opened
  const [bunnyData, setBunnyData] = useState<BunnyRenditionsData | null>(null);
  const [bunnyLoading, setBunnyLoading] = useState(false);
  const [bunnyError, setBunnyError] = useState<string | null>(null);

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

  const fetchVideoPurchases = async () => {
    setLoadingPurchases(true);
    try {
      const res = await fetch(`/api/v1/videos/${id}/purchases`);
      if (res.ok) {
        const data = await res.json();
        setPurchases(data.purchases || []);
        setPurchasesStats(data.stats || null);
      }
    } catch (err) {
      console.error("Failed to load video purchases:", err);
    } finally {
      setLoadingPurchases(false);
    }
  };

  const isBunnyVideo = Boolean(
    video && (((video.storageType || "").toLowerCase() === "bunny") || Boolean(video.bunnyVideoId))
  );

  const fetchBunnyRenditions = async (force = false) => {
    if (!id) return;
    if (!isBunnyVideo && !force) return;
    if (bunnyLoading) return;
    setBunnyLoading(true);
    setBunnyError(null);
    try {
      const res = await fetch(`/api/v1/videos/${id}/bunny`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || data?.details || `Failed to load renditions data (${res.status})`);
      }
      setBunnyData(data as BunnyRenditionsData);

      // Sync DB progress/status polled from Bunny Stream into main video state
      if (data?.local) {
        setVideo((prev) =>
          prev
            ? {
                ...prev,
                status: data.local.status ?? prev.status,
                progress: typeof data.local.progress === "number" ? data.local.progress : prev.progress,
                durationSeconds: data.local.durationSeconds ?? prev.durationSeconds,
                sourceResolution: data.local.sourceResolution ?? prev.sourceResolution,
                sizeBytes: data.local.sizeBytes ?? prev.sizeBytes,
              }
            : prev
        );
      }
    } catch (e: any) {
      console.error("Failed to load renditions:", e);
      setBunnyError(e?.message || "Failed to fetch renditions");
      setBunnyData(null);
    } finally {
      setBunnyLoading(false);
    }
  };

  // Reset bunny state when switching videos
  useEffect(() => {
    setBunnyData(null);
    setBunnyError(null);
    setBunnyLoading(false);
  }, [id]);

  // Auto-fetch bunny data when renditions tab is opened for bunny videos
  useEffect(() => {
    if (activeTab === "renditions" && isBunnyVideo && !bunnyData && !bunnyLoading && !bunnyError) {
      fetchBunnyRenditions();
    }
  }, [activeTab, isBunnyVideo, bunnyData, bunnyLoading, bunnyError, id]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (isBunnyVideo) {
      await fetchBunnyRenditions(true);
      await Promise.all([fetchVideoDetail(true), fetchVideoPurchases()]);
    } else {
      await Promise.all([fetchVideoDetail(true), fetchVideoPurchases()]);
    }
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
    fetchVideoPurchases();
  }, [id]);

  // Auto-poll video progress if video is still processing / queued / uploading
  const isVideoProcessing = Boolean(
    video && (video.status === "PROCESSING" || video.status === "QUEUED" || video.status === "UPLOADING")
  );

  useEffect(() => {
    if (!isVideoProcessing) return;
    const interval = setInterval(() => {
      fetchVideoDetail(true);
      if (isBunnyVideo) {
        fetchBunnyRenditions(true);
      }
    }, 40000);

    return () => clearInterval(interval);
  }, [isVideoProcessing, isBunnyVideo, id]);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    setIsDeleteConfirmOpen(true);
  };

  const handleExecuteDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoIds: [id] }),
      });
      if (res.ok) {
        router.push(backUrl);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete video");
      }
    } catch (e) {
      console.error("Delete error", e);
    } finally {
      setIsDeleting(false);
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
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold">Video not found</h2>
        <Link href="/dashboard/uploaded-videos" className="text-primary hover:underline mt-2 inline-block">
          Return to Uploaded Videos
        </Link>
      </div>
    );
  }

  const isDash = video.playbackUrl?.includes(".mpd");
  const mediaTag = isDash ? "dash-video" : "video";

  const iframeEmbedCode = typeof window !== "undefined"
    ? `<iframe src="${window.location.origin}/embed/${video.id}" width="100%" height="450" frameborder="0" allowfullscreen></iframe>`
    : "";
  const scriptEmbedCode = `<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/video.js"></script>${
    isDash
      ? `
<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/media/dash-video.js"></script>`
      : ""
  }
<video-player style="aspect-ratio:16/9;width:100%">
  <video-skin>
    <${mediaTag} src="${video.playbackUrl}" playsinline></${mediaTag}>
  </video-skin>
</video-player>`;

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href={backUrl}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Videos
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {(video.status === "FAILED" || video.status === "CANCELLED") && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRetryTranscode}
              disabled={isRetrying}
              className="flex-1 sm:flex-none"
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
            className="flex-1 sm:flex-none"
            title="Refresh video details"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditOpen(true)}
            className="flex-1 sm:flex-none"
            title="Edit video title, description, and thumbnail"
          >
            <Pencil className="w-4 h-4 text-primary" />
            <span>Edit Video</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMoveOpen(true)}
            className="flex-1 sm:flex-none"
            title="Move video to another folder"
          >
            <FolderInput className="w-4 h-4" />
            <span>Move Video</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setIsShareOpen(true)}
            className="flex-1 sm:flex-none"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Video</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="flex-1 sm:flex-none text-destructive hover:bg-destructive/10"
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
            ) : video.status === "FAILED" || video.status === "CANCELLED" ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-6 text-center max-w-md mx-auto">
                <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-foreground">{video.status === "CANCELLED" ? "Transcoding Cancelled" : "Transcoding Failed"}</p>
                  <p className="text-xs text-muted-foreground">
                    {video.status === "CANCELLED"
                      ? "Video processing was cancelled and any partial encodes were cleaned up. You can retry encoding."
                      : "HLS adaptive bitrate encoding encountered an issue during processing."}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRetryTranscode}
                  disabled={isRetrying}
                  className="mt-2 gap-2"
                >
                  <RotateCcw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />
                  {isRetrying ? "Requeueing Job..." : "Retry Transcoding"}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-6 text-center max-w-sm mx-auto">
                <Clock className="w-8 h-8 animate-spin text-primary" />
                <div className="space-y-2 w-full">
                  <p className="text-sm font-semibold text-foreground">Video Transcoding in Progress</p>
                  <p className="text-xs text-muted-foreground font-medium">Progress: {video.progress || 0}%</p>
                  <Progress value={Math.min(100, Math.max(0, video.progress || 0))} className="w-full" />
                  <p className="text-xs text-muted-foreground">Check back in 10 mins</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="mt-2 gap-2 text-xs bg-card/80 hover:bg-card border-border/80 text-foreground"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
                  <span>{isRefreshing ? "Checking Progress..." : "Refresh Progress"}</span>
                </Button>
              </div>
            )}
          </div>

          <div className="border border-border rounded-2xl bg-card p-4 sm:p-6 shadow-2xs space-y-4">
            {/* Tabs */}
            <div className="flex border-b border-border gap-2 pb-2 text-sm font-semibold overflow-x-auto whitespace-nowrap">
              <Button
                variant={activeTab === "details" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("details")}
                className="gap-2"
              >
                <FileText className="w-4 h-4" /> Video Details
              </Button>
              <Button
                variant={activeTab === "embed" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("embed")}
                className="gap-2"
              >
                <Code className="w-4 h-4" /> Embed Codes
              </Button>
              <Button
                variant={activeTab === "renditions" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setActiveTab("renditions");
                  // trigger bunny fetch eagerly on click if not yet loaded
                  if (
                    ((video.storageType || "").toLowerCase() === "bunny" || Boolean(video.bunnyVideoId)) &&
                    !bunnyData &&
                    !bunnyLoading &&
                    !bunnyError
                  ) {
                    // schedule after state update; use microtask
                    setTimeout(() => fetchBunnyRenditions(), 0);
                  }
                }}
                className="gap-2"
              >
                <Layers className="w-4 h-4" /> Renditions (
                {isBunnyVideo
                  ? bunnyLoading
                    ? "…"
                    : bunnyData
                      ? bunnyData.availableResolutions.length
                      : "…"
                  : video.renditions?.length > 0
                    ? video.renditions.length
                    : video.requireHls && video.status !== "FAILED"
                      ? "Processing"
                      : 0}
                )
              </Button>
              <Button
                variant={activeTab === "purchases" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("purchases")}
                className="gap-2"
              >
                <DollarSign className="w-4 h-4" /> Purchases ({purchases.length})
              </Button>
            </div>

            {/* Tab 1: Video Details (Selected by default) */}
            {activeTab === "details" && (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap min-w-0 flex-1">
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground wrap-break-word">
                      {video.title}
                    </h2>
                    <Badge variant="outline" className="uppercase shrink-0">
                      {video.shareAccessMode}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditOpen(true)}
                    className="shrink-0 gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5 text-primary" />
                    <span>Edit Video</span>
                  </Button>
                </div>

                {video.description ? (
                  <div className="max-h-72 overflow-y-auto text-sm text-foreground/90 pr-1">
                    <RichTextViewer content={video.description} />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No description provided. Click &ldquo;Edit Video&rdquo; to add one.
                  </p>
                )}
              </div>
            )}

            {/* Tab 2: Embed Code */}
            {activeTab === "embed" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
                    <span>IFRAME EMBED (RECOMMENDED)</span>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => copyToClipboard(iframeEmbedCode, "iframe")}
                      className="h-auto p-1 gap-1"
                    >
                      {copiedType === "iframe" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedType === "iframe" ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <pre className="p-3 bg-muted text-foreground border border-border text-xs rounded-xl overflow-x-auto font-mono whitespace-pre-wrap break-all">
                    {iframeEmbedCode}
                  </pre>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
                    <span>DIRECT VIDEO.JS EMBED</span>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => copyToClipboard(scriptEmbedCode, "script")}
                      className="h-auto p-1 gap-1 cursor-pointer"
                    >
                      {copiedType === "script" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedType === "script" ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <pre className="p-3 bg-muted text-foreground border border-border text-xs rounded-xl overflow-x-auto font-mono whitespace-pre-wrap break-all">
                    {scriptEmbedCode}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 3: Transcoded Renditions Ladder */}
            {activeTab === "renditions" && (
              <div className="space-y-4">
                {isBunnyVideo ? (
                  // ——— Bunny.net Stream storage branch ———
                  bunnyLoading && !bunnyData ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                      <span>Fetching renditions data…</span>
                    </div>
                  ) : bunnyError ? (
                    <Alert variant="destructive" className="text-xs">
                      <AlertTriangle className="w-4 h-4" />
                      <AlertTitle className="text-xs font-semibold">Failed to fetch Bunny renditions</AlertTitle>
                      <AlertDescription className="text-xs flex items-center justify-between gap-2">
                        <span>{bunnyError}</span>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => fetchBunnyRenditions(true)}
                          disabled={bunnyLoading}
                          className="gap-1.5 shrink-0"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${bunnyLoading ? "animate-spin" : ""}`} />
                          Retry
                        </Button>
                      </AlertDescription>
                    </Alert>
                  ) : bunnyData ? (
                    bunnyData.availableResolutions && bunnyData.availableResolutions.length > 0 ? (
                      <div className="space-y-3 py-1">
                        <p className="text-sm font-medium text-foreground">
                          Encoded in <span className="font-bold text-primary">{bunnyData.availableResolutions.length}</span> resolution{bunnyData.availableResolutions.length !== 1 ? "s" : ""}:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {bunnyData.availableResolutions.map((res) => (
                            <Badge
                              key={res}
                              variant="outline"
                              className="gap-1.5 border-primary/20 bg-primary/10 text-primary font-mono text-xs py-1 px-2.5"
                            >
                              <VideoIcon className="w-3.5 h-3.5" />
                              {res}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground py-2">
                        {bunnyData.encodeProgress < 100
                          ? `Transcoding in progress (${bunnyData.encodeProgress}%). No resolutions encoded yet.`
                          : "No encoded resolutions available."}
                      </p>
                    )
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                      <span>No renditions data available.</span>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => fetchBunnyRenditions(true)}
                        disabled={bunnyLoading}
                        className="gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${bunnyLoading ? "animate-spin" : ""}`} /> Fetch
                      </Button>
                    </div>
                  )
                ) : video.renditions?.length > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Adaptive bitrate stream representations packaged into fMP4 / HLS streams:
                    </p>
                    <div className="divide-y divide-border">
                      {video.renditions.map((rend) => {
                        const isAudio = rend.resolution.toLowerCase().includes("audio");
                        return (
                          <div
                            key={rend.resolution}
                            className="py-3 flex items-center justify-between gap-2 text-sm"
                          >
                            <div className="flex items-center gap-3">
                              <Badge
                                variant="outline"
                                className={`gap-1.5 ${
                                  isAudio
                                    ? "bg-muted text-muted-foreground"
                                    : "border-primary/20 bg-primary/10 text-primary"
                                }`}
                              >
                                {isAudio ? (
                                  <Volume2 className="w-3.5 h-3.5" />
                                ) : (
                                  <VideoIcon className="w-3.5 h-3.5" />
                                )}
                                {rend.resolution}
                              </Badge>
                              <span className="text-xs text-muted-foreground font-mono">
                                {rend.bitrateKbps} kbps bitrate
                                {rend.sizeBytes ? ` (${formatBytes(rend.sizeBytes)})` : ""}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : video.requireHls ? (
                  video.status === "FAILED" || video.status === "CANCELLED" ? (
                    <Alert variant="destructive" className="text-xs">
                      <AlertTriangle />
                      <AlertTitle className="flex items-center justify-between gap-2 font-semibold">
                        <span>{video.status === "CANCELLED" ? "Transcoding Cancelled (Require HLS = ON)" : "Transcoding Failed (Require HLS = ON)"}</span>
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={handleRetryTranscode}
                          disabled={isRetrying}
                          className="gap-1.5 shrink-0"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                          {isRetrying ? "Requeueing..." : "Retry Transcoding"}
                        </Button>
                      </AlertTitle>
                      <AlertDescription className="text-xs leading-relaxed">
                        {video.status === "CANCELLED"
                          ? "Transcoding was cancelled and any partial dash segments were cleaned up. Click retry to re-encode."
                          : "HLS transcoding failed during processing. Click the button above to retry transcoding or re-upload the video."}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="text-xs">
                      <RefreshCw className="animate-spin" />
                      <AlertTitle className="flex items-center justify-between gap-2 font-semibold">
                        <span>Transcoding in Progress ({video.progress || 0}%)</span>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={handleRefresh}
                          disabled={isRefreshing}
                          className="gap-1 shrink-0"
                        >
                          <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} /> Refresh Status
                        </Button>
                      </AlertTitle>
                      <AlertDescription className="text-xs space-y-3">
                        <Progress value={Math.min(100, Math.max(0, video.progress || 0))} className="w-full" />
                        <p className="text-[11px] text-muted-foreground">Check back in 10 mins</p>
                        <p className="leading-relaxed">
                          HLS transcoding is currently in progress for this video ({video.status === "QUEUED" ? "Queued" : video.status === "UPLOADING" ? "Uploading" : `Processing ${video.progress || 0}%`}). Adaptive bitrate renditions will be available here once completed. Use the Refresh button above to check latest status.
                        </p>
                      </AlertDescription>
                    </Alert>
                  )
                ) : (
                  <Alert className="text-xs">
                    <AlertTitle className="text-xs font-semibold">Direct Playback Mode (Require HLS = OFF)</AlertTitle>
                    <AlertDescription className="text-xs space-y-1 leading-relaxed">
                      <p>
                        HLS transcoding was disabled for this video upon upload. The original video file is stored in Cloudflare R2 and served directly.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Tab 4: Purchases History */}
            {activeTab === "purchases" && (
              <div className="space-y-6">
                {/* Stats Header */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-card border border-border space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <Receipt className="w-3.5 h-3.5 text-primary" /> Total Video Revenue
                    </span>
                    <p className="text-xl font-black text-foreground">
                      {formatMoney(purchasesStats ? purchasesStats.totalRevenue : 0, video?.currency || "USD")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {purchasesStats?.salesCount || 0} direct purchase{purchasesStats?.salesCount !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-card border border-border space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-primary" /> Share Mode & Price
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="uppercase">
                        {video.shareAccessMode}
                      </Badge>
                      {video.shareAccessMode === "PURCHASABLE" && (
                        <span className="font-bold text-sm text-foreground">
                          {formatMoney(video.price, video.currency || "USD")} <span className="text-xs text-muted-foreground font-normal">({video.currency || "USD"})</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {video.shareAccessMode === "PURCHASABLE" ? "Paid access enabled" : "Free / restricted sharing"}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-card border border-border space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <ShoppingBag className="w-3.5 h-3.5 text-primary" /> Total Buyers
                    </span>
                    <p className="text-xl font-black text-foreground">
                      {purchases.length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Active user licenses
                    </p>
                  </div>
                </div>

                {/* Table of Buyers */}
                {loadingPurchases ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Loading purchases...
                  </div>
                ) : purchases.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-border rounded-xl space-y-2 p-6 bg-muted/20">
                    <ShoppingBag className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
                    <p className="text-sm font-semibold text-foreground">No purchases yet</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      When visitors purchase access to this video, their details and transaction IDs will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="border border-border rounded-xl">
                    <Table className="text-left text-xs">
                      <TableHeader className="bg-muted/60 text-muted-foreground font-semibold">
                        <TableRow>
                          <TableHead className="py-3 px-4">Buyer</TableHead>
                          <TableHead className="py-3 px-4">Amount Paid</TableHead>
                          <TableHead className="py-3 px-4">Country</TableHead>
                          <TableHead className="py-3 px-4">Purchased On</TableHead>
                          <TableHead className="py-3 px-4">Payment ID</TableHead>
                          <TableHead className="py-3 px-4">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchases.map((p) => (
                          <TableRow key={p.id} className="hover:bg-muted/30">
                            <TableCell className="py-3 px-4">
                              <div className="font-semibold text-foreground">
                                {p.user?.name || "Buyer"}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {p.user?.email || "—"}
                              </div>
                            </TableCell>
                            <TableCell className="py-3 px-4 font-bold text-foreground">
                              {formatMoney(p.amount, p.currency)} <span className="text-xs text-muted-foreground font-normal font-mono">({p.currency})</span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-muted-foreground font-mono">
                              {p.countryCode || "GLOBAL"}
                            </TableCell>
                            <TableCell className="py-3 px-4 text-muted-foreground">
                              {new Date(p.createdAt).toLocaleDateString()} {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                            <TableCell className="py-3 px-4 text-muted-foreground font-mono text-xs">
                              {p.paymentId}
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <Badge variant="secondary">{p.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Metadata Sidebar */}
        <div className="space-y-6">
          {/* Asset Info Card */}
          <div className="glass-card rounded-2xl p-6 border border-border space-y-3 text-xs">
            <h3 className="font-bold text-sm text-foreground uppercase tracking-wider mb-2">
              Asset Metadata
            </h3>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Video ID</span>
              <span className="font-mono text-foreground">{video.id}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Share Access</span>
              <span className="font-bold text-foreground uppercase">{video.shareAccessMode}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">HLS Mode</span>
              <span className="font-semibold text-foreground">
                {video.requireHls ? "Required" : "Disabled (Direct)"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Source Resolution</span>
              <span className="font-semibold text-foreground">{video.sourceResolution || "Probing"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Total File Size</span>
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                {formatBytes(video.sizeBytes)}
                {video.requireHls && video.status !== "READY" && (
                  <Badge variant="outline" className="font-medium">
                    Original File
                  </Badge>
                )}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Uploaded On</span>
              <span className="text-foreground">{new Date(video.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title={`Delete Video "${video.title}"?`}
        description="Are you sure you want to delete this video and all its transcoded renditions? This action cannot be undone."
        variant="danger"
        confirmText="Delete Video"
        cancelText="Cancel"
        isLoading={isDeleting}
        onConfirm={handleExecuteDelete}
      />
    </div>
  );
}
