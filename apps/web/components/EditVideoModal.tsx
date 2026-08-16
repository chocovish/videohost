"use client";

import { useState, useEffect, useRef } from "react";
import {
  Pencil,
  FileText,
  Image as ImageIcon,
  UploadCloud,
  X,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
  RotateCcw,
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
import { Label } from "@/components/ui/label";
import { processThumbnail } from "@/lib/video-utils";

export interface EditVideoData {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
}

interface EditVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedVideo?: any) => void;
  video: EditVideoData | null;
}

export default function EditVideoModal({
  isOpen,
  onClose,
  onSuccess,
  video,
}: EditVideoModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isThumbnailRemoved, setIsThumbnailRemoved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (video && isOpen) {
      setTitle(video.title || "");
      setDescription(video.description || "");
      setSelectedFile(null);
      setPreviewUrl(video.thumbnailUrl || null);
      setIsThumbnailRemoved(false);
      setError(null);
      setUploadStep(null);
    }
  }, [video, isOpen]);

  // Clean up object URLs when preview changes or component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WebP, etc.).");
      return;
    }

    // Revoke previous blob url if needed
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setIsThumbnailRemoved(false);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
  };

  const handleRemoveThumbnail = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsThumbnailRemoved(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleResetThumbnail = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(video?.thumbnailUrl || null);
    setIsThumbnailRemoved(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!video || !title.trim()) {
      setError("Video title is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let finalThumbnailUrl = video.thumbnailUrl || null;

      // 1. If a new thumbnail was chosen, compress and upload to S3
      if (selectedFile) {
        setUploadStep("Optimizing thumbnail image...");
        const { blob } = await processThumbnail(selectedFile, {
          maxWidth: 1280,
          maxHeight: 720,
          quality: 0.82,
        });

        setUploadStep("Requesting secure upload ticket...");
        const thumbRes = await fetch("/api/upload/thumbnail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: video.id }),
        });

        const thumbData = await thumbRes.json();
        if (!thumbRes.ok || !thumbData.uploadUrl) {
          throw new Error(thumbData.error || "Failed to generate thumbnail upload URL.");
        }

        setUploadStep("Uploading optimized thumbnail...");
        const uploadRes = await fetch(thumbData.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/webp" },
          body: blob,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload thumbnail to storage.");
        }

        finalThumbnailUrl = thumbData.thumbnailUrl || null;
      }

      // 2. Update video metadata (title, description, removeThumbnail)
      setUploadStep("Saving video details...");
      const patchPayload: Record<string, any> = {
        title: title.trim(),
        description: description.trim() || null,
      };

      if (isThumbnailRemoved && !selectedFile) {
        patchPayload.removeThumbnail = true;
        finalThumbnailUrl = null;
      }

      const res = await fetch(`/api/v1/videos/${video.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchPayload),
      });

      const updatedData = await res.json();
      if (!res.ok) {
        throw new Error(updatedData.error || "Failed to update video details.");
      }

      if (finalThumbnailUrl && !updatedData.thumbnailUrl) {
        updatedData.thumbnailUrl = finalThumbnailUrl;
      }

      onSuccess?.(updatedData);
      onClose();
    } catch (err: any) {
      console.error("Error updating video details:", err);
      setError(err?.message || "An unexpected error occurred while saving.");
    } finally {
      setLoading(false);
      setUploadStep(null);
    }
  };

  const hasThumbnailChanged =
    selectedFile !== null || (isThumbnailRemoved && video?.thumbnailUrl);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] shrink-0">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Edit Video Details</DialogTitle>
              <DialogDescription className="text-xs">
                Update the video title, description, and custom thumbnail
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 py-1">
          {/* Title Field */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-video-title" className="text-xs font-bold text-[hsl(var(--foreground))]">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-video-title"
              type="text"
              required
              disabled={loading}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Product Demo Q3"
              className="font-medium"
            />
          </div>

          {/* Description Field */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-video-desc" className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center justify-between">
              <span>Description</span>
              <span className="text-[11px] font-normal text-[hsl(var(--muted-foreground))]">Optional</span>
            </Label>
            <textarea
              id="edit-video-desc"
              rows={3}
              disabled={loading}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about this video, timestamps, or summary..."
              className="w-full rounded-xl border border-[hsl(var(--input))] bg-background px-3.5 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-y min-h-[80px]"
            />
          </div>

          {/* Thumbnail Section */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                <span>Thumbnail</span>
              </Label>
              {hasThumbnailChanged && (
                <button
                  type="button"
                  onClick={handleResetThumbnail}
                  disabled={loading}
                  className="text-[11px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Revert
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              {/* Thumbnail Preview Window */}
              <div className="aspect-video w-full bg-slate-950 rounded-xl overflow-hidden border border-[hsl(var(--border))] relative flex items-center justify-center group shadow-xs">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500 gap-1.5 p-3 text-center">
                    <ImageIcon className="w-7 h-7 text-slate-600" />
                    <span className="text-[11px] font-medium">No thumbnail</span>
                  </div>
                )}

                {selectedFile && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-bold shadow-md flex items-center gap-1 backdrop-blur-xs">
                    <Check className="w-3 h-3" /> New Selected
                  </div>
                )}
              </div>

              {/* Action Buttons & Helpers */}
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  id="edit-video-thumbnail-file-input"
                  className="hidden"
                  disabled={loading}
                  onChange={handleFileChange}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full font-semibold justify-center gap-2 h-9 text-xs"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                  <span>{previewUrl ? "Change Image" : "Upload Image"}</span>
                </Button>

                {previewUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={loading}
                    onClick={handleRemoveThumbnail}
                    className="w-full font-semibold justify-center gap-1.5 h-8 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Thumbnail</span>
                  </Button>
                )}

                <p className="text-[10px] text-[hsl(var(--muted-foreground))] leading-tight">
                  Supports PNG, JPG, WebP. Recommended ratio 16:9 (1280×720). Images are auto-compressed for lightning-fast loading.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-[hsl(var(--border))] gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !title.trim()}
              className="w-full sm:w-auto min-w-[130px] text-xs font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>{uploadStep || "Saving..."}</span>
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
