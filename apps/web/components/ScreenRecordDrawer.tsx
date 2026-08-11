"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  VideoMetadata,
  extractVideoMetadataAndThumbnail,
  fixWebmDuration,
  formatDuration,
  formatBytes,
} from "@/lib/video-utils";
import {
  RecordingCompositor,
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
import { uploadVideoFile } from "@/lib/upload-video";

interface ScreenRecordDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  currentFolderId?: string | null;
  folderPathName?: string;
}

type RecordState = "idle" | "countdown" | "recording" | "paused" | "recorded" | "uploading";
type CompressionPreset = "compact" | "balanced" | "max_quality";

export default function ScreenRecordDrawer({
  isOpen,
  onClose,
  onUploadSuccess,
  currentFolderId,
  folderPathName,
}: ScreenRecordDrawerProps) {
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Webcam & Recording Studio Controls
  const [isWebcamEnabled, setIsWebcamEnabled] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [webcamCorner, setWebcamCorner] = useState<WebcamCorner>("bottom-left");
  const [webcamShape, setWebcamShape] = useState<WebcamShape>("circle");
  const [webcamSize, setWebcamSize] = useState<WebcamSize>("medium");
  const [resolution, setResolution] = useState<ResolutionPreset>("1080p");
  const [compressionMode, setCompressionMode] = useState<CompressionPreset>("compact");
  const [countdownDelay, setCountdownDelay] = useState<0 | 3 | 5>(5);
  const [countdownTime, setCountdownTime] = useState<number>(5);
  const [showStudioSettings, setShowStudioSettings] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requireHls, setRequireHls] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [checkingQuota, setCheckingQuota] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

  const [showConfirmClose, setShowConfirmClose] = useState(false);

  // Stream & Recorder references
  const displayStreamRef = useRef<MediaStream | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const compositeStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const compositorRef = useRef<RecordingCompositor | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeRef = useRef(0);
  const recordingStartTimeRef = useRef(0);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Enumerate Camera Input Devices
  const updateCameraDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      setCameraDevices(videoInputs);

      if (videoInputs.length > 0 && !selectedCameraId) {
        setSelectedCameraId(videoInputs[0].deviceId);
      }
    } catch (e) {
      console.warn("Failed to enumerate media devices:", e);
    }
  }, [selectedCameraId]);

  useEffect(() => {
    if (isOpen) {
      updateCameraDevices();
    }
  }, [isOpen, updateCameraDevices]);

  // Handle webcam stream initialization/switching
  const setupWebcamStream = useCallback(
    async (deviceId?: string): Promise<MediaStream | null> => {
      try {
        if (webcamStreamRef.current) {
          webcamStreamRef.current.getTracks().forEach((track) => track.stop());
          webcamStreamRef.current = null;
        }

        const targetDeviceId = deviceId || selectedCameraId;
        const videoConstraints: boolean | MediaTrackConstraints = targetDeviceId
          ? { deviceId: { exact: targetDeviceId } }
          : true;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });

        webcamStreamRef.current = stream;

        if (compositorRef.current) {
          compositorRef.current.setWebcamStream(stream);
        }

        updateCameraDevices();
        return stream;
      } catch (err) {
        console.warn("Failed to acquire webcam stream:", err);
        setIsWebcamEnabled(false);
        if (compositorRef.current) {
          compositorRef.current.isWebcamEnabled = false;
        }
        return null;
      }
    },
    [selectedCameraId, updateCameraDevices]
  );

  // Toggle Webcam mid-recording or idle
  const handleToggleWebcam = async () => {
    const nextState = !isWebcamEnabled;
    setIsWebcamEnabled(nextState);

    if (compositorRef.current) {
      compositorRef.current.isWebcamEnabled = nextState;
    }

    if (nextState) {
      await setupWebcamStream();
    } else if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((track) => track.stop());
      webcamStreamRef.current = null;
      if (compositorRef.current) {
        compositorRef.current.setWebcamStream(null);
      }
    }
  };

  // Switch camera device
  const handleSelectCameraDevice = async (deviceId: string) => {
    setSelectedCameraId(deviceId);
    if (isWebcamEnabled) {
      await setupWebcamStream(deviceId);
    }
  };

  // Toggle microphone track audio status
  const handleToggleMic = () => {
    const nextState = !isMicEnabled;
    setIsMicEnabled(nextState);

    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = nextState;
      });
    }
  };

  // Keep Compositor properties synchronized live with React state
  useEffect(() => {
    if (compositorRef.current) {
      compositorRef.current.webcamCorner = webcamCorner;
      compositorRef.current.webcamShape = webcamShape;
      compositorRef.current.webcamSize = webcamSize;
      compositorRef.current.isWebcamEnabled = isWebcamEnabled;
    }
  }, [webcamCorner, webcamShape, webcamSize, isWebcamEnabled]);

  const cleanupStreams = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn("Failed to stop media recorder:", e);
      }
    }

    if (compositorRef.current) {
      compositorRef.current.stop();
      compositorRef.current = null;
    }

    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach((track) => track.stop());
      displayStreamRef.current = null;
    }

    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((track) => track.stop());
      webcamStreamRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        console.warn("Failed to close AudioContext:", e);
      }
      audioContextRef.current = null;
    }

    if (compositeStreamRef.current) {
      compositeStreamRef.current.getTracks().forEach((track) => track.stop());
      compositeStreamRef.current = null;
    }
  }, []);

  const resetAll = useCallback(() => {
    cleanupStreams();
    setRecordState("idle");
    setRecordingTime(0);
    recordingTimeRef.current = 0;
    setRecordedFile(null);
    setIsWebcamEnabled(false);
    setIsMicEnabled(false);
    setShowStudioSettings(false);
    setCountdownTime(0);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setTitle("");
    setDescription("");
    setRequireHls(false);
    setError("");
    setProgress(0);
    setStatusText("");
    setCheckingQuota(false);
    setIsQuotaExceeded(false);
    if (metadata?.thumbnailUrl) {
      URL.revokeObjectURL(metadata.thumbnailUrl);
    }
    setMetadata(null);
    setShowConfirmClose(false);
  }, [cleanupStreams, previewUrl, metadata]);

  // Cancel Countdown during delay phase
  const cancelCountdown = () => {
    cleanupStreams();
    setRecordState("idle");
  };

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
      resetAll();
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    resetAll();
    onClose();
  };

  // Build resolution constraints based on chosen preset
  const getDisplayVideoConstraints = (preset: ResolutionPreset): MediaTrackConstraints => {
    if (preset === "4k") {
      return { width: { ideal: 3840 }, height: { ideal: 2160 }, frameRate: { ideal: 60 } };
    }
    if (preset === "1080p") {
      return { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 } };
    }
    if (preset === "720p") {
      return { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } };
    }
    return { displaySurface: "browser" };
  };

  // Start Screen Recording with Canvas Compositer Engine & Optimized Compression
  const startRecording = async () => {
    setError("");
    try {
      // 1. Get Screen Display Stream
      const displayConstraints = getDisplayVideoConstraints(resolution);
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: displayConstraints,
        audio: true,
      });

      displayStreamRef.current = displayStream;

      // Handle user stopping screen share via browser floating bar
      displayStream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

      // 2. Initialize Canvas Compositor
      const compositor = new RecordingCompositor({
        webcamCorner,
        webcamShape,
        webcamSize,
        isWebcamEnabled,
      });
      compositorRef.current = compositor;
      compositor.setScreenStream(displayStream);

      // 3. Acquire webcam stream if enabled
      if (isWebcamEnabled) {
        await setupWebcamStream();
      }

      // Determine Target FPS & Target Bitrate based on Compression Preset
      let targetFps = 30;
      let targetBitrate = 1_500_000; // 1.5 Mbps default for compact small file size

      if (compressionMode === "compact") {
        targetFps = 30;
        targetBitrate = 1_200_000; // 1.2 Mbps (~8-10MB/min) - Ultra compressed & crisp!
      } else if (compressionMode === "balanced") {
        targetFps = 30;
        targetBitrate = 2_200_000; // 2.2 Mbps (~16MB/min)
      } else if (compressionMode === "max_quality") {
        targetFps = 60;
        targetBitrate = 5_000_000; // 5 Mbps (~35MB/min)
      }

      // Start compositing loop with target FPS to avoid unneeded 60 FPS overhead
      const canvasVideoStream = compositor.start(targetFps);

      // 4. Handle microphone audio mixing if enabled
      let audioTracks: MediaStreamTrack[] = [];

      if (displayStream.getAudioTracks().length > 0) {
        audioTracks.push(...displayStream.getAudioTracks());
      }

      if (isMicEnabled) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = micStream;

          const audioCtx = new AudioContext();
          audioContextRef.current = audioCtx;
          const dest = audioCtx.createMediaStreamDestination();

          if (displayStream.getAudioTracks().length > 0) {
            const displayAudioSource = audioCtx.createMediaStreamSource(
              new MediaStream([displayStream.getAudioTracks()[0]])
            );
            displayAudioSource.connect(dest);
          }

          const micAudioSource = audioCtx.createMediaStreamSource(micStream);
          micAudioSource.connect(dest);

          audioTracks = dest.stream.getAudioTracks();
        } catch (micErr) {
          console.warn("Microphone access failed or denied:", micErr);
        }
      }

      // 5. Build final composite stream (Canvas Video + Mixed Audio)
      const compositeStream = new MediaStream([
        ...canvasVideoStream.getVideoTracks(),
        ...audioTracks,
      ]);
      compositeStreamRef.current = compositeStream;

      // Set live preview stream
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = compositeStream;
      }

      // 6. Prepare MediaRecorder with optimal mimeType & bitrate constraint
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";

      recordedChunksRef.current = [];
      const recorderOptions: MediaRecorderOptions = {
        mimeType,
        videoBitsPerSecond: targetBitrate,
      };
      const recorder = new MediaRecorder(compositeStream, recorderOptions);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const rawBlob = new Blob(recordedChunksRef.current, { type: mimeType });
        const elapsedMs = Math.max(1000, Date.now() - (recordingStartTimeRef.current || Date.now()));
        const durationSec = Math.max(1, Math.round(elapsedMs / 1000));

        let finalBlob = rawBlob;
        if (mimeType.includes("webm")) {
          try {
            finalBlob = await fixWebmDuration(rawBlob, elapsedMs);
          } catch (e) {
            console.warn("WebM duration patching failed:", e);
          }
        }

        const now = new Date();
        const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
          now.getDate()
        ).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const fileName = `Studio Recording ${formattedDate}.webm`;
        const file = new File([finalBlob], fileName, { type: mimeType });

        setRecordedFile(file);
        setTitle(`Studio Recording ${formattedDate}`);

        const url = URL.createObjectURL(finalBlob);
        setPreviewUrl(url);

        setCheckingQuota(true);
        setIsQuotaExceeded(false);

        // Check remaining storage before allowing upload
        try {
          const usageRes = await fetch("/api/v1/usage");
          if (usageRes.ok) {
            const usageData = await usageRes.json();
            if (usageData.usage) {
              const { usedBytes, storageLimitBytes, isLimitReached } = usageData.usage;
              const remainingBytes = Math.max(0, storageLimitBytes - usedBytes);
              if (isLimitReached || file.size > remainingBytes) {
                setIsQuotaExceeded(true);
                setError(
                  `Recorded file size (${formatBytes(file.size)}) exceeds your available storage quota (${formatBytes(remainingBytes)} remaining out of ${formatBytes(storageLimitBytes)}). Upload is disabled.`
                );
              } else {
                setIsQuotaExceeded(false);
                setError("");
              }
            }
          }
        } catch (e) {
          console.warn("Quota check error:", e);
        } finally {
          setCheckingQuota(false);
        }

        const meta = await extractVideoMetadataAndThumbnail(file, durationSec);
        setMetadata(meta);

        setRecordState("recorded");
      };

      // 7. Handle Countdown Delay
      const beginActualRecording = () => {
        recorder.start(1000);
        recordingStartTimeRef.current = Date.now();
        setRecordState("recording");
        setRecordingTime(0);
        recordingTimeRef.current = 0;

        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => {
            const next = prev + 1;
            recordingTimeRef.current = next;
            return next;
          });
        }, 1000);
      };

      if (countdownDelay > 0) {
        setRecordState("countdown");
        setCountdownTime(countdownDelay);

        let remaining = countdownDelay;
        countdownTimerRef.current = setInterval(() => {
          remaining -= 1;
          setCountdownTime(remaining);

          if (remaining <= 0) {
            if (countdownTimerRef.current) {
              clearInterval(countdownTimerRef.current);
              countdownTimerRef.current = null;
            }
            beginActualRecording();
          }
        }, 1000);
      } else {
        beginActualRecording();
      }
    } catch (err: any) {
      console.error("Screen recording setup failed:", err);
      if (err.name !== "NotAllowedError") {
        setError(err?.message || "Failed to start screen recording");
      }
      cleanupStreams();
      setRecordState("idle");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordState("paused");
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const next = prev + 1;
          recordingTimeRef.current = next;
          return next;
        });
      }, 1000);
      setRecordState("recording");
    }
  };

  const stopRecording = () => {
    cleanupStreams();
  };

  const handleReRecord = () => {
    resetAll();
  };

  const handleDownload = () => {
    if (!recordedFile && !previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl || URL.createObjectURL(recordedFile!);
    a.download = recordedFile?.name || `${title.trim() || "Studio Recording"}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Upload Process
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordedFile || !title.trim() || checkingQuota || isQuotaExceeded) return;

    setError("");
    setCheckingQuota(true);

    // Validate storage quota before starting upload
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

      // Dispatch live usage update event for Sidebar
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("usage-updated"));
        window.dispatchEvent(new CustomEvent("video-uploaded"));
      }

      setTimeout(() => {
        setUploading(false);
        resetAll();
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

  useEffect(() => {
    if (
      (recordState === "recording" || recordState === "paused" || recordState === "countdown") &&
      videoPreviewRef.current &&
      compositeStreamRef.current
    ) {
      if (videoPreviewRef.current.srcObject !== compositeStreamRef.current) {
        videoPreviewRef.current.srcObject = compositeStreamRef.current;
      }
    }
  }, [recordState]);

  useEffect(() => {
    return () => {
      cleanupStreams();
    };
  }, [cleanupStreams]);

  return (
    <>
      <Drawer open={isOpen} onOpenChange={(open) => !open && handleAttemptClose()}>
        <DrawerContent className="w-full" hideCloseButton>
          <div className="max-w-5xl mx-auto w-full relative">
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
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse">
                        <Timer className="w-3.5 h-3.5 text-amber-600 animate-spin" /> Starting in {countdownTime}s
                      </span>
                    )}
                    {recordState === "recording" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-600 border border-red-500/20 animate-pulse">
                        <Disc className="w-3.5 h-3.5 text-red-600 animate-spin" /> Recording Live
                      </span>
                    )}
                    {recordState === "paused" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        <Pause className="w-3.5 h-3.5" /> Paused
                      </span>
                    )}
                  </DrawerTitle>
                  <DrawerDescription className="text-xs text-muted-foreground mt-0.5">
                    Record your screen with face camera stream overlay, custom positioning, shapes, size optimization & delay timer
                  </DrawerDescription>
                </div>
              </div>
            </DrawerHeader>

            {error && (
              <div className="mx-4 mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm flex items-center gap-2 shadow-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-4 space-y-4">
              {/* VIEW MODE: IDLE SETUP */}
              {recordState === "idle" && (
                <div className="space-y-5">
                  {/* Studio Configuration Panel */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-3xl p-6 bg-gradient-to-b from-slate-50/50 to-slate-100/30 dark:from-slate-900/40 dark:to-slate-950/40 shadow-xs space-y-6">
                    
                    {/* Top Controls: Resolution, Compression, Delay, Audio & Camera */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      
                      {/* 1. Resolution Selector */}
                      <div className="p-3.5 rounded-2xl bg-background border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                          <span className="flex items-center gap-1">
                            <Monitor className="w-3.5 h-3.5 text-blue-500" /> Resolution
                          </span>
                          <span className="uppercase text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold">
                            {resolution}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 pt-0.5">
                          {(["720p", "1080p", "4k", "native"] as ResolutionPreset[]).map((res) => (
                            <button
                              key={res}
                              type="button"
                              onClick={() => setResolution(res)}
                              className={`py-1 rounded-md text-[10px] font-bold transition-all ${
                                resolution === res
                                  ? "bg-blue-600 text-white shadow-xs shadow-blue-500/25 scale-[1.02]"
                                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                              }`}
                            >
                              {res.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 2. Compression & File Size Optimization */}
                      <div className="p-3.5 rounded-2xl bg-background border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                          <span className="flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-emerald-500" /> File Size
                          </span>
                          <span className="uppercase text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold">
                            {compressionMode === "compact" ? "Small" : compressionMode === "balanced" ? "Balanced" : "Max"}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 pt-0.5">
                          {[
                            { key: "compact", label: "Compact" },
                            { key: "balanced", label: "Balanced" },
                            { key: "max_quality", label: "Max" },
                          ].map((item) => (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => setCompressionMode(item.key as CompressionPreset)}
                              className={`py-1 rounded-md text-[10px] font-bold transition-all ${
                                compressionMode === item.key
                                  ? "bg-emerald-600 text-white shadow-xs shadow-emerald-500/25 scale-[1.02]"
                                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                              }`}
                              title={item.key === "compact" ? "Smallest file size (~10MB/min)" : item.key === "balanced" ? "Balanced quality & size" : "Highest quality (larger file)"}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 3. Start Countdown Delay Option */}
                      <div className="p-3.5 rounded-2xl bg-background border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                          <span className="flex items-center gap-1">
                            <Timer className="w-3.5 h-3.5 text-amber-500" /> Start Delay
                          </span>
                          <span className="uppercase text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold">
                            {countdownDelay === 0 ? "OFF" : `${countdownDelay}s`}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 pt-0.5">
                          {[
                            { delay: 0, label: "Off" },
                            { delay: 3, label: "3s" },
                            { delay: 5, label: "5s" },
                          ].map((item) => (
                            <button
                              key={item.delay}
                              type="button"
                              onClick={() => setCountdownDelay(item.delay as 0 | 3 | 5)}
                              className={`py-1 rounded-md text-[10px] font-bold transition-all ${
                                countdownDelay === item.delay
                                  ? "bg-amber-600 text-white shadow-xs shadow-amber-500/25 scale-[1.02]"
                                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 4. Microphone Input Toggle */}
                      <div className="p-3.5 rounded-2xl bg-background border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                          <span className="flex items-center gap-1">
                            {isMicEnabled ? (
                              <Mic className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <MicOff className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            Microphone
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold ${
                              isMicEnabled
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                            }`}
                          >
                            {isMicEnabled ? "ON" : "MUTED"}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsMicEnabled(!isMicEnabled)}
                          className={`w-full justify-center font-bold text-[11px] h-8 transition-all ${
                            isMicEnabled
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20"
                              : "border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                          }`}
                        >
                          {isMicEnabled ? "Mic On" : "Enable Mic"}
                        </Button>
                      </div>

                      {/* 5. Webcam Stream Toggle */}
                      <div className="p-3.5 rounded-2xl bg-background border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                          <span className="flex items-center gap-1">
                            {isWebcamEnabled ? (
                              <Camera className="w-3.5 h-3.5 text-indigo-500" />
                            ) : (
                              <CameraOff className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            Webcam
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold ${
                              isWebcamEnabled
                                ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                            }`}
                          >
                            {isWebcamEnabled ? "ON" : "OFF"}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleToggleWebcam}
                          className={`w-full justify-center font-bold text-[11px] h-8 transition-all ${
                            isWebcamEnabled
                              ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 hover:bg-indigo-500/20"
                              : "border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                          }`}
                        >
                          {isWebcamEnabled ? "Camera On" : "Enable Face Cam"}
                        </Button>
                      </div>
                    </div>

                    {/* Extended Webcam Controls (If Webcam is enabled) */}
                    {isWebcamEnabled && (
                      <div className="p-5 rounded-2xl bg-background border border-indigo-500/20 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                          <span className="text-xs font-extrabold flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                            <Sparkles className="w-4 h-4" /> Camera Overlay Customization
                          </span>
                          {cameraDevices.length > 1 && (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-semibold text-muted-foreground">Device:</span>
                              <select
                                value={selectedCameraId}
                                onChange={(e) => handleSelectCameraDevice(e.target.value)}
                                className="text-xs font-semibold px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              >
                                {cameraDevices.map((dev, idx) => (
                                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                                    {dev.label || `Camera ${idx + 1}`}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          {/* Corner Picker (2x2 Grid) */}
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                              Webcam Placement Corner
                            </label>
                            <div className="grid grid-cols-2 gap-2 p-2 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 w-full max-w-[200px]">
                              {[
                                { key: "top-left", label: "TL" },
                                { key: "top-right", label: "TR" },
                                { key: "bottom-left", label: "BL" },
                                { key: "bottom-right", label: "BR" },
                              ].map((pos) => (
                                <button
                                  key={pos.key}
                                  type="button"
                                  onClick={() => setWebcamCorner(pos.key as WebcamCorner)}
                                  className={`h-9 rounded-lg text-xs font-extrabold flex items-center justify-center transition-all ${
                                    webcamCorner === pos.key
                                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 scale-[1.03]"
                                      : "bg-background text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                                  }`}
                                >
                                  {pos.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Shape Picker */}
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                              Webcam Frame Shape
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { key: "circle", label: "Circle", icon: Circle },
                                { key: "squircle", label: "Squircle", icon: LayoutGrid },
                                { key: "square", label: "Square", icon: Square },
                              ].map((shape) => {
                                const ShapeIcon = shape.icon;
                                return (
                                  <button
                                    key={shape.key}
                                    type="button"
                                    onClick={() => setWebcamShape(shape.key as WebcamShape)}
                                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                                      webcamShape === shape.key
                                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold"
                                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    }`}
                                  >
                                    <ShapeIcon className="w-4 h-4" />
                                    <span>{shape.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Size Picker */}
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                              Webcam Frame Size
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { key: "small", label: "Small (16%)" },
                                { key: "medium", label: "Medium (22%)" },
                                { key: "large", label: "Large (30%)" },
                              ].map((sz) => (
                                <button
                                  key={sz.key}
                                  type="button"
                                  onClick={() => setWebcamSize(sz.key as WebcamSize)}
                                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition-all ${
                                    webcamSize === sz.key
                                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold"
                                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  }`}
                                >
                                  <span>{sz.key.toUpperCase()}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Big Action Call To Action */}
                    <div className="pt-2 text-center">
                      <Button
                        onClick={startRecording}
                        size="lg"
                        className="bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold px-10 py-6 rounded-2xl shadow-xl shadow-red-500/25 flex items-center gap-3 mx-auto text-base transition-all hover:scale-[1.02]"
                      >
                        <Disc className="w-5 h-5 animate-pulse" />
                        <span>Start Studio Recording</span>
                      </Button>
                    </div>
                  </div>

                  {/* Destination Folder Banner */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-300 font-medium">
                    <Folder className="w-4 h-4 text-amber-600 shrink-0 fill-amber-500/20" />
                    <span>
                      Target Folder: <strong className="font-bold">{folderPathName || "Root"}</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* VIEW MODE: COUNTDOWN / RECORDING / PAUSED (LIVE PREVIEW & FLOATING STUDIO CONTROLS) */}
              {(recordState === "countdown" || recordState === "recording" || recordState === "paused") && (
                <div className="space-y-4">
                  <div className="relative aspect-video bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-2xl group">
                    <video
                      ref={(el) => {
                        videoPreviewRef.current = el;
                        if (el && compositeStreamRef.current && el.srcObject !== compositeStreamRef.current) {
                          el.srcObject = compositeStreamRef.current;
                        }
                      }}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-contain"
                    />

                    {/* COUNTDOWN OVERLAY */}
                    {recordState === "countdown" && (
                      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center z-40 space-y-4 animate-in fade-in duration-200">
                        <div className="relative flex items-center justify-center">
                          <div className="w-32 h-32 rounded-full border-4 border-amber-500/30 border-t-amber-500 animate-spin" />
                          <span className="absolute font-black text-6xl text-white tracking-tighter animate-pulse">
                            {countdownTime}
                          </span>
                        </div>
                        <div className="text-center space-y-1.5 px-4">
                          <h4 className="font-extrabold text-white text-xl">
                            Recording Starts In {countdownTime} Seconds...
                          </h4>
                          <p className="text-xs text-amber-200/90 max-w-sm mx-auto font-medium">
                            Switch to the screen, window, or tab you wish to record now!
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelCountdown}
                          className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs px-5 py-2 rounded-xl"
                        >
                          Cancel Countdown
                        </Button>
                      </div>
                    )}

                    {/* Top Left Floating Status Badge & Recording Timer */}
                    <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-md px-4 py-2 rounded-full text-white text-xs font-extrabold flex items-center gap-2.5 border border-white/15 shadow-xl z-20">
                      <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                      <span className="font-mono text-sm tracking-wider">{formatDuration(recordingTime)}</span>
                      <span className="text-[10px] uppercase font-bold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full border border-red-500/30">
                        {resolution}
                      </span>
                    </div>

                    {/* Top Right Studio Controls Expand Button */}
                    <div className="absolute top-4 right-4 z-20">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setShowStudioSettings(!showStudioSettings)}
                        className="bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/15 rounded-full text-xs font-bold gap-1.5 h-8 px-3 shadow-lg"
                      >
                        <Settings2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Studio Controls</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform ${showStudioSettings ? "rotate-180" : ""}`}
                        />
                      </Button>
                    </div>

                    {/* Mid-Recording Live Settings Floating Overlay Box */}
                    {showStudioSettings && (
                      <div className="absolute top-14 right-4 z-30 w-72 p-4 bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl text-white shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between text-xs font-bold border-b border-white/10 pb-2">
                          <span className="flex items-center gap-1.5 text-indigo-400">
                            <SlidersHorizontal className="w-3.5 h-3.5" /> Live Webcam Adjuster
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowStudioSettings(false)}
                            className="text-slate-400 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Camera Device Switcher */}
                        {cameraDevices.length > 1 && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Camera Device
                            </label>
                            <select
                              value={selectedCameraId}
                              onChange={(e) => handleSelectCameraDevice(e.target.value)}
                              className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            >
                              {cameraDevices.map((dev, idx) => (
                                <option key={dev.deviceId || idx} value={dev.deviceId} className="bg-slate-900 text-white">
                                  {dev.label || `Camera ${idx + 1}`}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Live Corner Switcher */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Webcam Position Corner
                          </label>
                          <div className="grid grid-cols-4 gap-1">
                            {[
                              { key: "top-left", label: "TL" },
                              { key: "top-right", label: "TR" },
                              { key: "bottom-left", label: "BL" },
                              { key: "bottom-right", label: "BR" },
                            ].map((pos) => (
                              <button
                                key={pos.key}
                                type="button"
                                onClick={() => setWebcamCorner(pos.key as WebcamCorner)}
                                className={`py-1 rounded-md text-[11px] font-bold transition-all ${
                                  webcamCorner === pos.key
                                    ? "bg-indigo-600 text-white font-extrabold"
                                    : "bg-white/10 hover:bg-white/20 text-slate-300"
                                }`}
                              >
                                {pos.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Live Shape Switcher */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Webcam Frame Shape
                          </label>
                          <div className="grid grid-cols-3 gap-1">
                            {[
                              { key: "circle", label: "Circle" },
                              { key: "squircle", label: "Squircle" },
                              { key: "square", label: "Square" },
                            ].map((sh) => (
                              <button
                                key={sh.key}
                                type="button"
                                onClick={() => setWebcamShape(sh.key as WebcamShape)}
                                className={`py-1 rounded-md text-[11px] font-bold transition-all ${
                                  webcamShape === sh.key
                                    ? "bg-indigo-600 text-white font-extrabold"
                                    : "bg-white/10 hover:bg-white/20 text-slate-300"
                                }`}
                              >
                                {sh.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Live Size Switcher */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Webcam Size
                          </label>
                          <div className="grid grid-cols-3 gap-1">
                            {[
                              { key: "small", label: "S" },
                              { key: "medium", label: "M" },
                              { key: "large", label: "L" },
                            ].map((sz) => (
                              <button
                                key={sz.key}
                                type="button"
                                onClick={() => setWebcamSize(sz.key as WebcamSize)}
                                className={`py-1 rounded-md text-[11px] font-bold transition-all ${
                                  webcamSize === sz.key
                                    ? "bg-indigo-600 text-white font-extrabold"
                                    : "bg-white/10 hover:bg-white/20 text-slate-300"
                                }`}
                              >
                                {sz.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Floating Recording Control Bar at Bottom */}
                    <div className="absolute bottom-4 left-4 right-4 bg-black/85 backdrop-blur-xl p-3 rounded-2xl border border-white/15 flex items-center justify-between text-white shadow-2xl z-20">
                      <div className="flex items-center gap-3">
                        {/* Live Status Indicator */}
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <Disc className="w-4 h-4 text-red-500 animate-spin" />
                          <span className="hidden sm:inline">
                            {recordState === "recording" ? "Recording in progress..." : "Recording paused"}
                          </span>
                        </div>

                        {/* Quick Webcam & Mic Toggles */}
                        <div className="flex items-center gap-1.5 pl-2 border-l border-white/20">
                          <button
                            type="button"
                            onClick={handleToggleWebcam}
                            className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                              isWebcamEnabled ? "bg-indigo-500/20 text-indigo-400" : "bg-white/10 text-slate-400"
                            }`}
                            title="Toggle face camera mid-recording"
                          >
                            {isWebcamEnabled ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={handleToggleMic}
                            className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                              isMicEnabled ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-slate-400"
                            }`}
                            title="Toggle microphone"
                          >
                            {isMicEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Action Buttons: Pause/Resume & Stop */}
                      <div className="flex items-center gap-2">
                        {recordState === "recording" ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={pauseRecording}
                            className="h-8 px-3 text-xs font-semibold gap-1.5 bg-white/15 hover:bg-white/25 text-white border-0"
                          >
                            <Pause className="w-3.5 h-3.5" /> Pause
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={resumeRecording}
                            className="h-8 px-3 text-xs font-semibold gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 border-0"
                          >
                            <Play className="w-3.5 h-3.5" /> Resume
                          </Button>
                        )}

                        <Button
                          size="sm"
                          onClick={stopRecording}
                          className="h-8 px-3 text-xs font-extrabold gap-1.5 bg-red-600 text-white hover:bg-red-700 border-0 shadow-md shadow-red-500/20"
                        >
                          <SquareIcon className="w-3.5 h-3.5 fill-current" /> Stop Recording
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW MODE: RECORDED / UPLOADING */}
              {(recordState === "recorded" || recordState === "uploading") && (
                <form onSubmit={handleUpload} className="space-y-4">
                  {/* Recorded Video Preview & Metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md group">
                      {previewUrl && (
                        <video
                          src={previewUrl}
                          controls
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>

                    <div className="space-y-3 flex flex-col justify-center">
                      {/* Auto Generated Thumbnail preview */}
                      {metadata?.thumbnailUrl && (
                        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <img
                            src={metadata.thumbnailUrl}
                            alt="Generated thumbnail"
                            className="w-16 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                          />
                          <div className="text-xs">
                            <span className="font-bold flex items-center gap-1 text-slate-800 dark:text-slate-200">
                              <ImageIcon className="w-3.5 h-3.5 text-emerald-500" /> Auto Thumbnail
                            </span>
                            <span className="text-[11px] text-muted-foreground">Generated from recorded stream</span>
                          </div>
                        </div>
                      )}

                      {/* Metadata Pill Summary */}
                      {metadata && (
                        <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                          {metadata.durationSeconds > 0 && (
                            <span className="flex items-center gap-1 bg-indigo-500/10 px-2.5 py-1 rounded-lg">
                              <Clock className="w-3.5 h-3.5" /> {formatDuration(metadata.durationSeconds)}
                            </span>
                          )}
                          {metadata.sourceWidth > 0 && (
                            <span className="flex items-center gap-1 bg-indigo-500/10 px-2.5 py-1 rounded-lg">
                              <Maximize2 className="w-3.5 h-3.5" /> {metadata.sourceWidth}x{metadata.sourceHeight}
                            </span>
                          )}
                          {recordedFile && (
                            <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 font-bold px-2.5 py-1 rounded-lg border border-emerald-500/20">
                              {(recordedFile.size / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleDownload}
                          disabled={uploading}
                          className="flex-1 font-semibold gap-1.5 text-xs h-9 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Download recorded file locally"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Download
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleReRecord}
                          disabled={uploading}
                          className="flex-1 font-semibold gap-1.5 text-xs h-9 border-dashed"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Re-record
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Require HLS Switch */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="space-y-0.5">
                      <label
                        htmlFor="require-hls-drawer-toggle"
                        className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                      >
                        Require HLS Transcoding
                      </label>
                      <p className="text-[11px] text-muted-foreground">
                        {requireHls
                          ? "Transcode studio recording into adaptive HLS stream (480p-4K)"
                          : "Store original WebM/MP4 recording & play directly"}
                      </p>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium pt-0.5">
                        Note: HLS takes more storage space (original file + converted renditions)
                      </p>
                    </div>
                    <button
                      id="require-hls-drawer-toggle"
                      type="button"
                      role="switch"
                      aria-checked={requireHls}
                      disabled={uploading}
                      onClick={() => setRequireHls(!requireHls)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                        requireHls ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          requireHls ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Destination Folder Banner */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-300 font-medium">
                    <Folder className="w-4 h-4 text-amber-600 shrink-0 fill-amber-500/20" />
                    <span>
                      Destination Folder: <strong className="font-bold">{folderPathName || "Root"}</strong>
                    </span>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-1.5">
                    <Label htmlFor="screen-video-title">Video Title</Label>
                    <Input
                      id="screen-video-title"
                      type="text"
                      required
                      disabled={uploading}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Dashboard Demo Recording"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="screen-video-description">Description (Optional)</Label>
                    <textarea
                      id="screen-video-description"
                      rows={2}
                      disabled={uploading}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add details about this studio recording..."
                      className="flex w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none"
                    />
                  </div>

                  {/* Upload Progress Bar */}
                  {uploading && (
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between text-xs font-medium text-muted-foreground">
                        <span>{statusText}</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <DrawerFooter className="px-0">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleAttemptClose}
                      disabled={uploading}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={uploading || !recordedFile || checkingQuota || isQuotaExceeded}
                      className="w-full sm:w-auto min-w-[160px] font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50"
                    >
                      <UploadCloud className="w-4 h-4 mr-2" />
                      {uploading
                        ? "Processing..."
                        : checkingQuota
                        ? "Checking Quota..."
                        : isQuotaExceeded
                        ? "Quota Exceeded"
                        : requireHls
                        ? "Upload & Transcode"
                        : "Upload Recording"}
                    </Button>
                  </DrawerFooter>
                </form>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Confirmation Modal when Closing with Unsaved Recording */}
      <Dialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle>Discard Unsaved Studio Recording?</DialogTitle>
                <DialogDescription className="mt-1">
                  You have an unsaved studio screen recording. If you close now, your recorded video will be permanently lost.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirmClose(false)}
              className="w-full sm:w-auto font-semibold"
            >
              Keep Recording
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDiscard}
              className="w-full sm:w-auto font-bold bg-red-600 hover:bg-red-700"
            >
              Discard & Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
