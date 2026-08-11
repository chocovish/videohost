"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Video,
  Mic,
  MicOff,
  Square as SquareIcon,
  Play,
  Pause,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  Download,
  Camera,
  CameraOff,
  Monitor,
  Disc,
  Sparkles,
  SlidersHorizontal,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  HardDrive,
  Lock,
  Layers,
  ChevronDown,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import PublicHeader from "@/components/PublicHeader";
import { formatDuration, formatBytes } from "@/lib/video-utils";
import {
  WebcamCorner,
  WebcamShape,
  WebcamSize,
  ResolutionPreset,
} from "@/lib/recording-compositor";
import { useScreenRecorder, CompressionPreset, TargetFps } from "@/hooks/useScreenRecorder";

export default function RecordStudioView() {
  const {
    recordState,
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
    metadata,
    videoPreviewRef,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelCountdown,
    handleReRecord,
    handleDownload,
  } = useScreenRecorder();

  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [downloadFilename, setDownloadFilename] = useState("");
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

  const activeFilename = downloadFilename.trim() || title || "Studio Recording";

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] relative overflow-hidden flex flex-col justify-between selection:bg-lime-500 selection:text-white">
      {/* Dynamic Ambient Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[48rem] h-[48rem] bg-[hsl(var(--primary))]/20 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Header Navigation Bar */}
      <PublicHeader currentPage="record" />

      {/* Main Studio Workstation Section */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 relative z-10 space-y-8 flex-1 flex flex-col justify-center">
        {/* Page Hero Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/30 text-[hsl(var(--primary))] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Free & Unlimited Web Studio Recorder
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Record Screen & Webcam <br />
            <span className="text-[hsl(var(--primary))] underline decoration-[hsl(var(--primary))]/30">
              Download Instantly
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] leading-relaxed max-w-xl mx-auto">
            Capture full desktop screens, windows, or tabs with customizable camera Picture-in-Picture, mixed audio, and zero watermarks.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="flex-1 font-medium">{error}</span>
          </div>
        )}

        {/* Recording Studio Main Canvas Box */}
        <div className="glass-card rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl space-y-6 backdrop-blur-xl">
          {/* Active Viewport Player & Studio Controls Grid */}
          {(recordState === "idle" ||
            recordState === "countdown" ||
            recordState === "recording" ||
            recordState === "paused") && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT COLUMN: Video Preview Viewport */}
              <div className="lg:col-span-7 space-y-3">
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-800 shadow-2xl group">
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-contain ${
                      recordState === "idle" ? "hidden" : "block"
                    }`}
                  />

                  {/* Countdown Overlay HUD */}
                  {recordState === "countdown" && (
                    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center z-30 gap-4">
                      <div className="w-24 h-24 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center animate-ping absolute" />
                      <span className="text-7xl font-black text-white font-mono tracking-tighter drop-shadow-2xl z-10">
                        {countdownTime}
                      </span>
                      <p className="text-xs text-slate-300 font-semibold uppercase tracking-widest">
                        Recording starting in...
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelCountdown}
                        className="mt-2 text-xs text-slate-400 hover:text-white hover:bg-white/10 rounded-xl"
                      >
                        Cancel Countdown
                      </Button>
                    </div>
                  )}

                  {/* Idle Preview Placeholder */}
                  {recordState === "idle" && (
                    <div className="text-center p-6 space-y-3 max-w-sm">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[hsl(var(--primary))]/20 to-emerald-500/20 border border-[hsl(var(--primary))]/30 flex items-center justify-center mx-auto text-[hsl(var(--primary))] shadow-inner">
                        <Monitor className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-extrabold text-white tracking-tight">
                          Studio Viewport
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Configure your studio settings on the right and click <strong className="text-white">Start Recording</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Live Recording HUD Status Bar */}
                  {(recordState === "recording" || recordState === "paused") && (
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-none">
                      <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-full shadow-xl pointer-events-auto">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            recordState === "recording"
                              ? "bg-red-500 animate-pulse"
                              : "bg-amber-500"
                          }`}
                        />
                        <span className="text-xs font-mono font-bold text-white tracking-wide">
                          {formatDuration(recordingTime)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-full shadow-xl text-[11px] font-semibold text-slate-300 pointer-events-auto">
                        <span className="text-[hsl(var(--primary))] uppercase font-mono font-bold">{resolution}</span>
                        <span>•</span>
                        <span>{fps} FPS</span>
                        <span>•</span>
                        <span>{isWebcamEnabled ? "Cam Active" : "No Cam"}</span>
                        <span>•</span>
                        <span>{isMicEnabled ? "Mic Active" : "Mic Muted"}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Controls Panel in Stacked Rows */}
              <div className="lg:col-span-5 space-y-3.5">
                {recordState === "idle" && (
                  <div className="space-y-3">
                    {/* Row 1: Mic & Webcam Toggles */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={handleToggleMic}
                        className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                          isMicEnabled
                            ? "bg-[hsl(var(--primary))]/10 border-[hsl(var(--primary))]/40 text-[hsl(var(--foreground))]"
                            : "bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                        }`}
                      >
                        <div
                          className={`p-2 rounded-xl shrink-0 ${
                            isMicEnabled ? "bg-[hsl(var(--primary))] text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          }`}
                        >
                          {isMicEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">Microphone</p>
                          <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">
                            {isMicEnabled ? "Voice On" : "Muted"}
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleWebcam}
                        className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                          isWebcamEnabled
                            ? "bg-[hsl(var(--primary))]/10 border-[hsl(var(--primary))]/40 text-[hsl(var(--foreground))]"
                            : "bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                        }`}
                      >
                        <div
                          className={`p-2 rounded-xl shrink-0 ${
                            isWebcamEnabled ? "bg-[hsl(var(--primary))] text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          }`}
                        >
                          {isWebcamEnabled ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">Webcam PIP</p>
                          <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">
                            {isWebcamEnabled ? "Active PIP" : "Disabled"}
                          </p>
                        </div>
                      </button>
                    </div>

                    {/* Auto-Expanded Webcam PIP Controls (Shown immediately below On/Off toggle when enabled) */}
                    {isWebcamEnabled && (
                      <div className="p-3.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 border border-[hsl(var(--primary))]/30 space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                          <h4 className="text-xs font-extrabold flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--primary))]" /> Webcam PIP Controls
                          </h4>
                          <span className="text-[10px] font-bold bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        </div>

                        {/* Camera Input Device */}
                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">
                            Camera Device
                          </Label>
                          <Select
                            value={selectedCameraId || (cameraDevices.length > 0 ? cameraDevices[0].deviceId : "")}
                            onValueChange={(val) => handleSelectCameraDevice(val)}
                            disabled={cameraDevices.length === 0}
                          >
                            <SelectTrigger className="w-full text-xs font-medium rounded-xl bg-white dark:bg-slate-800 h-8">
                              <SelectValue placeholder="Select camera" />
                            </SelectTrigger>
                            <SelectContent>
                              {cameraDevices.length === 0 ? (
                                <SelectItem value="none" disabled>No camera detected</SelectItem>
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

                        {/* Position Corner */}
                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">
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
                                    ? "bg-[hsl(var(--primary))] text-white shadow-sm"
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
                          <Label className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">
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
                                    ? "bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))] shadow-sm"
                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                                }`}
                              >
                                {s.replace("-", " ")}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Preview Size */}
                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">
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
                                    ? "bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))] shadow-sm"
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
                      <Label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider block">
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
                                ? "bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))] shadow-sm"
                                : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[hsl(var(--muted-foreground))] hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                          >
                            {res}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Row 2b: Frame Rate (FPS) Selector Pills */}
                    <div className="bg-white dark:bg-slate-900/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <Label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider block">
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
                                ? "bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))] shadow-sm"
                                : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[hsl(var(--muted-foreground))] hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                          >
                            {rate} FPS
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Row 3: Countdown Delay Pills */}
                    <div className="bg-white dark:bg-slate-900/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <Label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider block">
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
                                ? "bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))] shadow-sm"
                                : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[hsl(var(--muted-foreground))] hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                          >
                            {cd.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Row 4: Bitrate Quality Pills */}
                    <div className="bg-white dark:bg-slate-900/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <Label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                        <Zap className="w-3 h-3 text-[hsl(var(--primary))]" /> Bitrate Quality
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
                                : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[hsl(var(--muted-foreground))] hover:bg-slate-200 dark:hover:bg-slate-700"
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

                {/* Primary Action Buttons Bar */}
                <div className="pt-1">
                  {recordState === "idle" && (
                    <Button
                      size="lg"
                      onClick={startRecording}
                      className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold py-6 rounded-2xl shadow-xl shadow-red-500/25 text-base gap-3 group transition-all hover:scale-[1.02]"
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
                        className="bg-[hsl(var(--primary))] hover:opacity-90 text-white font-extrabold rounded-2xl py-6 shadow-xl gap-2"
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

          {/* Post-Recording Viewport & Download Area */}
          {recordState === "recorded" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {/* Left Column: Preview Video Player */}
                <div className="md:col-span-3 space-y-3">
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video border border-slate-800 shadow-2xl">
                    {previewUrl && (
                      <video
                        src={previewUrl}
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>

                  {/* Video Metadata Badges */}
                  {metadata && (
                    <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs">
                      <div>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))] font-semibold">Duration</p>
                        <p className="font-extrabold text-sm">{formatDuration(metadata.durationSeconds)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))] font-semibold">Resolution</p>
                        <p className="font-extrabold text-sm">{metadata.sourceWidth}x{metadata.sourceHeight}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))] font-semibold">File Size</p>
                        <p className="font-extrabold text-sm">{recordedFile ? formatBytes(recordedFile.size) : "-"}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Download Controls & Cloud Options */}
                <div className="md:col-span-2 space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-extrabold text-[hsl(var(--primary))] uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4" /> Recording Complete
                      </div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                        Your video has been recorded successfully in high quality. You can download the file directly to your device or save it to your VideoHost cloud account.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">File Download Name</Label>
                      <Input
                        value={downloadFilename}
                        onChange={(e) => setDownloadFilename(e.target.value)}
                        placeholder={title || "Studio Recording"}
                        className="rounded-xl font-semibold"
                      />
                    </div>

                    {/* Main Download Button */}
                    <Button
                      size="lg"
                      onClick={() => handleDownload(activeFilename)}
                      className="w-full bg-[hsl(var(--primary))] hover:opacity-95 text-white font-extrabold py-6 rounded-2xl shadow-xl shadow-[hsl(var(--primary))]/25 text-sm gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Download Recording (.webm)
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handleReRecord}
                      className="w-full font-bold rounded-2xl py-5 text-xs gap-2"
                    >
                      <RotateCcw className="w-4 h-4" /> Start New Recording
                    </Button>
                  </div>

                  {/* Cloud Account CTA Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[hsl(var(--primary))] flex items-center justify-center text-white shrink-0">
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold">Want Cloud HLS Transcoding?</h4>
                        <p className="text-[10px] text-slate-400">Save videos, embed anywhere, and get HLS ladders.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Link
                        href="/auth/register"
                        className="flex-1 py-2 px-3 bg-[hsl(var(--primary))] text-white text-xs font-bold rounded-xl text-center hover:opacity-90 transition-opacity"
                      >
                        Create Free Account
                      </Link>
                      <Link
                        href="/auth/login"
                        className="py-2 px-3 bg-white/10 text-white text-xs font-bold rounded-xl hover:bg-white/20 transition-colors"
                      >
                        Sign In
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-6">
          <div className="glass-card p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center mb-2">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-sm">100% Private & Local</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              Recording and canvas composition run locally in your browser. Zero data sent to servers.
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center mb-2">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-sm">Webcam PIP Overlay</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              Overlay your face camera in top or bottom corners with circle or square frame shapes.
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center mb-2">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-sm">Up to 4K 60FPS</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              Hardware-accelerated VP9 capture up to 3840x2160 resolution with dynamic audio mixing.
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center mb-2">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-sm">No Watermark Ever</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              Clean high-definition videos with zero time limits, branding logos, or hidden fees.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[hsl(var(--border))] py-6 text-center text-xs text-[hsl(var(--muted-foreground))] relative z-10">
        © 2026 VideoHost Platform. Professional Web Studio Screen Recorder.
      </footer>

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
              <DialogDescription className="text-xs text-[hsl(var(--muted-foreground))] mt-1 leading-relaxed">
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
    </div>
  );
}
