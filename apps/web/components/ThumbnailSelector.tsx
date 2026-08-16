"use client";

import React from "react";
import { Sparkles, UploadCloud, Check, Image as ImageIcon, Loader2 } from "lucide-react";
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
      className={`p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 transition-all ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-lime-600 dark:text-lime-400" />
          Select Video Thumbnail
          {hasThumbnails && (
            <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
              ({thumbnails.length} frames generated)
            </span>
          )}
        </span>
        {customThumbUrl && (
          <button
            type="button"
            onClick={onRemoveCustomThumb}
            disabled={disabled}
            className="text-[11px] text-red-600 dark:text-red-400 hover:underline font-semibold transition-colors disabled:opacity-50"
          >
            Reset to auto
          </button>
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
                className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all cursor-pointer group focus:outline-none ${
                  isSelected
                    ? "border-lime-500 dark:border-lime-400 ring-2 ring-lime-500/30 scale-[1.02] shadow-sm"
                    : "border-slate-200 dark:border-slate-800 opacity-75 hover:opacity-100 hover:border-slate-400 dark:hover:border-slate-600"
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
                  <div className="absolute top-1 left-1 bg-lime-500 text-white p-0.5 rounded-full shadow-xs">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="py-3 px-2 text-center text-xs text-slate-500 dark:text-slate-400 rounded-xl bg-white/60 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-800">
          <ImageIcon className="w-4 h-4 mx-auto mb-1 text-slate-400" />
          <span>Extracting thumbnail previews from recording...</span>
        </div>
      )}

      {/* Custom Uploaded Preview Banner (if active) */}
      {customThumbUrl && (
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-lime-500/10 border border-lime-500/20">
          <div className="relative aspect-video w-14 rounded-lg overflow-hidden border border-lime-500/30 shrink-0">
            <img
              src={customThumbUrl}
              alt="Custom uploaded thumbnail preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-0.5 left-0.5 bg-lime-500 text-white p-0.5 rounded-full">
              <Check className="w-2 h-2 stroke-[3]" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-lime-800 dark:text-lime-300 truncate">
              Custom Image Selected
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Compressed to optimized 720p WebP
            </p>
          </div>
        </div>
      )}

      {/* Custom Thumbnail Upload Row */}
      <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
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
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors shadow-2xs shrink-0 ${
              disabled || compressingThumb ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            {compressingThumb ? (
              <Loader2 className="w-3.5 h-3.5 text-lime-600 animate-spin" />
            ) : (
              <UploadCloud className="w-3.5 h-3.5 text-lime-600 dark:text-lime-400" />
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
