"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ListVideo,
  ArrowLeft,
  Share2,
  Trash2,
  Pencil,
  Plus,
  Search,
  Folder,
  FolderPlus,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Play,
  Clock,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe,
  Lock,
  ShieldAlert,
  Film,
  Sparkles,
  RefreshCw,
  X,
  DollarSign,
  Receipt,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ShareModal from "@/components/ShareModal";
import {
  ShareAccessMode,
  CountryPriceItem,
  ShareAccessModeSelector,
} from "@/components/share";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import VideoPlayer from "@/components/VideoPlayer";
import { formatDuration } from "@/lib/video-utils";
import { formatMoney } from "@/lib/utils";

interface PlaylistItem {
  itemId: string;
  order: number;
  videoId: string;
  title: string;
  description: string | null;
  status: string;
  durationSeconds: number | null;
  sizeBytes: number | null;
  thumbnailUrl: string | null;
  playbackUrl: string;
  folderId: string | null;
  folderName: string | null;
  createdAt: string;
}

interface PlaylistDetail {
  id: string;
  title: string;
  description: string | null;
  shareAccessMode: "PUBLIC" | "RESTRICTED" | "PRIVATE" | "PURCHASABLE";
  price?: number | null;
  currency?: string | null;
  countryPricing?: any;
  shareUrl: string;
  itemCount: number;
  totalDurationSeconds: number;
  videos: PlaylistItem[];
  createdAt: string;
  updatedAt: string;
}

interface SearchVideoResult {
  id: string;
  title: string;
  description: string | null;
  durationSeconds: number | null;
  status: string;
  thumbnailUrl: string | null;
  folderName: string | null;
  alreadyInPlaylist: boolean;
  createdAt: string;
}

interface FolderOption {
  id: string;
  name: string;
  itemCount: number;
}

