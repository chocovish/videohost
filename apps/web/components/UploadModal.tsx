"use client";

import { useState } from "react";
import { X, UploadCloud, Film, AlertCircle, Folder, Clock, Maximize2, Image as ImageIcon } from "lucide-react";

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

    const timeoutId = setTimeout(() => {
      cleanupAndResolve({
        durationSeconds: Math.round(video.duration || 0),
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
        const maxDim = 720; // Max width/height for lightweight fast loading thumbnails (~20-30KB)
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
                durationSeconds: Math.round(video.duration || 0),
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
        durationSeconds: Math.round(video.duration || 0),
        sourceWidth: video.videoWidth || 0,
        sourceHeight: video.videoHeight || 0,
        thumbnailBlob: null,
        thumbnailUrl: null,
      });
    };

    video.onloadedmetadata = () => {
      const seekTime = Math.min(1.0, (video.duration || 0) / 2);
      if (seekTime > 0) {
        video.currentTime = seekTime;
      } else {
        captureFrame();
      }
    };

    video.onseeked = captureFrame;

    video.onerror = () => {
      clearTimeout(timeoutId);
      cleanupAndResolve({
        durationSeconds: 0,
        sourceWidth: 0,
        sourceHeight: 0,
        thumbnailBlob: null,
        thumbnailUrl: null,
      });
    };

    video.src = url;
  });
}

function formatDuration(seconds: number): string {
  if (!seconds) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

export default function UploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  currentFolderId = null,
  folderPathName = "Root",
}: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [requireHls, setRequireHls] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("");

  const resetForm = () => {
    setFile(null);
    setMetadata(null);
    setRequireHls(false);
    setTitle("");
    setDescription("");
    setError("");
    setProgress(0);
    setStatusText("");
  };

  const handleClose = () => {
    if (uploading) return;
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ""));
      }

      // Collect video metadata & extract thumbnail on client side
      try {
        const meta = await extractVideoMetadataAndThumbnail(selected);
        setMetadata(meta);
      } catch (err) {
        console.warn("Could not extract client video metadata/thumbnail:", err);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;

    setError("");
    setUploading(true);
    setProgress(0);
    setStatusText("Requesting presigned upload URL...");

    try {
      // 1. Request presigned upload URL (passing requireHls and client-extracted metadata)
      const presignedRes = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          folderId: currentFolderId || null,
          requireHls,
          durationSeconds: metadata?.durationSeconds || null,
          sourceWidth: metadata?.sourceWidth || null,
          sourceHeight: metadata?.sourceHeight || null,
        }),
      });

      const presignedData = await presignedRes.json();
      if (!presignedRes.ok) {
        throw new Error(presignedData.error || "Failed to generate upload URL");
      }

      const { videoId, uploadUrl, thumbnailUploadUrl } = presignedData;

      // 2a. Upload video file directly to R2 via XMLHttpRequest to track progress
      setStatusText("Uploading video to Cloudflare R2...");
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`R2 upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during R2 upload"));
        xhr.send(file);
      });

      // 2b. Upload client-extracted thumbnail image to R2
      if (thumbnailUploadUrl && metadata?.thumbnailBlob) {
        try {
          setStatusText("Uploading video thumbnail...");
          await fetch(thumbnailUploadUrl, {
            method: "PUT",
            headers: { "Content-Type": "image/jpeg" },
            body: metadata.thumbnailBlob,
          });
        } catch (thumbErr) {
          console.warn("Failed to upload client thumbnail:", thumbErr);
        }
      }

      // 3. Signal upload complete
      if (requireHls) {
        setStatusText("Queueing HLS adaptive transcode job...");
      } else {
        setStatusText("Finalizing video upload...");
      }

      const completeRes = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });

      if (!completeRes.ok) {
        throw new Error("Failed to finalize upload");
      }

      if (requireHls) {
        setStatusText("Upload complete! Video queued for processing.");
      } else {
        setStatusText("Upload complete! Video ready for playback.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto glass-card bg-white rounded-2xl p-4 sm:p-6 shadow-2xl relative border border-[hsl(var(--border))] my-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-[hsl(var(--foreground))]">Upload Video</h3>
          </div>
          <button
            onClick={handleClose}
            disabled={uploading}
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

        <form onSubmit={handleUpload} className="mt-4 space-y-4">
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
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-[hsl(var(--border))]">
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
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:ring-offset-2 ${requireHls ? "bg-[hsl(var(--primary))]" : "bg-slate-300"
                }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${requireHls ? "translate-x-5" : "translate-x-0"
                  }`}
              />
            </button>
          </div>

          {/* Destination Folder Info Banner */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 text-xs text-amber-900 font-medium">
            <Folder className="w-4 h-4 text-amber-600 shrink-0 fill-amber-500/20" />
            <span>
              Destination: <strong className="font-bold">{folderPathName || "Root"}</strong>
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
              Title
            </label>
            <input
              type="text"
              required
              disabled={uploading}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q3 Product Keynote"
              className="w-full px-3.5 py-2 rounded-lg border border-[hsl(var(--input))] bg-white focus:ring-2 focus:ring-[hsl(var(--primary))] text-sm outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              disabled={uploading}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about this video..."
              className="w-full px-3.5 py-2 rounded-lg border border-[hsl(var(--input))] bg-white focus:ring-2 focus:ring-[hsl(var(--primary))] text-sm outline-none resize-none"
            />
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-medium text-[hsl(var(--muted-foreground))]">
                <span>{statusText}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-[hsl(var(--primary))] transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-[hsl(var(--border))]">
            <button
              type="button"
              onClick={handleClose}
              disabled={uploading}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold bg-[hsl(var(--primary))] text-white shadow-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
            >
              {uploading ? "Processing..." : requireHls ? "Upload & Transcode" : "Upload Video"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
