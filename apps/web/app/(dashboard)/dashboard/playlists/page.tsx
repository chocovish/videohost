"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ListVideo,
  Plus,
  Search,
  Share2,
  Trash2,
  Pencil,
  Clock,
  Film,
  Globe,
  Lock,
  ShieldAlert,
  Loader2,
  MoreVertical,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ShareModal from "@/components/ShareModal";
import { formatDuration } from "@/lib/video-utils";

interface PlaylistItemSummary {
  id: string;
  title: string;
  description: string | null;
  shareAccessMode: "PUBLIC" | "RESTRICTED" | "PRIVATE";
  itemCount: number;
  totalDurationSeconds: number;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function PlaylistsPage() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<PlaylistItemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Rename Modal
  const [renameTarget, setRenameTarget] = useState<PlaylistItemSummary | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [renameDescription, setRenameDescription] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  // Delete Dialog
  const [deleteTarget, setDeleteTarget] = useState<PlaylistItemSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Share Modal
  const [shareTarget, setShareTarget] = useState<PlaylistItemSummary | null>(null);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/playlists");
      const data = await res.json();
      if (res.ok) {
        setPlaylists(data.playlists || []);
      }
    } catch (err) {
      console.error("Error loading playlists:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) {
      setCreateError("Please enter a playlist title");
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createTitle.trim(),
          description: createDescription.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.playlist) {
        setIsCreateOpen(false);
        setCreateTitle("");
        setCreateDescription("");
        router.push(`/dashboard/playlists/${data.playlist.id}`);
      } else {
        setCreateError(data.error || "Failed to create playlist");
      }
    } catch (err: any) {
      setCreateError(err.message || "Failed to create playlist");
    } finally {
      setCreating(false);
    }
  };

  const handleRenamePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameTitle.trim()) return;

    setRenaming(true);
    setRenameError(null);
    try {
      const res = await fetch(`/api/playlists/${renameTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: renameTitle.trim(),
          description: renameDescription.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRenameTarget(null);
        fetchPlaylists();
      } else {
        setRenameError(data.error || "Failed to rename playlist");
      }
    } catch (err: any) {
      setRenameError(err.message || "Failed to rename playlist");
    } finally {
      setRenaming(false);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/playlists/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteTarget(null);
        fetchPlaylists();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete playlist");
      }
    } catch (err) {
      console.error("Error deleting playlist:", err);
    } finally {
      setDeleting(false);
    }
  };

  const filteredPlaylists = playlists.filter((pl) => {
    const q = searchQuery.toLowerCase();
    return pl.title.toLowerCase().includes(q) || (pl.description && pl.description.toLowerCase().includes(q));
  });

  const getAccessBadge = (mode: string) => {
    switch (mode) {
      case "PUBLIC":
        return (
          <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
            <Globe className="w-3 h-3" /> Public
          </Badge>
        );
      case "RESTRICTED":
        return (
          <Badge variant="outline" className="gap-1 text-indigo-600 border-indigo-500/30 bg-indigo-500/10">
            <Lock className="w-3 h-3" /> Restricted
          </Badge>
        );
      case "PRIVATE":
        return (
          <Badge variant="secondary" className="gap-1">
            <ShieldAlert className="w-3 h-3" /> Private
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-2xs">
              <ListVideo className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-foreground">
                  Playlists
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-primary/10 text-primary border border-primary/20">
                  {playlists.length}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Organize videos into shareable sequence collections with custom ordering
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => {
            setCreateTitle("");
            setCreateDescription("");
            setCreateError(null);
            setIsCreateOpen(true);
          }}
          className="gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Playlist
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-card p-2.5 rounded-2xl border border-border shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search playlists by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Main Content / Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-semibold text-muted-foreground">Loading playlists...</p>
        </div>
      ) : filteredPlaylists.length === 0 ? (
        <div className="text-center py-16 px-4 bg-card/40 rounded-2xl border border-dashed border-border">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <ListVideo className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg text-foreground">
            {searchQuery ? "No matching playlists found" : "No playlists created yet"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-6">
            {searchQuery
              ? `No playlist matches "${searchQuery}". Try searching with a different keyword.`
              : "Create your first playlist to group videos into courses, series, or presentations that can be reordered and shared."}
          </p>
          {!searchQuery && (
            <div className="flex items-center justify-center gap-3">
              <Button
                onClick={() => {
                  setCreateTitle("");
                  setCreateDescription("");
                  setCreateError(null);
                  setIsCreateOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" /> Create Playlist
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlaylists.map((pl) => (
            <div
              key={pl.id}
              className="group relative bg-card border border-border rounded-2xl overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Thumbnail / Header Stage */}
                <Link href={`/dashboard/playlists/${pl.id}`} className="block relative aspect-video bg-slate-950 overflow-hidden">
                  {pl.thumbnailUrl ? (
                    <img
                      src={pl.thumbnailUrl}
                      alt={pl.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-linear-to-br from-slate-900 via-slate-800 to-slate-950 text-slate-400">
                      <ListVideo className="w-12 h-12 text-primary/70" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Empty Playlist</span>
                    </div>
                  )}

                  {/* Dark gradient overlay */}
                  <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    {getAccessBadge(pl.shareAccessMode)}
                  </div>

                  {/* Right Playlist Stack Count Indicator */}
                  <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2">
                    {pl.totalDurationSeconds > 0 && (
                      <span className="px-2 py-0.5 bg-black/70 backdrop-blur-md text-[11px] font-bold text-slate-200 rounded-md flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary" />
                        {formatDuration(pl.totalDurationSeconds)}
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 bg-primary text-white text-[11px] font-black rounded-md flex items-center gap-1 shadow-2xs">
                      <Film className="w-3 h-3" />
                      {pl.itemCount} {pl.itemCount === 1 ? "video" : "videos"}
                    </span>
                  </div>
                </Link>

                {/* Playlist Info */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/dashboard/playlists/${pl.id}`}
                      className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1 flex-1"
                    >
                      {pl.title}
                    </Link>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={() => setShareTarget(pl)}
                          className="gap-2 font-medium cursor-pointer"
                        >
                          <Share2 className="w-4 h-4 text-slate-500" />
                          Share Playlist
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setRenameTarget(pl);
                            setRenameTitle(pl.title);
                            setRenameDescription(pl.description || "");
                            setRenameError(null);
                          }}
                          className="gap-2 font-medium cursor-pointer"
                        >
                          <Pencil className="w-4 h-4 text-slate-500" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(pl)}
                          className="gap-2 font-medium text-red-600 focus:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Playlist
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {pl.description ? (
                    <p className="text-xs text-muted-foreground line-clamp-2">{pl.description}</p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No description provided</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Playlist Modal */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => !open && setIsCreateOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <ListVideo className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle>Create New Playlist</DialogTitle>
                <DialogDescription>Group videos together in custom ordered collections</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreatePlaylist} className="space-y-4 pt-2">
            {createError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 text-xs font-medium">
                {createError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Playlist Title *</label>
              <Input
                placeholder="e.g. Masterclass Series 2026, Onboarding Modules"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                required
                autoFocus
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Description (optional)</label>
              <textarea
                placeholder="Brief summary of what this playlist contains..."
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                rows={3}
                className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-input rounded-xl outline-hidden focus:ring-2 focus:ring-primary text-foreground resize-none"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating || !createTitle.trim()}
                className="gap-2"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {creating ? "Creating..." : "Create Playlist"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Playlist Modal */}
      <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Playlist</DialogTitle>
            <DialogDescription>Update the title and description for this playlist</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRenamePlaylist} className="space-y-4 pt-2">
            {renameError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 text-xs font-medium">
                {renameError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Playlist Title *</label>
              <Input
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Description (optional)</label>
              <textarea
                value={renameDescription}
                onChange={(e) => setRenameDescription(e.target.value)}
                rows={3}
                className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-input rounded-xl outline-hidden focus:ring-2 focus:ring-primary text-foreground resize-none"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameTarget(null)}
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

      {/* Delete Playlist Confirmation */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle>Delete Playlist</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete <span className="font-semibold text-slate-800 dark:text-slate-200">"{deleteTarget?.title}"</span>?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <p className="text-xs text-muted-foreground">
            Note: Deleting this playlist will not delete your original videos. It only deletes the playlist collection and share links.
          </p>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeletePlaylist}
              disabled={deleting}
              className="gap-2"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {deleting ? "Deleting..." : "Delete Playlist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Modal */}
      {shareTarget && (
        <ShareModal
          isOpen={Boolean(shareTarget)}
          onClose={() => {
            setShareTarget(null);
            fetchPlaylists();
          }}
          targetType="playlist"
          targetId={shareTarget.id}
          targetName={shareTarget.title}
          onAccessModeChange={(newMode) => {
            setPlaylists((prev) =>
              prev.map((p) => (p.id === shareTarget.id ? { ...p, shareAccessMode: newMode } : p))
            );
          }}
        />
      )}
    </div>
  );
}
