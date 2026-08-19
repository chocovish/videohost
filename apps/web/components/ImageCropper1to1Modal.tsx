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
  Layers,
  Building2,
  CheckCircle2,
} from "lucide-react";

interface ImageCropper1to1ModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  onCropComplete: (croppedDataUrl: string) => void;
}

export default function ImageCropper1to1Modal({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
}: ImageCropper1to1ModalProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [previewDataUrl, setPreviewDataUrl] = useState<string>("");

  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const CROP_BOX_SIZE = 240; // Visual crop box size in px

  // Reset transforms whenever modal opens with a newly uploaded image
  useEffect(() => {
    if (imageSrc) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setPreviewDataUrl("");
    }
  }, [imageSrc]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    updatePreview(1, { x: 0, y: 0 }, img);
  };

  // Generate 1:1 cropped canvas
  const getCroppedCanvas = useCallback(
    (currentZoom: number, currentOffset: { x: number; y: number }, customImg?: HTMLImageElement): HTMLCanvasElement | null => {
      const img = customImg || imageRef.current;
      if (!img || !img.naturalWidth || !img.naturalHeight) return null;

      const canvas = document.createElement("canvas");
      const TARGET_SIZE = 512; // 512x512 1:1 square output
      canvas.width = TARGET_SIZE;
      canvas.height = TARGET_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Clear clean background
      ctx.clearRect(0, 0, TARGET_SIZE, TARGET_SIZE);

      // Calculate scale relative to crop box
      const scaleToFit = Math.max(
        CROP_BOX_SIZE / img.naturalWidth,
        CROP_BOX_SIZE / img.naturalHeight
      );

      const effectiveScale = scaleToFit * currentZoom;

      // Crop box center relative to image render center
      const imgCenterX = CROP_BOX_SIZE / 2 + currentOffset.x;
      const imgCenterY = CROP_BOX_SIZE / 2 + currentOffset.y;

      const srcCropW = CROP_BOX_SIZE / effectiveScale;
      const srcCropH = CROP_BOX_SIZE / effectiveScale;
      const srcX = (CROP_BOX_SIZE / 2 - imgCenterX) / effectiveScale + img.naturalWidth / 2 - srcCropW / 2;
      const srcY = (CROP_BOX_SIZE / 2 - imgCenterY) / effectiveScale + img.naturalHeight / 2 - srcCropH / 2;

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
          TARGET_SIZE,
          TARGET_SIZE
        );
        return canvas;
      } catch (err) {
        console.error("Canvas drawImage error:", err);
        return null;
      }
    },
    []
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
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl lg:max-w-4xl p-5 sm:p-6 md:p-7 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/15 text-primary shrink-0 shadow-xs">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle>Crop Organization Logo</DialogTitle>
              <DialogDescription>
                Position, zoom, and crop your uploaded logo to a perfect 1:1 square ratio.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Main 2-Column Responsive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-2 items-start">
          
          {/* Left Column: Interactive Cropping Workspace (7 Cols on Desktop) */}
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
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  maxWidth: "none",
                  maxHeight: "none",
                  transition: isDragging ? "none" : "transform 0.05s ease-out",
                }}
                className="pointer-events-none absolute select-none object-contain"
              />

              {/* 1:1 Square Crop Mask Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div
                  style={{ width: `${CROP_BOX_SIZE}px`, height: `${CROP_BOX_SIZE}px` }}
                  className="relative rounded-2xl border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]"
                >
                  {/* Grid Lines (Rule of Thirds) */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                    <div className="border-r border-b border-white/25" />
                    <div className="border-r border-b border-white/25" />
                    <div className="border-b border-white/25" />
                    <div className="border-r border-b border-white/25" />
                    <div className="border-r border-b border-white/25" />
                    <div className="border-b border-white/25" />
                    <div className="border-r border-b border-white/25" />
                    <div className="border-r border-b border-white/25" />
                    <div />
                  </div>

                  {/* Corner Accent Handles */}
                  <div className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-primary" />
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-primary" />
                  <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-primary" />
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-primary" />

                  {/* 1:1 Badge inside crop area */}
                  <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 text-[10px] font-bold text-white tracking-wider backdrop-blur-xs border border-white/10">
                    1:1 Square
                  </div>
                </div>
              </div>

              {/* Drag Hint */}
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/75 text-white/90 text-[11px] font-medium flex items-center gap-1.5 pointer-events-none backdrop-blur-xs border border-white/10">
                <Move className="w-3.5 h-3.5 text-primary" /> Click & drag to reposition
              </div>
            </div>

            {/* Zoom Controls Bar */}
            <div className="p-3 bg-muted/40 rounded-2xl border border-border space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ZoomIn className="w-3.5 h-3.5 text-primary" /> Zoom & Scale
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleZoomChange(1)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                      zoom === 1 ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    1.0x
                  </button>
                  <button
                    type="button"
                    onClick={() => handleZoomChange(1.5)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                      zoom === 1.5 ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    1.5x
                  </button>
                  <button
                    type="button"
                    onClick={() => handleZoomChange(2.0)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                      zoom === 2.0 ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    2.0x
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleZoomChange(zoom - 0.2)}
                  disabled={zoom <= 1}
                  className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>

                <div className="flex-1">
                  <Slider
                    value={[zoom]}
                    min={1}
                    max={3.5}
                    step={0.05}
                    onValueChange={handleZoomChange}
                    className="cursor-pointer"
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleZoomChange(zoom + 0.2)}
                  disabled={zoom >= 3.5}
                  className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>

                <span className="text-xs font-bold font-mono text-foreground w-11 text-right shrink-0">
                  {zoom.toFixed(1)}x
                </span>

                <div className="h-4 w-px bg-border shrink-0" />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="h-8 px-2.5 text-xs rounded-xl shrink-0 gap-1 font-medium hover:bg-muted"
                  title="Reset Position and Zoom"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column: Spacious Live Previews & UI Context (5 Cols on Desktop) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4 bg-muted/40 p-4 sm:p-5 rounded-2xl border border-border">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary" /> Live 1:1 Previews
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
                  Real-time
                </span>
              </div>

              {/* Previews List */}
              <div className="space-y-3.5">
                
                {/* 1. Large Square 1:1 Workspace Icon */}
                <div className="flex items-center gap-3.5 p-2 rounded-xl bg-card border border-border shadow-2xs">
                  <div className="w-16 h-16 rounded-xl border border-border bg-white dark:bg-slate-900 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:8px_8px] overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                    {previewDataUrl ? (
                      <img src={previewDataUrl} alt="Square 1:1 preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">Square Workspace Logo</p>
                    <p className="text-[11px] text-muted-foreground">512 × 512 px (Retina)</p>
                    <span className="inline-block mt-0.5 text-[9px] font-semibold text-primary uppercase tracking-wider">
                      Primary Brand Asset
                    </span>
                  </div>
                </div>

                {/* 2. Circular Avatar & Header Icon */}
                <div className="flex items-center gap-3.5 p-2 rounded-xl bg-card border border-border shadow-2xs">
                  <div className="w-12 h-12 rounded-full border border-border bg-white dark:bg-slate-900 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:8px_8px] overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                    {previewDataUrl ? (
                      <img src={previewDataUrl} alt="Circular preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">Circular Profile & Nav</p>
                    <p className="text-[11px] text-muted-foreground">Top bar navigation, avatar menus</p>
                  </div>
                </div>

                {/* 3. Small Compact Badge / Favicon */}
                <div className="flex items-center gap-3.5 p-2 rounded-xl bg-card border border-border shadow-2xs">
                  <div className="w-8 h-8 rounded-lg border border-border bg-white dark:bg-slate-900 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:8px_8px] overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                    {previewDataUrl ? (
                      <img src={previewDataUrl} alt="Compact badge preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">Favicon & Compact Badge</p>
                    <p className="text-[11px] text-muted-foreground">32 × 32 px table & list icon</p>
                  </div>
                </div>

                {/* 4. Realistic Organization Menu Context Mockup */}
                <div className="p-2.5 rounded-xl bg-slate-900 text-white border border-slate-800 shadow-md">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 flex items-center justify-between">
                    <span>In-App Context Mockup</span>
                    <Building2 className="w-3 h-3 text-primary" />
                  </div>
                  <div className="flex items-center gap-2.5 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                    <div className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-900 overflow-hidden shrink-0 flex items-center justify-center">
                      {previewDataUrl ? (
                        <img src={previewDataUrl} alt="Context mockup" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-800 animate-pulse" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-100 truncate">Your Organization</span>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      </div>
                      <p className="text-[10px] text-slate-400">Enterprise Workspace</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom High-Res Quality Badge */}
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground flex items-start gap-2.5 mt-2">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>Saves at high-resolution 1:1 square ratio (512 × 512 px) for crisp display on all screens.</span>
            </div>
          </div>

        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSaveCrop}
            className="gap-2"
          >
            <Check className="w-4 h-4" /> Apply 1:1 Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
