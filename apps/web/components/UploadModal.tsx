"use client";

import { useState } from "react";
import { X, UploadCloud, Film, CheckCircle2, AlertCircle } from "lucide-react";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export default function UploadModal({ isOpen, onClose, onUploadSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("");

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ""));
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
      // 1. Request presigned upload URL
      const presignedRes = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });

      const presignedData = await presignedRes.json();
      if (!presignedRes.ok) {
        throw new Error(presignedData.error || "Failed to generate upload URL");
      }

      const { videoId, uploadUrl } = presignedData;

      // 2. Upload file directly to R2 via XMLHttpRequest to track progress
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

      // 3. Signal upload complete to queue transcoding
      setStatusText("Queueing HLS adaptive transcode job...");
      const completeRes = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });

      if (!completeRes.ok) {
        throw new Error("Failed to queue transcode job");
      }

      setStatusText("Upload complete! Video queued for processing.");
      setTimeout(() => {
        setUploading(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg glass-card bg-white rounded-2xl p-6 shadow-2xl relative border border-[hsl(var(--border))]">
        <div className="flex items-center justify-between pb-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-[hsl(var(--foreground))]">Upload Video</h3>
          </div>
          <button
            onClick={onClose}
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
          <div className="border-2 border-dashed border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] rounded-xl p-6 text-center transition-colors bg-[hsl(var(--muted))]/30">
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
              <Film className="w-10 h-10 text-[hsl(var(--primary))] mb-2" />
              {file ? (
                <div>
                  <p className="font-semibold text-sm text-[hsl(var(--foreground))]">{file.name}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
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

          <div className="flex justify-end gap-3 pt-4 border-t border-[hsl(var(--border))]">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-[hsl(var(--primary))] text-white shadow-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {uploading ? "Processing..." : "Upload & Transcode"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
