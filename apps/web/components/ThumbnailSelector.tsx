"use client";

import React from "react";
import { Sparkles, UploadCloud, Check, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ThumbnailOption, formatDuration } from "@/lib/video-utils";

export interface ThumbnailSelectorProps {
  thumbnails?: ThumbnailOption[];
  selectedThumbnailIndex: number;
  onSelectThumbnail: (index: number) => void;
  customThumbUrl: string | null;
  onCustomThumbChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveCustomThumb: () => void;
  compressingThumb?: boolean;
  disabled?: boolean;
  inputId?: string;
  className?: string;
}

export function ThumbnailSelector({
  thumbnails,
  selectedThumbnailIndex,
  onSelectThumbnail,
  customThumbUrl,
  onCustomThumbChange,
  onRemoveCustomThumb,
  compressingThumb = false,
  disabled = false,
  inputId = "custom-thumbnail-file-input",
  className = "",
}: ThumbnailSelectorProps) {
  const hasThumbnails = thumbnails && thumbnails.length > 0;

  return (
    <div
      className={`p-3.5 rounded-2xl bg-muted/40 border border-border space-y-2.5 transition-all ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Select Video Thumbnail
          {hasThumbnails && (
            <span className="text-[10px] font-normal text-muted-foreground">
              ({thumbnails.length} frames generated)
            </span>
          )}
        </span>
        {customThumbUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemoveCustomThumb}
            disabled={disabled}
            className="h-6 text-[11px] text-destructive hover:bg-destructive/10 font-semibold p-1"
          >
            Reset to auto
          </Button>
        )}
      </div>

      {/* 4 Suggested Thumbnails Grid */}
      {hasThumbnails ? (
        <div className="grid grid-cols-4 gap-2">
          {thumbnails.map((thumb, idx) => {
            const isSelected = selectedThumbnailIndex === idx && !customThumbUrl;
            return (
              <button
                key={idx}
                type="button"
                disabled={disabled}
                onClick={() => onSelectThumbnail(idx)}
                className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all cursor-pointer group focus:outline-hidden ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/30 scale-[1.02] shadow-xs"
                    : "border-border opacity-75 hover:opacity-100 hover:border-primary/50"
                } ${disabled ? "pointer-events-none opacity-50" : ""}`}
              >
                <img
                  src={thumb.url}
                  alt={`Thumbnail frame ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-1 right-1 bg-black/75 backdrop-blur-xs text-[9px] font-mono font-medium text-white px-1 py-0.2 rounded-md">
                  {formatDuration(thumb.timestampSeconds)}
                </div>
                {isSelected && (
                  <div className="absolute top-1 left-1 bg-primary text-primary-foreground p-0.5 rounded-full shadow-2xs">
                    <Check className="w-2.5 h-2.5 stroke-3" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="py-3 px-2 text-center text-xs text-muted-foreground rounded-xl bg-card border border-dashed border-border">
          <ImageIcon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <span>Extracting thumbnail previews from recording...</span>
        </div>
      )}

      {/* Custom Uploaded Preview Banner (if active) */}
      {customThumbUrl && (
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-primary/10 border border-primary/20">
          <div className="relative aspect-video w-14 rounded-lg overflow-hidden border border-primary/30 shrink-0">
            <img
              src={customThumbUrl}
              alt="Custom uploaded thumbnail preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-0.5 left-0.5 bg-primary text-primary-foreground p-0.5 rounded-full">
              <Check className="w-2 h-2 stroke-3" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-primary truncate">
              Custom Image Selected
            </p>
            <p className="text-[10px] text-muted-foreground">
              Compressed to optimized 720p WebP
            </p>
          </div>
        </div>
      )}

      {/* Custom Thumbnail Upload Row */}
      <div className="pt-2 flex items-center justify-between border-t border-border">
        <span className="text-[11px] text-muted-foreground">
          {customThumbUrl ? "Using custom uploaded image" : "Or upload a custom image"}
        </span>
        <div>
          <input
            type="file"
            accept="image/*"
            disabled={disabled || compressingThumb}
            onChange={onCustomThumbChange}
            className="hidden"
            id={inputId}
          />
          <label
            htmlFor={inputId}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-7 text-xs font-medium gap-1.5 cursor-pointer",
              (disabled || compressingThumb) && "opacity-50 pointer-events-none"
            )}
          >
            {compressingThumb ? (
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
            ) : (
              <UploadCloud className="w-3.5 h-3.5 text-primary" />
            )}
            <span>
              {compressingThumb
                ? "Processing..."
                : customThumbUrl
                ? "Change custom..."
                : "Upload custom image"}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
