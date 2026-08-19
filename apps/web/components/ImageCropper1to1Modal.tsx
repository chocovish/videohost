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
  RotateCcw,
  Check,
  Move,
  Sparkles,
  Layers,
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

  const CROP_BOX_SIZE = 260; // Visual crop box size in px

  // Reset transform when new image is loaded
  useEffect(() => {
    if (imageSrc) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
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

      // Fill transparent/clean background
      ctx.clearRect(0, 0, TARGET_SIZE, TARGET_SIZE);

      // Calculate scale relative to crop box
      const scaleToFit = Math.max(
        CROP_BOX_SIZE / img.naturalWidth,
        CROP_BOX_SIZE / img.naturalHeight
      );

      const effectiveScale = scaleToFit * currentZoom;
      const renderW = img.naturalWidth * effectiveScale;
      const renderH = img.naturalHeight * effectiveScale;

      // Crop box center relative to image render center
      const imgCenterX = CROP_BOX_SIZE / 2 + currentOffset.x;
      const imgCenterY = CROP_BOX_SIZE / 2 + currentOffset.y;

      const srcCropW = CROP_BOX_SIZE / effectiveScale;
      const srcCropH = CROP_BOX_SIZE / effectiveScale;
      const srcX = (CROP_BOX_SIZE / 2 - imgCenterX) / effectiveScale + img.naturalWidth / 2 - srcCropW / 2;
      const srcY = (CROP_BOX_SIZE / 2 - imgCenterY) / effectiveScale + img.naturalHeight / 2 - srcCropH / 2;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

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
    },
    []
  );

  const updatePreview = useCallback(
    (currentZoom: number, currentOffset: { x: number; y: number }, customImg?: HTMLImageElement) => {
      const canvas = getCroppedCanvas(currentZoom, currentOffset, customImg);
      if (canvas) {
        setPreviewDataUrl(canvas.toDataURL("image/png", 0.95));
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

  const handleZoomChange = (values: number[]) => {
    const newZoom = values[0] || 1;
    setZoom(newZoom);
    updatePreview(newZoom, offset);
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    updatePreview(1, { x: 0, y: 0 });
  };

  const handleSaveCrop = () => {
    const canvas = getCroppedCanvas(zoom, offset);
    if (canvas) {
      const croppedBase64 = canvas.toDataURL("image/png", 0.95);
      onCropComplete(croppedBase64);
      onClose();
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-6 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] shrink-0">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">1:1 Logo Cropper</DialogTitle>
              <DialogDescription className="text-xs">
                Adjust and crop your organization logo to a perfect 1:1 square resolution
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-3">
          {/* Left / Center 2 cols: Interactive Cropper Canvas */}
          <div className="sm:col-span-2 space-y-3">
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="relative w-full h-[280px] bg-slate-950/90 rounded-2xl overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none border border-[hsl(var(--border))]"
            >
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
                  className="relative rounded-2xl border-2 border-[hsl(var(--primary))] shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
                >
                  {/* Grid Lines */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                    <div className="border-r border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div />
                  </div>

                  {/* Corner Accent Handles */}
                  <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-[hsl(var(--primary))]" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-[hsl(var(--primary))]" />
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-[hsl(var(--primary))]" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-[hsl(var(--primary))]" />

                  {/* 1:1 Badge inside crop area */}
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-bold text-white tracking-wider backdrop-blur-xs">
                    1:1 Square
                  </div>
                </div>
              </div>

              {/* Drag Hint */}
              <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/60 text-white/80 text-[10px] flex items-center gap-1 pointer-events-none backdrop-blur-xs">
                <Move className="w-3 h-3" /> Drag to reposition
              </div>
            </div>

            {/* Zoom Slider & Reset Controls */}
            <div className="flex items-center gap-3 px-1 pt-1">
              <ZoomIn className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />
              <div className="flex-1">
                <Slider
                  value={[zoom]}
                  min={1}
                  max={3}
                  step={0.05}
                  onValueChange={handleZoomChange}
                  className="cursor-pointer"
                />
              </div>
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] w-10 text-right">
                {zoom.toFixed(1)}x
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="h-8 px-2.5 text-xs rounded-lg shrink-0 gap-1"
                title="Reset Position and Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </Button>
            </div>
          </div>

          {/* Right 1 col: Live Previews in Various Shapes */}
          <div className="space-y-4 flex flex-col justify-between bg-[hsl(var(--muted))]/30 p-4 rounded-2xl border border-[hsl(var(--border))]">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-3 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[hsl(var(--primary))]" /> Live 1:1 Previews
              </div>

              <div className="space-y-3">
                {/* Square 1:1 Preview */}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl border-2 border-[hsl(var(--border))] bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                    {previewDataUrl ? (
                      <img src={previewDataUrl} alt="Square 1:1 preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[hsl(var(--foreground))]">Square (1:1)</p>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]">512 × 512 px</p>
                  </div>
                </div>

                {/* Circle 1:1 Preview */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-2 border-[hsl(var(--border))] bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                    {previewDataUrl ? (
                      <img src={previewDataUrl} alt="Circle 1:1 preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[hsl(var(--foreground))]">Circular Icon</p>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Avatars & Nav</p>
                  </div>
                </div>

                {/* Small Compact Preview */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg border border-[hsl(var(--border))] bg-white dark:bg-slate-900 shadow-xs overflow-hidden flex items-center justify-center shrink-0">
                    {previewDataUrl ? (
                      <img src={previewDataUrl} alt="Small 1:1 preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[hsl(var(--foreground))]">Favicon / Badge</p>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]">32 × 32 px</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20 text-[11px] text-[hsl(var(--foreground))] flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[hsl(var(--primary))] shrink-0 mt-0.5" />
              <span>Saves at high-resolution 1:1 square ratio for crisp display on all screens.</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSaveCrop}
            className="bg-[hsl(var(--primary))] text-white font-bold gap-1.5"
          >
            <Check className="w-4 h-4" /> Apply 1:1 Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
