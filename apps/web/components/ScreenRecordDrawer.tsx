"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadVideoFile } from "@/lib/upload-video";
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
    isMicEnabled,
    handleToggleMic,
    recordingTime,
    recordedFile,
    previewUrl,
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

  const [description, setDescription] = useState("");
  const [requireHls, setRequireHls] = useState(false);
  const [showStudioSettings, setShowStudioSettings] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [checkingQuota, setCheckingQuota] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const [highQualityConfirm, setHighQualityConfirm] = useState<{
    isOpen: boolean;
    settingLabel: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    settingLabel: "",
    onConfirm: () => {},
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
    setUploading(false);
    setProgress(0);
    setStatusText("");
  }, [resetAll]);

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

    try {
      await uploadVideoFile({
        file: recordedFile,
        title: title.trim(),
        description: description.trim() || undefined,
        requireHls,
        currentFolderId,
        metadata,
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
        <DrawerContent className="w-full" hideCloseButton>
          <div className="max-w-7xl mx-auto w-full relative">
            {/* Corner Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAttemptClose}
              disabled={uploading}
              className="absolute top-2 right-0 sm:top-2 sm:right-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 z-10 p-2"
              title="Close drawer"
            >
              <X className="w-4 h-4 text-slate-500" />
            </Button>

            <DrawerHeader className="pr-12">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-md shadow-red-500/20 shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <DrawerTitle className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
                    Studio Screen Recorder
                    {recordState === "countdown" && (
                      <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-semibold animate-pulse">
                        Starting in {countdownTime}s...
                      </span>
                    )}
                    {recordState === "recording" && (
                      <span className="text-xs bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-red-500" /> REC
                      </span>
                    )}
                    {recordState === "paused" && (
                      <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                        PAUSED
                      </span>
                    )}
                  </DrawerTitle>
                  <DrawerDescription className="text-xs text-slate-500 mt-0.5">
                    Capture screen, webcam PIP overlay, and microphone audio.
                    {folderPathName ? (
                      <span className="ml-1 font-medium text-slate-700 dark:text-slate-300">
                        Saving to: <Folder className="w-3 h-3 inline-block mx-0.5 -mt-0.5 text-lime-600" /> {folderPathName}
                      </span>
                    ) : (
                      <span className="ml-1 text-slate-400">(Saving to Root Drive)</span>
                    )}
                  </DrawerDescription>
                </div>
              </div>
            </DrawerHeader>

            {/* Error Banner */}
            {error && (
              <div className="mx-6 mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* Main Content Area */}
            <div className="px-6 py-2 space-y-4">
              {/* State: IDLE / COUNTDOWN / RECORDING / PAUSED */}
              {(recordState === "idle" ||
                recordState === "countdown" ||
                recordState === "recording" ||
                recordState === "paused") && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* LEFT COLUMN: Video Preview Viewport */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-800 shadow-xl group">
                      <video
                        ref={videoPreviewRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-contain ${
                          recordState === "idle" ? "hidden" : "block"
                        }`}
                      />

                      {/* Countdown Overlay */}
                      {recordState === "countdown" && (
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-20 gap-3">
                          <div className="w-24 h-24 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center animate-ping absolute" />
                          <span className="text-7xl font-black text-white font-mono tracking-tighter drop-shadow-lg z-10">
                            {countdownTime}
                          </span>
                          <p className="text-xs text-slate-300 font-semibold uppercase tracking-widest">
                            Get Ready...
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelCountdown}
                            className="mt-2 text-xs text-slate-400 hover:text-white hover:bg-white/10"
                          >
                            Cancel Countdown
                          </Button>
                        </div>
                      )}

                      {/* Idle State Banner */}
                      {recordState === "idle" && (
                        <div className="text-center p-6 space-y-3 max-w-sm">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-lime-500/20 to-emerald-500/20 border border-lime-500/30 flex items-center justify-center mx-auto text-lime-500 shadow-inner">
                            <Monitor className="w-8 h-8" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-lg font-bold text-white tracking-tight">
                              Ready to Record
                            </h3>
                            <p className="text-xs text-slate-400">
                              Configure studio controls on the right and click start.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Live Recording HUD Status Bar */}
                      {(recordState === "recording" || recordState === "paused") && (
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
                          <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full shadow-lg pointer-events-auto">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                recordState === "recording"
                                  ? "bg-red-500 animate-pulse"
                                  : "bg-amber-500"
                              }`}
                            />
                            <span className="text-xs font-mono font-bold text-white">
                              {formatDuration(recordingTime)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full shadow-lg text-[11px] font-semibold text-slate-300 pointer-events-auto">
                            <span className="text-lime-400 uppercase font-mono">{resolution}</span>
                            <span>•</span>
                            <span>{fps} FPS</span>
                            <span>•</span>
                            <span>{isWebcamEnabled ? "Cam Active" : "No Cam"}</span>
                            <span>•</span>
                            <span>{isMicEnabled ? "Mic On" : "Mic Muted"}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Controls Panel in Stacked Rows */}
                  <div className="lg:col-span-5 space-y-3">
                    {recordState === "idle" && (
                      <div className="space-y-3">
                        {/* Row 1: Mic & Webcam Toggles */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={handleToggleMic}
                            className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                              isMicEnabled
                                ? "bg-lime-500/10 border-lime-500/40 text-lime-700 dark:text-lime-400"
                                : "bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                            }`}
                          >
                            <div
                              className={`p-2 rounded-xl shrink-0 ${
                                isMicEnabled ? "bg-lime-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                              }`}
                            >
                              {isMicEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">Microphone</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {isMicEnabled ? "Voice On" : "Muted"}
                              </p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={handleToggleWebcam}
                            className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                              isWebcamEnabled
                                ? "bg-lime-500/10 border-lime-500/40 text-lime-700 dark:text-lime-400"
                                : "bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                            }`}
                          >
                            <div
                              className={`p-2 rounded-xl shrink-0 ${
                                isWebcamEnabled ? "bg-lime-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                              }`}
                            >
                              {isWebcamEnabled ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">Webcam PIP</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {isWebcamEnabled ? "Active PIP" : "Disabled"}
                              </p>
                            </div>
                          </button>
                        </div>

                        {/* Auto-Expanded Webcam PIP Controls (Shown immediately below On/Off toggle when enabled) */}
                        {isWebcamEnabled && (
                          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-lime-500/30 space-y-2.5 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-lime-500" /> Webcam PIP Controls
                              </h4>
                              <span className="text-[10px] font-bold bg-lime-500/15 text-lime-600 dark:text-lime-400 px-2 py-0.5 rounded-full">
                                Active
                              </span>
                            </div>

                            {/* Camera Device */}
                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                                Camera Device
                              </Label>
                              <Select
                                value={selectedCameraId || (cameraDevices.length > 0 ? cameraDevices[0].deviceId : "")}
                                onValueChange={(val) => handleSelectCameraDevice(val)}
                                disabled={cameraDevices.length === 0}
                              >
                                <SelectTrigger className="w-full h-8 text-xs font-medium rounded-xl bg-white dark:bg-slate-800">
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
                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                                PIP Position Corner
                              </Label>
                              <div className="grid grid-cols-2 gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                {(["bottom-left", "bottom-right", "top-left", "top-right"] as WebcamCorner[]).map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setWebcamCorner(c)}
                                    className={`text-[10px] font-bold py-1 px-1.5 rounded-lg capitalize transition-all ${
                                      webcamCorner === c
                                        ? "bg-lime-500 text-white shadow-sm"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    }`}
                                  >
                                    {c.replace("-", " ")}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Frame Shape */}
                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                                PIP Frame Shape
                              </Label>
                              <div className="flex items-center gap-1">
                                {(["circle", "rounded-square", "square"] as WebcamShape[]).map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => setWebcamShape(s)}
                                    className={`flex-1 text-[10px] font-bold py-1.5 rounded-xl capitalize transition-all border ${
                                      webcamShape === s
                                        ? "bg-lime-500 text-white border-lime-600 shadow-sm"
                                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                                    }`}
                                  >
                                    {s.replace("-", " ")}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* PIP Preview Size */}
                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                                PIP Preview Size
                              </Label>
                              <div className="flex items-center gap-1">
                                {(["small", "medium", "large"] as WebcamSize[]).map((sz) => (
                                  <button
                                    key={sz}
                                    type="button"
                                    onClick={() => setWebcamSize(sz)}
                                    className={`flex-1 text-[10px] font-bold py-1.5 rounded-xl capitalize transition-all border ${
                                      webcamSize === sz
                                        ? "bg-lime-500 text-white border-lime-600 shadow-sm"
                                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                                    }`}
                                  >
                                    {sz}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Row 2: Resolution Selector Pills */}
                        <div className="bg-white dark:bg-slate-900/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Resolution Preset
                          </Label>
                          <div className="grid grid-cols-4 gap-1">
                            {(["720p", "1080p", "1440p", "4k"] as ResolutionPreset[]).map((res) => (
                              <button
                                key={res}
                                type="button"
                                onClick={() => handleSelectResolution(res)}
                                className={`h-7 px-1 rounded-xl text-[10px] font-bold uppercase transition-all border flex items-center justify-center ${
                                  resolution === res
                                    ? "bg-lime-500 text-white border-lime-500 shadow-sm"
                                    : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                }`}
                              >
                                {res}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Row 2b: Frame Rate (FPS) Selector Pills */}
                        <div className="bg-white dark:bg-slate-900/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Frame Rate (FPS)
                          </Label>
                          <div className="grid grid-cols-4 gap-1">
                            {([15, 24, 30, 60] as TargetFps[]).map((rate) => (
                              <button
                                key={rate}
                                type="button"
                                onClick={() => handleSelectFps(rate)}
                                className={`h-7 px-1 rounded-xl text-[10px] font-bold uppercase transition-all border flex items-center justify-center ${
                                  fps === rate
                                    ? "bg-lime-500 text-white border-lime-500 shadow-sm"
                                    : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                }`}
                              >
                                {rate} FPS
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Row 3: Countdown Delay Pills */}
                        <div className="bg-white dark:bg-slate-900/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Countdown Timer
                          </Label>
                          <div className="grid grid-cols-3 gap-1">
                            {[
                              { value: 0, label: "0s" },
                              { value: 3, label: "3s" },
                              { value: 5, label: "5s" },
                            ].map((cd) => (
                              <button
                                key={cd.value}
                                type="button"
                                onClick={() => setCountdownDelay(cd.value as 0 | 3 | 5)}
                                className={`h-7 px-1 rounded-xl text-[10px] font-bold transition-all border flex items-center justify-center ${
                                  countdownDelay === cd.value
                                    ? "bg-lime-500 text-white border-lime-500 shadow-sm"
                                    : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                }`}
                              >
                                {cd.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Row 4: Bitrate Quality Pills */}
                        <div className="bg-white dark:bg-slate-900/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Zap className="w-3 h-3 text-lime-500" /> Bitrate Quality
                          </Label>
                          <div className="grid grid-cols-3 gap-1">
                            {[
                              { id: "compact", label: "Compact" },
                              { id: "balanced", label: "Balanced" },
                              { id: "max_quality", label: "Max" },
                            ].map((b) => (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => handleSelectCompressionMode(b.id as CompressionPreset)}
                                className={`h-7 px-1 rounded-xl text-[10px] font-bold transition-all border flex items-center justify-center ${
                                  compressionMode === b.id
                                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 shadow-sm"
                                    : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                }`}
                              >
                                {b.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Live Mid-Recording Controls Bar */}
                    {(recordState === "recording" || recordState === "paused") && (
                      <div className="p-4 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-white/15 text-white shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                              Live Recording Controls
                            </h4>
                          </div>
                          <span className="text-[10px] font-bold bg-white/10 text-slate-300 px-2 py-0.5 rounded-full">
                            Live Active
                          </span>
                        </div>

                        {/* Mic & Webcam Toggles */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={handleToggleMic}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                              isMicEnabled
                                ? "bg-lime-500/20 border-lime-500/40 text-lime-300"
                                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                            }`}
                          >
                            <div
                              className={`p-1.5 rounded-lg shrink-0 ${
                                isMicEnabled ? "bg-lime-500 text-slate-950" : "bg-white/10 text-slate-400"
                              }`}
                            >
                              {isMicEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">Mic Audio</p>
                              <p className="text-[10px] opacity-75 truncate">
                                {isMicEnabled ? "Unmuted" : "Muted"}
                              </p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={handleToggleWebcam}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                              isWebcamEnabled
                                ? "bg-lime-500/20 border-lime-500/40 text-lime-300"
                                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                            }`}
                          >
                            <div
                              className={`p-1.5 rounded-lg shrink-0 ${
                                isWebcamEnabled ? "bg-lime-500 text-slate-950" : "bg-white/10 text-slate-400"
                              }`}
                            >
                              {isWebcamEnabled ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">Webcam PIP</p>
                              <p className="text-[10px] opacity-75 truncate">
                                {isWebcamEnabled ? "Active" : "Disabled"}
                              </p>
                            </div>
                          </button>
                        </div>

                        {/* Live Advanced Webcam Controls */}
                        {isWebcamEnabled && (
                          <div className="space-y-2 pt-2 border-t border-white/10">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                PIP Corner Position
                              </Label>
                              <div className="grid grid-cols-2 gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                                {(["bottom-left", "bottom-right", "top-left", "top-right"] as WebcamCorner[]).map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setWebcamCorner(c)}
                                    className={`h-6 text-[10px] font-bold rounded-lg capitalize transition-all flex items-center justify-center ${
                                      webcamCorner === c
                                        ? "bg-lime-500 text-slate-950 shadow-sm"
                                        : "text-slate-300 hover:bg-white/10"
                                    }`}
                                  >
                                    {c.replace("-", " ")}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                PIP Frame Shape
                              </Label>
                              <div className="flex items-center gap-1">
                                {(["circle", "rounded-square", "square"] as WebcamShape[]).map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => setWebcamShape(s)}
                                    className={`flex-1 h-7 text-[10px] font-bold rounded-xl capitalize transition-all border flex items-center justify-center ${
                                      webcamShape === s
                                        ? "bg-lime-500 text-slate-950 border-lime-500 shadow-sm"
                                        : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                                    }`}
                                  >
                                    {s.replace("-", " ")}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Primary Studio Action Bar */}
                    <div className="pt-1">
                      {recordState === "idle" && (
                        <Button
                          size="lg"
                          onClick={startRecording}
                          className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold py-6 rounded-2xl shadow-xl shadow-red-500/20 text-base gap-3 group transition-all hover:scale-[1.02]"
                        >
                          <Disc className="w-5 h-5 animate-pulse text-white" />
                          Start Screen Studio
                        </Button>
                      )}

                      {recordState === "recording" && (
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={pauseRecording}
                            className="font-bold rounded-2xl py-6 border-slate-300 dark:border-slate-700 gap-2"
                          >
                            <Pause className="w-5 h-5 text-amber-500 fill-current" /> Pause
                          </Button>

                          <Button
                            size="lg"
                            onClick={stopRecording}
                            className="bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-2xl py-6 shadow-xl shadow-red-600/25 gap-2"
                          >
                            <SquareIcon className="w-5 h-5 fill-current" /> Stop & Finish
                          </Button>
                        </div>
                      )}

                      {recordState === "paused" && (
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            size="lg"
                            onClick={resumeRecording}
                            className="bg-lime-600 hover:bg-lime-700 text-white font-extrabold rounded-2xl py-6 shadow-xl gap-2"
                          >
                            <Play className="w-5 h-5 fill-current" /> Resume
                          </Button>

                          <Button
                            size="lg"
                            onClick={stopRecording}
                            className="bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-2xl py-6 shadow-xl shadow-red-600/25 gap-2"
                          >
                            <SquareIcon className="w-5 h-5 fill-current" /> Stop & Finish
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* State: RECORDED / PREVIEW & UPLOAD */}
              {(recordState === "recorded" || recordState === "uploading") && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    {/* Left Column: Video Preview Player */}
                    <div className="md:col-span-3 space-y-3">
                      <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video border border-slate-800 shadow-xl">
                        {previewUrl && (
                          <video
                            src={previewUrl}
                            controls
                            autoPlay
                            className="w-full h-full object-contain"
                          />
                        )}
                      </div>

                      {/* Video Stats Summary Bar */}
                      {metadata && (
                        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs">
                          <div>
                            <p className="text-[10px] text-slate-400 font-medium">Duration</p>
                            <p className="font-bold text-slate-800 dark:text-slate-200">
                              {formatDuration(metadata.durationSeconds)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-medium">Resolution</p>
                            <p className="font-bold text-slate-800 dark:text-slate-200">
                              {metadata.sourceWidth}x{metadata.sourceHeight}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-medium">File Size</p>
                            <p className="font-bold text-slate-800 dark:text-slate-200">
                              {recordedFile ? formatBytes(recordedFile.size) : "-"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Upload Metadata Form & Quick Download */}
                    <form onSubmit={handleUpload} className="md:col-span-2 space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Recording Title <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Project Demo Overview"
                            disabled={uploading}
                            className="rounded-xl font-medium"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Description (Optional)
                          </Label>
                          <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add brief details about this recording..."
                            disabled={uploading}
                            rows={3}
                            className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-500 font-medium"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="drawer-requireHls"
                            checked={requireHls}
                            onChange={(e) => setRequireHls(e.target.checked)}
                            disabled={uploading}
                            className="rounded border-slate-300 text-lime-500 focus:ring-lime-500 h-4 w-4"
                          />
                          <Label htmlFor="drawer-requireHls" className="text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
                            Transcode to HLS multi-bitrate ladder (480p to 4K)
                          </Label>
                        </div>
                      </div>

                      {/* Upload Progress Bar */}
                      {uploading && (
                        <div className="space-y-2 p-3 rounded-xl bg-lime-500/10 border border-lime-500/20">
                          <div className="flex justify-between text-xs font-bold text-lime-700 dark:text-lime-400">
                            <span>{statusText || "Uploading recording..."}</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-lime-500 h-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Action Buttons: Save / Download / Re-record */}
                      <div className="space-y-2 pt-2">
                        <Button
                          type="submit"
                          disabled={uploading || !title.trim() || checkingQuota || isQuotaExceeded}
                          className="w-full bg-lime-500 hover:bg-lime-600 text-white font-extrabold rounded-xl py-5 shadow-lg shadow-lime-500/20 gap-2 text-sm"
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
                            className="rounded-xl border-slate-300 dark:border-slate-700 font-bold text-xs gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5 text-lime-600" /> Download WebM
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            onClick={handleReRecord}
                            disabled={uploading}
                            className="rounded-xl font-bold text-xs gap-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white"
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
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-red-600">
              <AlertCircle className="w-5 h-5" /> Discard Active Recording?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 pt-2">
              You have an active or unsaved recording session. If you close now, your recorded video content will be permanently lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirmClose(false)}
              className="rounded-xl text-xs"
            >
              Keep Recording
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDiscard}
              className="rounded-xl text-xs bg-red-600 hover:bg-red-700 font-bold"
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
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto sm:mx-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight">
                High File Size Warning
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Selecting <strong className="text-amber-500">{highQualityConfirm.settingLabel}</strong> will significantly increase video quality, but will result in substantially higher output file sizes and may consume more disk storage and network bandwidth.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 font-medium">
            💡 <strong>Pro Tip:</strong> For standard recordings, 30 FPS, Balanced bitrate, or 1080p produces smooth quality while keeping the file size compact.
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              onClick={() => setHighQualityConfirm((prev) => ({ ...prev, isOpen: false }))}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                highQualityConfirm.onConfirm();
                setHighQualityConfirm((prev) => ({ ...prev, isOpen: false }));
              }}
              className="rounded-xl text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              Proceed with High Quality
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
