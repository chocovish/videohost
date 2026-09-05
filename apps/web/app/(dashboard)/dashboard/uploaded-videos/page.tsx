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
  FolderInput,
  ChevronRight,
  Home,
  Trash2,
  Share2,
  Video,
  HardDrive,
  Pencil,
  MoreVertical,
  Check,
  CheckSquare,
  X,
  Ban,
  RotateCcw,
} from "lucide-react";
import UploadModal from "@/components/UploadModal";
import ScreenRecordDrawer from "@/components/ScreenRecordDrawer";
import CreateFolderModal from "@/components/CreateFolderModal";
import RenameFolderModal from "@/components/RenameFolderModal";
import ShareModal from "@/components/ShareModal";
import MoveItemModal from "@/components/MoveItemModal";
import EditVideoModal from "@/components/EditVideoModal";
import VideoThumbnail from "@/components/VideoThumbnail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatDuration, formatBytes } from "@/lib/video-utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
  status: "UPLOADING" | "QUEUED" | "PROCESSING" | "READY" | "FAILED" | "CANCELLED";
  progress?: number;
  durationSeconds?: number;
  sizeBytes?: number | null;
  requireHls?: boolean;
  thumbnailUrl?: string;
  storageType?: string | null;
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
  const [currentFolder, setCurrentFolder] = useState<{ id: string; name: string; createdAt?: string } | null>(null);

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Multi-selection state
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [renameFolderTarget, setRenameFolderTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingCurrentFolder, setIsDeletingCurrentFolder] = useState(false);
  const [shareTarget, setShareTarget] = useState<{
    type: "video";
    id: string;
    name: string;
  } | null>(null);
  const [moveTarget, setMoveTarget] = useState<{
    type: "video" | "folder";
    id: string;
    name: string;
    currentFolderId: string | null;
  } | null>(null);
  const [editTarget, setEditTarget] = useState<VideoItem | null>(null);

  const selectedCount = selectedFolderIds.size + selectedVideoIds.size;

  const toggleSelectFolder = (id: string) => {
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectVideo = (id: string) => {
    setSelectedVideoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedFolderIds(new Set());
    setSelectedVideoIds(new Set());
  };

  const navigateToFolder = (folderId: string | null) => {
    clearSelection();
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
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("usage-updated"));
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    clearSelection();
    refreshAll();
  }, [currentFolderId]);

  // Background polling for videos in progress (Bunny encoding or HLS transcoding)
  const hasProcessingVideos = videos.some(
    (v) => v.status === "PROCESSING" || v.status === "QUEUED" || v.status === "UPLOADING"
  );

  useEffect(() => {
    if (!hasProcessingVideos) return;
    const interval = setInterval(() => {
      const url = currentFolderId ? `/api/v1/videos?folderId=${currentFolderId}` : "/api/v1/videos?folderId=root";
      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (data?.data) {
            setVideos(data.data);
          }
        })
        .catch(() => {});
    }, 40000);
    return () => clearInterval(interval);
  }, [hasProcessingVideos, currentFolderId]);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "folder" | "video";
    id: string;
    name: string;
    isCurrentFolder?: boolean;
  } | null>(null);
  const [isDeletingConfirm, setIsDeletingConfirm] = useState(false);

  const handleDeleteFolder = (e: React.MouseEvent, folderId: string, name: string) => {
    e.stopPropagation();
    setDeleteConfirm({ type: "folder", id: folderId, name });
  };

  const handleDeleteCurrentFolder = () => {
    if (!currentFolder) return;
    setDeleteConfirm({ type: "folder", id: currentFolder.id, name: currentFolder.name, isCurrentFolder: true });
  };

  const handleDeleteVideo = (e: React.MouseEvent, videoId: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirm({ type: "video", id: videoId, name: title });
  };

  const [retryingVideoIds, setRetryingVideoIds] = useState<Set<string>>(new Set());

  const handleRetryTranscode = async (e: React.MouseEvent, videoId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setRetryingVideoIds((prev) => new Set(prev).add(videoId));
    try {
      const res = await fetch(`/api/v1/videos/${videoId}/retry`, { method: "POST" });
      if (res.ok) {
        await refreshAll();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Failed to retry transcoding");
      }
    } catch (err) {
      console.error("Error retrying transcode:", err);
      alert("An error occurred while retrying transcoding");
    } finally {
      setRetryingVideoIds((prev) => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeletingConfirm(true);
    try {
      const payload =
        deleteConfirm.type === "folder"
          ? { folderIds: [deleteConfirm.id] }
          : { videoIds: [deleteConfirm.id] };

      const res = await fetch("/api/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (deleteConfirm.isCurrentFolder) {
          const parentId = breadcrumbs.length >= 2 ? breadcrumbs[breadcrumbs.length - 2].id : null;
          navigateToFolder(parentId);
        } else {
          refreshAll();
        }
        setDeleteConfirm(null);
      } else {
        const data = await res.json();
        alert(data.error || `Failed to delete ${deleteConfirm.type}`);
      }
    } catch (err) {
      console.error("Error executing delete:", err);
      alert(`An error occurred while deleting the ${deleteConfirm.type}`);
    } finally {
      setIsDeletingConfirm(false);
    }
  };

  const handleExecuteBulkDelete = async () => {
    if (selectedCount === 0) return;
    setIsBulkDeleting(true);
    try {
      const res = await fetch("/api/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoIds: Array.from(selectedVideoIds),
          folderIds: Array.from(selectedFolderIds),
        }),
      });

      if (res.ok) {
        clearSelection();
        setIsBulkDeleteModalOpen(false);
        await refreshAll();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete selected items");
      }
    } catch (err) {
      console.error("Error executing bulk delete:", err);
      alert("An error occurred during bulk deletion");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleFolderRenamed = (newName?: string) => {
    if (currentFolder && newName && renameFolderTarget?.id === currentFolder.id) {
      setCurrentFolder({ ...currentFolder, name: newName });
    }
    refreshAll();
  };

  const filteredVideos = videos.filter((v) => {
    const matchesSearch = v.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalVisibleItems = folders.length + filteredVideos.length;
  const isAllSelected =
    totalVisibleItems > 0 &&
    folders.every((f) => selectedFolderIds.has(f.id)) &&
    filteredVideos.every((v) => selectedVideoIds.has(v.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      clearSelection();
    } else {
      setSelectedFolderIds(new Set(folders.map((f) => f.id)));
      setSelectedVideoIds(new Set(filteredVideos.map((v) => v.id)));
    }
  };

  const getStatusBadge = (status: string, progress?: number) => {
    switch (status) {
      case "READY":
        return (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="w-3 h-3" /> Ready
          </Badge>
        );
      case "PROCESSING":
      case "QUEUED":
        return (
          <Badge variant="outline" className="gap-1 text-muted-foreground animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" /> {status === "QUEUED" ? "Queued" : `Encoding ${progress || 0}%`}
          </Badge>
        );
      case "UPLOADING":
        return (
          <Badge variant="default" className="gap-1">
            Uploading
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="w-3 h-3" /> Transcode Failed
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <Ban className="w-3 h-3" /> Cancelled
          </Badge>
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
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Uploaded Videos</h1>
          <p className="text-sm text-muted-foreground">
            Organize folders, manage your video library, and stream adaptive HLS
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => refreshAll()}
            disabled={isRefreshing}
            title="Refresh video assets"
            className="flex-1 sm:flex-none"
          >
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsCreateFolderOpen(true)}
            className="flex-1 sm:flex-none"
          >
            <FolderPlus className="w-4 h-4 text-primary" />
            <span>New Folder</span>
          </Button>
          <Button
            onClick={() => setIsUploadOpen(true)}
            className="flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Video</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsRecordOpen(true)}
            className="flex-1 sm:flex-none border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <Video className="w-4 h-4 text-destructive" />
            <span>Record Screen</span>
          </Button>
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Bar */}
      {selectedCount > 0 && (
        <div className="sticky top-4 z-30 flex flex-wrap items-center justify-between gap-3 p-3 sm:px-5 rounded-2xl bg-card/95 backdrop-blur-xl border border-primary/40 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="default"
              size="icon-xs"
              onClick={handleToggleSelectAll}
              className="w-6 h-6 rounded-lg shadow-xs transition-transform hover:scale-105 cursor-pointer"
              title="Toggle select all"
            >
              {isAllSelected ? (
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              ) : (
                <div className="w-2 h-0.5 bg-primary-foreground rounded-full" />
              )}
            </Button>
            <div className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span>
                <span className="font-bold text-primary">{selectedCount}</span> {selectedCount === 1 ? "item" : "items"} selected
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                ({selectedVideoIds.size} {selectedVideoIds.size === 1 ? "video" : "videos"}, {selectedFolderIds.size} {selectedFolderIds.size === 1 ? "folder" : "folders"})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleSelectAll}
              className="text-xs font-semibold h-8"
            >
              {isAllSelected ? "Deselect All" : `Select All (${totalVisibleItems})`}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
              className="text-xs font-semibold h-8 gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="text-xs font-semibold h-8 gap-1.5 shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedCount})</span>
            </Button>
          </div>
        </div>
      )}

      {/* Breadcrumb Navigation Bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-card/70 backdrop-blur-md rounded-2xl border border-border text-sm overflow-x-auto shadow-2xs">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateToFolder(null)}
          className={`flex items-center gap-1.5 font-semibold cursor-pointer ${currentFolderId === null
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
            }`}
        >
          <Home className="w-4 h-4" /> Root
        </Button>
        {breadcrumbs.map((b) => (
          <div key={b.id} className="flex items-center gap-2 shrink-0">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateToFolder(b.id)}
              className={`font-semibold cursor-pointer ${currentFolderId === b.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {b.name}
            </Button>
          </div>
        ))}
      </div>

      {/* Current Folder Details Header Banner */}
      {currentFolder && (
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-primary/10 via-primary/5 to-transparent p-5 sm:p-6 border border-primary/20 backdrop-blur-md shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3.5 rounded-2xl bg-primary/15 text-primary border border-primary/20 shrink-0 shadow-2xs">
                <Folder className="w-7 h-7 sm:w-8 sm:h-8 fill-primary/20" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                    {currentFolder.name}
                  </h2>
                  <Badge variant="outline" className="text-muted-foreground">
                    Folder
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2.5">
                  <span>
                    {videos.length} {videos.length === 1 ? "video" : "videos"}
                  </span>
                  <span>•</span>
                  <span>
                    {folders.length} {folders.length === 1 ? "subfolder" : "subfolders"}
                  </span>
                  {currentFolder.createdAt && (
                    <>
                      <span>•</span>
                      <span>Created {new Date(currentFolder.createdAt).toLocaleDateString()}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRenameFolderTarget(currentFolder)}
                className="font-semibold text-xs h-9"
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <span>Rename</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setMoveTarget({
                    type: "folder",
                    id: currentFolder.id,
                    name: currentFolder.name,
                    currentFolderId: breadcrumbs.length >= 2 ? breadcrumbs[breadcrumbs.length - 2].id : null,
                  })
                }
                className="gap-1.5"
              >
                <FolderInput className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <span>Move</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteCurrentFolder}
                disabled={isDeletingCurrentFolder}
                className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                <span>{isDeletingCurrentFolder ? "Deleting..." : "Delete Folder"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Controls Bar: Search, Select All, Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card/60 backdrop-blur-md p-3 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1 max-w-md">
          {totalVisibleItems > 0 && (
            <Button
              variant={isAllSelected ? "secondary" : "outline"}
              size="sm"
              onClick={handleToggleSelectAll}
              className="text-xs font-semibold h-9 shrink-0 gap-1.5 px-3"
              title={isAllSelected ? "Deselect all visible items" : "Select all visible items"}
            >
              <CheckSquare className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">{isAllSelected ? "Deselect All" : "Select All"}</span>
            </Button>
          )}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs sm:text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto p-1.5 -m-1.5 w-full sm:w-auto justify-start sm:justify-end scrollbar-none">
          {["ALL", "READY", "PROCESSING", "FAILED", "CANCELLED"].map((st) => (
            <Button
              key={st}
              variant={statusFilter === st ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter(st)}
              className="text-xs font-semibold h-8 shrink-0"
            >
              {st}
            </Button>
          ))}
        </div>
      </div>

      {/* Subfolders Section */}
      {folders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Folders</h2>
            {selectedFolderIds.size > 0 && (
              <span className="text-xs text-primary font-semibold">
                {selectedFolderIds.size} of {folders.length} selected
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {folders.map((folder) => {
              const isSelected = selectedFolderIds.has(folder.id);
              return (
                <div
                  key={folder.id}
                  onClick={() => navigateToFolder(folder.id)}
                  className={`group cursor-pointer glass-card card-hover rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col justify-between relative ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/40 bg-primary/5 dark:bg-primary/10 shadow-md"
                      : "border-border hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
                  }`}
                >
                  {/* Checkbox Overlay (Top Left) */}
                  <div
                    className="absolute top-2.5 left-2.5 z-20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleSelectFolder(folder.id);
                      }}
                      className={`h-5 w-5 rounded-md shadow-xs transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary text-primary-foreground ring-2 ring-primary/30 hover:bg-primary"
                          : selectedCount > 0
                          ? "border border-border bg-card/90 text-transparent hover:border-primary hover:text-muted-foreground"
                          : "border border-border/80 bg-card/90 text-transparent opacity-0 group-hover:opacity-100 hover:border-primary hover:text-muted-foreground"
                      }`}
                      title={isSelected ? "Deselect folder" : "Select folder"}
                      aria-label={`Select folder ${folder.name}`}
                    >
                      <Check className={`w-3.5 h-3.5 stroke-[3] ${isSelected ? "opacity-100" : "opacity-0"}`} />
                    </Button>
                  </div>

                  {/* Folder Content */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform shrink-0">
                          <Folder className="w-6 h-6 fill-primary/20" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3
                            className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate"
                            title={folder.name}
                          >
                            {folder.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {folder.itemCount} {folder.itemCount === 1 ? "item" : "items"}
                          </p>
                        </div>
                      </div>

                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                aria-label="Folder actions"
                              />
                            }
                          >
                            <MoreVertical className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => setRenameFolderTarget({ id: folder.id, name: folder.name })}
                              className="gap-2 font-medium cursor-pointer"
                            >
                              <Pencil className="w-4 h-4 text-muted-foreground" />
                              Rename Folder
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setMoveTarget({
                                 type: "folder",
                                  id: folder.id,
                                  name: folder.name,
                                  currentFolderId: folder.parentId,
                                })
                              }
                              className="gap-2 font-medium cursor-pointer"
                            >
                              <FolderInput className="w-4 h-4 text-muted-foreground" />
                              Move Folder
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => handleDeleteFolder(e, folder.id, folder.name)}
                              className="gap-2 font-medium text-destructive focus:text-destructive cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete Folder
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-4 pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground mt-2">
                    <span>{new Date(folder.createdAt).toLocaleDateString()}</span>
                    <span className="text-xs font-medium text-muted-foreground">Folder</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Videos Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Videos</h2>
          {selectedVideoIds.size > 0 && (
            <span className="text-xs text-primary font-semibold">
              {selectedVideoIds.size} of {filteredVideos.length} selected
            </span>
          )}
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-64" />
            ))}
          </div>
        ) : filteredVideos.length === 0 && folders.length === 0 ? (
          <div className="text-center py-16 px-4 bg-card/40 rounded-2xl border border-dashed border-border">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <Film className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground">This folder is empty</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-6">
              Create a subfolder or upload your first video to start managing your media library.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => setIsCreateFolderOpen(true)}
              >
                Create Subfolder
              </Button>
              <Button
                onClick={() => setIsUploadOpen(true)}
              >
                Upload Video
              </Button>
            </div>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-12 px-4 bg-card/40 rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
            No video files found in this directory.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => {
              const isSelected = selectedVideoIds.has(video.id);
              return (
                <div
                  key={video.id}
                  className={`group glass-card card-hover rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col justify-between relative ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/40 bg-primary/5 dark:bg-primary/10 shadow-md"
                      : "border-border hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
                  }`}
                >
                  <div>
                    {/* Thumbnail Container */}
                    <div className="relative aspect-video bg-muted overflow-hidden flex items-center justify-center">
                      {/* Checkbox Overlay (Top Left) */}
                      <div className="absolute top-2.5 left-2.5 z-20" onClick={(e) => e.stopPropagation()}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleSelectVideo(video.id);
                          }}
                          className={`h-5 w-5 rounded-md flex items-center justify-center transition-all cursor-pointer backdrop-blur-md ${
                            isSelected
                              ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/40 hover:bg-primary"
                              : selectedCount > 0
                              ? "border border-white/60 bg-black/60 text-transparent hover:border-white hover:text-white/80"
                              : "border border-white/60 bg-black/60 text-transparent opacity-0 group-hover:opacity-100 hover:border-white hover:text-white/80"
                          }`}
                          title={isSelected ? "Deselect video" : "Select video"}
                          aria-label={`Select video ${video.title}`}
                        >
                          <Check className={`w-3.5 h-3.5 stroke-[3] ${isSelected ? "opacity-100" : "opacity-0"}`} />
                        </Button>
                      </div>

                      <Link
                        href={`/dashboard/videos/${video.id}`}
                        className="w-full h-full block relative cursor-pointer"
                      >
                        <VideoThumbnail
                          src={video.thumbnailUrl}
                          alt={video.title}
                          status={video.status}
                          storageType={video.storageType}
                          progress={video.progress}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Play Overlay */}
                          {video.status === "READY" && (
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                              <Play className="w-6 h-6 fill-primary-foreground ml-0.5" />
                            </div>
                          </div>
                        )}

                        {/* Duration Badge */}
                        {video.durationSeconds && (
                          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 text-white text-xs font-bold flex items-center gap-1 backdrop-blur-xs">
                            <Clock className="w-3 h-3" /> {formatDuration(video.durationSeconds)}
                          </span>
                        )}

                        {/* Share Access Tag (Top Right) */}
                        <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/60 text-white text-xs font-semibold uppercase backdrop-blur-xs">
                          {video.shareAccessMode}
                        </span>
                      </Link>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/dashboard/videos/${video.id}`}
                          className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1 flex-1"
                        >
                          {video.title}
                        </Link>

                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                aria-label="Video actions"
                              />
                            }
                          >
                            <MoreVertical className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => setEditTarget(video)}
                              className="gap-2 font-medium cursor-pointer"
                            >
                              <Pencil className="w-4 h-4 text-muted-foreground" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setMoveTarget({
                                  type: "video",
                                  id: video.id,
                                  name: video.title,
                                  currentFolderId: video.folderId || null,
                                })
                              }
                              className="gap-2 font-medium cursor-pointer"
                            >
                              <FolderInput className="w-4 h-4 text-muted-foreground" />
                              Move Video
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setShareTarget({ type: "video", id: video.id, name: video.title })}
                              className="gap-2 font-medium cursor-pointer"
                            >
                              <Share2 className="w-4 h-4 text-muted-foreground" />
                              Share Video
                            </DropdownMenuItem>
                            {(video.status === "FAILED" || video.status === "CANCELLED") && (
                              <DropdownMenuItem
                                onClick={(e) => handleRetryTranscode(e, video.id)}
                                disabled={retryingVideoIds.has(video.id)}
                                className="gap-2 font-medium cursor-pointer"
                              >
                                <RotateCcw className={`w-4 h-4 ${retryingVideoIds.has(video.id) ? "animate-spin" : ""}`} />
                                {retryingVideoIds.has(video.id) ? "Retrying..." : "Retry Transcoding"}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => handleDeleteVideo(e, video.id, video.title)}
                              className="gap-2 font-medium text-destructive focus:text-destructive cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete Video
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {video.description && (
                        <RichTextViewer
                          content={video.description}
                          clamp={2}
                          className="text-xs text-muted-foreground line-clamp-2"
                        />
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-4 pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground mt-2 gap-2">
                    <div className="flex items-center gap-2">
                      <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                      <span
                        className="inline-flex items-center gap-1 font-medium bg-muted px-2 py-0.5 rounded-md text-xs"
                        title="Video file size"
                      >
                        <HardDrive className="w-3 h-3 text-muted-foreground" />
                        {formatBytes(video.sizeBytes)}
                        {video.requireHls && video.status !== "READY" && video.sizeBytes ? " (Original)" : ""}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {(video.status === "FAILED" || video.status === "CANCELLED") && (
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={(e) => handleRetryTranscode(e, video.id)}
                          disabled={retryingVideoIds.has(video.id)}
                          className="gap-1 h-6 text-xs"
                          title="Retry transcoding (cleans residual dash folder first)"
                        >
                          <RotateCcw className={`w-3 h-3 ${retryingVideoIds.has(video.id) ? "animate-spin" : ""}`} />
                          {retryingVideoIds.has(video.id) ? "Retrying..." : "Retry"}
                        </Button>
                      )}
                      {getStatusBadge(video.status, video.progress)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rename Folder Modal */}
      {renameFolderTarget && (
        <RenameFolderModal
          isOpen={!!renameFolderTarget}
          onClose={() => setRenameFolderTarget(null)}
          onSuccess={handleFolderRenamed}
          folder={renameFolderTarget}
        />
      )}

      {/* Move Item Modal */}
      {moveTarget && (
        <MoveItemModal
          isOpen={!!moveTarget}
          onClose={() => setMoveTarget(null)}
          onSuccess={refreshAll}
          itemType={moveTarget.type}
          itemId={moveTarget.id}
          itemName={moveTarget.name}
          currentFolderId={moveTarget.currentFolderId}
        />
      )}

      {/* Edit Video Modal */}
      {editTarget && (
        <EditVideoModal
          isOpen={!!editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={refreshAll}
          video={editTarget}
        />
      )}

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

      {/* Screen Record Drawer */}
      <ScreenRecordDrawer
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        onUploadSuccess={refreshAll}
        currentFolderId={currentFolderId}
        folderPathName={folderPathName}
      />

      {/* Single Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
        title={
          deleteConfirm?.type === "folder"
            ? `Delete Folder "${deleteConfirm.name}"?`
            : `Delete Video "${deleteConfirm?.name}"?`
        }
        description={
          deleteConfirm?.type === "folder"
            ? `Are you sure you want to delete folder "${deleteConfirm.name}"? This folder, all its nested subfolders, and all videos inside will be permanently deleted from storage. This action cannot be undone.`
            : `Are you sure you want to delete video "${deleteConfirm?.name}"? This action cannot be undone and will permanently remove the video and its files from storage.`
        }
        variant="danger"
        confirmText={deleteConfirm?.type === "folder" ? "Delete Folder" : "Delete Video"}
        cancelText="Cancel"
        isLoading={isDeletingConfirm}
        onConfirm={handleExecuteDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isBulkDeleteModalOpen}
        onOpenChange={(open) => {
          if (!open && !isBulkDeleting) setIsBulkDeleteModalOpen(false);
        }}
        title={`Delete ${selectedCount} selected ${selectedCount === 1 ? "item" : "items"}?`}
        description={`Are you sure you want to delete ${selectedVideoIds.size > 0 ? `${selectedVideoIds.size} video(s)` : ""}${selectedVideoIds.size > 0 && selectedFolderIds.size > 0 ? " and " : ""}${selectedFolderIds.size > 0 ? `${selectedFolderIds.size} folder(s)` : ""}? Selected videos and folders (including all nested subfolders and their contained videos) will be permanently deleted from storage. This action cannot be undone.`}
        variant="danger"
        confirmText={`Delete ${selectedCount} ${selectedCount === 1 ? "Item" : "Items"}`}
        cancelText="Cancel"
        isLoading={isBulkDeleting}
        onConfirm={handleExecuteBulkDelete}
        onCancel={() => setIsBulkDeleteModalOpen(false)}
      />
    </div>
  );
}

export default function UploadedVideosPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground font-medium">Loading uploaded videos...</div>}>
      <UploadedVideosContent />
    </Suspense>
  );
}
