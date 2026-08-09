"use client";

import { useState } from "react";
import { X, FolderPlus, AlertCircle, Loader2 } from "lucide-react";

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  parentId: string | null;
  parentFolderName?: string | null;
}

export default function CreateFolderModal({
  isOpen,
  onClose,
  onSuccess,
  parentId,
  parentFolderName,
}: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: folderName.trim(),
          parentId: parentId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create folder");
      }

      setFolderName("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto glass-card bg-white rounded-2xl p-4 sm:p-6 shadow-2xl relative border border-[hsl(var(--border))] my-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[hsl(var(--foreground))]">New Folder</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {parentFolderName ? `Creating inside "${parentFolderName}"` : "Creating at root level"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
              Folder Name
            </label>
            <input
              type="text"
              required
              autoFocus
              disabled={loading}
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g. Marketing Assets"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[hsl(var(--input))] bg-white focus:ring-2 focus:ring-[hsl(var(--primary))] text-sm outline-none transition-all"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-[hsl(var(--border))]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !folderName.trim()}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold bg-[hsl(var(--primary))] text-white shadow-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                </>
              ) : (
                "Create Folder"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
