"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  VideoMetadata,
  extractVideoMetadataAndThumbnail,
  fixWebmDuration,
} from "@/lib/video-utils";
import {
  RecordingCompositor,
  WebcamCorner,
  WebcamShape,
  WebcamSize,
  ResolutionPreset,
} from "@/lib/recording-compositor";

export type RecordState = "idle" | "countdown" | "recording" | "paused" | "recorded" | "uploading";
export type CompressionPreset = "compact" | "balanced" | "max_quality";
export type TargetFps = 15 | 24 | 30 | 60;

export interface UseScreenRecorderOptions {
  onRecordingComplete?: (file: File, metadata: VideoMetadata) => void;
}

export function useScreenRecorder(options?: UseScreenRecorderOptions) {
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [wasMicEnabledOnStart, setWasMicEnabledOnStart] = useState(false);
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
  const [fps, setFps] = useState<TargetFps>(30);
  const [resolution, setResolution] = useState<ResolutionPreset>("1080p");
  const [compressionMode, setCompressionMode] = useState<CompressionPreset>("compact");
  const [countdownDelay, setCountdownDelay] = useState<0 | 3 | 5>(5);
  const [countdownTime, setCountdownTime] = useState<number>(5);

  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);

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
      if (typeof window === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
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
    updateCameraDevices();
  }, [updateCameraDevices]);

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
    if ((recordState === "recording" || recordState === "paused") && !wasMicEnabledOnStart) {
      return;
    }

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
    setWasMicEnabledOnStart(false);
    setCountdownTime(0);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setTitle("");
    setError("");
    if (metadata?.thumbnailUrl) {
      URL.revokeObjectURL(metadata.thumbnailUrl);
    }
    setMetadata(null);
  }, [cleanupStreams, previewUrl, metadata]);

  // Cancel Countdown during delay phase
  const cancelCountdown = () => {
    cleanupStreams();
    setRecordState("idle");
  };

  // Build resolution constraints based on chosen preset
  const getDisplayVideoConstraints = (preset: ResolutionPreset, targetFpsVal: number): MediaTrackConstraints => {
    if (preset === "4k") {
      return { width: { ideal: 3840 }, height: { ideal: 2160 }, frameRate: { ideal: targetFpsVal } };
    }
    if (preset === "1080p") {
      return { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: targetFpsVal } };
    }
    if (preset === "720p") {
      return { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: targetFpsVal } };
    }
    return { displaySurface: "browser", frameRate: { ideal: targetFpsVal } };
  };

  // Start Screen Recording with Canvas Compositer Engine & Optimized Compression
  const startRecording = async () => {
    setError("");
    setWasMicEnabledOnStart(isMicEnabled);
    try {
      // 1. Get Screen Display Stream
      const displayConstraints = getDisplayVideoConstraints(resolution, fps);
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

      // Target FPS & Bitrate
      let targetFps = fps;
      let targetBitrate = 1_500_000; // 1.5 Mbps default

      if (compressionMode === "compact") {
        targetBitrate = 1_200_000;
      } else if (compressionMode === "balanced") {
        targetBitrate = 2_200_000;
      } else if (compressionMode === "max_quality") {
        targetBitrate = 5_000_000;
      }

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

      // 5. Build final composite stream
      const compositeStream = new MediaStream([
        ...canvasVideoStream.getVideoTracks(),
        ...audioTracks,
      ]);
      compositeStreamRef.current = compositeStream;

      // Set live preview stream
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = compositeStream;
      }

      // 6. Prepare MediaRecorder
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

        const meta = await extractVideoMetadataAndThumbnail(file, durationSec);
        setMetadata(meta);

        setRecordState("recorded");

        if (options?.onRecordingComplete) {
          options.onRecordingComplete(file, meta);
        }
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

  const handleDownload = (customFilename?: string) => {
    if (!recordedFile && !previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl || URL.createObjectURL(recordedFile!);
    const nameToUse = customFilename?.trim() || title.trim() || "Studio Recording";
    a.download = nameToUse.endsWith(".webm") || nameToUse.endsWith(".mp4") ? nameToUse : `${nameToUse}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Cleanup component unmount
  useEffect(() => {
    return () => {
      cleanupStreams();
    };
  }, [cleanupStreams]);

  return {
    recordState,
    setRecordState,
    isMicEnabled,
    wasMicEnabledOnStart,
    setIsMicEnabled,
    handleToggleMic,
    recordingTime,
    recordedFile,
    previewUrl,
    isWebcamEnabled,
    setIsWebcamEnabled,
    handleToggleWebcam,
    cameraDevices,
    selectedCameraId,
    setSelectedCameraId,
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
  };
}
