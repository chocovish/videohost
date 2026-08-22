"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
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

const RATIO_CONFIGS: Record<
  AspectRatioOption,
  {
    label: string;
    cropW: number;
    cropH: number;
    targetW: number;
    targetH: number;
    aspectRatioCSS: string;
    hint: string;
  }
> = {
  "1:1": {
    label: "1:1 Square",
    cropW: 240,
    cropH: 240,
    targetW: 512,
    targetH: 512,
    aspectRatioCSS: "aspect-square",
    hint: "Recommended for Avatars, Logos & Profile Icons (512×512px)",
  },
  "16:9": {
    label: "16:9 Widescreen",
    cropW: 320,
    cropH: 180,
    targetW: 1280,
    targetH: 720,
    aspectRatioCSS: "aspect-video",
    hint: "Recommended for Offering Covers & Video Thumbnails (1280×720px)",
  },
  "3:1": {
    label: "3:1 Banner Header",
    cropW: 330,
    cropH: 110,
    targetW: 1200,
    targetH: 400,
    aspectRatioCSS: "aspect-[3/1]",
    hint: "Recommended for Page Banners & Hero Header Covers (1200×400px)",
  },
  "4:3": {
    label: "4:3 Standard",
    cropW: 280,
    cropH: 210,
    targetW: 800,
    targetH: 600,
    aspectRatioCSS: "aspect-[4/3]",
    hint: "Standard Card Format (800×600px)",
  },
};