export default function PlaylistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const playlistId = params?.id as string;

  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab State
  const [playlistTab, setPlaylistTab] = useState<"videos" | "purchases">("videos");

  // Reorder State
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderSavedSuccess, setOrderSavedSuccess] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Playlist Purchases State
  const [purchases, setPurchases] = useState<any[]>([]);
  const [purchasesStats, setPurchasesStats] = useState<{
    totalRevenue: number;
    salesCount: number;
    basePrice?: number | null;
    currency?: string;
    shareAccessMode?: string;
  } | null>(null);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  // Add Videos Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"search" | "folder">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchVideoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingVideoIds, setAddingVideoIds] = useState<Set<string>>(new Set());

  // Folder Add State
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [addingFolder, setAddingFolder] = useState(false);
  const [folderAddSuccessMsg, setFolderAddSuccessMsg] = useState<string | null>(null);

  // Edit / Rename Modal State
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const [renameDescription, setRenameDescription] = useState("");
  const [renameShareAccessMode, setRenameShareAccessMode] = useState<ShareAccessMode>("PUBLIC");
  const [renamePrice, setRenamePrice] = useState("19.99");
  const [renameCurrency, setRenameCurrency] = useState("USD");
  const [renameCountryPricing, setRenameCountryPricing] = useState<CountryPriceItem[]>([]);
  const [renaming, setRenaming] = useState(false);

  // Delete Dialog
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Share Modal
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Video Preview Modal
  const [previewVideo, setPreviewVideo] = useState<PlaylistItem | null>(null);

  const fetchPlaylistDetails = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const res = await fetch(`/api/playlists/${playlistId}`);
      const data = await res.json();
      if (res.ok && data.playlist) {
        setPlaylist(data.playlist);
        setItems(data.playlist.videos || []);
      } else {
        setError(data.error || "Failed to load playlist");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load playlist");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchPlaylistPurchases = async () => {
    setLoadingPurchases(true);
    try {
      const res = await fetch(`/api/playlists/${playlistId}/purchases`);
      if (res.ok) {
        const data = await res.json();
        setPurchases(data.purchases || []);
        setPurchasesStats(data.stats || null);
      }
    } catch (err) {
      console.error("Failed to load playlist purchases:", err);
    } finally {
      setLoadingPurchases(false);
    }
  };

  useEffect(() => {
    if (playlistId) {
      fetchPlaylistDetails(true);
      fetchPlaylistPurchases();
    }
  }, [playlistId]);

  // Search Videos for Add Modal
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/playlists/search-videos?playlistId=${playlistId}&query=${encodeURIComponent(query)}`
        );
        const data = await res.json();
        if (res.ok) {
          setSearchResults(data.videos || []);
        }
      } catch (e) {
        console.error("Failed to search videos:", e);
      } finally {
        setSearching(false);
      }
    }, 250);
  };

  // Fetch all folders when Add Modal opens
  const fetchFolders = async () => {
    setLoadingFolders(true);
    try {
      const res = await fetch("/api/folders?all=true");
      const data = await res.json();
      if (res.ok && data.folders) {
        setFolders(data.folders);
        if (data.folders.length > 0 && !selectedFolderId) {
          setSelectedFolderId(data.folders[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to fetch folders:", e);
    } finally {
      setLoadingFolders(false);
    }
  };

  const openAddModal = () => {
    setIsAddModalOpen(true);
    setSearchQuery("");
    setSearchResults([]);
    setFolderAddSuccessMsg(null);
    handleSearchChange("");
    fetchFolders();
  };

  // Add individual video
  const handleAddVideo = async (videoId: string) => {
    setAddingVideoIds((prev) => new Set(prev).add(videoId));
    try {
      const res = await fetch(`/api/playlists/${playlistId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });
      const data = await res.json();
      if (res.ok) {
        // Mark as added in search results
        setSearchResults((prev) =>
          prev.map((v) => (v.id === videoId ? { ...v, alreadyInPlaylist: true } : v))
        );
        fetchPlaylistDetails();
      } else {
        alert(data.error || "Failed to add video");
      }
    } catch (err: any) {
      alert(err.message || "Failed to add video");
    } finally {
      setAddingVideoIds((prev) => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    }
  };

  // Add all videos from Folder
  const handleAddFromFolder = async () => {
    if (!selectedFolderId) return;

    setAddingFolder(true);
    setFolderAddSuccessMsg(null);
    try {
      const res = await fetch(`/api/playlists/${playlistId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: selectedFolderId }),
      });
      const data = await res.json();
      if (res.ok) {
        setFolderAddSuccessMsg(
          data.addedCount > 0
            ? `Successfully added ${data.addedCount} new videos from folder!`
            : "All videos in this folder are already part of the playlist."
        );
        fetchPlaylistDetails();
      } else {
        alert(data.error || "Failed to add videos from folder");
      }
    } catch (err: any) {
      alert(err.message || "Failed to add videos from folder");
    } finally {
      setAddingFolder(false);
    }
  };

  // Remove video from playlist
  const [removeItemTarget, setRemoveItemTarget] = useState<{ itemId: string; videoTitle: string } | null>(null);
  const [isRemovingItem, setIsRemovingItem] = useState(false);

  const handleRemoveItem = (itemId: string, videoTitle: string) => {
    setRemoveItemTarget({ itemId, videoTitle });
  };

  const handleExecuteRemoveItem = async () => {
    if (!removeItemTarget) return;
    const { itemId } = removeItemTarget;
    setIsRemovingItem(true);
    const previousItems = [...items];
    const newItems = items.filter((item) => item.itemId !== itemId);
    setItems(newItems);

    try {
      const res = await fetch(`/api/playlists/${playlistId}/items?itemId=${itemId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRemoveItemTarget(null);
        fetchPlaylistDetails();
      } else {
        setItems(previousItems);
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to remove video");
      }
    } catch (err) {
      setItems(previousItems);
      console.error("Error removing item:", err);
    } finally {
      setIsRemovingItem(false);
    }
  };

  // Save new order to backend
  const persistOrder = async (orderedList: PlaylistItem[]) => {
    setSavingOrder(true);
    try {
      const orderedItemIds = orderedList.map((item) => item.itemId);
      const res = await fetch(`/api/playlists/${playlistId}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedItemIds }),
      });
      if (res.ok) {
        setOrderSavedSuccess(true);
        setTimeout(() => setOrderSavedSuccess(false), 2000);
      }
    } catch (e) {
      console.error("Failed to save playlist order:", e);
    } finally {
      setSavingOrder(false);
    }
  };

  // Move item up / down
  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    setItems(newItems);
    persistOrder(newItems);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...items];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, movedItem);

    setItems(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
    persistOrder(updated);
  };

  // Handle Playlist Rename & Settings
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTitle.trim()) return;

    setRenaming(true);
    try {
      const isPurchasable = renameShareAccessMode === "PURCHASABLE";
      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: renameTitle.trim(),
          description: renameDescription.trim() || null,
          shareAccessMode: renameShareAccessMode,
          price: isPurchasable && renamePrice ? parseFloat(renamePrice) : null,
          currency: isPurchasable ? renameCurrency : "USD",
          countryPricing: isPurchasable ? renameCountryPricing : [],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsRenameOpen(false);
        fetchPlaylistDetails();
      } else {
        alert(data.error || "Failed to update playlist");
      }
    } catch (err: any) {
      alert(err.message || "Failed to update playlist");
    } finally {
      setRenaming(false);
    }
  };

  // Handle Playlist Delete
  const handleDeleteSubmit = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/dashboard/playlists");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete playlist");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete playlist");
    } finally {
      setDeleting(false);
    }
  };

  const getAccessBadge = (mode: string) => {
    switch (mode) {
      case "PUBLIC":
        return (
          <Badge variant="outline" className="gap-1.5 text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
            <Globe className="w-3.5 h-3.5" /> Public
          </Badge>
        );
      case "RESTRICTED":
        return (
          <Badge variant="outline" className="gap-1.5 text-indigo-600 border-indigo-500/30 bg-indigo-500/10">
            <Lock className="w-3.5 h-3.5" /> Restricted
          </Badge>
        );
      case "PRIVATE":
        return (
          <Badge variant="secondary" className="gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" /> Private
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-semibold text-muted-foreground">Loading playlist...</p>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Playlist Not Found</h2>
        <p className="text-sm text-muted-foreground">{error || "This playlist could not be loaded."}</p>
        <Link href="/dashboard/playlists">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Playlists
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link
            href="/dashboard/playlists"
            className="p-2 mt-1 rounded-xl bg-white dark:bg-slate-900 border border-border text-muted-foreground hover:text-foreground shadow-2xs transition-colors shrink-0"
            title="Back to Playlists"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="space-y-1.5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Playlist Collection
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                {playlist.title}
              </h1>
              {getAccessBadge(playlist.shareAccessMode)}
            </div>

            {playlist.description && (
              <div className="text-sm text-foreground/90 leading-relaxed max-w-3xl">
                <RichTextViewer content={playlist.description} />
              </div>
            )}

            <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground pt-0.5 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-primary" /> {items.length} {items.length === 1 ? "Video" : "Videos"}
              </span>
              {playlist.totalDurationSeconds > 0 && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" /> {formatDuration(playlist.totalDurationSeconds)} Total Duration
                </span>
              )}
              <span>Created {new Date(playlist.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0 lg:self-start">
          <Button
            variant="outline"
            onClick={() => {
              setRenameTitle(playlist.title);
              setRenameDescription(playlist.description || "");
              setRenameShareAccessMode(playlist.shareAccessMode || (playlist.price ? "PURCHASABLE" : "PUBLIC"));
              setRenamePrice(playlist.price !== undefined && playlist.price !== null ? String(playlist.price) : "19.99");
              setRenameCurrency(playlist.currency || "USD");
              setRenameCountryPricing(Array.isArray(playlist.countryPricing) ? playlist.countryPricing : []);
              setIsRenameOpen(true);
            }}
            className="gap-2"
          >
            <Pencil className="w-4 h-4" /> Edit Playlist & Access
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsShareOpen(true)}
            className="gap-2"
          >
            <Share2 className="w-4 h-4" /> Share Playlist
          </Button>

          <Button
            onClick={openAddModal}
            className="gap-2"
          >
            <Plus className="w-4 h-4" /> Add Videos
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsDeleteOpen(true)}
            className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
            title="Delete Playlist"
          >
            <Trash2 className="w-4 h-4" /> Delete Playlist
          </Button>
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <div className="flex items-center gap-2 p-1.5 bg-muted/60 rounded-2xl border border-border w-fit">
        <button
          onClick={() => setPlaylistTab("videos")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            playlistTab === "videos"
              ? "bg-card text-foreground shadow-xs border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Film className="w-4 h-4 text-primary" /> Playlist Sequence ({items.length})
        </button>
        <button
          onClick={() => setPlaylistTab("purchases")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            playlistTab === "purchases"
              ? "bg-card text-foreground shadow-xs border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <DollarSign className="w-4 h-4 text-lime-500" /> Purchases ({purchases.length})
        </button>
      </div>

      {/* TAB 1: VIDEOS SEQUENCE & REORDERING */}
      {playlistTab === "videos" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">Playlist Sequence</h2>
              <span className="text-xs text-muted-foreground">
                (Drag rows or use up/down arrows to reorder)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {savingOrder && (
                <span className="text-xs font-bold text-primary flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving order...
                </span>
              )}
              {orderSavedSuccess && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Order saved
                </span>
              )}
            </div>
          </div>

        {items.length === 0 ? (
          <div className="text-center py-16 px-4 bg-card/40 rounded-2xl border border-dashed border-border">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <Film className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-lg text-foreground">This playlist is empty</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-6">
              Add videos to your playlist by searching video titles, IDs, or adding all videos from a folder.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                onClick={openAddModal}
                className="gap-2"
              >
                <Plus className="w-4 h-4" /> Add First Video
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item, index) => {
              const isDragging = draggedIndex === index;
              const isDragOver = dragOverIndex === index;

              return (
                <div
                  key={item.itemId}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`group relative bg-white dark:bg-slate-900/90 border rounded-2xl p-3 flex items-center justify-between gap-4 transition-all duration-200 ${
                    isDragging
                      ? "opacity-40 scale-[0.98] border-dashed border-primary"
                      : isDragOver
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/40 hover:shadow-xs"
                  }`}
                >
                  {/* Left: Drag Handle & Number */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div
                      className="cursor-grab active:cursor-grabbing p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      title="Drag to reorder"
                    >
                      <GripVertical className="w-5 h-5" />
                    </div>

                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-mono font-bold text-xs text-slate-600 dark:text-slate-300">
                      {index + 1}
                    </div>
                  </div>

                  {/* Video Thumbnail */}
                  <div
                    onClick={() => setPreviewVideo(item)}
                    className="relative w-28 sm:w-32 aspect-video bg-slate-950 rounded-xl overflow-hidden shrink-0 cursor-pointer group/thumb shadow-2xs"
                  >
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-600">
                        <Film className="w-6 h-6" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                      <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                    {item.durationSeconds && (
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 backdrop-blur-md text-[10px] font-bold text-slate-200 rounded">
                        {formatDuration(item.durationSeconds)}
                      </span>
                    )}
                  </div>

                  {/* Video Details */}
                  <div className="flex-1 min-w-0">
                    <h4
                      onClick={() => setPreviewVideo(item)}
                      className="font-bold text-sm text-foreground hover:text-primary transition-colors cursor-pointer line-clamp-1"
                    >
                      {item.title}
                    </h4>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      {item.folderName && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                          <Folder className="w-3 h-3 text-amber-500" />
                          {item.folderName}
                        </span>
                      )}
                      <span className="font-mono text-[11px] text-slate-400">ID: {item.videoId}</span>
                    </div>
                  </div>

                  {/* Reorder Buttons & Remove Action */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Up / Down Controls for Touch and Accessibility */}
                    <div className="flex flex-col">
                      <button
                        onClick={() => moveItem(index, "up")}
                        disabled={index === 0}
                        className="p-1 rounded text-slate-400 hover:text-foreground disabled:opacity-20 disabled:hover:text-slate-400 transition-colors"
                        title="Move Up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveItem(index, "down")}
                        disabled={index === items.length - 1}
                        className="p-1 rounded text-slate-400 hover:text-foreground disabled:opacity-20 disabled:hover:text-slate-400 transition-colors"
                        title="Move Down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(item.itemId, item.title)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-500/10 transition-colors ml-1"
                      title="Remove from playlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* TAB 2: PURCHASES & BUYERS */}
      {playlistTab === "purchases" && (
        <div className="space-y-6">
          {/* Stats Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-card border border-border space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5 text-primary" /> Total Playlist Revenue
              </span>
              <p className="text-xl font-black text-foreground">
                {formatMoney(purchasesStats ? purchasesStats.totalRevenue : 0, playlist?.currency || "USD")}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {purchasesStats?.salesCount || 0} direct purchase{purchasesStats?.salesCount !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-lime-500" /> Share Mode & Price
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="uppercase text-[10px]">
                  {playlist.shareAccessMode}
                </Badge>
                {playlist.shareAccessMode === "PURCHASABLE" && (
                  <span className="font-bold text-sm text-foreground">
                    {formatMoney(playlist.price, playlist.currency || "USD")} <span className="text-xs text-muted-foreground font-normal">({playlist.currency || "USD"})</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {playlist.shareAccessMode === "PURCHASABLE" ? "All videos in playlist unlocked on buy" : "Free / restricted sharing"}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5 text-primary" /> Total Buyers
              </span>
              <p className="text-xl font-black text-foreground">
                {purchases.length}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Active playlist licenses
              </p>
            </div>
          </div>

          {/* Table of Buyers */}
          {loadingPurchases ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Loading playlist purchases...
            </div>
          ) : purchases.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-border rounded-xl space-y-2 p-6 bg-muted/20">
              <ShoppingBag className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
              <p className="text-sm font-semibold text-foreground">No purchases yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                When visitors purchase access to this playlist, all videos in it will automatically unlock for them, and their transaction records will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3 px-4">Buyer</th>
                    <th className="py-3 px-4">Amount Paid</th>
                    <th className="py-3 px-4">Country</th>
                    <th className="py-3 px-4">Purchased On</th>
                    <th className="py-3 px-4">Payment ID</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">
                          {p.user?.name || "Buyer"}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {p.user?.email || "—"}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-foreground">
                        {formatMoney(p.amount, p.currency)} <span className="text-[10px] text-muted-foreground font-normal font-mono">({p.currency})</span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono">
                        {p.countryCode || "GLOBAL"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString()} {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                        {p.paymentId}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Videos Modal (Search by title/ID or Add from Folder) */}
      <Dialog open={isAddModalOpen} onOpenChange={(open) => !open && setIsAddModalOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle>Add Videos to Playlist</DialogTitle>
                <DialogDescription>Search by title or video ID, or import an entire folder</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs
            defaultValue="search"
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as "search" | "folder")}
            className="flex-1 flex flex-col min-h-0 pt-2"
          >
            <TabsList className="grid grid-cols-2 rounded-xl p-1 bg-slate-100 dark:bg-slate-800">
              <TabsTrigger value="search" className="rounded-lg font-bold text-xs gap-2">
                <Search className="w-3.5 h-3.5" /> Search Title or Video ID
              </TabsTrigger>
              <TabsTrigger value="folder" className="rounded-lg font-bold text-xs gap-2">
                <FolderPlus className="w-3.5 h-3.5" /> Add from Folder
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: SEARCH VIDEOS */}
            <TabsContent value="search" className="flex-1 flex flex-col min-h-0 space-y-3 pt-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search by video title or paste video ID..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 rounded-xl"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearchChange("")}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Search Results List */}
              <div className="flex-1 overflow-y-auto max-h-[380px] space-y-2 pr-1">
                {searching ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-xs">Searching organization videos...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 space-y-1">
                    <Film className="w-8 h-8 mx-auto opacity-40" />
                    <p className="text-sm font-medium">No videos found</p>
                    <p className="text-xs">Try searching with a different title or video ID.</p>
                  </div>
                ) : (
                  searchResults.map((video) => {
                    const isAdding = addingVideoIds.has(video.id);

                    return (
                      <div
                        key={video.id}
                        className="bg-slate-50 dark:bg-slate-900/70 border border-border rounded-xl p-2.5 flex items-center justify-between gap-3 hover:border-primary/40 transition-colors"
                      >
                        {/* Thumbnail */}
                        <div className="relative w-20 aspect-video bg-slate-900 rounded-lg overflow-hidden shrink-0">
                          {video.thumbnailUrl ? (
                            <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                              <Film className="w-4 h-4" />
                            </div>
                          )}
                          {video.durationSeconds && (
                            <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 bg-black/80 text-[9px] font-bold text-slate-200 rounded">
                              {formatDuration(video.durationSeconds)}
                            </span>
                          )}
                        </div>

                        {/* Video Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs text-foreground line-clamp-1">
                            {video.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            {video.folderName && (
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                                <Folder className="w-2.5 h-2.5" /> {video.folderName}
                              </span>
                            )}
                            <span className="font-mono text-slate-400">ID: {video.id}</span>
                          </div>
                        </div>

                        {/* Add Button */}
                        <div>
                          {video.alreadyInPlaylist ? (
                            <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-xl text-xs font-bold flex items-center gap-1 border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Added
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleAddVideo(video.id)}
                              disabled={isAdding}
                              className="rounded-xl font-bold text-xs gap-1.5 bg-primary text-white hover:opacity-90"
                            >
                              {isAdding ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Plus className="w-3.5 h-3.5" />
                              )}
                              Add
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {/* TAB 2: ADD FROM FOLDER */}
            <TabsContent value="folder" className="flex-1 flex flex-col space-y-4 pt-3">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-border rounded-2xl space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Select Folder</label>
                  <p className="text-xs text-muted-foreground">
                    All videos from this folder (and its nested subfolders) will be added to this playlist in sequential order.
                  </p>
                </div>

                {loadingFolders ? (
                  <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Loading organization folders...
                  </div>
                ) : folders.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No folders found in your organization.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {folders.map((f) => {
                      const isSelected = selectedFolderId === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setSelectedFolderId(f.id)}
                          className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-2xs"
                              : "border-border hover:border-slate-300 bg-white dark:bg-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Folder className={`w-4 h-4 shrink-0 ${isSelected ? "text-primary" : "text-amber-500"}`} />
                            <span className="font-bold text-xs truncate text-foreground">{f.name}</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-md text-slate-600 dark:text-slate-300 shrink-0">
                            {f.itemCount} items
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {folderAddSuccessMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{folderAddSuccessMsg}</span>
                </div>
              )}

              <Button
                onClick={handleAddFromFolder}
                disabled={addingFolder || !selectedFolderId || folders.length === 0}
                className="w-full gap-2"
              >
                {addingFolder ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FolderPlus className="w-4 h-4" />
                )}
                {addingFolder ? "Importing videos from folder..." : "Add All Videos From Selected Folder"}
              </Button>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-3 border-t border-border shrink-0 mt-auto">
            <Button
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename & Settings Playlist Modal */}
      <Dialog open={isRenameOpen} onOpenChange={(open) => !open && !renaming && setIsRenameOpen(false)}>
        <DialogContent className="max-w-xl max-h-[88vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>Edit Playlist Settings</DialogTitle>
            <DialogDescription>Update the title, description, and share access mode</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRenameSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-1 pr-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Playlist Title *</label>
                <Input
                  value={renameTitle}
                  onChange={(e) => setRenameTitle(e.target.value)}
                  required
                  disabled={renaming}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Description (optional)</label>
                <RichTextEditor
                  value={renameDescription}
                  onChange={setRenameDescription}
                  disabled={renaming}
                  placeholder="Brief summary of what this playlist contains..."
                  minHeight="110px"
                  maxHeight="220px"
                  showWordCount={false}
                  showCharacterCount={false}
                />
              </div>

              {/* Share & Access Mode Section */}
              <div className="pt-2 border-t border-border">
                <ShareAccessModeSelector
                  targetType="playlist"
                  modeContext="edit"
                  accessMode={renameShareAccessMode}
                  onChangeAccessMode={setRenameShareAccessMode}
                  price={renamePrice}
                  onChangePrice={setRenamePrice}
                  currency={renameCurrency}
                  onChangeCurrency={setRenameCurrency}
                  countryPricing={renameCountryPricing}
                  onChangeCountryPricing={setRenameCountryPricing}
                  disabled={renaming}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border shrink-0 mt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRenameOpen(false)}
                disabled={renaming}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={renaming || !renameTitle.trim()}
                className="gap-2"
              >
                {renaming ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Playlist Modal */}
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title={`Delete Playlist "${playlist.title}"?`}
        description="Are you sure you want to delete this playlist? Deleting this playlist will not delete your original videos."
        variant="danger"
        confirmText="Delete Playlist"
        cancelText="Cancel"
        isLoading={deleting}
        onConfirm={handleDeleteSubmit}
        onCancel={() => setIsDeleteOpen(false)}
      />

      {/* Remove Video from Playlist Modal */}
      <ConfirmDialog
        open={Boolean(removeItemTarget)}
        onOpenChange={(open) => {
          if (!open) setRemoveItemTarget(null);
        }}
        title="Remove Video from Playlist?"
        description={`Are you sure you want to remove "${removeItemTarget?.videoTitle}" from this playlist? The original video will not be deleted.`}
        variant="danger"
        confirmText="Remove Video"
        cancelText="Cancel"
        isLoading={isRemovingItem}
        onConfirm={handleExecuteRemoveItem}
        onCancel={() => setRemoveItemTarget(null)}
      />

      {/* Video Preview Modal */}
      <Dialog open={Boolean(previewVideo)} onOpenChange={(open) => !open && setPreviewVideo(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-slate-800">
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-white text-sm line-clamp-1">{previewVideo?.title}</h3>
            <button
              onClick={() => setPreviewVideo(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="aspect-video bg-black flex items-center justify-center">
            {previewVideo && (
              <VideoPlayer
                src={previewVideo.playbackUrl}
                poster={previewVideo.thumbnailUrl || undefined}
                autoplay={true}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Modal */}
      {isShareOpen && (
        <ShareModal
          isOpen={isShareOpen}
          onClose={() => {
            setIsShareOpen(false);
            fetchPlaylistDetails();
          }}
          targetType="playlist"
          targetId={playlist.id}
          targetName={playlist.title}
          onAccessModeChange={(newMode) => {
            setPlaylist((prev) => (prev ? { ...prev, shareAccessMode: newMode } : prev));
          }}
        />
      )}
    </div>
  );
}
