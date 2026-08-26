"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Video,
  Mic,
  MicOff,
  Square as SquareIcon,
  Play,
  Pause,
  RotateCcw,
  UploadCloud,
  AlertCircle,
  AlertTriangle,
  Folder,
  Clock,
  Maximize2,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  X,
  Disc,
  Download,
  Camera,
  CameraOff,
  Settings2,
  Monitor,
  LayoutGrid,
  Circle,
  Square,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  Timer,
  Zap,
  Layers,
  Scissors,
} from "lucide-react";
import {
  formatDuration,
  formatBytes,
} from "@/lib/video-utils";
import {
  WebcamCorner,
  WebcamShape,
  WebcamSize,
  ResolutionPreset,
} from "@/lib/recording-compositor";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadVideoFile } from "@/lib/upload-video";
import { processThumbnail } from "@/lib/video-utils";
import { ThumbnailSelector } from "@/components/ThumbnailSelector";
import { VideoTrimmer } from "@/components/VideoTrimmer";
import { useScreenRecorder, CompressionPreset, TargetFps } from "@/hooks/useScreenRecorder";

interface ScreenRecordDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  currentFolderId?: string | null;
  folderPathName?: string;
}

export default function ScreenRecordDrawer({
  isOpen,
  onClose,
  onUploadSuccess,
  currentFolderId,
  folderPathName,
}: ScreenRecordDrawerProps) {
  const {
    recordState,
    setRecordState,
    isProcessing,
    processingStatus,
    isMicEnabled,
    wasMicEnabledOnStart,
    handleToggleMic,
    recordingTime,
    recordedFile,
    previewUrl,
    originalRecordedFile,
    originalMetadata,
    isTrimmed,
    applyTrimmedVideo,
    revertToOriginalRecording,
    isWebcamEnabled,
    handleToggleWebcam,
    cameraDevices,
    selectedCameraId,
    handleSelectCameraDevice,
    webcamCorner,
    setWebcamCorner,
    webcamShape,
    setWebcamShape,
    webcamSize,
    setWebcamSize,
    fps,
    setFps,
    resolution,
    setResolution,
    compressionMode,
    setCompressionMode,
    countdownDelay,
    setCountdownDelay,
    countdownTime,
    title,
    setTitle,
    error,
    setError,
    metadata,
    videoPreviewRef,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelCountdown,
    handleReRecord,
    resetAll,
    handleDownload,
  } = useScreenRecorder();

  const isMicDisabledMidRecording = (recordState === "recording" || recordState === "paused") && !wasMicEnabledOnStart;

  const [description, setDescription] = useState("");
  const [requireHls, setRequireHls] = useState(false);
  const [showStudioSettings, setShowStudioSettings] = useState(false);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const recordedVideoRef = useRef<HTMLVideoElement | null>(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [checkingQuota, setCheckingQuota] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  // 4 Suggested Thumbnails + Custom Upload State
  const [selectedThumbnailIndex, setSelectedThumbnailIndex] = useState(0);
  const [customThumbBlob, setCustomThumbBlob] = useState<Blob | null>(null);
  const [customThumbUrl, setCustomThumbUrl] = useState<string | null>(null);
  const [compressingThumb, setCompressingThumb] = useState(false);

  const [highQualityConfirm, setHighQualityConfirm] = useState<{
    isOpen: boolean;
    settingLabel: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    settingLabel: "",
    onConfirm: () => { },
  });

  const handleSelectFps = (selectedFps: TargetFps) => {
    if (selectedFps === 60 && fps !== 60) {
      setHighQualityConfirm({
        isOpen: true,
        settingLabel: "60 FPS Frame Rate",
        onConfirm: () => setFps(60),
      });
    } else {
      setFps(selectedFps);
    }
  };

  const handleSelectResolution = (selectedRes: ResolutionPreset) => {
    if (selectedRes === "4k" && resolution !== "4k") {
      setHighQualityConfirm({
        isOpen: true,
        settingLabel: "4K Resolution",
        onConfirm: () => setResolution("4k"),
      });
    } else {
      setResolution(selectedRes);
    }
  };

  const handleSelectCompressionMode = (selectedMode: CompressionPreset) => {
    if (selectedMode === "max_quality" && compressionMode !== "max_quality") {
      setHighQualityConfirm({
        isOpen: true,
        settingLabel: "Max Bitrate Quality",
        onConfirm: () => setCompressionMode("max_quality"),
      });
    } else {
      setCompressionMode(selectedMode);
    }
  };

  // Thumbnail Handlers
  const handleSelectThumbnail = (index: number) => {
    if (!metadata?.thumbnails?.[index]) return;
    setSelectedThumbnailIndex(index);
    if (customThumbUrl) {
      URL.revokeObjectURL(customThumbUrl);
    }
    setCustomThumbBlob(null);
    setCustomThumbUrl(null);
  };

  const handleCustomThumbChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedImage = e.target.files[0];
      try {
        setCompressingThumb(true);
        const { blob, url } = await processThumbnail(selectedImage, {
          maxWidth: 1280,
          maxHeight: 720,
          quality: 0.82,
        });
        if (customThumbUrl) {
          URL.revokeObjectURL(customThumbUrl);
        }
        setSelectedThumbnailIndex(-1);
        setCustomThumbBlob(blob);
        setCustomThumbUrl(url);
      } catch (err: any) {
        console.error("Failed to compress thumbnail image:", err);
        setError("Failed to compress selected thumbnail image");
      } finally {
        setCompressingThumb(false);
      }
    }
  };

  const handleRemoveCustomThumb = () => {
    if (customThumbUrl) {
      URL.revokeObjectURL(customThumbUrl);
    }
    setCustomThumbBlob(null);
    setCustomThumbUrl(null);
    setSelectedThumbnailIndex(0);
  };

  // Quota checking on recorded file change
  useEffect(() => {
    if (recordedFile && recordState === "recorded") {
      let isMounted = true;
      const checkQuota = async () => {
        setCheckingQuota(true);
        setIsQuotaExceeded(false);
        try {
          const usageRes = await fetch("/api/v1/usage");
          if (usageRes.ok && isMounted) {
            const usageData = await usageRes.json();
            if (usageData.usage) {
              const { usedBytes, storageLimitBytes, isLimitReached } = usageData.usage;
              const remainingBytes = Math.max(0, storageLimitBytes - usedBytes);
              if (isLimitReached || recordedFile.size > remainingBytes) {
                setIsQuotaExceeded(true);
                setError(
                  `Recorded file size (${formatBytes(recordedFile.size)}) exceeds your available storage quota (${formatBytes(remainingBytes)} remaining out of ${formatBytes(storageLimitBytes)}). Upload is disabled.`
                );
              } else {
                setIsQuotaExceeded(false);
              }
            }
          }
        } catch (e) {
          console.warn("Quota check error:", e);
        } finally {
          if (isMounted) setCheckingQuota(false);
        }
      };
      checkQuota();
      return () => {
        isMounted = false;
      };
    }
  }, [recordedFile, recordState, setError]);

  const handleFullReset = useCallback(() => {
    resetAll();
    setDescription("");
    setRequireHls(false);
    setShowStudioSettings(false);
    setCheckingQuota(false);
    setIsQuotaExceeded(false);
    setShowConfirmClose(false);
    setShowTrimmer(false);
    setUploading(false);
    setProgress(0);
    setStatusText("");
    setSelectedThumbnailIndex(0);
    if (customThumbUrl) {
      URL.revokeObjectURL(customThumbUrl);
    }
    setCustomThumbBlob(null);
    setCustomThumbUrl(null);
    setCompressingThumb(false);
  }, [resetAll, customThumbUrl]);

  // Handle drawer close attempt
  const handleAttemptClose = () => {
    if (uploading) return;
    if (
      recordState === "recording" ||
      recordState === "paused" ||
      recordState === "countdown" ||
      (recordState === "recorded" && recordedFile)
    ) {
      setShowConfirmClose(true);
    } else {
      handleFullReset();
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    handleFullReset();
    onClose();
  };

  // Upload Process
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordedFile || !title.trim() || checkingQuota || isQuotaExceeded) return;

    setError("");
    setCheckingQuota(true);

    try {
      const usageRes = await fetch("/api/v1/usage");
      if (usageRes.ok) {
        const usageData = await usageRes.json();
        if (usageData.usage) {
          const { usedBytes, storageLimitBytes, isLimitReached } = usageData.usage;
          const remainingBytes = Math.max(0, storageLimitBytes - usedBytes);
          if (isLimitReached || recordedFile.size > remainingBytes) {
            setIsQuotaExceeded(true);
            setError(
              `Cannot upload recording (${formatBytes(recordedFile.size)}). Your available storage quota is ${formatBytes(remainingBytes)} remaining out of ${formatBytes(storageLimitBytes)}.`
            );
            setCheckingQuota(false);
            return;
          }
        }
      }
    } catch (quotaErr) {
      console.warn("Pre-upload quota check failed:", quotaErr);
    } finally {
      setCheckingQuota(false);
    }

    setUploading(true);
    setRecordState("uploading");

    const effectiveThumbnailBlob = customThumbBlob || (
      selectedThumbnailIndex >= 0 && metadata?.thumbnails?.[selectedThumbnailIndex]
        ? metadata.thumbnails[selectedThumbnailIndex].blob
        : metadata?.thumbnailBlob
    );

    try {
      await uploadVideoFile({
        file: recordedFile,
        title: title.trim(),
        description: description.trim() || undefined,
        requireHls,
        currentFolderId,
        metadata: metadata ? {
          ...metadata,
          thumbnailBlob: effectiveThumbnailBlob,
        } : null,
        onProgress: (percent, status) => {
          setProgress(percent);
          setStatusText(status);
        },
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("usage-updated"));
        window.dispatchEvent(new CustomEvent("video-uploaded"));
      }

      setTimeout(() => {
        setUploading(false);
        handleFullReset();
        onUploadSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err?.message || "An error occurred during recording upload");
      setUploading(false);
      setRecordState("recorded");
    }
  };

  return (
    <>
      <Drawer open={isOpen} onOpenChange={(open) => !open && handleAttemptClose()}>
        <DrawerContent className="w-full max-h-[96dvh] sm:max-h-[92dvh] flex flex-col p-0 overflow-hidden" hideCloseButton>
          <div className="max-w-7xl mx-auto w-full flex flex-col h-full max-h-[96dvh] sm:max-h-[92dvh] relative overflow-hidden">
            {/* Corner Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAttemptClose}
              disabled={uploading}
              className="absolute top-2.5 right-3 sm:top-3 sm:right-4 rounded-xl z-20"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </Button>

            <DrawerHeader className="shrink-0 px-4 sm:px-6 pt-3 pb-2.5 pr-14 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary text-primary-foreground shadow-xs shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <DrawerTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg font-extrabold tracking-tight">
                    Studio Screen Recorder
                    {recordState === "countdown" && (
                      <span className="text-xs bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-full font-semibold animate-pulse">
                        Starting in {countdownTime}s...
                      </span>
                    )}
                    {recordState === "recording" && (
                      <span className="text-xs bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive" /> REC
                      </span>
                    )}
                    {recordState === "paused" && (
                      <span className="text-xs bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-full font-semibold">
                        PAUSED
                      </span>
                    )}
                  </DrawerTitle>
                  <DrawerDescription className="text-xs text-muted-foreground truncate">
                    Capture screen, webcam PIP overlay, and microphone audio.
                    {folderPathName ? (
                      <span className="ml-1 font-medium text-foreground">
                        Saving to: <Folder className="w-3 h-3 inline-block mx-0.5 -mt-0.5 text-primary" /> {folderPathName}
                      </span>
                    ) : (
                      <span className="ml-1 text-muted-foreground">(Saving to Root Drive)</span>
                    )}
                  </DrawerDescription>
                </div>
              </div>
            </DrawerHeader>

            {/* Error Banner */}
            {error && (
              <Alert variant="destructive" className="shrink-0 mx-4 sm:mx-6 my-2 text-xs animate-in fade-in slide-in-from-top-2">
                <AlertCircle />
                <span className="flex-1 text-xs">{error}</span>
              </Alert>
            )}

            {/* Main Content Area */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-3 space-y-3 overscroll-contain">
              {/* State: IDLE / COUNTDOWN / RECORDING / PAUSED */}
              {(recordState === "idle" ||
                recordState === "countdown" ||
                recordState === "recording" ||
                recordState === "paused") && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
                    {/* LEFT COLUMN: Video Preview Viewport */}
                    <div className="lg:col-span-7 space-y-2">
                      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-[38vh] lg:max-h-[50vh] w-full flex items-center justify-center border border-border shadow-xl group">
                        <video
                          ref={videoPreviewRef}
                          autoPlay
                          playsInline
                          muted
                          className={`w-full h-full object-contain ${recordState === "idle" ? "hidden" : "block"
                            }`}
                        />

                        {/* Countdown Overlay */}
                        {recordState === "countdown" && (
                          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-20 gap-2.5">
                            <div className="w-20 h-20 rounded-full bg-destructive/20 border-2 border-destructive flex items-center justify-center animate-ping absolute" />
                            <span className="text-6xl font-black text-white font-mono tracking-tighter drop-shadow-lg z-10">
                              {countdownTime}
                            </span>
                            <p className="text-xs text-white/70 font-semibold uppercase tracking-widest">
                              Get Ready...
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelCountdown}
                              className="mt-1 text-xs text-white/70 hover:text-white hover:bg-white/10"
                            >
                              Cancel Countdown
                            </Button>
                          </div>
                        )}

                        {/* Idle State Banner */}
                        {recordState === "idle" && (
                          <div className="text-center p-4 space-y-2 max-w-sm">
                            <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto text-primary shadow-inner">
                              <Monitor className="w-6 h-6" />
                            </div>
                            <div className="space-y-0.5">
                              <h3 className="text-base font-bold text-white tracking-tight">
                                Ready to Record
                              </h3>
                              <p className="text-xs text-white/60">
                                Configure studio options on the right and click start.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Live Recording HUD Status Bar */}
                        {(recordState === "recording" || recordState === "paused") && (
                          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none">
                            <div className="flex items-center gap-2 bg-black/90 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full shadow-lg pointer-events-auto">
                              <span
                                className={`w-2 h-2 rounded-full ${recordState === "recording"
                                  ? "bg-destructive animate-pulse"
                                  : "bg-primary"
                                  }`}
                              />
                              <span className="text-xs font-mono font-bold text-white">
                                {formatDuration(recordingTime)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 bg-black/90 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full shadow-lg text-xs font-semibold text-white/70 pointer-events-auto">
                              <span className="text-primary uppercase font-mono">{resolution}</span>
                              <span>•</span>
                              <span>{fps} FPS</span>
                              <span>•</span>
                              <span>{isWebcamEnabled ? "Cam Active" : "No Cam"}</span>
                              <span>•</span>
                              <span>{isMicEnabled ? "Mic On" : "Muted"}</span>
                            </div>
                          </div>
                        )}

                        {/* Processing Video Overlay */}
                        {isProcessing && (
                          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs z-30 flex flex-col items-center justify-center text-white space-y-2.5 p-4 text-center animate-in fade-in">
                            <div className="w-12 h-12 rounded-xl bg-destructive/20 border border-destructive/30 flex items-center justify-center text-destructive">
                              <Loader2 className="w-6 h-6 animate-spin" />
                            </div>
                            <div className="space-y-0.5">
                              <h4 className="text-xs font-extrabold text-white">
                                {processingStatus || "Processing Recording..."}
                              </h4>
                              <p className="text-xs text-white/60 max-w-xs leading-relaxed">
                                Transmuxing container, fixing timeline duration, and generating thumbnails.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Controls Panel in Fitted Grid */}
                    <div className="lg:col-span-5 flex flex-col justify-between gap-2.5">
                      {recordState === "idle" && (
                        <div className="space-y-2.5">
                          {/* Row 1: Mic & Webcam Toggles */}
                          <div className="grid grid-cols-2 gap-2">
                            <Button variant="ghost"
                              type="button"
                              onClick={handleToggleMic}
                              className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${isMicEnabled
                                ? "bg-primary/10 border-primary/40 text-primary"
                                : "bg-card border-border hover:border-ring"
                                }`}
                            >
                              <div
                                className={`p-1.5 rounded-lg shrink-0 ${isMicEnabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                  }`}
                              >
                                {isMicEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate">Microphone</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {isMicEnabled ? "Voice On" : "Muted"}
                                </p>
                              </div>
                            </Button>

                            <Button variant="ghost"
                              type="button"
                              onClick={handleToggleWebcam}
                              className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${isWebcamEnabled
                                ? "bg-primary/10 border-primary/40 text-primary"
                                : "bg-card border-border hover:border-ring"
                                }`}
                            >
                              <div
                                className={`p-1.5 rounded-lg shrink-0 ${isWebcamEnabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                  }`}
                              >
                                {isWebcamEnabled ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate">Webcam PIP</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {isWebcamEnabled ? "Active PIP" : "Disabled"}
                                </p>
                              </div>
                            </Button>
                          </div>

                          {/* Compact Auto-Expanded Webcam PIP Controls */}
                          {isWebcamEnabled && (
                            <div className="p-2.5 rounded-xl bg-muted/60 border border-primary/30 space-y-2 animate-in fade-in slide-in-from-top-2">
                              <div className="flex items-center justify-between border-b border-border pb-1">
                                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                  <Sparkles className="w-3 h-3 text-primary" /> Webcam PIP Options
                                </h4>
                                <span className="text-xs font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                                  Active
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {/* Camera Device */}
                                <div className="space-y-0.5">
                                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                                    Camera Device
                                  </Label>
                                  <Select
                                    value={selectedCameraId || (cameraDevices.length > 0 ? cameraDevices[0].deviceId : "")}
                                    onValueChange={(val) => handleSelectCameraDevice(val || "")}
                                    disabled={cameraDevices.length === 0}
                                  >
                                    <SelectTrigger size="sm" className="w-full h-7 text-xs">
                                      <SelectValue placeholder="Select camera" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {cameraDevices.length === 0 ? (
                                        <SelectItem value="none" disabled>No camera found</SelectItem>
                                      ) : (
                                        cameraDevices.map((dev) => (
                                          <SelectItem key={dev.deviceId} value={dev.deviceId}>
                                            {dev.label || `Camera (${dev.deviceId.slice(0, 5)}...)`}
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Corner Position */}
                                <div className="space-y-0.5">
                                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                                    Position Corner
                                  </Label>
                                  <div className="grid grid-cols-2 gap-0.5 bg-card p-0.5 rounded-lg border border-border">
                                    {(["top-left", "top-right", "bottom-left", "bottom-right"] as WebcamCorner[]).map((c) => (
                                      <Button variant="ghost"
                                        key={c}
                                        type="button"
                                        onClick={() => setWebcamCorner(c)}
                                        className={`text-xs font-bold py-0.5 px-1 rounded-sm capitalize transition-all ${webcamCorner === c
                                          ? "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 hover:text-primary-foreground"
                                          : "text-muted-foreground hover:bg-muted"
                                          }`}
                                      >
                                        {c.replace("-", " ")}
                                      </Button>
                                    ))}
                                  </div>
                                </div>

                                {/* Frame Shape */}
                                <div className="space-y-0.5">
                                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                                    Frame Shape
                                  </Label>
                                  <div className="flex items-center gap-0.5">
                                    {(["circle", "rounded-square", "square"] as WebcamShape[]).map((s) => (
                                      <Button variant="ghost"
                                        key={s}
                                        type="button"
                                        onClick={() => setWebcamShape(s)}
                                        className={`flex-1 text-xs font-bold py-1 rounded-lg capitalize transition-all border ${webcamShape === s
                                          ? "bg-primary text-primary-foreground border-primary shadow-xs hover:bg-primary/90 hover:text-primary-foreground"
                                          : "bg-card border-border text-muted-foreground"
                                          }`}
                                      >
                                        {s.replace("-", " ")}
                                      </Button>
                                    ))}
                                  </div>
                                </div>

                                {/* PIP Preview Size */}
                                <div className="space-y-0.5">
                                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                                    Preview Size
                                  </Label>
                                  <div className="flex items-center gap-0.5">
                                    {(["small", "medium", "large"] as WebcamSize[]).map((sz) => (
                                      <Button variant="ghost"
                                        key={sz}
                                        type="button"
                                        onClick={() => setWebcamSize(sz)}
                                        className={`flex-1 text-xs font-bold py-1 rounded-lg capitalize transition-all border ${webcamSize === sz
                                          ? "bg-primary text-primary-foreground border-primary shadow-xs hover:bg-primary/90 hover:text-primary-foreground"
                                          : "bg-card border-border text-muted-foreground"
                                          }`}
                                      >
                                        {sz}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 2x2 Grid of Studio Settings for Compact Resolution Fitting */}
                          <div className="grid grid-cols-2 gap-2">
                            {/* Resolution Selector */}
                            <div className="bg-card p-2.5 rounded-xl border border-border space-y-1">
                              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                                Resolution
                              </Label>
                              <div className="grid grid-cols-4 gap-0.5">
                                {(["720p", "1080p", "1440p", "4k"] as ResolutionPreset[]).map((res) => (
                                  <Button variant="ghost"
                                    key={res}
                                    type="button"
                                    onClick={() => handleSelectResolution(res)}
                                    className={`h-7 rounded-lg text-xs font-bold uppercase transition-all border flex items-center justify-center ${resolution === res
                                      ? "bg-primary text-primary-foreground border-primary shadow-xs hover:bg-primary/90 hover:text-primary-foreground"
                                      : "bg-muted border-border text-muted-foreground hover:bg-accent"
                                      }`}
                                  >
                                    {res}
                                  </Button>
                                ))}
                              </div>
                            </div>

                            {/* Frame Rate (FPS) Selector */}
                            <div className="bg-card p-2.5 rounded-xl border border-border space-y-1">
                              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                                Frame Rate (FPS)
                              </Label>
                              <div className="grid grid-cols-4 gap-0.5">
                                {([15, 24, 30, 60] as TargetFps[]).map((rate) => (
                                  <Button variant="ghost"
                                    key={rate}
                                    type="button"
                                    onClick={() => handleSelectFps(rate)}
                                    className={`h-7 rounded-lg text-xs font-bold uppercase transition-all border flex items-center justify-center ${fps === rate
                                      ? "bg-primary text-primary-foreground border-primary shadow-xs hover:bg-primary/90 hover:text-primary-foreground"
                                      : "bg-muted border-border text-muted-foreground hover:bg-accent"
                                      }`}
                                  >
                                    {rate}
                                  </Button>
                                ))}
                              </div>
                            </div>

                            {/* Countdown Delay */}
                            <div className="bg-card p-2.5 rounded-xl border border-border space-y-1">
                              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                                Countdown Timer
                              </Label>
                              <div className="grid grid-cols-3 gap-0.5">
                                {[
                                  { value: 0, label: "0s" },
                                  { value: 3, label: "3s" },
                                  { value: 5, label: "5s" },
                                ].map((cd) => (
                                  <Button variant="ghost"
                                    key={cd.value}
                                    type="button"
                                    onClick={() => setCountdownDelay(cd.value as 0 | 3 | 5)}
                                    className={`h-7 rounded-lg text-xs font-bold transition-all border flex items-center justify-center ${countdownDelay === cd.value
                                      ? "bg-primary text-primary-foreground border-primary shadow-xs hover:bg-primary/90 hover:text-primary-foreground"
                                      : "bg-muted border-border text-muted-foreground hover:bg-accent"
                                      }`}
                                  >
                                    {cd.label}
                                  </Button>
                                ))}
                              </div>
                            </div>

                            {/* Bitrate Quality */}
                            <div className="bg-card p-2.5 rounded-xl border border-border space-y-1">
                              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <Zap className="w-2.5 h-2.5 text-primary" /> Quality
                              </Label>
                              <div className="grid grid-cols-3 gap-0.5">
                                {[
                                  { id: "compact", label: "Low" },
                                  { id: "balanced", label: "Bal" },
                                  { id: "max_quality", label: "Max" },
                                ].map((b) => (
                                  <Button variant="ghost"
                                    key={b.id}
                                    type="button"
                                    onClick={() => handleSelectCompressionMode(b.id as CompressionPreset)}
                                    className={`h-7 rounded-lg text-xs font-bold transition-all border flex items-center justify-center ${compressionMode === b.id
                                      ? "bg-primary text-primary-foreground border-primary shadow-xs hover:bg-primary/90 hover:text-primary-foreground"
                                      : "bg-muted border-border text-muted-foreground hover:bg-accent"
                                      }`}
                                  >
                                    {b.label}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Live Mid-Recording Controls Bar */}
                      {(recordState === "recording" || recordState === "paused") && (
                        <div className="p-3 rounded-2xl bg-popover text-popover-foreground backdrop-blur-xl border border-border shadow-2xl space-y-2.5 animate-in fade-in slide-in-from-bottom-2">
                          <div className="flex items-center justify-between border-b border-border pb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                              <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                                Live Recording Controls
                              </h4>
                            </div>
                            <span className="text-xs font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                              Live Active
                            </span>
                          </div>

                          {/* Mic & Webcam Toggles */}
                          <div className="grid grid-cols-2 gap-2">
                            <Button variant="ghost"
                              type="button"
                              onClick={handleToggleMic}
                              className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${isMicEnabled
                                ? "bg-primary/20 border-primary/40 text-primary"
                                : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                                }`}
                            >
                              <div
                                className={`p-1.5 rounded-lg shrink-0 ${isMicEnabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                  }`}
                              >
                                {isMicEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate">Mic Audio</p>
                                <p className="text-xs opacity-75 truncate">
                                  {isMicEnabled ? "Unmuted" : "Muted"}
                                </p>
                              </div>
                            </Button>

                            <Button variant="ghost"
                              type="button"
                              onClick={handleToggleWebcam}
                              className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${isWebcamEnabled
                                ? "bg-primary/20 border-primary/40 text-primary"
                                : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                                }`}
                            >
                              <div
                                className={`p-1.5 rounded-lg shrink-0 ${isWebcamEnabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                  }`}
                              >
                                {isWebcamEnabled ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate">Webcam PIP</p>
                                <p className="text-xs opacity-75 truncate">
                                  {isWebcamEnabled ? "Active" : "Disabled"}
                                </p>
                              </div>
                            </Button>
                          </div>

                          {/* Live Advanced Webcam Controls */}
                          {isWebcamEnabled && (
                            <div className="space-y-2 pt-1.5 border-t border-border">
                              <div className="space-y-1">
                                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                  PIP Corner Position
                                </Label>
                                <div className="grid grid-cols-2 gap-1 bg-muted/50 p-1 rounded-xl border border-border">
                                  {(["top-left", "top-right", "bottom-left", "bottom-right"] as WebcamCorner[]).map((c) => (
                                    <Button variant="ghost"
                                      key={c}
                                      type="button"
                                      onClick={() => setWebcamCorner(c)}
                                      className={`h-6 text-xs font-bold rounded-lg capitalize transition-all flex items-center justify-center ${webcamCorner === c
                                        ? "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 hover:text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted"
                                        }`}
                                    >
                                      {c.replace("-", " ")}
                                    </Button>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                  PIP Frame Shape
                                </Label>
                                <div className="flex items-center gap-1">
                                  {(["circle", "rounded-square", "square"] as WebcamShape[]).map((s) => (
                                    <Button variant="ghost"
                                      key={s}
                                      type="button"
                                      onClick={() => setWebcamShape(s)}
                                      className={`flex-1 h-7 text-xs font-bold rounded-lg capitalize transition-all border flex items-center justify-center ${webcamShape === s
                                        ? "bg-primary text-primary-foreground border-primary shadow-xs hover:bg-primary/90 hover:text-primary-foreground"
                                        : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                                        }`}
                                    >
                                      {s.replace("-", " ")}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Primary Studio Action Bar - Always in View */}
                      <div className="pt-1">
                        {recordState === "idle" && (
                          <Button
                            size="lg"
                            variant="record"
                            onClick={startRecording}
                            className="w-full font-extrabold gap-2.5 group transition-all hover:scale-[1.01]"
                          >
                            <Disc className="w-5 h-5 animate-pulse" />
                            Start Screen Recording
                          </Button>
                        )}

                        {recordState === "recording" && (
                          <div className="grid grid-cols-2 gap-2.5">
                            <Button
                              size="lg"
                              variant="outline"
                              onClick={pauseRecording}
                              disabled={isProcessing}
                              className="font-bold rounded-xl gap-2 text-xs sm:text-sm"
                            >
                              <Pause className="w-4 h-4 text-primary fill-current" /> Pause
                            </Button>

                            <Button
                              size="lg"
                              variant="danger"
                              onClick={stopRecording}
                              disabled={isProcessing}
                              className="font-extrabold rounded-xl gap-2 text-xs sm:text-sm"
                            >
                              {isProcessing ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Processing...</span>
                                </>
                              ) : (
                                <>
                                  <SquareIcon className="w-4 h-4 fill-current" />
                                  <span>Stop & Finish</span>
                                </>
                              )}
                            </Button>
                          </div>
                        )}

                        {recordState === "paused" && (
                          <div className="grid grid-cols-2 gap-2.5">
                            <Button
                              size="lg"
                              onClick={resumeRecording}
                              disabled={isProcessing}
                              className="font-extrabold rounded-xl gap-2 text-xs sm:text-sm"
                            >
                              <Play className="w-4 h-4 fill-current" /> Resume
                            </Button>

                            <Button
                              size="lg"
                              variant="danger"
                              onClick={stopRecording}
                              disabled={isProcessing}
                              className="font-extrabold rounded-xl gap-2 text-xs sm:text-sm"
                            >
                              {isProcessing ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Processing...</span>
                                </>
                              ) : (
                                <>
                                  <SquareIcon className="w-4 h-4 fill-current" />
                                  <span>Stop & Finish</span>
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {/* State: RECORDED / PREVIEW & UPLOAD */}
              {(recordState === "recorded" || recordState === "uploading") && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
                    {/* Left Column: Video Preview Player & Trimmer */}
                    <div className="lg:col-span-7 space-y-2.5">
                      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-[36vh] lg:max-h-[46vh] w-full flex items-center justify-center border border-border shadow-xl group">
                        {previewUrl && (
                          <video
                            key={previewUrl}
                            ref={recordedVideoRef}
                            src={previewUrl}
                            controls
                            className="w-full h-full object-contain"
                          />
                        )}

                        {/* Trimmed Badge */}
                        {isTrimmed && (
                          <div className="absolute top-2.5 left-2.5 bg-primary text-primary-foreground backdrop-blur-md px-2 py-0.5 rounded-full text-xs font-black shadow-md flex items-center gap-1 z-10 animate-in fade-in">
                            <Scissors className="w-3 h-3" />
                            Trimmed Video
                          </div>
                        )}
                      </div>

                      {/* Video Trimmer Toggle & Stats Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-muted border border-border">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost"
                            type="button"
                            size="sm"
                            onClick={() => {
                              if (!showTrimmer) {
                                recordedVideoRef.current?.pause();
                              }
                              setShowTrimmer(!showTrimmer);
                            }}
                            disabled={uploading}
                            className={`rounded-xl text-xs font-extrabold gap-1.5 h-7 transition-all ${showTrimmer
                              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                              : "border border-primary/40 text-primary hover:bg-primary/10"
                              }`}
                          >
                            <Scissors className="w-3 h-3" />
                            {showTrimmer ? "Close Trimmer" : isTrimmed ? "Re-trim Video" : "Trim Video"}
                          </Button>

                          {isTrimmed && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                revertToOriginalRecording();
                                setSelectedThumbnailIndex(0);
                                setShowTrimmer(false);
                              }}
                              disabled={uploading}
                              className="rounded-xl text-xs font-bold h-7 text-muted-foreground hover:text-destructive gap-1 hover:bg-destructive/10"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Revert to Original
                            </Button>
                          )}
                        </div>

                        {metadata && (
                          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground pr-1">
                            <span className="font-bold text-foreground">
                              {formatDuration(metadata.durationSeconds)}
                            </span>
                            <span>•</span>
                            <span>{metadata.sourceWidth}x{metadata.sourceHeight}</span>
                            <span>•</span>
                            <span>{recordedFile ? formatBytes(recordedFile.size) : "-"}</span>
                          </div>
                        )}
                      </div>

                      {/* Video Trimmer Studio Engine Panel */}
                      {showTrimmer && recordedFile && previewUrl && (
                        <VideoTrimmer
                          videoFile={recordedFile}
                          previewUrl={previewUrl}
                          metadata={metadata}
                          videoElementRef={recordedVideoRef}
                          onTrimSuccess={(newFile, newUrl, newMeta) => {
                            applyTrimmedVideo(newFile, newMeta, newUrl);
                            setSelectedThumbnailIndex(0);
                            setShowTrimmer(false);
                          }}
                          onCancel={() => setShowTrimmer(false)}
                        />
                      )}
                    </div>

                    {/* Right Column: Upload Metadata Form & Sticky Action Buttons */}
                    <form onSubmit={handleUpload} className="lg:col-span-5 flex flex-col h-full justify-between gap-3">
                      <div className="space-y-2.5">
                        <div className="space-y-1">
                          <Label className="text-xs font-bold">
                            Recording Title <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Project Demo Overview"
                            disabled={uploading}
                            className="rounded-xl font-medium h-9 text-xs sm:text-sm"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-bold">
                            Description (Optional)
                          </Label>
                          <RichTextEditor
                            value={description}
                            onChange={setDescription}
                            placeholder="Add brief details about this recording..."
                            disabled={uploading}
                            minHeight="60px"
                            maxHeight="120px"
                            showWordCount={false}
                            showCharacterCount={false}
                          />
                        </div>

                        {/* 4 Suggested Thumbnails + Custom Upload */}
                        <ThumbnailSelector
                          thumbnails={metadata?.thumbnails}
                          selectedThumbnailIndex={selectedThumbnailIndex}
                          onSelectThumbnail={handleSelectThumbnail}
                          customThumbUrl={customThumbUrl}
                          onCustomThumbChange={handleCustomThumbChange}
                          onRemoveCustomThumb={handleRemoveCustomThumb}
                          compressingThumb={compressingThumb}
                          disabled={uploading}
                          inputId="custom-thumbnail-drawer-input"
                          className="p-2.5 space-y-2"
                        />

                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border transition-all hover:border-ring">
                          <div className="flex items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className={`p-1.5 rounded-lg shrink-0 transition-colors ${requireHls
                                  ? "bg-primary/15 text-primary"
                                  : "bg-secondary/60 text-secondary-foreground"
                                  }`}
                              >
                                <Layers className="w-3.5 h-3.5" />
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <label
                                  htmlFor="drawer-requireHls-toggle"
                                  className="text-xs font-bold text-foreground cursor-pointer block truncate"
                                >
                                  HLS Multi-Bitrate Ladder
                                </label>
                                <p className="text-xs text-muted-foreground leading-tight">
                                  {requireHls
                                    ? "Transcode to adaptive ladder (480p to 4K)"
                                    : "Store original video without transcoding"}
                                </p>
                              </div>
                            </div>
                            <Switch
                              id="drawer-requireHls-toggle"
                              checked={requireHls}
                              onCheckedChange={(checked) => setRequireHls(checked)}
                              disabled={uploading}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Upload Progress Bar */}
                      {uploading && (
                        <div className="space-y-1.5 p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                          <div className="flex justify-between text-xs font-bold text-primary">
                            <span>{statusText || "Uploading recording..."}</span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} />
                        </div>
                      )}

                      {/* Sticky Action Buttons: Save / Download / Re-record (Always in View) */}
                      <div className="sticky bottom-0 bg-popover/95 backdrop-blur-md pt-2 pb-0.5 border-t border-border space-y-2 z-10">
                        <Button
                          type="submit"
                          disabled={uploading || !title.trim() || checkingQuota || isQuotaExceeded}
                          className="w-full font-extrabold rounded-xl shadow-md gap-2 text-sm"
                        >
                          <UploadCloud className="w-4 h-4" />
                          {uploading ? "Uploading..." : "Save Recording to Account"}
                        </Button>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleDownload()}
                            disabled={uploading}
                            className="rounded-xl font-bold text-xs h-8 gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5 text-primary" /> Download WebM
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            onClick={handleReRecord}
                            disabled={uploading}
                            className="rounded-xl font-bold text-xs h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Re-record
                          </Button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Confirm Discard Modal */}
      <Dialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" /> Discard Active Recording?
            </DialogTitle>
            <DialogDescription>
              You have an active or unsaved recording session. If you close now, your recorded video content will be permanently lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border shrink-0 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirmClose(false)}
            >
              Keep Recording
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDiscard}
            >
              Discard & Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* High File Size Confirmation Modal */}
      <Dialog
        open={highQualityConfirm.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setHighQualityConfirm((prev) => ({ ...prev, isOpen: false }));
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-3 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary mx-auto sm:mx-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle>
                High File Size Warning
              </DialogTitle>
              <DialogDescription>
                Selecting <strong className="text-primary">{highQualityConfirm.settingLabel}</strong> will significantly increase video quality, but will result in substantially higher output file sizes and may consume more disk storage and network bandwidth.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="p-3 rounded-xl bg-muted/60 border border-border text-xs text-muted-foreground font-medium">
            💡 <strong className="text-foreground">Pro Tip:</strong> For standard recordings, 30 FPS, Balanced bitrate, or 1080p produces smooth quality while keeping the file size compact.
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border shrink-0 mt-3">
            <Button
              variant="outline"
              onClick={() => setHighQualityConfirm((prev) => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button variant="ghost"
              onClick={() => {
                highQualityConfirm.onConfirm();
                setHighQualityConfirm((prev) => ({ ...prev, isOpen: false }));
              }}
            >
              Proceed with High Quality
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
