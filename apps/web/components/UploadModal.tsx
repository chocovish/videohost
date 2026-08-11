"use client";

import { useState } from "react";
import { UploadCloud, Film, AlertCircle, Folder, Clock, Maximize2, Image as ImageIcon } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { uploadVideoFile } from "@/lib/upload-video";
import {
  VideoMetadata,
  extractVideoMetadataAndThumbnail,
  formatDuration,
  formatBytes,
} from "@/lib/video-utils";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  currentFolderId?: string | null;
  folderPathName?: string;
}

export default function UploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  currentFolderId,
  folderPathName,
}: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requireHls, setRequireHls] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [checkingQuota, setCheckingQuota] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setDescription("");
    setRequireHls(false);
    setError("");
    setProgress(0);
    setStatusText("");
    setCheckingQuota(false);
    setIsQuotaExceeded(false);
    if (metadata?.thumbnailUrl) {
      URL.revokeObjectURL(metadata.thumbnailUrl);
    }
    setMetadata(null);
  };

  const handleClose = () => {
    if (!uploading) {
      resetForm();
      onClose();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (!title) {
        const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
        setTitle(nameWithoutExt);
      }

      setCheckingQuota(true);
      setIsQuotaExceeded(false);

      // Check remaining storage before allowing upload
      try {
        const usageRes = await fetch("/api/v1/usage");
        if (usageRes.ok) {
          const usageData = await usageRes.json();
          if (usageData.usage) {
            const { usedBytes, storageLimitBytes, isLimitReached } = usageData.usage;
            const remainingBytes = Math.max(0, storageLimitBytes - usedBytes);
            if (isLimitReached || selectedFile.size > remainingBytes) {
              setIsQuotaExceeded(true);
              setError(
                `Selected file size (${formatBytes(selectedFile.size)}) exceeds your available storage quota (${formatBytes(remainingBytes)} remaining out of ${formatBytes(storageLimitBytes)}). Upload is disabled.`
              );
            } else {
              setIsQuotaExceeded(false);
              setError("");
            }
          }
        }
      } catch (e) {
        console.warn("Quota check error:", e);
      } finally {
        setCheckingQuota(false);
      }

      const meta = await extractVideoMetadataAndThumbnail(selectedFile);
      setMetadata(meta);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim() || checkingQuota || isQuotaExceeded) return;

    setError("");
    setCheckingQuota(true);

    // Validate storage quota before starting upload
    try {
      const usageRes = await fetch("/api/v1/usage");
      if (usageRes.ok) {
        const usageData = await usageRes.json();
        if (usageData.usage) {
          const { usedBytes, storageLimitBytes, isLimitReached } = usageData.usage;
          const remainingBytes = Math.max(0, storageLimitBytes - usedBytes);
          if (isLimitReached || file.size > remainingBytes) {
            setIsQuotaExceeded(true);
            setError(
              `Cannot upload video (${formatBytes(file.size)}). Your available storage quota is ${formatBytes(remainingBytes)} remaining out of ${formatBytes(storageLimitBytes)}.`
            );
            setCheckingQuota(false);
            return;
          }
        }
      }
    } catch (quotaErr) {
      console.warn("Pre-upload quota check failed:", quotaErr);
    } finally {
      setCheckingQuota(false);
    }

    setUploading(true);

    try {
      await uploadVideoFile({
        file,
        title: title.trim(),
        description: description.trim() || undefined,
        requireHls,
        currentFolderId,
        metadata,
        onProgress: (percent, status) => {
          setProgress(percent);
          setStatusText(status);
        },
      });

      // Dispatch live usage update event for Sidebar
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("usage-updated"));
        window.dispatchEvent(new CustomEvent("video-uploaded"));
      }

      setTimeout(() => {
        setUploading(false);
        resetForm();
        onUploadSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err?.message || "An error occurred during upload");
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] shrink-0">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle>Upload Video</DialogTitle>
              <DialogDescription>Add a new video to your library or active folder</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4">
          {/* Dropzone */}
          <div className="border-2 border-dashed border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] rounded-xl p-5 text-center transition-colors bg-[hsl(var(--muted))]/30">
            <input
              type="file"
              accept="video/*"
              required
              disabled={uploading}
              onChange={handleFileChange}
              className="hidden"
              id="video-file-input"
            />
            <label htmlFor="video-file-input" className="cursor-pointer flex flex-col items-center justify-center">
              {metadata?.thumbnailUrl ? (
                <div className="relative w-full max-w-xs h-32 mx-auto rounded-xl overflow-hidden border border-slate-200 bg-black group mb-2 shadow-sm">
                  <img
                    src={metadata.thumbnailUrl}
                    alt="Extracted video thumbnail preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-emerald-400" /> Auto Thumbnail
                  </div>
                </div>
              ) : (
                <Film className="w-10 h-10 text-[hsl(var(--primary))] mb-2" />
              )}
              {file ? (
                <div className="space-y-1">
                  <p className="font-semibold text-sm text-[hsl(var(--foreground))]">{file.name}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  {metadata && (metadata.durationSeconds > 0 || metadata.sourceWidth > 0) && (
                    <div className="flex items-center justify-center gap-3 pt-1 text-[11px] font-medium text-[hsl(var(--primary))]">
                      {metadata.durationSeconds > 0 && (
                        <span className="flex items-center gap-1 bg-[hsl(var(--primary))]/10 px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3" /> {formatDuration(metadata.durationSeconds)}
                        </span>
                      )}
                      {metadata.sourceWidth > 0 && (
                        <span className="flex items-center gap-1 bg-[hsl(var(--primary))]/10 px-2 py-0.5 rounded-md">
                          <Maximize2 className="w-3 h-3" /> {metadata.sourceWidth}x{metadata.sourceHeight}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-sm text-[hsl(var(--foreground))]">
                    Click to select or drag and drop video
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">MP4, MOV, WebM, MKV (up to 4K)</p>
                </div>
              )}
            </label>
          </div>

          {/* Require HLS Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[hsl(var(--border))]">
            <div className="space-y-0.5">
              <label htmlFor="require-hls-toggle" className="text-xs font-bold text-[hsl(var(--foreground))] cursor-pointer">
                Require HLS
              </label>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                {requireHls
                  ? "Transcode video into adaptive HLS stream (480p-4K)"
                  : "Store original video & play directly without transcoding"}
              </p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium pt-0.5">
                Note: HLS takes more storage space (original file + converted renditions)
              </p>
            </div>
            <button
              id="require-hls-toggle"
              type="button"
              role="switch"
              aria-checked={requireHls}
              disabled={uploading}
              onClick={() => setRequireHls(!requireHls)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:ring-offset-2 ${
                requireHls ? "bg-[hsl(var(--primary))]" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  requireHls ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Destination Folder Info Banner */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-300 font-medium">
            <Folder className="w-4 h-4 text-amber-600 shrink-0 fill-amber-500/20" />
            <span>
              Destination: <strong className="font-bold">{folderPathName || "Root"}</strong>
            </span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="video-title">Title</Label>
            <Input
              id="video-title"
              type="text"
              required
              disabled={uploading}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q3 Product Keynote"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="video-description">Description (Optional)</Label>
            <textarea
              id="video-description"
              rows={2}
              disabled={uploading}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about this video..."
              className="flex w-full rounded-xl border border-[hsl(var(--input))] bg-background px-3.5 py-2 text-sm ring-offset-background placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none"
            />
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-medium text-[hsl(var(--muted-foreground))]">
                <span>{statusText}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-[hsl(var(--primary))] transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={uploading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={uploading || !file || checkingQuota || isQuotaExceeded}
              className="w-full sm:w-auto min-w-[140px]"
            >
              {uploading
                ? "Processing..."
                : checkingQuota
                ? "Checking Quota..."
                : isQuotaExceeded
                ? "Quota Exceeded"
                : requireHls
                ? "Upload & Transcode"
                : "Upload Video"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
