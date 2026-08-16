"use client";

import { useState, useEffect, useMemo } from "react";
import {
  FolderInput,
  Folder,
  Home,
  Search,
  Check,
  AlertCircle,
  Loader2,
  ChevronRight,
  Film,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RawFolder {
  id: string;
  name: string;
  parentId: string | null;
  itemCount?: number;
}

interface ProcessedFolder {
  id: string;
  name: string;
  parentId: string | null;
  path: string;
  depth: number;
  isDescendantOrSelf: boolean;
  isCurrent: boolean;
}

interface MoveItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  itemType: "video" | "folder";
  itemId: string;
  itemName: string;
  currentFolderId: string | null;
}

export default function MoveItemModal({
  isOpen,
  onClose,
  onSuccess,
  itemType,
  itemId,
  itemName,
  currentFolderId,
}: MoveItemModalProps) {
  const [folders, setFolders] = useState<RawFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  // Selected destination folder: null means Root, string is folder ID
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setError("");
    setSelectedFolderId(null);
    setSearch("");

    const fetchAllFolders = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/folders?all=true");
        const data = await res.json();
        if (res.ok) {
          setFolders(data.folders || []);
        } else {
          setError(data.error || "Failed to load folders");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load folders");
      } finally {
        setLoading(false);
      }
    };

    fetchAllFolders();
  }, [isOpen]);

  // Compute folder hierarchy, paths, and descendant status
  const { processedFolders, isRootCurrent } = useMemo(() => {
    const isRootCurr = !currentFolderId || currentFolderId === "root";
    const folderMap = new Map<string, RawFolder>();
    folders.forEach((f) => folderMap.set(f.id, f));

    // Find all descendant IDs if item is a folder
    const descendantIds = new Set<string>();
    if (itemType === "folder") {
      descendantIds.add(itemId);
      let addedMore = true;
      while (addedMore) {
        addedMore = false;
        for (const f of folders) {
          if (f.parentId && descendantIds.has(f.parentId) && !descendantIds.has(f.id)) {
            descendantIds.add(f.id);
            addedMore = true;
          }
        }
      }
    }

    // Build paths and depth
    const getPathAndDepth = (folderId: string): { path: string; depth: number } => {
      const parts: string[] = [];
      let curr = folderMap.get(folderId);
      let depth = 0;
      while (curr) {
        parts.unshift(curr.name);
        depth++;
        curr = curr.parentId ? folderMap.get(curr.parentId) : undefined;
      }
      return { path: "Root / " + parts.join(" / "), depth };
    };

    // Sort folders hierarchical / topological
    const result: ProcessedFolder[] = folders.map((f) => {
      const { path, depth } = getPathAndDepth(f.id);
      return {
        id: f.id,
        name: f.name,
        parentId: f.parentId,
        path,
        depth,
        isDescendantOrSelf: descendantIds.has(f.id),
        isCurrent: currentFolderId === f.id,
      };
    });

    result.sort((a, b) => a.path.localeCompare(b.path));

    return { processedFolders: result, isRootCurrent: isRootCurr };
  }, [folders, itemType, itemId, currentFolderId]);

  const filteredFolders = useMemo(() => {
    if (!search.trim()) return processedFolders;
    const query = search.toLowerCase().trim();
    return processedFolders.filter(
      (f) => f.name.toLowerCase().includes(query) || f.path.toLowerCase().includes(query)
    );
  }, [processedFolders, search]);

  const handleMove = async () => {
    // If target is current location, just close
    const isTargetCurrent =
      (selectedFolderId === null && isRootCurrent) ||
      (selectedFolderId !== null && selectedFolderId === currentFolderId);

    if (isTargetCurrent) {
      onClose();
      return;
    }

    setError("");
    setSaving(true);

    try {
      if (itemType === "video") {
        const res = await fetch(`/api/v1/videos/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            folderId: selectedFolderId || "root",
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to move video");
        }
      } else {
        const res = await fetch(`/api/folders/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parentId: selectedFolderId || "root",
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to move folder");
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "An error occurred while moving item");
    } finally {
      setSaving(false);
    }
  };

  const selectedFolderName = useMemo(() => {
    if (selectedFolderId === null) return "Root Directory";
    const found = folders.find((f) => f.id === selectedFolderId);
    return found ? found.name : "Selected Folder";
  }, [selectedFolderId, folders]);

  const isMoveDisabled =
    saving ||
    loading ||
    (selectedFolderId === null && isRootCurrent) ||
    (selectedFolderId !== null && selectedFolderId === currentFolderId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] shrink-0">
              <FolderInput className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-bold truncate">
                Move {itemType === "video" ? "Video" : "Folder"}
              </DialogTitle>
              <DialogDescription className="text-xs truncate max-w-sm">
                Moving &ldquo;{itemName}&rdquo; to another destination
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="my-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Search destination folders */}
        <div className="relative my-2 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search destination folders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>

        {/* Folder Destination List */}
        <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[320px] space-y-1.5 pr-1 border border-[hsl(var(--border))] rounded-xl p-2 bg-slate-50/50 dark:bg-slate-900/30">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--primary))]" />
              <span>Loading folder hierarchy...</span>
            </div>
          ) : (
            <>
              {/* Root folder option */}
              <button
                type="button"
                onClick={() => setSelectedFolderId(null)}
                className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                  selectedFolderId === null
                    ? "bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/40 text-[hsl(var(--primary))]"
                    : "hover:bg-slate-200/50 dark:hover:bg-slate-800 text-[hsl(var(--foreground))]"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`p-1.5 rounded-lg ${
                      selectedFolderId === null
                        ? "bg-[hsl(var(--primary))] text-white"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-600"
                    }`}
                  >
                    <Home className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <span className="font-bold">Root Directory</span>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] font-normal">
                      Top-level storage
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isRootCurrent && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-500">
                      Current
                    </span>
                  )}
                  {selectedFolderId === null && (
                    <Check className="w-4 h-4 text-[hsl(var(--primary))]" />
                  )}
                </div>
              </button>

              {/* Subfolders list */}
              {filteredFolders.map((f) => {
                const isSelected = selectedFolderId === f.id;
                const isDisabled = f.isDescendantOrSelf;

                return (
                  <button
                    key={f.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => !isDisabled && setSelectedFolderId(f.id)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between ${
                      isDisabled
                        ? "opacity-40 cursor-not-allowed bg-slate-100/50 dark:bg-slate-800/30"
                        : isSelected
                        ? "bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/40 text-[hsl(var(--primary))] cursor-pointer"
                        : "hover:bg-slate-200/50 dark:hover:bg-slate-800 text-[hsl(var(--foreground))] cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 ${
                          isSelected
                            ? "bg-[hsl(var(--primary))] text-white"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        <Folder className="w-3.5 h-3.5 fill-amber-500/20" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold truncate text-[hsl(var(--foreground))]">
                          {f.name}
                        </p>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">
                          {f.path}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {f.isDescendantOrSelf && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-red-500/10 text-red-500">
                          {f.id === itemId ? "Self" : "Subfolder"}
                        </span>
                      )}
                      {f.isCurrent && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-500">
                          Current
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-4 h-4 text-[hsl(var(--primary))]" />
                      )}
                    </div>
                  </button>
                );
              })}

              {filteredFolders.length === 0 && search && (
                <div className="py-8 text-center text-xs text-slate-400">
                  No folders matching &ldquo;{search}&rdquo;
                </div>
              )}
            </>
          )}
        </div>

        {/* Selected target preview indicator */}
        <div className="pt-2 text-xs flex items-center gap-1.5 text-[hsl(var(--muted-foreground))] shrink-0">
          <span>Destination:</span>
          <span className="font-bold text-[hsl(var(--foreground))] truncate">
            {selectedFolderName}
          </span>
        </div>

        <DialogFooter className="mt-4 shrink-0 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleMove}
            disabled={isMoveDisabled}
            className="w-full sm:w-auto min-w-[120px]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Moving...
              </>
            ) : (
              "Move Here"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
