"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Video,
  Mic,
  MicOff,
  Square,
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
} from "lucide-react";
import ysFixWebmDuration from "fix-webm-duration";

function fixWebmDuration(blob: Blob, durationMs: number): Promise<Blob> {
  return new Promise((resolve) => {
    try {
      ysFixWebmDuration(blob, durationMs, (fixedBlob: Blob) => {
        resolve(fixedBlob);
      });
    } catch (err) {
      console.warn("Failed to fix WebM duration header:", err);
      resolve(blob);
    }
  });
}
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

interface VideoMetadata {
  durationSeconds: number;
  sourceWidth: number;
  sourceHeight: number;
  thumbnailBlob: Blob | null;
  thumbnailUrl: string | null;
}

function extractVideoMetadataAndThumbnail(file: File, fallbackDuration: number = 0): Promise<VideoMetadata> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    let resolved = false;

    const cleanupAndResolve = (result: VideoMetadata) => {
      if (!resolved) {
        resolved = true;
        URL.revokeObjectURL(url);
        resolve(result);
      }
    };

    const getValidDuration = (): number => {
      if (typeof video.duration === "number" && isFinite(video.duration) && !isNaN(video.duration) && video.duration > 0) {
        return Math.round(video.duration);
      }
      if (typeof video.currentTime === "number" && isFinite(video.currentTime) && video.currentTime > 0 && video.currentTime < 1e5) {
        return Math.round(video.currentTime);
      }
      if (typeof fallbackDuration === "number" && isFinite(fallbackDuration) && !isNaN(fallbackDuration) && fallbackDuration > 0) {
        return Math.round(fallbackDuration);
      }
      return 0;
    };

    const timeoutId = setTimeout(() => {
      cleanupAndResolve({
        durationSeconds: getValidDuration(),
        sourceWidth: video.videoWidth || 0,
        sourceHeight: video.videoHeight || 0,
        thumbnailBlob: null,
        thumbnailUrl: null,
      });
    }, 4000);

    const captureFrame = () => {
      clearTimeout(timeoutId);
      try {
        const canvas = document.createElement("canvas");
        const maxDim = 720;
        const originalWidth = video.videoWidth || 640;
        const originalHeight = video.videoHeight || 360;
        const scale = Math.min(1, maxDim / Math.max(originalWidth, originalHeight));

        canvas.width = Math.round(originalWidth * scale);
        canvas.height = Math.round(originalHeight * scale);

        const ctx = canvas.getContext("2d");
        if (ctx && canvas.width > 0 && canvas.height > 0) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              const thumbUrl = blob ? URL.createObjectURL(blob) : null;
              cleanupAndResolve({
                durationSeconds: getValidDuration(),
                sourceWidth: originalWidth,
                sourceHeight: originalHeight,
                thumbnailBlob: blob,
                thumbnailUrl: thumbUrl,
              });
            },
            "image/jpeg",
            0.7
          );
          return;
        }
      } catch (e) {
        console.warn("Failed canvas thumbnail rendering:", e);
      }

      cleanupAndResolve({
        durationSeconds: getValidDuration(),
        sourceWidth: video.videoWidth || 0,
        sourceHeight: video.videoHeight || 0,
        thumbnailBlob: null,
        thumbnailUrl: null,
      });
    };

    video.onloadedmetadata = () => {
      if (video.duration === Infinity) {
        video.currentTime = 1e101;
        video.ontimeupdate = () => {
          video.ontimeupdate = null;
          if (video.duration === Infinity) {
            video.currentTime = 0;
          }
          captureFrame();
        };
      } else {
        const dur = video.duration || 0;
        const seekTime = isFinite(dur) && dur > 0 ? Math.min(1.0, dur / 2) : 0;
        if (seekTime > 0) {
          video.currentTime = seekTime;
        } else {
          captureFrame();
        }
      }
    };

    video.onseeked = () => {
      captureFrame();
    };

    video.onerror = () => {
      clearTimeout(timeoutId);
      cleanupAndResolve({
        durationSeconds: getValidDuration(),
        sourceWidth: 0,
        sourceHeight: 0,
        thumbnailBlob: null,
        thumbnailUrl: null,
      });
    };

    video.src = url;
  });
}

