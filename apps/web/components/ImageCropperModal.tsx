"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Crop,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  Move,
  Sparkles,
  CheckCircle2,
  Maximize2,
} from "lucide-react";

export type AspectRatioOption = "1:1" | "16:9" | "3:1" | "4:3";

export interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  onCropComplete: (croppedDataUrl: string) => void;
  aspectRatio?: AspectRatioOption;
  title?: string;
  description?: string;
  allowRatioChange?: boolean;
}

interface RatioConfig {
  label: string;
  shortLabel: string;
  ratio: number; // width / height
  targetW: number;
  targetH: number;
  aspectRatioCSS: string;
  hint: string;
  maxDisplayW: number;
}

const RATIO_CONFIGS: Record<AspectRatioOption, RatioConfig> = {
  "3:1": {
    label: "3:1 Banner Header",
    shortLabel: "3:1",
    ratio: 3 / 1,
    targetW: 1200,
    targetH: 400,
    aspectRatioCSS: "aspect-[3/1]",
    hint: "Recommended for Page Banners & Hero Header Covers (1200×400px)",
    maxDisplayW: 380,
  },
  "16:9": {
    label: "16:9 Widescreen",
    shortLabel: "16:9",
    ratio: 16 / 9,
    targetW: 1280,
    targetH: 720,
    aspectRatioCSS: "aspect-video",
    hint: "Recommended for Offering Covers & Video Thumbnails (1280×720px)",
    maxDisplayW: 340,
  },
  "1:1": {
    label: "1:1 Square",
    shortLabel: "1:1",
    ratio: 1,
    targetW: 512,
    targetH: 512,
    aspectRatioCSS: "aspect-square",
    hint: "Recommended for Avatars, Logos & Profile Icons (512×512px)",
    maxDisplayW: 260,
  },
  "4:3": {
    label: "4:3 Standard",
    shortLabel: "4:3",
    ratio: 4 / 3,
    targetW: 800,
    targetH: 600,
    aspectRatioCSS: "aspect-[4/3]",
    hint: "Standard Card Format (800×600px)",
    maxDisplayW: 300,
  },
};

