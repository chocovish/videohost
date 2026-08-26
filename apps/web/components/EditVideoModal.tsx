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
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Alert } from "@/components/ui/alert";
import { processThumbnail } from "@/lib/video-utils";
import {
  ShareAccessMode,
  CountryPriceItem,
  ShareAccessModeSelector,
} from "@/components/share";

export interface EditVideoData {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  shareAccessMode?: ShareAccessMode;
  price?: number | null;
  currency?: string | null;
  countryPricing?: CountryPriceItem[] | null;
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

  // Share & Access Mode State
  const [shareAccessMode, setShareAccessMode] = useState<ShareAccessMode>("PUBLIC");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [countryPricing, setCountryPricing] = useState<CountryPriceItem[]>([]);

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
      setShareAccessMode(video.shareAccessMode || (video.price !== null && video.price !== undefined ? "PURCHASABLE" : "PUBLIC"));
      setPrice(video.price !== undefined && video.price !== null ? String(video.price) : "");
      setCurrency(video.currency || "USD");
      setCountryPricing(Array.isArray(video.countryPricing) ? video.countryPricing : []);
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

      // 2. Update video metadata (title, description, share access mode, pricing, removeThumbnail)
      setUploadStep("Saving video details...");
      const isPurchasable = shareAccessMode === "PURCHASABLE";
      const patchPayload: Record<string, any> = {
        title: title.trim(),
        description: description.trim() || null,
        shareAccessMode,
        price: isPurchasable && price !== "" && price !== null && !isNaN(Number(price)) ? parseFloat(price) : null,
        currency: isPurchasable ? currency : "USD",
        countryPricing: isPurchasable ? countryPricing : [],
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
      <DialogContent className="max-w-lg max-h-[88vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <Pencil className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate">Edit Video Details</DialogTitle>
              <DialogDescription className="truncate mt-0.5">
                Update the video title, description, and custom thumbnail
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="shrink-0 text-xs">
            <AlertCircle />
            <span className="text-xs">{error}</span>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 py-1 pr-1 min-h-0">
            {/* Title Field */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-video-title" className="text-xs font-medium text-foreground">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-video-title"
                type="text"
                required
                disabled={loading}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Product Demo Q3"
              />
            </div>

            {/* Description Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-video-desc" className="text-xs font-medium text-foreground">
                  Description
                </Label>
                <span className="text-xs text-muted-foreground">Optional</span>
              </div>
              <RichTextEditor
                id="edit-video-desc"
                disabled={loading}
                value={description}
                onChange={setDescription}
                placeholder="Add details about this video, timestamps, or summary..."
                minHeight="120px"
                maxHeight="260px"
                showWordCount={false}
                showCharacterCount={false}
              />
            </div>

            {/* Thumbnail Section */}
            <div className="space-y-2 pt-1 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-primary" />
                  <span>Thumbnail</span>
                </Label>
                {hasThumbnailChanged && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={handleResetThumbnail}
                    disabled={loading}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw /> Revert
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                {/* Thumbnail Preview Window */}
                <div className="aspect-video w-full bg-muted/60 rounded-lg overflow-hidden border border-border relative flex items-center justify-center group shadow-xs">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-1.5 p-3 text-center">
                      <ImageIcon className="w-6 h-6 opacity-60" />
                      <span className="text-xs">No thumbnail</span>
                    </div>
                  )}

                  {selectedFile && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-xs font-semibold shadow-xs flex items-center gap-1">
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
                    className="w-full justify-center gap-1.5"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-primary" />
                    <span>{previewUrl ? "Change Image" : "Upload Image"}</span>
                  </Button>

                  {previewUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={loading}
                      onClick={handleRemoveThumbnail}
                      className="w-full justify-center gap-1.5 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Thumbnail</span>
                    </Button>
                  )}

                  <p className="text-xs text-muted-foreground leading-tight">
                    Supports PNG, JPG, WebP. Recommended 16:9 ratio.
                  </p>
                </div>
              </div>
            </div>

            {/* Share & Access Mode Section */}
            <div className="pt-2 border-t border-border">
              <ShareAccessModeSelector
                targetType="video"
                modeContext="edit"
                accessMode={shareAccessMode}
                onChangeAccessMode={setShareAccessMode}
                price={price}
                onChangePrice={setPrice}
                currency={currency}
                onChangeCurrency={setCurrency}
                countryPricing={countryPricing}
                onChangeCountryPricing={setCountryPricing}
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border shrink-0 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !title.trim()}
              className="w-full sm:w-auto min-w-[120px]"
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