function formatDuration(sec?: number): string {
  if (sec === undefined || sec === null || !isFinite(sec) || isNaN(sec) || sec < 0) {
    return "0:00";
  }
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

type RecordState = "idle" | "recording" | "paused" | "recorded" | "uploading";

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

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requireHls, setRequireHls] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);

  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeRef = useRef(0);
  const recordingStartTimeRef = useRef(0);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  const cleanupStreams = useCallback(() => {
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
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const resetAll = useCallback(() => {
    cleanupStreams();
    setRecordState("idle");
    setRecordingTime(0);
    recordingTimeRef.current = 0;
    setRecordedFile(null);
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
    if (metadata?.thumbnailUrl) {
      URL.revokeObjectURL(metadata.thumbnailUrl);
    }
    setMetadata(null);
    setShowConfirmClose(false);
  }, [cleanupStreams, previewUrl, metadata]);

  // Handle drawer close attempt
  const handleAttemptClose = () => {
    if (uploading) return;
    if (recordState === "recording" || recordState === "paused" || (recordState === "recorded" && recordedFile)) {
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

  // Start Screen Recording
  const startRecording = async () => {
    setError("");
    try {
      // Get Screen Display Stream
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "browser",
        },
        audio: true,
      });

      let combinedStream = displayStream;

      // Handle microphone audio mixing if enabled
      if (isMicEnabled) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const audioCtx = new AudioContext();
          const dest = audioCtx.createMediaStreamDestination();

          if (displayStream.getAudioTracks().length > 0) {
            const displayAudioSource = audioCtx.createMediaStreamSource(
              new MediaStream([displayStream.getAudioTracks()[0]])
            );
            displayAudioSource.connect(dest);
          }

          const micAudioSource = audioCtx.createMediaStreamSource(micStream);
          micAudioSource.connect(dest);

          combinedStream = new MediaStream([
            ...displayStream.getVideoTracks(),
            ...dest.stream.getAudioTracks(),
          ]);
        } catch (micErr) {
          console.warn("Microphone access failed or denied, recording display audio only:", micErr);
        }
      }

      mediaStreamRef.current = combinedStream;

      // Handle user stopping screen share via browser's built-in floating bar
      displayStream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

      // Set live preview stream
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = combinedStream;
      }

      // Prepare MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";

      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(combinedStream, { mimeType });
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
        const fileName = `Screen Recording ${formattedDate}.webm`;
        const file = new File([finalBlob], fileName, { type: mimeType });

        setRecordedFile(file);
        setTitle(`Screen Recording ${formattedDate}`);

        const url = URL.createObjectURL(finalBlob);
        setPreviewUrl(url);

        // Extract metadata & thumbnail using recorded duration fallback
        const meta = await extractVideoMetadataAndThumbnail(file, durationSec);
        setMetadata(meta);

        setRecordState("recorded");
      };

      recorder.start(1000);
      recordingStartTimeRef.current = Date.now();
      setRecordState("recording");
      setRecordingTime(0);
      recordingTimeRef.current = 0;

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const next = prev + 1;
          recordingTimeRef.current = next;
          return next;
        });
      }, 1000);
    } catch (err: any) {
      console.error("Screen recording setup failed:", err);
      if (err.name !== "NotAllowedError") {
        setError(err?.message || "Failed to start screen recording");
      }
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
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const handleReRecord = () => {
    cleanupStreams();
    setRecordState("idle");
    setRecordingTime(0);
    recordingTimeRef.current = 0;
    setRecordedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (metadata?.thumbnailUrl) {
      URL.revokeObjectURL(metadata.thumbnailUrl);
    }
    setMetadata(null);
  };

  const handleDownload = () => {
    if (!recordedFile && !previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl || URL.createObjectURL(recordedFile!);
    a.download = recordedFile?.name || `${title.trim() || "Screen Recording"}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Upload Process
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordedFile || !title.trim()) return;

    setError("");
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
    if ((recordState === "recording" || recordState === "paused") && videoPreviewRef.current && mediaStreamRef.current) {
      if (videoPreviewRef.current.srcObject !== mediaStreamRef.current) {
        videoPreviewRef.current.srcObject = mediaStreamRef.current;
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
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <DrawerTitle className="flex items-center gap-2">
                    Screen Record & Upload
                    {recordState === "recording" && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-600 border border-red-500/20 animate-pulse">
                        <Disc className="w-3.5 h-3.5 text-red-600 animate-spin" /> Recording
                      </span>
                    )}
                    {recordState === "paused" && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        <Pause className="w-3.5 h-3.5" /> Paused
                      </span>
                    )}
                  </DrawerTitle>
                  <DrawerDescription>
                    Record your browser tab, app window, or full screen and upload directly to your library
                  </DrawerDescription>
                </div>
              </div>
            </DrawerHeader>

          {error && (
            <div className="mx-4 mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-4 space-y-4">
            {/* View Mode: IDLE */}
            {recordState === "idle" && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-[hsl(var(--border))] rounded-2xl p-8 text-center bg-[hsl(var(--muted))]/20 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center mx-auto shadow-xs">
                    <Video className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[hsl(var(--foreground))]">Ready to Record</h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 max-w-md mx-auto">
                      Click below to select a screen, browser tab, or window to record. You can optionally enable microphone input.
                    </p>
                  </div>

                  {/* Microphone Toggle */}
                  <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-background border border-[hsl(var(--border))] shadow-xs">
                    <button
                      type="button"
                      onClick={() => setIsMicEnabled(!isMicEnabled)}
                      className={`p-2 rounded-lg transition-colors ${
                        isMicEnabled ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                      }`}
                    >
                      {isMicEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </button>
                    <div className="text-left text-xs">
                      <span className="font-bold block text-[hsl(var(--foreground))]">Microphone Audio</span>
                      <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                        {isMicEnabled ? "Include microphone commentary" : "Muted"}
                      </span>
                    </div>
                  </div>

                  {/* Start Recording Button */}
                  <div className="pt-2">
                    <Button
                      onClick={startRecording}
                      size="lg"
                      className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-6 rounded-2xl shadow-lg shadow-red-500/25 flex items-center gap-2.5 mx-auto text-base"
                    >
                      <Disc className="w-5 h-5 animate-pulse" />
                      <span>Start Recording</span>
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

            {/* View Mode: RECORDING / PAUSED */}
            {(recordState === "recording" || recordState === "paused") && (
              <div className="space-y-4">
                <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-lg">
                  <video
                    ref={(el) => {
                      videoPreviewRef.current = el;
                      if (el && mediaStreamRef.current && el.srcObject !== mediaStreamRef.current) {
                        el.srcObject = mediaStreamRef.current;
                      }
                    }}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-contain"
                  />

                  {/* Floating Overlay Badge & Timer */}
                  <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-full text-white text-xs font-bold flex items-center gap-2 border border-white/10 shadow-md">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                    <span>{formatDuration(recordingTime)}</span>
                  </div>

                  {/* Recording Status Bar at bottom of video */}
                  <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md p-3 rounded-xl border border-white/10 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <Disc className="w-4 h-4 text-red-500 animate-spin" />
                      <span>{recordState === "recording" ? "Recording in progress..." : "Recording paused"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {recordState === "recording" ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={pauseRecording}
                          className="h-8 px-3 text-xs font-semibold gap-1.5"
                        >
                          <Pause className="w-3.5 h-3.5" /> Pause
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={resumeRecording}
                          className="h-8 px-3 text-xs font-semibold gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <Play className="w-3.5 h-3.5" /> Resume
                        </Button>
                      )}

                      <Button
                        size="sm"
                        onClick={stopRecording}
                        className="h-8 px-3 text-xs font-bold gap-1.5 bg-red-600 text-white hover:bg-red-700"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" /> Stop Recording
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* View Mode: RECORDED / UPLOADING */}
            {(recordState === "recorded" || recordState === "uploading") && (
              <form onSubmit={handleUpload} className="space-y-4">
                {/* Recorded Video Preview & Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-[hsl(var(--border))] shadow-xs group">
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
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[hsl(var(--muted))]/40 border border-[hsl(var(--border))]">
                        <img
                          src={metadata.thumbnailUrl}
                          alt="Generated thumbnail"
                          className="w-16 h-10 object-cover rounded-lg border border-slate-200"
                        />
                        <div className="text-xs">
                          <span className="font-bold flex items-center gap-1 text-[hsl(var(--foreground))]">
                            <ImageIcon className="w-3.5 h-3.5 text-emerald-500" /> Auto Thumbnail
                          </span>
                          <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Generated from frame preview</span>
                        </div>
                      </div>
                    )}

                    {/* Metadata Pill Summary */}
                    {metadata && (
                      <div className="flex items-center gap-2 text-xs font-medium text-[hsl(var(--primary))]">
                        {metadata.durationSeconds > 0 && (
                          <span className="flex items-center gap-1 bg-[hsl(var(--primary))]/10 px-2.5 py-1 rounded-lg">
                            <Clock className="w-3.5 h-3.5" /> {formatDuration(metadata.durationSeconds)}
                          </span>
                        )}
                        {metadata.sourceWidth > 0 && (
                          <span className="flex items-center gap-1 bg-[hsl(var(--primary))]/10 px-2.5 py-1 rounded-lg">
                            <Maximize2 className="w-3.5 h-3.5" /> {metadata.sourceWidth}x{metadata.sourceHeight}
                          </span>
                        )}
                        {recordedFile && (
                          <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-[hsl(var(--muted-foreground))] px-2.5 py-1 rounded-lg">
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
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[hsl(var(--border))]">
                  <div className="space-y-0.5">
                    <label
                      htmlFor="require-hls-drawer-toggle"
                      className="text-xs font-bold text-[hsl(var(--foreground))] cursor-pointer"
                    >
                      Require HLS
                    </label>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                      {requireHls
                        ? "Transcode screen recording into adaptive HLS stream (480p-4K)"
                        : "Store original WebM/MP4 recording & play directly"}
                    </p>
                  </div>
                  <button
                    id="require-hls-drawer-toggle"
                    type="button"
                    role="switch"
                    aria-checked={requireHls}
                    disabled={uploading}
                    onClick={() => setRequireHls(!requireHls)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:ring-offset-2 ${
                      requireHls ? "bg-[hsl(var(--primary))]" : "bg-slate-300"
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
                    placeholder="Add details about this screen recording..."
                    className="flex w-full rounded-xl border border-[hsl(var(--input))] bg-background px-3.5 py-2 text-sm ring-offset-background placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none"
                  />
                </div>

                {/* Upload Progress Bar */}
                {uploading && (
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-xs font-medium text-[hsl(var(--muted-foreground))]">
                      <span>{statusText}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-[hsl(var(--primary))] transition-all duration-300 rounded-full"
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
                    disabled={uploading || !recordedFile}
                    className="w-full sm:w-auto min-w-[160px] font-bold"
                  >
                    <UploadCloud className="w-4 h-4 mr-2" />
                    {uploading ? "Processing..." : requireHls ? "Upload & Transcode" : "Upload Recording"}
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
                <DialogTitle>Discard Unsaved Recording?</DialogTitle>
                <DialogDescription className="mt-1">
                  You have an unsaved screen recording. If you close now, your recorded video will be permanently lost.
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
