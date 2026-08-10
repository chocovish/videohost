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

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  currentFolderId?: string | null;
  folderPathName?: string;
}

interface VideoMetadata {
  durationSeconds: number;
  sourceWidth: number;
  sourceHeight: number;
  thumbnailBlob: Blob | null;
  thumbnailUrl: string | null;
}

function extractVideoMetadataAndThumbnail(file: File): Promise<VideoMetadata> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    let resolved = false;

    const cleanupAndResolve = (result: VideoMetadata) => {
      if (!resolved) {
        resolved = true;
        URL.revokeObjectURL(url);
        resolve(result);
      }
    };

    const getValidDuration = (): number => {
      if (typeof video.duration === "number" && isFinite(video.duration) && !isNaN(video.duration) && video.duration > 0) {
        return Math.round(video.duration);
      }
      if (typeof video.currentTime === "number" && isFinite(video.currentTime) && video.currentTime > 0 && video.currentTime < 1e5) {
        return Math.round(video.currentTime);
      }
      return 0;
    };

    const timeoutId = setTimeout(() => {
      cleanupAndResolve({
        durationSeconds: getValidDuration(),
        sourceWidth: video.videoWidth || 0,
        sourceHeight: video.videoHeight || 0,
        thumbnailBlob: null,
        thumbnailUrl: null,
      });
    }, 4000);

    const captureFrame = () => {
      clearTimeout(timeoutId);
      try {
        const canvas = document.createElement("canvas");
        const maxDim = 720;
        const originalWidth = video.videoWidth || 640;
        const originalHeight = video.videoHeight || 360;
        const scale = Math.min(1, maxDim / Math.max(originalWidth, originalHeight));

        canvas.width = Math.round(originalWidth * scale);
        canvas.height = Math.round(originalHeight * scale);

        const ctx = canvas.getContext("2d");
        if (ctx && canvas.width > 0 && canvas.height > 0) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              const thumbUrl = blob ? URL.createObjectURL(blob) : null;
              cleanupAndResolve({
                durationSeconds: getValidDuration(),
                sourceWidth: originalWidth,
                sourceHeight: originalHeight,
                thumbnailBlob: blob,
                thumbnailUrl: thumbUrl,
              });
            },
            "image/jpeg",
            0.7
          );
          return;
        }
      } catch (e) {
        console.warn("Failed canvas thumbnail rendering:", e);
      }

      cleanupAndResolve({
        durationSeconds: getValidDuration(),
        sourceWidth: video.videoWidth || 0,
        sourceHeight: video.videoHeight || 0,
        thumbnailBlob: null,
        thumbnailUrl: null,
      });
    };

    video.onloadedmetadata = () => {
      if (video.duration === Infinity) {
        video.currentTime = 1e101;
        video.ontimeupdate = () => {
          video.ontimeupdate = null;
          if (video.duration === Infinity) {
            video.currentTime = 0;
          }
          captureFrame();
        };
      } else {
        const dur = video.duration || 0;
        const seekTime = isFinite(dur) && dur > 0 ? Math.min(1.0, dur / 2) : 0;
        if (seekTime > 0) {
          video.currentTime = seekTime;
        } else {
          captureFrame();
        }
      }
    };

    video.onseeked = () => {
      captureFrame();
    };

    video.onerror = () => {
      clearTimeout(timeoutId);
      cleanupAndResolve({
        durationSeconds: getValidDuration(),
        sourceWidth: 0,
        sourceHeight: 0,
        thumbnailBlob: null,
        thumbnailUrl: null,
      });
    };

    video.src = url;
  });
}

function formatDuration(sec?: number): string {
  if (sec === undefined || sec === null || !isFinite(sec) || isNaN(sec) || sec < 0) {
    return "0:00";
  }
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
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

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setDescription("");
    setRequireHls(false);
    setError("");
    setProgress(0);
    setStatusText("");
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
      const meta = await extractVideoMetadataAndThumbnail(selectedFile);
      setMetadata(meta);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;

    setError("");
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
              disabled={uploading || !file}
              className="w-full sm:w-auto min-w-[140px]"
            >
              {uploading ? "Processing..." : requireHls ? "Upload & Transcode" : "Upload Video"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
