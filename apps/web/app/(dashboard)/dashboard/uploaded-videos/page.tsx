"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Search,
  Film,
  Play,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  FolderPlus,
  Folder,
  ChevronRight,
  Home,
  Trash2,
  Share2,
} from "lucide-react";
import UploadModal from "@/components/UploadModal";
import CreateFolderModal from "@/components/CreateFolderModal";
import ShareModal from "@/components/ShareModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  itemCount: number;
  createdAt: string;
}

interface VideoItem {
  id: string;
  title: string;
  description?: string;
  status: "UPLOADING" | "QUEUED" | "PROCESSING" | "READY" | "FAILED";
  progress?: number;
  durationSeconds?: number;
  thumbnailUrl?: string;
  shareAccessMode: "PUBLIC" | "RESTRICTED" | "PRIVATE";
  createdAt: string;
  folderId?: string | null;
}

function UploadedVideosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFolderId = searchParams.get("folderId");

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [currentFolder, setCurrentFolder] = useState<{ id: string; name: string } | null>(null);

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<{
    type: "video" | "folder";
    id: string;
    name: string;
  } | null>(null);

  const navigateToFolder = (folderId: string | null) => {
    if (folderId) {
      router.push(`/dashboard/uploaded-videos?folderId=${folderId}`);
    } else {
      router.push("/dashboard/uploaded-videos");
    }
  };

  const fetchFolders = async (parentId: string | null) => {
    try {
      const url = parentId ? `/api/folders?parentId=${parentId}` : "/api/folders?parentId=root";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setFolders(data.folders || []);
        setBreadcrumbs(data.breadcrumbs || []);
        setCurrentFolder(data.currentFolder || null);
      }
    } catch (err) {
      console.error("Error loading folders:", err);
    }
  };

  const fetchVideos = async (folderId: string | null) => {
    try {
      setLoading(true);
      const url = folderId ? `/api/v1/videos?folderId=${folderId}` : "/api/v1/videos?folderId=root";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.data) {
        setVideos(data.data);
      }
    } catch (err) {
      console.error("Error loading videos:", err);
    } finally {
      setLoading(false);
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchFolders(currentFolderId),
        fetchVideos(currentFolderId),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, [currentFolderId]);

  const handleDeleteFolder = async (e: React.MouseEvent, folderId: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete folder "${name}"? Contained videos will be moved to Root.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        refreshAll();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete folder");
      }
    } catch (err) {
      console.error("Error deleting folder:", err);
    }
  };

  const filteredVideos = videos.filter((v) => {
    const matchesSearch = v.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const getStatusBadge = (status: string, progress?: number) => {
    switch (status) {
      case "READY":
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Ready
          </span>
        );
      case "PROCESSING":
      case "QUEUED":
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-600 flex items-center gap-1 animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" /> {status === "QUEUED" ? "Queued" : `Encoding ${progress || 0}%`}
          </span>
        );
      case "UPLOADING":
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-600">Uploading</span>
        );
      case "FAILED":
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-500/10 text-red-600 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Transcode Failed
          </span>
        );
      default:
        return null;
    }
  };

  const folderPathName =
    breadcrumbs.length > 0 ? ["Root", ...breadcrumbs.map((b) => b.name)].join(" / ") : "Root";

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[hsl(var(--foreground))]">Uploaded Videos</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Organize folders, manage your video library, and stream adaptive HLS
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => refreshAll()}
            disabled={isRefreshing}
            title="Refresh video assets"
            className="flex-1 sm:flex-none font-semibold min-h-[44px]"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${isRefreshing ? "animate-spin text-[hsl(var(--primary))]" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsCreateFolderOpen(true)}
            className="flex-1 sm:flex-none font-semibold min-h-[44px]"
          >
            <FolderPlus className="w-4 h-4 text-amber-600 mr-1" />
            <span>New Folder</span>
          </Button>
          <Button
            onClick={() => setIsUploadOpen(true)}
            className="w-full sm:w-auto font-semibold min-h-[44px]"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span>Upload Video</span>
          </Button>
        </div>
      </div>

      {/* Breadcrumb Navigation Bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl border border-[hsl(var(--border))] text-sm overflow-x-auto shadow-xs">
        <button
          onClick={() => navigateToFolder(null)}
          className={`flex items-center gap-1.5 font-semibold transition-colors cursor-pointer ${
            currentFolderId === null
              ? "text-[hsl(var(--primary))]"
              : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          }`}
        >
          <Home className="w-4 h-4" /> Root
        </button>
        {breadcrumbs.map((b) => (
          <div key={b.id} className="flex items-center gap-2 shrink-0">
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <button
              onClick={() => navigateToFolder(b.id)}
              className={`font-semibold transition-colors cursor-pointer ${
                currentFolderId === b.id
                  ? "text-[hsl(var(--primary))]"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              {b.name}
            </button>
          </div>
        ))}
      </div>

      {/* Controls Bar: Search & Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-3 rounded-2xl border border-[hsl(var(--border))] shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {["ALL", "READY", "PROCESSING", "FAILED"].map((st) => (
            <Button
              key={st}
              variant={statusFilter === st ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter(st)}
              className="text-xs font-semibold"
            >
              {st}
            </Button>
          ))}
        </div>
      </div>

      {/* Subfolders Section */}
      {folders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Folders</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {folders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => navigateToFolder(folder.id)}
                className="group cursor-pointer glass-card bg-white p-4 rounded-2xl border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/50 hover:shadow-md transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-105 transition-transform shrink-0">
                    <Folder className="w-6 h-6 fill-amber-500/20" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors truncate">
                      {folder.name}
                    </h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {folder.itemCount} {folder.itemCount === 1 ? "item" : "items"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShareTarget({ type: "folder", id: folder.id, name: folder.name });
                    }}
                    title="Share folder via email"
                    aria-label="Share folder"
                    className="p-2 rounded-lg text-slate-400 hover:text-[hsl(var(--primary))] hover:bg-slate-100 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteFolder(e, folder.id, folder.name)}
                    title="Delete folder"
                    aria-label="Delete folder"
                    className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Videos Section */}
      <div className="space-y-3 pt-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Videos</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-64 rounded-2xl bg-slate-200/60 animate-pulse" />
            ))}
          </div>
        ) : filteredVideos.length === 0 && folders.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white/40 rounded-2xl border border-dashed border-[hsl(var(--border))]">
            <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] flex items-center justify-center mx-auto mb-4">
              <Film className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">This folder is empty</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-sm mx-auto mt-1 mb-6">
              Create a subfolder or upload your first video to start managing your media library.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setIsCreateFolderOpen(true)}
                className="px-4 py-2 bg-white border border-[hsl(var(--border))] text-[hsl(var(--foreground))] font-semibold text-sm rounded-xl hover:bg-slate-50"
              >
                Create Subfolder
              </button>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-4 py-2 bg-[hsl(var(--primary))] text-white font-semibold text-sm rounded-xl hover:opacity-90"
              >
                Upload Video
              </button>
            </div>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white/30 rounded-2xl border border-dashed border-[hsl(var(--border))] text-sm text-[hsl(var(--muted-foreground))]">
            No video files found in this directory.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => (
              <Link
                key={video.id}
                href={`/dashboard/videos/${video.id}`}
                className="group glass-card rounded-2xl overflow-hidden border border-[hsl(var(--border))] hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail Container */}
                  <div className="aspect-video bg-slate-900 relative overflow-hidden flex items-center justify-center">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-slate-500">
                        <Film className="w-10 h-10 mb-1" />
                        <span className="text-xs">No Preview</span>
                      </div>
                    )}

                    {/* Play Overlay */}
                    {video.status === "READY" && (
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                          <Play className="w-6 h-6 fill-white ml-0.5" />
                        </div>
                      </div>
                    )}

                    {/* Duration Badge */}
                    {video.durationSeconds && (
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs">
                        <Clock className="w-3 h-3" /> {formatDuration(video.durationSeconds)}
                      </span>
                    )}

                    {/* Share Access Tag */}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-semibold uppercase backdrop-blur-xs">
                      {video.shareAccessMode}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-base text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors line-clamp-1">
                        {video.title}
                      </h3>
                    </div>
                    {video.description && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2">{video.description}</p>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="p-4 pt-2 border-t border-[hsl(var(--border))]/50 flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))] mt-2">
                  <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShareTarget({ type: "video", id: video.id, name: video.title });
                      }}
                      title="Share video via email"
                      className="p-1 rounded-md text-slate-400 hover:text-[hsl(var(--primary))] hover:bg-slate-100 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    {getStatusBadge(video.status, video.progress)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {shareTarget && (
        <ShareModal
          isOpen={!!shareTarget}
          onClose={() => setShareTarget(null)}
          targetType={shareTarget.type}
          targetId={shareTarget.id}
          targetName={shareTarget.name}
          onAccessModeChange={() => refreshAll()}
        />
      )}

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        onSuccess={refreshAll}
        parentId={currentFolderId}
        parentFolderName={currentFolder?.name}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={refreshAll}
        currentFolderId={currentFolderId}
        folderPathName={folderPathName}
      />
    </div>
  );
}

export default function UploadedVideosPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium animate-pulse">Loading uploaded videos...</div>}>
      <UploadedVideosContent />
    </Suspense>
  );
}
