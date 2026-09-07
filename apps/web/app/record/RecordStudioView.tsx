"use client";

import { useState, useRef, useEffect, type ReactNode, type RefObject } from "react";
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
  Maximize2,
  Monitor,
  Timer,
  Eye,
  RefreshCw,
  ChevronDown,
  Loader2,
  Scissors,
  PictureInPicture2,
  Settings2,
  X,
  MonitorUp,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { formatDuration, formatBytes, type VideoMetadata } from "@/lib/video-utils";
import {
  WebcamCorner,
  WebcamShape,
  WebcamSize,
  RecordingLayoutMode,
  ResolutionPreset,
} from "@/lib/recording-compositor";
import { VideoTrimmer } from "@/components/VideoTrimmer";
import { useScreenRecorder, CompressionPreset, TargetFps } from "@/hooks/useScreenRecorder";

const CORNER_DOT: Record<WebcamCorner, string> = {
  "top-left": "top-1.5 left-1.5",
  "top-right": "top-1.5 right-1.5",
  "bottom-left": "bottom-1.5 left-1.5",
  "bottom-right": "bottom-1.5 right-1.5",
};

const SHAPE_CLASS: Record<WebcamShape, string> = {
  circle: "rounded-full",
  squircle: "h-5 rounded-[35%]",
  "rounded-square": "rounded-[18%]",
};

const SHAPE_LABEL: Record<WebcamShape, string> = {
  circle: "Circle",
  squircle: "Portrait squircle",
  "rounded-square": "Rounded square",
};

const SIZE_LABEL: Record<WebcamSize, string> = {
  small: "S",
  medium: "M",
  large: "L",
  "extra-large": "XL",
};

const RESOLUTION_LABEL: Record<ResolutionPreset, string> = {
  native: "Auto",
  "720p": "720p",
  "1080p": "1080p",
  "4k": "4K",
};

const QUALITY_LABEL: Record<CompressionPreset, string> = {
  compact: "Compact",
  balanced: "Balanced",
  max_quality: "Max",
};

function DockDivider() {
  return <div className="w-px h-6 bg-border/80 shrink-0 mx-0.5" aria-hidden="true" />;
}

function SegButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-bold transition-all",
        active
          ? "bg-background text-foreground shadow-sm ring-1 ring-border"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function DockIconButton({
  active = false,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            onClick={onClick}
            className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border transition-all",
              active
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-muted/60 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {children}
          </button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function HudButton({
  label,
  onClick,
  children,
  active = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            onClick={onClick}
            disabled={disabled}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-40 disabled:pointer-events-none",
              active
                ? "bg-white/15 text-white"
                : "text-slate-400 hover:text-white hover:bg-white/10"
            )}
          >
            {children}
          </button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function OptionGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/70">{children}</div>
    </div>
  );
}

function OptionButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex-1 h-7 rounded-lg text-[11px] font-bold transition-all",
        active
          ? "bg-background text-foreground shadow-sm ring-1 ring-border"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

