"use client";

import React, { useState, useEffect } from "react";
import { Film, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VideoThumbnailProps {
  src?: string | null;
  alt?: string;
  title?: string;
  status?: string | null;
  storageType?: string | null;
  progress?: number | null;
  className?: string;
  containerClassName?: string;
  compact?: boolean;
  showProcessingText?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export function VideoThumbnail({
  src,
  alt = "Video thumbnail",
  title,
  status,
  storageType,
  progress,
  className = "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300",
  containerClassName = "",
  compact = false,
  showProcessingText = true,
  onLoad,
  onError,
}: VideoThumbnailProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset state when src changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [src]);

  const isBunny = (storageType || "").toLowerCase() === "bunny";
  const isStatusProcessing =
    status === "PROCESSING" || status === "QUEUED" || status === "UPLOADING";

  const isProcessing =
    isStatusProcessing || (isBunny && status !== "READY" && status !== "FAILED" && status !== "CANCELLED");

  // 1. If there is no src URL provided
  if (!src) {
    if (isProcessing) {
      return (
        <div
          className={cn(
            "w-full h-full flex flex-col items-center justify-center text-center select-none bg-muted/80 dark:bg-muted/40 relative overflow-hidden",
            compact ? "p-1" : "p-3",
            containerClassName
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/15 via-transparent to-primary/10 animate-pulse pointer-events-none" />
          <div
            className={cn(
              "rounded-full bg-primary/15 text-primary flex items-center justify-center relative z-10 shadow-xs",
              compact ? "p-1 mb-0.5" : "p-2 sm:p-2.5 mb-1.5"
            )}
          >
            <Loader2
              className={cn(
                "animate-spin text-primary",
                compact ? "w-3 h-3" : "w-4 h-4 sm:w-5 sm:h-5"
              )}
            />
          </div>
          {showProcessingText && (
            <div className="relative z-10 space-y-0.5 px-1 max-w-full">
              <span
                className={cn(
                  "font-semibold text-foreground/90 leading-tight block truncate",
                  compact ? "text-[8px]" : "text-xs"
                )}
              >
                Video being processed
              </span>
              {!compact && typeof progress === "number" && progress > 0 && progress < 100 && (
                <span className="text-[10px] text-muted-foreground font-medium block">
                  {progress}% completed
                </span>
              )}
            </div>
          )}
        </div>
      );
    }

    if (status === "FAILED") {
      return (
        <div
          className={cn(
            "w-full h-full flex flex-col items-center justify-center p-2 text-center text-destructive bg-destructive/5",
            containerClassName
          )}
        >
          <AlertTriangle className={compact ? "w-3.5 h-3.5" : "w-8 h-8 mb-1"} />
          {!compact && <span className="text-xs font-semibold">Processing Failed</span>}
        </div>
      );
    }

    return (
      <div
        className={cn(
          "w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/40",
          containerClassName
        )}
      >
        <Film className={compact ? "w-3.5 h-3.5" : "w-8 h-8 sm:w-10 sm:h-10 mb-1 opacity-50"} />
        {!compact && <span className="text-xs font-medium">No Preview</span>}
      </div>
    );
  }

  // 2. If the single image request encountered an error (e.g. 404 from Bunny CDN while encoding)
  if (imageError) {
    if (isProcessing || isBunny) {
      return (
        <div
          className={cn(
            "w-full h-full flex flex-col items-center justify-center text-center select-none bg-muted/80 dark:bg-muted/40 relative overflow-hidden",
            compact ? "p-1" : "p-3",
            containerClassName
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/15 via-transparent to-primary/10 animate-pulse pointer-events-none" />
          <div
            className={cn(
              "rounded-full bg-primary/15 text-primary flex items-center justify-center relative z-10 shadow-xs",
              compact ? "p-1 mb-0.5" : "p-2 sm:p-2.5 mb-1.5"
            )}
          >
            <Loader2
              className={cn(
                "animate-spin text-primary",
                compact ? "w-3 h-3" : "w-4 h-4 sm:w-5 sm:h-5"
              )}
            />
          </div>
          {showProcessingText && (
            <div className="relative z-10 space-y-0.5 px-1 max-w-full">
              <span
                className={cn(
                  "font-semibold text-foreground/90 leading-tight block truncate",
                  compact ? "text-[8px]" : "text-xs"
                )}
              >
                Video being processed
              </span>
              {!compact && typeof progress === "number" && progress > 0 && progress < 100 && (
                <span className="text-[10px] text-muted-foreground font-medium block">
                  {progress}% completed
                </span>
              )}
            </div>
          )}
        </div>
      );
    }

    if (status === "FAILED") {
      return (
        <div
          className={cn(
            "w-full h-full flex flex-col items-center justify-center p-2 text-center text-destructive bg-destructive/5",
            containerClassName
          )}
        >
          <AlertTriangle className={compact ? "w-3.5 h-3.5" : "w-8 h-8 mb-1"} />
          {!compact && <span className="text-xs font-semibold">Processing Failed</span>}
        </div>
      );
    }

    return (
      <div
        className={cn(
          "w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/40",
          containerClassName
        )}
      >
        <Film className={compact ? "w-3.5 h-3.5" : "w-8 h-8 sm:w-10 sm:h-10 mb-1 opacity-50"} />
        {!compact && <span className="text-xs font-medium">No Preview</span>}
      </div>
    );
  }

  // 3. Exactly one single <img> tag is rendered and requested
  return (
    <div className={cn("w-full h-full relative overflow-hidden", containerClassName)}>
      {!imageLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80 dark:bg-muted/40 text-center z-10 select-none overflow-hidden">
          {isProcessing ? (
            <>
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/15 via-transparent to-primary/10 animate-pulse pointer-events-none" />
              <div
                className={cn(
                  "rounded-full bg-primary/15 text-primary flex items-center justify-center relative z-10 shadow-xs",
                  compact ? "p-1 mb-0.5" : "p-2 sm:p-2.5 mb-1.5"
                )}
              >
                <Loader2
                  className={cn(
                    "animate-spin text-primary",
                    compact ? "w-3 h-3" : "w-4 h-4 sm:w-5 sm:h-5"
                  )}
                />
              </div>
              {showProcessingText && (
                <div className="relative z-10 space-y-0.5 px-1 max-w-full">
                  <span
                    className={cn(
                      "font-semibold text-foreground/90 leading-tight block truncate",
                      compact ? "text-[8px]" : "text-xs"
                    )}
                  >
                    Video being processed
                  </span>
                  {!compact && typeof progress === "number" && progress > 0 && progress < 100 && (
                    <span className="text-[10px] text-muted-foreground font-medium block">
                      {progress}% completed
                    </span>
                  )}
                </div>
              )}
            </>
          ) : (
            <Loader2
              className={cn(
                "animate-spin",
                compact ? "w-3 h-3 text-muted-foreground" : "w-4 h-4 text-primary"
              )}
            />
          )}
        </div>
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => {
          setImageLoaded(true);
          onLoad?.();
        }}
        onError={() => {
          setImageError(true);
          onError?.();
        }}
        className={cn(
          className,
          !imageLoaded ? "opacity-0" : "opacity-100 transition-opacity duration-300"
        )}
      />
    </div>
  );
}

export default VideoThumbnail;