export default function ImageCropperModal({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
  aspectRatio = "3:1",
  title,
  description,
  allowRatioChange = false,
}: ImageCropperModalProps) {
  const [selectedRatio, setSelectedRatio] = useState<AspectRatioOption>(aspectRatio);
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [previewDataUrl, setPreviewDataUrl] = useState<string>("");

  // Touch pinch-to-zoom tracking
  const [touchDistance, setTouchDistance] = useState<number | null>(null);
  const [pinchInitialZoom, setPinchInitialZoom] = useState<number>(1);

  // Dynamic container dimensions for viewport responsiveness
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number }>({
    width: 320,
    height: 260,
  });

  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync selected ratio if prop changes
  useEffect(() => {
    setSelectedRatio(aspectRatio);
  }, [aspectRatio]);

  const currentConfig = RATIO_CONFIGS[selectedRatio] || RATIO_CONFIGS["3:1"];

  // Measure container dimensions dynamically to fit any screen size (mobile -> 4K)
  useEffect(() => {
    if (!isOpen) return;

    const measureContainer = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setContainerDimensions({ width: rect.width, height: rect.height });
        }
      }
    };

    // Initial measure with microtask delay to ensure DOM is painted
    const frameId = requestAnimationFrame(measureContainer);
    window.addEventListener("resize", measureContainer);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      ro = new ResizeObserver(measureContainer);
      ro.observe(containerRef.current);
    }

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", measureContainer);
      if (ro) ro.disconnect();
    };
  }, [isOpen, selectedRatio]);

  // Compute adaptive crop box display dimensions that fit seamlessly inside container
  const { displayCropW, displayCropH } = useMemo(() => {
    const cW = containerDimensions.width || 320;
    const cH = containerDimensions.height || 260;
    const padX = 24;
    const padY = 24;
    const maxAvailW = Math.max(140, cW - padX * 2);
    const maxAvailH = Math.max(80, cH - padY * 2);

    let w = Math.min(currentConfig.maxDisplayW, maxAvailW);
    let h = w / currentConfig.ratio;

    if (h > maxAvailH) {
      h = maxAvailH;
      w = h * currentConfig.ratio;
    }

    return {
      displayCropW: Math.round(w),
      displayCropH: Math.round(h),
    };
  }, [containerDimensions, currentConfig]);

  // Base scale and rendered dimensions to ensure the image fully covers the crop frame at zoom=1
  const { baseScale, renderedBaseW, renderedBaseH } = useMemo(() => {
    const nw = imageSize.width || displayCropW;
    const nh = imageSize.height || displayCropH;
    const scale = Math.max(displayCropW / nw, displayCropH / nh);
    return {
      baseScale: scale,
      renderedBaseW: nw * scale,
      renderedBaseH: nh * scale,
    };
  }, [displayCropW, displayCropH, imageSize]);

  // Generate cropped canvas according to selected aspect ratio
  const getCroppedCanvas = useCallback(
    (
      currentZoom: number,
      currentOffset: { x: number; y: number },
      customImg?: HTMLImageElement,
      boxW?: number,
      boxH?: number
    ): HTMLCanvasElement | null => {
      const img = customImg || imageRef.current;
      if (!img || !img.naturalWidth || !img.naturalHeight) return null;

      const activeBoxW = boxW || displayCropW;
      const activeBoxH = boxH || displayCropH;

      const canvas = document.createElement("canvas");
      canvas.width = currentConfig.targetW;
      canvas.height = currentConfig.targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.clearRect(0, 0, currentConfig.targetW, currentConfig.targetH);

      // Scale relative to current interactive crop box
      const scaleToFit = Math.max(
        activeBoxW / img.naturalWidth,
        activeBoxH / img.naturalHeight
      );

      const effectiveScale = scaleToFit * currentZoom;

      // Crop box center with offset
      const imgCenterX = activeBoxW / 2 + currentOffset.x;
      const imgCenterY = activeBoxH / 2 + currentOffset.y;

      const srcCropW = activeBoxW / effectiveScale;
      const srcCropH = activeBoxH / effectiveScale;
      const srcX = (activeBoxW / 2 - imgCenterX) / effectiveScale + img.naturalWidth / 2 - srcCropW / 2;
      const srcY = (activeBoxH / 2 - imgCenterY) / effectiveScale + img.naturalHeight / 2 - srcCropH / 2;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      try {
        ctx.drawImage(
          img,
          srcX,
          srcY,
          srcCropW,
          srcCropH,
          0,
          0,
          currentConfig.targetW,
          currentConfig.targetH
        );
        return canvas;
      } catch (err) {
        console.error("Canvas drawImage error:", err);
        return null;
      }
    },
    [displayCropW, displayCropH, currentConfig.targetW, currentConfig.targetH]
  );

  const updatePreview = useCallback(
    (currentZoom: number, currentOffset: { x: number; y: number }, customImg?: HTMLImageElement) => {
      try {
        const canvas = getCroppedCanvas(currentZoom, currentOffset, customImg);
        if (canvas) {
          setPreviewDataUrl(canvas.toDataURL("image/png", 0.95));
        }
      } catch (err) {
        console.warn("Could not export preview canvas to data URL:", err);
      }
    },
    [getCroppedCanvas]
  );

  // Reset transforms whenever modal opens or aspect ratio changes
  useEffect(() => {
    if (imageSrc) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setPreviewDataUrl("");
    }
  }, [imageSrc, selectedRatio]);

  // Update preview when display box or image loads
  useEffect(() => {
    if (imageSize.width > 0 && imageRef.current) {
      updatePreview(zoom, offset);
    }
  }, [displayCropW, displayCropH, imageSize, zoom, offset, updatePreview]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    updatePreview(1, { x: 0, y: 0 }, img);
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newOffset = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    };
    setOffset(newOffset);
    updatePreview(zoom, newOffset);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile & pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y,
      });
      setTouchDistance(null);
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchDistance(dist);
      setPinchInitialZoom(zoom);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const newOffset = {
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      };
      setOffset(newOffset);
      updatePreview(zoom, newOffset);
    } else if (e.touches.length === 2 && touchDistance !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = currentDist / (touchDistance || 1);
      const newZoom = Math.min(3.5, Math.max(1, pinchInitialZoom * factor));
      setZoom(newZoom);
      updatePreview(newZoom, offset);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
      setTouchDistance(null);
    } else if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y,
      });
      setTouchDistance(null);
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    const newZoom = Math.min(3.5, Math.max(1, zoom + delta));
    setZoom(newZoom);
    updatePreview(newZoom, offset);
  };

  const handleZoomChange = (values: number | readonly number[]) => {
    const rawVal = Array.isArray(values) ? values[0] : values;
    const newZoom = Math.min(3.5, Math.max(1, rawVal || 1));
    setZoom(newZoom);
    updatePreview(newZoom, offset);
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    updatePreview(1, { x: 0, y: 0 });
  };

  const handleSaveCrop = () => {
    try {
      const canvas = getCroppedCanvas(zoom, offset);
      if (canvas) {
        const croppedBase64 = canvas.toDataURL("image/png", 0.95);
        onCropComplete(croppedBase64);
        onClose();
      }
    } catch (err: any) {
      console.error("Failed to crop image:", err);
      alert("Failed to export cropped image. Please try uploading the image again.");
    }
  };

  // Keyboard accessibility
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const step = e.shiftKey ? 20 : 6;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setOffset((prev) => {
          const next = { ...prev, x: prev.x - step };
          updatePreview(zoom, next);
          return next;
        });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setOffset((prev) => {
          const next = { ...prev, x: prev.x + step };
          updatePreview(zoom, next);
          return next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setOffset((prev) => {
          const next = { ...prev, y: prev.y - step };
          updatePreview(zoom, next);
          return next;
        });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setOffset((prev) => {
          const next = { ...prev, y: prev.y + step };
          updatePreview(zoom, next);
          return next;
        });
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        const newZoom = Math.min(3.5, zoom + 0.1);
        setZoom(newZoom);
        updatePreview(newZoom, offset);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        const newZoom = Math.max(1, zoom - 0.1);
        setZoom(newZoom);
        updatePreview(newZoom, offset);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, zoom, offset, updatePreview]);

  if (!isOpen || !imageSrc) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-[calc(100dvw-1rem)] sm:max-w-3xl lg:max-w-4xl max-h-[min(94dvh,860px)] h-fit flex flex-col p-0 overflow-hidden rounded-2xl sm:rounded-3xl border border-border shadow-2xl bg-card text-foreground duration-200"
        showCloseButton={true}
      >
        {/* Pinned Header (shrink-0) */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border shrink-0 space-y-2">
          <div className="flex items-center gap-3 pr-8">
            <div className="p-2.5 rounded-2xl bg-primary/15 text-primary shrink-0 shadow-xs">
              <Crop className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg font-bold truncate">
                {title || `Crop Image (${currentConfig.label})`}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground line-clamp-1 sm:line-clamp-2">
                {description || currentConfig.hint}
              </DialogDescription>
            </div>
          </div>

          {/* Aspect Ratio Selector Pills (if allowed) */}
          {allowRatioChange && (
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto py-0.5 scrollbar-none">
              {(["3:1", "16:9", "1:1", "4:3"] as AspectRatioOption[]).map((r) => (
                <Button
                  key={r}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRatio(r)}
                  className={`rounded-xl text-xs font-bold whitespace-nowrap shrink-0 ${
                    selectedRatio === r
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                      : "bg-muted/70 hover:bg-muted text-foreground border border-border"
                  }`}
                >
                  {RATIO_CONFIGS[r].label}
                </Button>
              ))}
            </div>
          )}
        </DialogHeader>

        {/* Scrollable & Contained Workspace Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
            
            {/* Left Column: Interactive Cropping Workspace (7 cols on desktop) */}
            <div className="lg:col-span-7 space-y-3">
              <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
                className="relative w-full h-[220px] xs:h-[250px] sm:h-[300px] md:h-[340px] bg-black rounded-2xl overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none border border-border shadow-inner touch-none"
                style={{ touchAction: "none" }}
              >

                {/* Rendered Image with Zoom & Offset */}
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Crop Target"
                  onLoad={onImageLoad}
                  draggable={false}
                  className="max-w-none pointer-events-none transition-transform duration-75 origin-center will-change-transform select-none"
                  style={{
                    transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`,
                    width: renderedBaseW ? `${renderedBaseW}px` : "auto",
                    height: renderedBaseH ? `${renderedBaseH}px` : "auto",
                  }}
                />

                {/* Responsive Crop Mask Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/75" />
                  <div
                    className="relative z-10 rounded-xl ring-2 ring-primary transition-[width,height] duration-150"
                    style={{
                      width: `${displayCropW}px`,
                      height: `${displayCropH}px`,
                    }}
                  >
                    {/* Rule of Thirds Grid Guidelines */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                      <div className="border-r border-b border-white/30" />
                      <div className="border-r border-b border-white/30" />
                      <div className="border-b border-white/30" />
                      <div className="border-r border-b border-white/30" />
                      <div className="border-r border-b border-white/30" />
                      <div className="border-b border-white/30" />
                      <div className="border-r border-b border-white/30" />
                      <div className="border-r border-b border-white/30" />
                      <div />
                    </div>

                    {/* Corner Accent Grips */}
                    <div className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-primary rounded-tl-sm shadow-xs" />
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-primary rounded-tr-sm shadow-xs" />
                    <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-primary rounded-bl-sm shadow-xs" />
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-primary rounded-br-sm shadow-xs" />

                    {/* Ratio Badge inside crop box */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-primary/90 backdrop-blur-xs text-xs font-black text-primary-foreground uppercase tracking-wider shadow-sm">
                      {selectedRatio}
                    </div>
                  </div>
                </div>

                {/* Gesture hint pill */}
                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-white/90 text-xs font-semibold flex items-center gap-1.5 pointer-events-none shadow-md whitespace-nowrap">
                  <Move className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
                  <span>Drag to pan · Pinch or scroll to zoom</span>
                </div>
              </div>

              {/* Controls Bar: Zoom Slider + Presets + Reset */}
              <div className="p-3 sm:p-3.5 bg-muted/60 border border-border/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <ZoomIn className="w-3.5 h-3.5 text-primary" />
                    <span>Zoom Level</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 1.5, 2].map((preset) => (
                        <Button
                          key={preset}
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            setZoom(preset);
                            updatePreview(preset, offset);
                          }}
                          className={`px-1.5 rounded-md font-mono font-bold cursor-pointer ${
                            Math.abs(zoom - preset) < 0.05
                              ? "bg-primary text-primary-foreground hover:bg-primary/90 border border-primary"
                              : "bg-background text-muted-foreground hover:text-foreground border border-border"
                          }`}
                        >
                          {preset}x
                        </Button>
                      ))}
                    </div>
                    <span className="font-mono text-primary font-bold text-xs">{zoom.toFixed(1)}x</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      const newZ = Math.max(1, zoom - 0.2);
                      setZoom(newZ);
                      updatePreview(newZ, offset);
                    }}
                    className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>

                  <Slider
                    min={1}
                    max={3.5}
                    step={0.05}
                    value={[zoom]}
                    onValueChange={handleZoomChange}
                    className="flex-1"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      const newZ = Math.min(3.5, zoom + 0.2);
                      setZoom(newZ);
                      updatePreview(newZ, offset);
                    }}
                    className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="text-xs text-muted-foreground hover:text-foreground shrink-0 gap-1 cursor-pointer"
                    title="Reset Position and Zoom"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Reset</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Column: Live Context Previews & Quality Metadata (5 cols on desktop) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="p-3.5 sm:p-4 rounded-2xl border border-border bg-card shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Live Preview
                    </span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground font-semibold">
                    {currentConfig.targetW} × {currentConfig.targetH}px
                  </span>
                </div>

                {/* Output Display */}
                <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 bg-muted/30 rounded-xl border border-border/60">
                  {previewDataUrl ? (
                    <div
                      className={`overflow-hidden rounded-xl border border-border shadow-md relative bg-black/40 ${
                        selectedRatio === "1:1"
                          ? "w-28 h-28 sm:w-32 sm:h-32 rounded-2xl"
                          : selectedRatio === "3:1"
                          ? "w-full max-w-[280px] h-20 sm:h-24 rounded-xl"
                          : "w-full max-w-[280px] h-32 sm:h-36 rounded-xl"
                      }`}
                    >
                      <img
                        src={previewDataUrl}
                        alt="Cropped Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-28 h-28 rounded-xl border border-dashed border-border flex items-center justify-center text-muted-foreground text-xs">
                      Generating preview...
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground mt-2 font-medium text-center">
                    {currentConfig.hint}
                  </span>
                </div>

                {/* Resolution & CDN Antialiasing Info */}
                <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 text-xs space-y-1">
                  <div className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>High-Resolution Output</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Exported at <strong className="text-foreground">{currentConfig.targetW}×{currentConfig.targetH}px</strong> ({currentConfig.label}), optimized for crisp rendering across all mobile, tablet, and retina displays.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer: ALWAYS VISIBLE across all screen heights & resolutions */}
        <DialogFooter className="p-3 sm:p-4 border-t border-border bg-card/95 backdrop-blur-md shrink-0 sticky bottom-0 z-20 flex-row items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={onClose}
            className="flex-1 sm:flex-initial text-xs font-semibold rounded-xl cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={handleSaveCrop}
            className="flex-1 sm:flex-initial text-xs font-bold rounded-xl cursor-pointer active:scale-95 transition-all"
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>Apply {currentConfig.shortLabel || selectedRatio} Crop</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