// Shared camera-bubble settings panel — used in the setup dock and in the
// live recording HUD so bubble position/shape/size/device can be changed
// at any time (changes apply live to the preview and the recording).
function CameraBubbleSettings({
  layoutMode,
  cameraDevices,
  selectedCameraId,
  onSelectCameraDevice,
  webcamCorner,
  onCornerChange,
  webcamShape,
  onShapeChange,
  webcamSize,
  onSizeChange,
}: {
  layoutMode: RecordingLayoutMode;
  cameraDevices: MediaDeviceInfo[];
  selectedCameraId: string;
  onSelectCameraDevice: (deviceId: string) => void;
  webcamCorner: WebcamCorner;
  onCornerChange: (corner: WebcamCorner) => void;
  webcamShape: WebcamShape;
  onShapeChange: (shape: WebcamShape) => void;
  webcamSize: WebcamSize;
  onSizeChange: (size: WebcamSize) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <PopoverTitle>
          {layoutMode === "camera-only" ? "Camera" : "Camera bubble"}
        </PopoverTitle>
        <p className="text-[11px] text-muted-foreground font-medium">
          Applied live to the preview and the final recording.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          Camera device
        </Label>
        <Select
          value={
            selectedCameraId || (cameraDevices.length > 0 ? cameraDevices[0].deviceId : "")
          }
          onValueChange={(val) => onSelectCameraDevice(val || "")}
          disabled={cameraDevices.length === 0}
        >
          <SelectTrigger size="sm" className="w-full">
            <SelectValue placeholder="Select camera" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {cameraDevices.length === 0 ? (
                <SelectItem value="none" disabled>
                  No camera detected
                </SelectItem>
              ) : (
                cameraDevices.map((dev) => (
                  <SelectItem key={dev.deviceId} value={dev.deviceId}>
                    {dev.label || `Camera (${dev.deviceId.slice(0, 5)}…)`}
                  </SelectItem>
                ))
              )}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {layoutMode === "screen-cam" && (
        <>
          {/* Position corner — visual mini preview */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Position
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["top-left", "top-right", "bottom-left", "bottom-right"] as WebcamCorner[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Bubble ${c.replace("-", " ")}`}
                  onClick={() => onCornerChange(c)}
                  className={cn(
                    "relative h-10 rounded-xl border transition-all",
                    webcamCorner === c
                      ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                      : "border-border/60 bg-muted/50 hover:bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "absolute w-3 h-3 rounded-[4px] transition-colors",
                      CORNER_DOT[c],
                      webcamCorner === c ? "bg-primary" : "bg-muted-foreground/40"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Frame shape */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Frame shape
            </Label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["circle", "squircle", "rounded-square"] as WebcamShape[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  title={SHAPE_LABEL[s]}
                  aria-label={`Frame shape ${SHAPE_LABEL[s]}`}
                  onClick={() => onShapeChange(s)}
                  className={cn(
                    "h-9 rounded-xl border flex items-center justify-center transition-all",
                    webcamShape === s
                      ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                      : "border-border/60 bg-muted/50 hover:bg-muted"
                  )}
                >
                  <span className={cn("w-4 h-4 bg-foreground/70", SHAPE_CLASS[s])} />
                </button>
              ))}
            </div>
          </div>

          {/* Bubble size */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Bubble size
            </Label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["small", "medium", "large", "extra-large"] as WebcamSize[]).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => onSizeChange(sz)}
                  className={cn(
                    "h-8 rounded-xl border text-[11px] font-black transition-all",
                    webcamSize === sz
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {SIZE_LABEL[sz]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export type RecorderContext = ReturnType<typeof useScreenRecorder>;

export interface RecordStudioViewProps {
  /** Render the studio inside another surface, such as the dashboard drawer. */
  embedded?: boolean;
  /** Dashboard integrations can replace the public result actions with an upload form. */
  renderRecordedActions?: (context: RecorderContext & {
    showTrimmer: boolean;
    toggleTrimmer: () => void;
    recordedVideoRef: RefObject<HTMLVideoElement | null>;
  }) => ReactNode;
  /** Called when a completed recording has been processed. */
  onRecordingComplete?: (file: File, metadata: VideoMetadata) => void;
  /** Exposes the shared recorder state to an embedding surface for close/reset handling. */
  onContextChange?: (context: RecorderContext) => void;
}

const RECORDER_FEATURES = [
  {
    icon: Monitor,
    title: "Screen, window & tab capture",
    description: "Record a presentation, product demo, lesson, or any browser tab with a clean, focused canvas.",
  },
  {
    icon: Camera,
    title: "Webcam picture-in-picture",
    description: "Add your camera as a polished bubble with flexible corner, shape, and size controls.",
  },
  {
    icon: Mic,
    title: "Voice and audio recording",
    description: "Capture microphone audio with your video and keep every explanation clear and personal.",
  },
  {
    icon: Scissors,
    title: "Trim and download instantly",
    description: "Cut the beginning or end of a take, name your file, and download the finished WebM video.",
  },
];

function RecorderMarketingContent() {
  return (
    <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-3 sm:pb-5">
      <section className="relative overflow-hidden rounded-[2rem] border-2 border-border bg-comic-dots px-5 sm:px-8 lg:px-10 py-8 sm:py-11 shadow-[6px_6px_0px_0px_var(--comic-shadow-subtle)]">
        <div className="relative z-10 grid lg:grid-cols-[1.35fr_0.65fr] gap-8 lg:gap-12 items-center">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-black uppercase tracking-wider text-primary border-2 border-primary/40 bg-primary/10 rounded-full px-3.5 py-1.5 mb-5">
              <Video className="w-3.5 h-3.5" />
              Free browser-based video recorder
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.02] font-heading">
              Record your screen, camera &amp; voice in one take.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed font-medium max-w-2xl">
              Taped is a professional online screen recorder that lets you capture your screen,
              webcam, microphone, and system audio directly in your browser. Create polished demos,
              tutorials, lessons, and walkthroughs — with no download, no watermark, and no editing
              software required.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2.5 text-xs sm:text-sm font-extrabold text-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                No installation
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                No watermark
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Up to 4K / 60 FPS
              </span>
            </div>
          </div>

          <aside className="rounded-3xl border-2 border-border bg-card/90 p-5 sm:p-6 shadow-[4px_4px_0px_0px_var(--comic-shadow-subtle)]">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="w-11 h-11 rounded-2xl bg-primary/15 border-2 border-primary/30 text-primary flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black tracking-tight">Made for focused recording</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">Simple controls. Professional results.</p>
              </div>
            </div>
            <ul className="mt-4 space-y-3 text-sm font-semibold text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                Record privately with local browser processing
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                Preview your screen and camera before you start
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                Save a clean video file the moment you finish
              </li>
            </ul>
          </aside>
        </div>
      </section>

    </div>
  );
}

function RecorderFeaturesContent() {
  return (
    <section
      className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-3 sm:pb-5"
      aria-labelledby="recorder-features-heading"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-primary">Everything you need</p>
          <h2 id="recorder-features-heading" className="mt-1.5 text-2xl sm:text-3xl font-black tracking-tight font-heading">
            A better way to record online
          </h2>
        </div>
        <p className="text-sm text-muted-foreground font-medium max-w-md sm:text-right">
          Capture content that looks and sounds ready to share, without a complicated video studio.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {RECORDER_FEATURES.map((feature) => (
          <article
            key={feature.title}
            className="rounded-2xl border-2 border-border bg-card p-5 shadow-[3px_3px_0px_0px_var(--comic-shadow-subtle)] transition-all hover:-translate-y-0.5 hover:border-foreground hover:shadow-[5px_5px_0px_0px_var(--comic-shadow)]"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 text-primary flex items-center justify-center">
              <feature.icon className="w-5 h-5" />
            </div>
            <h3 className="mt-4 text-sm font-black tracking-tight">{feature.title}</h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed font-medium">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function RecordStudioView({
  embedded = false,
  renderRecordedActions,
  onRecordingComplete,
  onContextChange,
}: RecordStudioViewProps) {
  const studio = useScreenRecorder({ onRecordingComplete });
  const {
    recordState,
    isProcessing,
    processingStatus,
    isMicEnabled,
    wasMicEnabledOnStart,
    handleToggleMic,
    recordingTime,
    recordedFile,
    previewUrl,
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
    layoutMode,
    handleSetLayoutMode,
    fps,
    setFps,
    resolution,
    setResolution,
    compressionMode,
    setCompressionMode,
    countdownDelay,
    setCountdownDelay,
    countdownTime,
    isPreviewArmed,
    preparePreview,
    stopPreview,
    hasScreenSource,
    ensureScreenStream,
    title,
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
    handleDownload,
  } = studio;

  const [isArming, setIsArming] = useState(false);
  const [downloadFilename, setDownloadFilename] = useState("");
  const [showTrimmer, setShowTrimmer] = useState(false);
  const recordedVideoRef = useRef<HTMLVideoElement | null>(null);
  const [highQualityConfirm, setHighQualityConfirm] = useState<{
    isOpen: boolean;
    settingLabel: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    settingLabel: "",
    onConfirm: () => {},
  });

  const isMicDisabledMidRecording =
    (recordState === "recording" || recordState === "paused") && !wasMicEnabledOnStart;
  const isLiveSession =
    recordState === "countdown" || recordState === "recording" || recordState === "paused";
  const isRecording = recordState === "recording" || recordState === "paused";
  const showLiveVideo = isPreviewArmed || isLiveSession;
  const activeFilename = downloadFilename.trim() || title || "Studio Recording";

  useEffect(() => {
    onContextChange?.(studio);
  }, [onContextChange, studio]);

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

  const handleStartScreenPreview = async () => {
    setIsArming(true);
    try {
      await preparePreview();
    } finally {
      setIsArming(false);
    }
  };

  const handleStartCameraOnlyPreview = async () => {
    setIsArming(true);
    try {
      await preparePreview({ layoutMode: "camera-only", enableWebcam: true });
    } finally {
      setIsArming(false);
    }
  };

  const handleChangeScreen = async () => {
    setIsArming(true);
    try {
      stopPreview();
      await preparePreview();
    } finally {
      setIsArming(false);
    }
  };

  const handleRecordClick = async () => {
    if (isProcessing || isArming) return;
    setIsArming(true);
    try {
      // Arm the live preview first if needed — recording then starts
      // instantly from the already-acquired streams (countdown applies).
      if (!isPreviewArmed) {
        const armed = await preparePreview();
        if (!armed) return;
      }
      await startRecording();
    } finally {
      setIsArming(false);
    }
  };

  const handleToggleTrimmer = () => {
    if (!showTrimmer) {
      recordedVideoRef.current?.pause();
    }
    setShowTrimmer(!showTrimmer);
  };

  // Dock: switch to the screen layout — when a session is already live
  // (e.g. coming from camera-only) prompt for a screen immediately and
  // revert if the user dismisses the picker.
  const handleSelectScreenLayout = async () => {
    await handleSetLayoutMode("screen-cam");
    if (isPreviewArmed || isLiveSession) {
      const ok = await ensureScreenStream();
      if (!ok) {
        await handleSetLayoutMode("camera-only");
      }
    }
  };

  // HUD: toggle between screen+cam bubble and full-frame camera, usable
  // mid-preview and mid-recording
  const handleToggleLayout = async () => {
    const nextMode: RecordingLayoutMode =
      layoutMode === "camera-only" ? "screen-cam" : "camera-only";
    await handleSetLayoutMode(nextMode);
    if (nextMode === "screen-cam") {
      const ok = await ensureScreenStream();
      if (!ok) {
        await handleSetLayoutMode("camera-only");
      }
    }
  };

  // Stage overlay: attach a screen to the live session on demand
  const handleAddScreen = async () => {
    await ensureScreenStream();
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          "relative w-full flex flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground",
          embedded
            ? "h-full min-h-0 overflow-x-clip"
            : isLiveSession
              ? "fixed inset-0 h-[100dvh] max-h-[100dvh] overflow-hidden overscroll-none"
              : "min-h-screen overflow-x-clip"
        )}
      >
        {/* Ambient glow accents */}
        <div className="pointer-events-none absolute -top-48 left-1/2 -translate-x-1/2 h-96 w-[52rem] rounded-full bg-primary/10 blur-[130px]" />
        <div className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-sky-500/10 blur-[110px]" />
        {/* Use the shared public navigation outside the full-bleed live stage. */}
        {!embedded && !isLiveSession && (
          <PublicHeader currentPage="record" />
        )}
        {!embedded && !isLiveSession && <RecorderMarketingContent />}

        {/* The live stage intentionally fills the viewport. In the public idle state it
            stays inside the same max-width column as the marketing content above. */}
        <main
          className={cn(
            "relative z-10 flex-1 min-h-0 flex w-full",
            isLiveSession
              ? ""
              : embedded
                ? "p-3 sm:p-4"
                : "max-w-6xl mx-auto p-3 sm:p-5 lg:p-6"
          )}
        >
          <div
            className={cn(
              "relative flex-1 min-h-0 overflow-hidden flex items-center justify-center bg-slate-950 transition-all duration-300",
              isLiveSession
                ? ""
                : embedded
                  ? "rounded-[2rem] ring-1 ring-border/80 shadow-2xl"
                  : "rounded-[2rem] ring-1 ring-border/80 shadow-2xl min-h-[31rem] sm:min-h-[35rem] lg:min-h-[38rem]"
            )}
          >
            {/* Dot grid backdrop for the idle viewport */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.09) 1px, transparent 0)",
                backgroundSize: "26px 26px",
              }}
            />

            {/* Live WYSIWYG composite preview (kept mounted so the hook can attach streams) */}
            <video
              ref={videoPreviewRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "absolute inset-0 w-full h-full object-contain transition-opacity duration-300",
                showLiveVideo ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            />

            {/* Recorded playback */}
            {(recordState === "recorded" || recordState === "uploading") && previewUrl && (
              <video
                key={previewUrl}
                ref={recordedVideoRef}
                src={previewUrl}
                controls
                playsInline
                className="absolute inset-0 w-full h-full object-contain"
              />
            )}

            {/* Idle empty state — arm the WYSIWYG preview */}
            {recordState === "idle" && !isPreviewArmed && (
              <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg space-y-6">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto">
                  <MonitorUp className="w-9 h-9" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black tracking-tight text-white">Studio viewport</h2>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Select a screen to arm a live WYSIWYG preview — including your camera bubble —
                    then hit <strong className="text-white">Record</strong> to start instantly.
                    Everything runs locally in your browser.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <Button
                    size="lg"
                    disabled={isArming}
                    onClick={() => void handleStartScreenPreview()}
                    className="h-11 rounded-full px-6 font-extrabold gap-2 shadow-lg shadow-primary/25"
                  >
                    {isArming ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MonitorUp className="w-4 h-4" />
                    )}
                    Select screen to preview
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    disabled={isArming}
                    onClick={() => void handleStartCameraOnlyPreview()}
                    className="h-11 rounded-full px-6 font-bold gap-2 border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
                  >
                    <Camera className="w-4 h-4" />
                    Camera only
                  </Button>
                </div>
                <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-slate-500">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  100% local &amp; private · No watermarks · Up to 4K 60 FPS
                </div>
              </div>
            )}

            {/* Armed preview badges */}
            {recordState === "idle" && isPreviewArmed && (
              <>
                <div className="absolute top-4 left-4 z-30 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[11px] font-black uppercase tracking-wider backdrop-blur-md">
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </span>
                  {countdownDelay > 0 && (
                    <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[11px] font-bold backdrop-blur-md">
                      <Timer className="w-3.5 h-3.5" />
                      {countdownDelay}s countdown before capture
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isArming}
                  onClick={() => void handleChangeScreen()}
                  className="absolute top-4 right-4 z-30 rounded-full border-white/15 bg-slate-950/60 text-slate-200 hover:bg-slate-900 hover:text-white backdrop-blur-md gap-1.5"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isArming && "animate-spin")} />
                  Change screen
                </Button>
              </>
            )}

            {/* Trimmed badge */}
            {recordState === "recorded" && isTrimmed && (
              <span className="absolute top-4 left-4 z-30 inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-primary/90 text-primary-foreground text-[11px] font-black uppercase tracking-wider shadow-lg">
                <Scissors className="w-3.5 h-3.5" />
                Trimmed
              </span>
            )}

            {/* Prompt when a live session is missing its screen source
                (e.g. armed camera-only, then switched to the screen layout) */}
            {(isPreviewArmed || isLiveSession) &&
              layoutMode === "screen-cam" &&
              !hasScreenSource && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-slate-950/70 backdrop-blur-sm px-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 text-slate-300 flex items-center justify-center">
                    <Monitor className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-white">Add a screen to capture</p>
                    <p className="text-xs text-slate-400 font-medium max-w-xs">
                      Your camera is live. Pick the screen, window, or tab you want to record
                      alongside it.
                    </p>
                  </div>
                  <Button
                    onClick={() => void handleAddScreen()}
                    className="rounded-full h-10 px-5 font-extrabold gap-2"
                  >
                    <Monitor className="w-4 h-4" />
                    Select screen
                  </Button>
                </div>
              )}

            {/* Error toast */}
            {error && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2.5rem)] max-w-md">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-red-950/80 border border-red-500/30 backdrop-blur-xl text-red-300 shadow-2xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-xs font-semibold leading-relaxed">{error}</span>
                  <button
                    type="button"
                    onClick={() => setError("")}
                    aria-label="Dismiss error"
                    className="p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Countdown overlay */}
            {recordState === "countdown" && (
              <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center gap-7">
                <div className="relative flex items-center justify-center w-44 h-44">
                  <span className="absolute inset-0 rounded-full border-2 border-red-500/40 animate-ping" />
                  <span className="absolute inset-3 rounded-full border border-red-500/20 animate-pulse" />
                  <span className="text-8xl font-black text-white font-mono tabular-nums drop-shadow-2xl">
                    {countdownTime}
                  </span>
                </div>
                <div className="space-y-1.5 text-center">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-300">
                    Recording starts in
                  </p>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    Switch to the window you want to capture
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={cancelCountdown}
                  className="rounded-full gap-2 border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
                >
                  <X className="w-4 h-4" />
                  Cancel — back to preview
                </Button>
              </div>
            )}

            {/* Live recording HUD — floats on top of the preview only */}
            {isRecording && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 p-1.5 rounded-full bg-slate-950/85 ring-1 ring-white/15 shadow-2xl backdrop-blur-xl max-w-[calc(100%-2rem)]">
                <div className="flex items-center gap-2 pl-2.5 pr-1 shrink-0">
                  <span
                    className={cn(
                      "w-2.5 h-2.5 rounded-full",
                      recordState === "recording"
                        ? "bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.9)]"
                        : "bg-amber-400"
                    )}
                  />
                  <span className="font-mono text-sm font-bold text-white tabular-nums">
                    {formatDuration(recordingTime)}
                  </span>
                  {recordState === "paused" && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                      Paused
                    </span>
                  )}
                </div>
                <div className="w-px h-5 bg-white/10 shrink-0" />
                <HudButton
                  label={recordState === "paused" ? "Resume recording" : "Pause recording"}
                  onClick={recordState === "paused" ? resumeRecording : pauseRecording}
                >
                  {recordState === "paused" ? (
                    <Play className="w-4 h-4 fill-current" />
                  ) : (
                    <Pause className="w-4 h-4 fill-current" />
                  )}
                </HudButton>
                <HudButton
                  label={isMicEnabled ? "Mute microphone" : "Unmute microphone"}
                  onClick={handleToggleMic}
                  active={isMicEnabled}
                  disabled={isMicDisabledMidRecording}
                >
                  {isMicEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </HudButton>
                <HudButton
                  label={isWebcamEnabled ? "Disable camera" : "Enable camera"}
                  onClick={() => void handleToggleWebcam()}
                  active={isWebcamEnabled}
                >
                  {isWebcamEnabled ? (
                    <Camera className="w-4 h-4" />
                  ) : (
                    <CameraOff className="w-4 h-4" />
                  )}
                </HudButton>
                {/* Layout toggle — screen+cam bubble ↔ full-frame camera */}
                <HudButton
                  label={
                    layoutMode === "screen-cam"
                      ? "Click for full-frame camera"
                      : "Click for screen + camera bubble"
                  }
                  onClick={() => void handleToggleLayout()}
                  active
                >
                  {layoutMode === "screen-cam" ? (
                    <PictureInPicture2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </HudButton>
                {/* Live bubble settings — position/shape/size/device */}
                {layoutMode === "screen-cam" && (
                  <Popover>
                    <PopoverTrigger
                      render={
                        <button
                          type="button"
                          aria-label="Camera bubble settings"
                          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <Settings2 className="w-4 h-4" />
                        </button>
                      }
                    />
                    <PopoverContent side="bottom" align="center" className="w-80">
                      <CameraBubbleSettings
                        layoutMode={layoutMode}
                        cameraDevices={cameraDevices}
                        selectedCameraId={selectedCameraId}
                        onSelectCameraDevice={(deviceId) =>
                          void handleSelectCameraDevice(deviceId || "")
                        }
                        webcamCorner={webcamCorner}
                        onCornerChange={setWebcamCorner}
                        webcamShape={webcamShape}
                        onShapeChange={setWebcamShape}
                        webcamSize={webcamSize}
                        onSizeChange={setWebcamSize}
                      />
                    </PopoverContent>
                  </Popover>
                )}
                <button
                  type="button"
                  onClick={stopRecording}
                  disabled={isProcessing}
                  className="ml-1 h-9 pl-3 pr-4 rounded-full bg-red-500 hover:bg-red-400 disabled:opacity-70 text-white flex items-center gap-2 text-xs font-black transition-all shadow-lg shadow-red-500/30 shrink-0"
                >
                  {isProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <SquareIcon className="w-3 h-3 fill-current" />
                  )}
                  Stop
                </button>
              </div>
            )}

            {/* Processing overlay (finalizing after stop) */}
            {isProcessing && recordState !== "recorded" && (
              <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <div className="space-y-1 text-center">
                  <p className="text-sm font-bold text-white">Finalizing your recording</p>
                  <p className="text-xs text-slate-400 font-semibold">
                    {processingStatus || "Processing…"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
        {/* Setup dock */}
        {recordState === "idle" && (
          <footer className="relative z-30 shrink-0 px-3 sm:px-6 pb-4 sm:pb-5 pt-1.5">
            <div className="mx-auto max-w-5xl rounded-[1.75rem] border border-border/70 bg-background/85 backdrop-blur-2xl shadow-2xl p-2 flex flex-wrap items-center gap-1.5">
              {/* Layout mode */}
              <div className="flex items-center gap-0.5 p-1 rounded-2xl bg-muted/70 shrink-0">
                {/* Screen seg — auto-prompts for a screen when the session is live */}
                <SegButton
                  active={layoutMode === "screen-cam"}
                  onClick={() => void handleSelectScreenLayout()}
                  icon={<Monitor className="w-4 h-4" />}
                  label="Screen"
                />
                <SegButton
                  active={layoutMode === "camera-only"}
                  onClick={() => void handleSetLayoutMode("camera-only")}
                  icon={<Camera className="w-4 h-4" />}
                  label="Camera"
                />
              </div>

              <DockDivider />

              {/* Microphone toggle */}
              <DockIconButton
                active={isMicEnabled}
                label={isMicEnabled ? "Microphone on — click to mute" : "Microphone off — click to enable"}
                onClick={handleToggleMic}
              >
                {isMicEnabled ? <Mic className="w-4.5 h-4.5" /> : <MicOff className="w-4.5 h-4.5" />}
              </DockIconButton>

              {/* Webcam toggle */}
              <DockIconButton
                active={isWebcamEnabled}
                label={isWebcamEnabled ? "Camera on — click to disable" : "Camera off — click to enable"}
                onClick={() => void handleToggleWebcam()}
              >
                {isWebcamEnabled ? (
                  <Camera className="w-4.5 h-4.5" />
                ) : (
                  <CameraOff className="w-4.5 h-4.5" />
                )}
              </DockIconButton>

              {/* Camera bubble settings */}
              {isWebcamEnabled && (
                <Popover>
                  <PopoverTrigger
                    render={
                      <button
                        type="button"
                        className="flex items-center gap-1.5 h-10 px-3 rounded-2xl bg-muted/60 border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0"
                      >
                        <PictureInPicture2 className="w-4.5 h-4.5" />
                        <span className="hidden sm:inline text-xs font-bold">Bubble</span>
                        <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                      </button>
                    }
                  />
                  <PopoverContent side="top" align="start" className="w-80">
                    <CameraBubbleSettings
                      layoutMode={layoutMode}
                      cameraDevices={cameraDevices}
                      selectedCameraId={selectedCameraId}
                      onSelectCameraDevice={(deviceId) =>
                        void handleSelectCameraDevice(deviceId || "")
                      }
                      webcamCorner={webcamCorner}
                      onCornerChange={setWebcamCorner}
                      webcamShape={webcamShape}
                      onShapeChange={setWebcamShape}
                      webcamSize={webcamSize}
                      onSizeChange={setWebcamSize}
                    />
                  </PopoverContent>
                </Popover>
              )}
              {/* Quality settings */}
              <Popover>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className="flex items-center gap-1.5 h-10 px-3 rounded-2xl bg-muted/60 border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0"
                    >
                      <Settings2 className="w-4.5 h-4.5" />
                      <span className="hidden sm:inline text-xs font-bold">
                        {RESOLUTION_LABEL[resolution]} · {fps} FPS · {QUALITY_LABEL[compressionMode]}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                    </button>
                  }
                />
                <PopoverContent side="top" align="end" className="w-80 space-y-4">
                  <div className="space-y-0.5">
                    <PopoverTitle>Recording quality</PopoverTitle>
                    <p className="text-[11px] text-muted-foreground font-medium">
                      Higher quality produces larger files.
                    </p>
                  </div>

                  <OptionGroup label="Resolution">
                    {(["native", "720p", "1080p", "4k"] as ResolutionPreset[]).map((r) => (
                      <OptionButton
                        key={r}
                        active={resolution === r}
                        onClick={() => handleSelectResolution(r)}
                      >
                        {RESOLUTION_LABEL[r]}
                      </OptionButton>
                    ))}
                  </OptionGroup>

                  <OptionGroup label="Frame rate">
                    {([15, 24, 30, 60] as TargetFps[]).map((f) => (
                      <OptionButton key={f} active={fps === f} onClick={() => handleSelectFps(f)}>
                        {f}
                      </OptionButton>
                    ))}
                  </OptionGroup>

                  <OptionGroup label="Bitrate">
                    {(["compact", "balanced", "max_quality"] as CompressionPreset[]).map((m) => (
                      <OptionButton
                        key={m}
                        active={compressionMode === m}
                        onClick={() => handleSelectCompressionMode(m)}
                      >
                        {QUALITY_LABEL[m]}
                      </OptionButton>
                    ))}
                  </OptionGroup>

                  <OptionGroup label="Countdown">
                    {([0, 3, 5] as const).map((d) => (
                      <OptionButton
                        key={d}
                        active={countdownDelay === d}
                        onClick={() => setCountdownDelay(d)}
                      >
                        {d === 0 ? "Off" : `${d}s`}
                      </OptionButton>
                    ))}
                  </OptionGroup>
                </PopoverContent>
              </Popover>

              <div className="flex-1 min-w-1" />

              {/* Record */}
              <Button
                type="button"
                onClick={() => void handleRecordClick()}
                disabled={isProcessing || isArming}
                className="h-11 shrink-0 rounded-full pl-4 pr-5 bg-red-600 hover:bg-red-500 text-white font-extrabold gap-2.5 shadow-lg shadow-red-600/30"
              >
                <span className="relative flex w-3 h-3">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-40 animate-ping" />
                  <span className="relative inline-flex w-3 h-3 rounded-full bg-white" />
                </span>
                {isArming ? "Preparing…" : isPreviewArmed ? "Start recording" : "Record"}
              </Button>
            </div>
          </footer>
        )}

        {/* Result dock */}
        {(recordState === "recorded" || recordState === "uploading") && (
          <footer className="relative z-30 shrink-0 px-3 sm:px-6 pb-4 pt-1.5 space-y-2.5">
            {showTrimmer && recordedFile && previewUrl && (
              <div className="mx-auto max-w-5xl rounded-[1.75rem] border border-border/70 bg-background/90 backdrop-blur-2xl shadow-2xl">
                <VideoTrimmer
                  videoFile={recordedFile}
                  previewUrl={previewUrl}
                  metadata={metadata}
                  videoElementRef={recordedVideoRef}
                  onTrimSuccess={(newFile, newUrl, newMeta) => {
                    applyTrimmedVideo(newFile, newMeta, newUrl);
                    setShowTrimmer(false);
                  }}
                  onCancel={() => setShowTrimmer(false)}
                />
              </div>
            )}

            <div className="mx-auto max-w-5xl rounded-[1.75rem] border border-border/70 bg-background/85 backdrop-blur-2xl shadow-2xl p-2 flex flex-wrap items-center gap-1.5">
              {renderRecordedActions ? (
                renderRecordedActions({
                  ...studio,
                  showTrimmer,
                  toggleTrimmer: handleToggleTrimmer,
                  recordedVideoRef,
                })
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-1 min-w-52">
                    <Input
                      value={downloadFilename}
                      onChange={(e) => setDownloadFilename(e.target.value)}
                      placeholder={title || "Recording name"}
                      aria-label="Download file name"
                      className="h-10 rounded-2xl bg-muted/60 border-transparent focus-visible:border-ring font-semibold"
                    />
                    <span className="text-[11px] font-mono font-bold text-muted-foreground shrink-0">
                      .webm
                    </span>
                  </div>

                  {metadata && (
                    <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground bg-muted/60 rounded-full px-3 py-1.5 shrink-0">
                      <Timer className="w-3.5 h-3.5" />
                      {formatDuration(metadata.durationSeconds)}
                      <span className="opacity-40">·</span>
                      {metadata.sourceWidth}×{metadata.sourceHeight}
                      <span className="opacity-40">·</span>
                      {recordedFile ? formatBytes(recordedFile.size) : "—"}
                    </div>
                  )}

                  <DockDivider />

                  <Button
                    variant="ghost"
                    onClick={handleToggleTrimmer}
                    className="h-10 rounded-2xl font-bold gap-1.5 shrink-0"
                  >
                    <Scissors className="w-4 h-4" />
                    {showTrimmer ? "Close trimmer" : isTrimmed ? "Re-trim" : "Trim"}
                  </Button>

                  {isTrimmed && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        revertToOriginalRecording();
                        setShowTrimmer(false);
                      }}
                      className="h-10 rounded-2xl font-bold gap-1.5 text-muted-foreground shrink-0"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Revert
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    onClick={handleReRecord}
                    className="h-10 rounded-2xl font-bold gap-1.5 shrink-0"
                  >
                    <RotateCcw className="w-4 h-4" />
                    New recording
                  </Button>

                  <Button
                    onClick={() => handleDownload(activeFilename)}
                    className="h-10 rounded-full px-5 font-extrabold gap-2 shadow-lg shadow-primary/25 shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>

                </>
              )}
            </div>
          </footer>
        )}
        {!embedded && !isLiveSession && <RecorderFeaturesContent />}
        {/* High file size confirmation modal */}
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
                <DialogTitle>High File Size Warning</DialogTitle>
                <DialogDescription>
                  Selecting <strong className="text-amber-500">{highQualityConfirm.settingLabel}</strong>{" "}
                  will significantly increase video quality, but will result in substantially higher
                  output file sizes and may consume more disk storage and network bandwidth.
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 font-medium">
              <strong>Pro tip:</strong> For standard recordings, 30 FPS, Balanced bitrate, or 1080p
              produces smooth quality while keeping the file size compact.
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border shrink-0 mt-3">
              <Button
                variant="outline"
                onClick={() => setHighQualityConfirm((prev) => ({ ...prev, isOpen: false }))}
              >
                Cancel
              </Button>
              <Button
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
        {!embedded && !isLiveSession && <PublicFooter />}
      </div>
    </TooltipProvider>
  );
}