export default function ImageCropperModal({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
  aspectRatio = "1:1",
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

  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync selected ratio if prop changes
  useEffect(() => {
    setSelectedRatio(aspectRatio);
  }, [aspectRatio]);

  const currentConfig = RATIO_CONFIGS[selectedRatio] || RATIO_CONFIGS["1:1"];
  const CROP_BOX_W = currentConfig.cropW;
  const CROP_BOX_H = currentConfig.cropH;

  // Reset transforms whenever modal opens with a newly uploaded image
  useEffect(() => {
    if (imageSrc) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setPreviewDataUrl("");
    }
  }, [imageSrc, selectedRatio]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    updatePreview(1, { x: 0, y: 0 }, img);
  };

  // Generate cropped canvas according to selected aspect ratio
  const getCroppedCanvas = useCallback(
    (
      currentZoom: number,
      currentOffset: { x: number; y: number },
      customImg?: HTMLImageElement
    ): HTMLCanvasElement | null => {
      const img = customImg || imageRef.current;
      if (!img || !img.naturalWidth || !img.naturalHeight) return null;

      const canvas = document.createElement("canvas");
      canvas.width = currentConfig.targetW;
      canvas.height = currentConfig.targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.clearRect(0, 0, currentConfig.targetW, currentConfig.targetH);

      // Scale relative to crop box
      const scaleToFit = Math.max(
        CROP_BOX_W / img.naturalWidth,
        CROP_BOX_H / img.naturalHeight
      );

      const effectiveScale = scaleToFit * currentZoom;

      const imgCenterX = CROP_BOX_W / 2 + currentOffset.x;
      const imgCenterY = CROP_BOX_H / 2 + currentOffset.y;

      const srcCropW = CROP_BOX_W / effectiveScale;
      const srcCropH = CROP_BOX_H / effectiveScale;
      const srcX = (CROP_BOX_W / 2 - imgCenterX) / effectiveScale + img.naturalWidth / 2 - srcCropW / 2;
      const srcY = (CROP_BOX_H / 2 - imgCenterY) / effectiveScale + img.naturalHeight / 2 - srcCropH / 2;

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
    [CROP_BOX_W, CROP_BOX_H, currentConfig.targetW, currentConfig.targetH]
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

  // Drag pan handlers
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

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const newOffset = {
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    };
    setOffset(newOffset);
    updatePreview(zoom, newOffset);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
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

  if (!isOpen || !imageSrc) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-3xl lg:max-w-4xl p-4 sm:p-6 md:p-7 overflow-hidden rounded-2xl sm:rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/15 text-primary shrink-0 shadow-xs">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle>{title || `Crop Image (${currentConfig.label})`}</DialogTitle>
              <DialogDescription>
                {description || currentConfig.hint}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Ratio Selector (if allowed) */}
        {allowRatioChange && (
          <div className="flex items-center gap-2 pt-1 pb-2 overflow-x-auto">
            {(["1:1", "16:9", "3:1", "4:3"] as AspectRatioOption[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedRatio(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  selectedRatio === r
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-muted hover:bg-muted/80 text-foreground border-border"
                }`}
              >
                {RATIO_CONFIGS[r].label}
              </button>
            ))}
          </div>
        )}

        {/* Main 2-Column Responsive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-2 items-start">
          
          {/* Left Column: Interactive Cropping Workspace */}
          <div className="lg:col-span-7 space-y-4">
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="relative w-full h-[320px] sm:h-[350px] bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none border border-border shadow-inner"
            >
              {/* Background checkered grid pattern */}
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

              {/* Image Render with Zoom & Offset */}
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop Target"
                onLoad={onImageLoad}
                draggable={false}
                className="max-w-none pointer-events-none transition-transform duration-75 origin-center will-change-transform"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  maxHeight: `${CROP_BOX_H}px`,
                  maxWidth: `${CROP_BOX_W}px`,
                  width: "auto",
                  height: "auto",
                }}
              />

              {/* Crop Mask Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div
                  className="relative rounded-2xl ring-2 ring-primary shadow-[0_0_0_9999px_rgba(3,7,18,0.78)] transition-all"
                  style={{ width: `${CROP_BOX_W}px`, height: `${CROP_BOX_H}px` }}
                >
                  {/* Subtle Grid Rule of Thirds Lines */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                    <div className="border-r border-b border-white/30" />
                    <div className="border-r border-b border-white/30" />
                    <div className="border-b border-white/30" />
                    <div className="border-r border-b border-white/30" />
                    <div className="border-r border-b border-white/30" />
                    <div className="border-b border-white/30" />
                    <div className="border-r border-white/30" />
                    <div className="border-r border-white/30" />
                    <div />
                  </div>

                  {/* Corner Accent Grips */}
                  <div className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-primary rounded-tl-md" />
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-primary rounded-tr-md" />
                  <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-primary rounded-bl-md" />
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-primary rounded-br-md" />

                  {/* Ratio Badge inside crop area */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-primary text-[10px] font-black text-white uppercase tracking-wider shadow-sm">
                    {selectedRatio}
                  </div>
                </div>
              </div>

              {/* Drag instruction overlay pill */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-white/90 text-[11px] font-semibold flex items-center gap-1.5 pointer-events-none shadow-md">
                <Move className="w-3.5 h-3.5 text-primary" />
                <span>Click & drag to reposition</span>
              </div>
            </div>

            {/* Controls Bar: Zoom & Reset */}
            <div className="p-3.5 bg-muted/60 border border-border/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <ZoomIn className="w-3.5 h-3.5 text-primary" />
                  <span>Zoom Level</span>
                </div>
                <span className="font-mono text-primary font-bold">{zoom.toFixed(1)}x</span>
              </div>

              <div className="flex items-center gap-3">
                <ZoomOut className="w-4 h-4 text-muted-foreground shrink-0" />
                <Slider
                  min={1}
                  max={3.5}
                  step={0.05}
                  value={[zoom]}
                  onValueChange={handleZoomChange}
                  className="flex-1"
                />
                <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0 gap-1 rounded-xl"
                  title="Reset Position and Zoom"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Context Previews */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Live Result Preview
                  </span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {currentConfig.targetW} × {currentConfig.targetH}px
                </span>
              </div>

              {/* Main Crop Output Display */}
              <div className="flex flex-col items-center justify-center p-3 bg-muted/30 rounded-xl border border-border/60">
                {previewDataUrl ? (
                  <div
                    className={`overflow-hidden rounded-xl border border-border shadow-md relative bg-black/40 ${
                      selectedRatio === "1:1"
                        ? "w-32 h-32 rounded-2xl"
                        : selectedRatio === "3:1"
                        ? "w-full h-24 rounded-xl"
                        : "w-full h-36 rounded-xl"
                    }`}
                  >
                    <img
                      src={previewDataUrl}
                      alt="Cropped Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-2xl border border-dashed border-border flex items-center justify-center text-muted-foreground text-xs">
                    Generating...
                  </div>
                )}
                <span className="text-[11px] text-muted-foreground mt-2 font-medium">
                  {currentConfig.hint}
                </span>
              </div>

              {/* Resolution Info Box */}
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs space-y-1">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> High-Resolution Output
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Exported with crisp antialiasing at{" "}
                  <strong className="text-foreground">{currentConfig.targetW}×{currentConfig.targetH}px</strong>, optimized for CDN streaming and responsive displays.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-border mt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="w-full sm:w-auto text-xs font-semibold rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSaveCrop}
            className="w-full sm:w-auto text-xs font-bold gap-1.5 bg-primary text-white rounded-xl shadow-md cursor-pointer hover:opacity-90 active:scale-95"
          >
            <Check className="w-4 h-4" /> Apply {currentConfig.label} Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
