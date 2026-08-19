"use client";

import { useState } from "react";
import { UploadCloud, Film, AlertCircle, Folder, Clock, Maximize2, Image as ImageIcon, Sparkles, Check, AlertTriangle } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { uploadVideoFile } from "@/lib/upload-video";
import {
  VideoMetadata,
  ThumbnailOption,
  extractVideoMetadataAndThumbnail,
  processThumbnail,
  compressAndResizeImage,
  formatDuration,
  formatBytes,
} from "@/lib/video-utils";
import {
  remuxVideoToMkvStrictCopy,
  validateTracksStrictCopy,
  UnsupportedTracksError,
  UnsupportedTrackInfo,
} from "@/lib/mediabunny-remux";
import UnsupportedVideoModal from "@/components/UnsupportedVideoModal";
import { ThumbnailSelector } from "@/components/ThumbnailSelector";

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
  const [selectedThumbnailIndex, setSelectedThumbnailIndex] = useState<number>(0);
  const [customThumbBlob, setCustomThumbBlob] = useState<Blob | null>(null);
  const [customThumbUrl, setCustomThumbUrl] = useState<string | null>(null);
  const [compressingThumb, setCompressingThumb] = useState(false);
  const [checkingQuota, setCheckingQuota] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [unsupportedModalOpen, setUnsupportedModalOpen] = useState(false);
  const [unsupportedTracks, setUnsupportedTracks] = useState<UnsupportedTrackInfo[]>([]);
  const [unsupportedFileName, setUnsupportedFileName] = useState("");
  const [validatingTracks, setValidatingTracks] = useState(false);

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
    setSelectedThumbnailIndex(0);
    setUnsupportedModalOpen(false);
    setUnsupportedTracks([]);
    setUnsupportedFileName("");
    setValidatingTracks(false);
    if (metadata?.thumbnails) {
      metadata.thumbnails.forEach((t) => URL.revokeObjectURL(t.url));
    } else if (metadata?.thumbnailUrl) {
      URL.revokeObjectURL(metadata.thumbnailUrl);
    }
    if (customThumbUrl) {
      URL.revokeObjectURL(customThumbUrl);
    }
    setMetadata(null);
    setCustomThumbBlob(null);
    setCustomThumbUrl(null);
  };

  const handleSelectThumbnail = (index: number) => {
    if (!metadata?.thumbnails?.[index]) return;
    setSelectedThumbnailIndex(index);
    if (customThumbUrl) {
      URL.revokeObjectURL(customThumbUrl);
    }
    setCustomThumbBlob(null);
    setCustomThumbUrl(null);
    const selected = metadata.thumbnails[index];
    setMetadata((prev) =>
      prev
        ? {
            ...prev,
            thumbnailBlob: selected.blob,
            thumbnailUrl: selected.url,
          }
        : null
    );
  };

  const handleCustomThumbChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedImage = e.target.files[0];
      try {
        setCompressingThumb(true);
        const { blob, url } = await processThumbnail(selectedImage, { maxWidth: 1280, maxHeight: 720, quality: 0.82 });
        if (customThumbUrl) {
          URL.revokeObjectURL(customThumbUrl);
        }
        setSelectedThumbnailIndex(-1);
        setCustomThumbBlob(blob);
        setCustomThumbUrl(url);
      } catch (err: any) {
        console.error("Failed to compress thumbnail image:", err);
        setError("Failed to compress selected thumbnail image");
      } finally {
        setCompressingThumb(false);
      }
    }
  };

  const handleRemoveCustomThumb = () => {
    if (customThumbUrl) {
      URL.revokeObjectURL(customThumbUrl);
    }
    setCustomThumbBlob(null);
    setCustomThumbUrl(null);
    setSelectedThumbnailIndex(0);
    if (metadata?.thumbnails?.[0]) {
      setMetadata((prev) =>
        prev
          ? {
              ...prev,
              thumbnailBlob: prev.thumbnails![0].blob,
              thumbnailUrl: prev.thumbnails![0].url,
            }
          : null
      );
    }
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
      setUnsupportedTracks([]);
      setUnsupportedFileName(selectedFile.name);
      if (!title) {
        const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
        setTitle(nameWithoutExt);
      }

      setCheckingQuota(true);
      setIsQuotaExceeded(false);

      // Check remaining storage & current plan before allowing upload
      try {
        const usageRes = await fetch("/api/v1/usage");
        if (usageRes.ok) {
          const usageData = await usageRes.json();
          if (usageData.plan) {
            setUserPlan(usageData.plan.toLowerCase());
          }
          if (usageData.usage) {
            const { usedBytes, storageLimitBytes, isLimitReached } = usageData.usage;
            const isUnlimited = storageLimitBytes >= Number.MAX_SAFE_INTEGER - 1000;
            const remainingBytes = Math.max(0, storageLimitBytes - usedBytes);
            if (!isUnlimited && (isLimitReached || selectedFile.size > remainingBytes)) {
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

      setSelectedThumbnailIndex(0);
      setCustomThumbBlob(null);
      setCustomThumbUrl(null);

      // Extract video metadata and check browser playback & MKV stream compatibility in parallel
      setValidatingTracks(true);
      try {
        const [meta, validation] = await Promise.all([
          extractVideoMetadataAndThumbnail(selectedFile),
          validateTracksStrictCopy(selectedFile),
        ]);
        setMetadata(meta);
        if (!validation.isValid && validation.unsupportedTracks.length > 0) {
          setUnsupportedTracks(validation.unsupportedTracks);
          setUnsupportedModalOpen(true);
          setError("Video contains tracks that cannot be played in web browsers or copied to MKV.");
        }
      } catch (validationErr) {
        console.warn("Video stream probing warning:", validationErr);
      } finally {
        setValidatingTracks(false);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim() || checkingQuota || isQuotaExceeded || validatingTracks) return;

    if (unsupportedTracks.length > 0) {
      setUnsupportedModalOpen(true);
      setError("Video contains tracks that cannot be played in web browsers or copied to MKV.");
      return;
    }

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
    setProgress(5);
    setStatusText("Checking whether the tracks can be played and copied to MKV...");

    // --------------------------------------------------------
    // STRICT -c copy via Mediabunny before upload
    // If tracks cannot be decoded/played or copied as-is, show popup and halt upload
    // --------------------------------------------------------
    let convertedFile: File = file;
    try {
      convertedFile = await remuxVideoToMkvStrictCopy(file, (remuxPct, status) => {
        // 5% - 25% progress during client-side stream copy
        const scaled = Math.max(5, Math.round(remuxPct * 0.25));
        setProgress(scaled);
        setStatusText(status);
      });
    } catch (remuxErr: any) {
      console.error("Client-side stream copy failed:", remuxErr);
      if (remuxErr instanceof UnsupportedTracksError) {
        setUnsupportedTracks(remuxErr.unsupportedTracks);
        setUnsupportedFileName(file.name);
        setUnsupportedModalOpen(true);
        setError("Video file not supported: Contains tracks that cannot be played by web browsers or copied to MKV.");
        setUploading(false);
        return;
      }
      setError(remuxErr?.message || "Failed to process video streams before upload.");
      setUploading(false);
      return;
    }

    try {
      await uploadVideoFile({
        file: convertedFile,
        title: title.trim(),
        description: description.trim() || undefined,
        requireHls,
        currentFolderId,
        metadata: {
          ...metadata,
          thumbnailBlob: customThumbBlob || metadata?.thumbnailBlob,
        },
        onProgress: (percent, status) => {
          // 25% - 100% progress during S3 upload & finalize
          const scaled = 25 + Math.round(percent * 0.75);
          setProgress(Math.min(100, scaled));
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle>Upload Video</DialogTitle>
              <DialogDescription>Add a new video to your library or active folder</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            {unsupportedTracks.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUnsupportedModalOpen(true)}
                className="h-7 text-[11px] px-2.5 bg-white dark:bg-slate-800 border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-50 shrink-0"
              >
                View Details
              </Button>
            )}
          </div>
        )}

        {validatingTracks && (
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-2 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            <span>Probing video streams for strict stream copy (-c copy → MKV)...</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4">
          {/* Dropzone */}
          <div className="border-2 border-dashed border-border hover:border-primary rounded-xl p-5 text-center transition-colors bg-muted/30">
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
              {customThumbUrl ? (
                <div className="relative w-full max-w-xs h-32 mx-auto rounded-xl overflow-hidden border border-slate-200 bg-black group mb-2 shadow-xs">
                  <img
                    src={customThumbUrl}
                    alt="Custom thumbnail preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-indigo-600/90 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-indigo-200" /> Custom Thumbnail
                  </div>
                </div>
              ) : metadata?.thumbnailUrl ? (
                <div className="relative w-full max-w-xs h-32 mx-auto rounded-xl overflow-hidden border border-slate-200 bg-black group mb-2 shadow-xs">
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
                <Film className="w-10 h-10 text-primary mb-2" />
              )}
              {file ? (
                <div className="space-y-1">
                  <p className="font-semibold text-sm text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  {metadata && (metadata.durationSeconds > 0 || metadata.sourceWidth > 0) && (
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] font-medium text-primary">
                      {metadata.durationSeconds > 0 && (
                        <span className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3" /> {formatDuration(metadata.durationSeconds)}
                        </span>
                      )}
                      {metadata.sourceWidth > 0 && (
                        <span className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-md">
                          <Maximize2 className="w-3 h-3" /> {metadata.sourceWidth}x{metadata.sourceHeight}
                        </span>
                      )}
                      {metadata.fps && (
                        <span className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-md">
                          {metadata.fps} FPS
                        </span>
                      )}
                      {metadata.codec && (
                        <span className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-md uppercase">
                          {metadata.codec}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    Click to select or drag and drop video
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">MP4, MOV, WebM, MKV (up to 4K)</p>
                </div>
              )}
            </label>
          </div>

          {/* 4-Thumbnail Selection Section */}
          {file && (
            <ThumbnailSelector
              thumbnails={metadata?.thumbnails}
              selectedThumbnailIndex={selectedThumbnailIndex}
              onSelectThumbnail={handleSelectThumbnail}
              customThumbUrl={customThumbUrl}
              onCustomThumbChange={handleCustomThumbChange}
              onRemoveCustomThumb={handleRemoveCustomThumb}
              compressingThumb={compressingThumb}
              disabled={uploading}
              inputId="custom-thumbnail-modal-input"
            />
          )}

          {/* Require HLS Switch */}
          {(() => {
            const canUseHls = ["pro", "enterprise"].includes(userPlan.toLowerCase());
            return (
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card">
                <div className="space-y-0.5 pr-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="require-hls-toggle" className="text-xs font-semibold cursor-pointer">
                      Require HLS (Adaptive Bitrate)
                    </Label>
                    {!canUseHls && (
                      <Badge variant="outline" className="uppercase text-amber-600 border-amber-500/30 bg-amber-500/10">
                        PRO FEATURE
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {!canUseHls
                      ? "Adaptive bitrate HLS streaming (multi-quality) requires Pro or Enterprise plan."
                      : requireHls
                      ? "Transcode video into adaptive HLS stream (480p-4K)"
                      : "Store original video & play directly without transcoding"}
                  </p>
                </div>
                <Switch
                  id="require-hls-toggle"
                  checked={canUseHls && requireHls}
                  onCheckedChange={(checked) => canUseHls && setRequireHls(checked)}
                  disabled={uploading || !canUseHls}
                />
              </div>
            );
          })()}

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
              className="flex w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none"
            />
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-medium text-muted-foreground">
                <span>{statusText}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
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
              disabled={uploading || !file || checkingQuota || isQuotaExceeded || validatingTracks || unsupportedTracks.length > 0}
              className="w-full sm:w-auto min-w-[140px]"
            >
              {uploading
                ? "Processing..."
                : validatingTracks
                ? "Validating Tracks..."
                : unsupportedTracks.length > 0
                ? "Incompatible Video"
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

      <UnsupportedVideoModal
        isOpen={unsupportedModalOpen}
        onClose={() => setUnsupportedModalOpen(false)}
        fileName={unsupportedFileName || file?.name}
        unsupportedTracks={unsupportedTracks}
        onSelectAnotherFile={() => {
          resetForm();
          const fileInput = document.getElementById("video-file-input") as HTMLInputElement | null;
          fileInput?.click();
        }}
      />
    </Dialog>
  );
}
