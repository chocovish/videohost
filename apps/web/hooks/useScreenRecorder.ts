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
  RecordingLayoutMode,
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
  const [originalRecordedFile, setOriginalRecordedFile] = useState<File | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [originalMetadata, setOriginalMetadata] = useState<VideoMetadata | null>(null);
  const [isTrimmed, setIsTrimmed] = useState<boolean>(false);

  // Webcam & Recording Studio Controls
  const [isWebcamEnabled, setIsWebcamEnabled] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [webcamCorner, setWebcamCorner] = useState<WebcamCorner>("bottom-left");
  const [webcamShape, setWebcamShape] = useState<WebcamShape>("circle");
  const [webcamSize, setWebcamSize] = useState<WebcamSize>("medium");
  const [layoutMode, setLayoutMode] = useState<RecordingLayoutMode>("screen-cam");
  const [fps, setFps] = useState<TargetFps>(30);
  const [resolution, setResolution] = useState<ResolutionPreset>("1080p");
  const [compressionMode, setCompressionMode] = useState<CompressionPreset>("compact");
  const [countdownDelay, setCountdownDelay] = useState<0 | 3 | 5>(5);
  const [countdownTime, setCountdownTime] = useState<number>(5);
  // True when a live WYSIWYG preview session is armed (streams acquired &
  // compositor rendering) but the recorder has not started yet.
  const [isPreviewArmed, setIsPreviewArmed] = useState(false);
  // Whether a screen display source is currently attached to the session
  const [hasScreenSource, setHasScreenSource] = useState(false);

  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");

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
  const armedPreviewRef = useRef(false);
  // Mirrors recordState for use inside stable media-event callbacks
  const recordStateRef = useRef<RecordState>("idle");

  // Enumerate Camera Input Devices
  const updateCameraDevices = useCallback(async () => {
    try {
      if (typeof window === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      // Ignore entries without an id (hidden until permission is granted)
      const videoInputs = devices.filter((d) => d.kind === "videoinput" && d.deviceId);
      setCameraDevices(videoInputs);

      if (videoInputs.length > 0 && !selectedCameraId) {
        setSelectedCameraId(videoInputs[0].deviceId);
      }
    } catch (e) {
      console.warn("Failed to enumerate media devices:", e);
    }
  }, [selectedCameraId]);

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
    } else {
      if (layoutMode === "camera-only") {
        setLayoutMode("screen-cam");
        if (compositorRef.current) {
          compositorRef.current.layoutMode = "screen-cam";
        }
      }
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((track) => track.stop());
        webcamStreamRef.current = null;
        if (compositorRef.current) {
          compositorRef.current.setWebcamStream(null);
        }
      }
    }
  };

  // Switch layout mode (Screen + Cam PIP vs Camera Only)
  const handleSetLayoutMode = async (mode: RecordingLayoutMode) => {
    setLayoutMode(mode);
    if (compositorRef.current) {
      compositorRef.current.layoutMode = mode;
    }
    if (mode === "camera-only") {
      if (!isWebcamEnabled || !webcamStreamRef.current) {
        setIsWebcamEnabled(true);
        if (compositorRef.current) {
          compositorRef.current.isWebcamEnabled = true;
        }
        await setupWebcamStream();
      }
    }
  };

  const handleToggleLayoutMode = async () => {
    const nextMode: RecordingLayoutMode = layoutMode === "camera-only" ? "screen-cam" : "camera-only";
    await handleSetLayoutMode(nextMode);
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
      compositorRef.current.layoutMode = layoutMode;
    }
  }, [webcamCorner, webcamShape, webcamSize, isWebcamEnabled, layoutMode]);

  // Keep a ref mirror of recordState for stable media event callbacks
  useEffect(() => {
    recordStateRef.current = recordState;
  }, [recordState]);

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

    armedPreviewRef.current = false;
    setIsPreviewArmed(false);
    setHasScreenSource(false);
  }, []);

  const resetAll = useCallback(() => {
    cleanupStreams();
    setRecordState("idle");
    setRecordingTime(0);
    recordingTimeRef.current = 0;
    setRecordedFile(null);
    setOriginalRecordedFile(null);
    setIsTrimmed(false);
    setIsWebcamEnabled(false);
    setLayoutMode("screen-cam");
    setIsMicEnabled(false);
    setWasMicEnabledOnStart(false);
    setCountdownTime(0);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (originalPreviewUrl && originalPreviewUrl !== previewUrl) {
      URL.revokeObjectURL(originalPreviewUrl);
      setOriginalPreviewUrl(null);
    }
    setTitle("");
    setError("");
    setIsProcessing(false);
    setProcessingStatus("");
    if (metadata?.thumbnailUrl) {
      URL.revokeObjectURL(metadata.thumbnailUrl);
    }
    setMetadata(null);
    setOriginalMetadata(null);
  }, [cleanupStreams, previewUrl, originalPreviewUrl, metadata]);

  // Cancel Countdown during delay phase.
  // When the session was armed for live preview, the streams stay warm so the
  // user lands back on the WYSIWYG preview; otherwise everything is torn down.
  const cancelCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    // The recorder was created before the countdown but never started
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn("Failed to stop media recorder:", e);
      }
    }
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];

    const previewTrack = compositeStreamRef.current?.getVideoTracks()[0];
    if (
      armedPreviewRef.current &&
      previewTrack &&
      previewTrack.readyState === "live"
    ) {
      setRecordState("idle");
      setIsPreviewArmed(true);
    } else {
      cleanupStreams();
      setRecordState("idle");
    }
  };

  // Build resolution constraints based on chosen preset
  const getDisplayVideoConstraints = useCallback(
    (preset: ResolutionPreset, targetFpsVal: number): MediaTrackConstraints => {
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
    },
    []
  );

  // Best-effort: apply resolution / fps changes to the live preview track
  // without tearing down the armed preview session
  useEffect(() => {
    if (!isPreviewArmed) return;
    const track = displayStreamRef.current?.getVideoTracks()[0];
    if (!track || track.readyState !== "live") return;
    track
      .applyConstraints(getDisplayVideoConstraints(resolution, fps))
      .catch(() => {
        /* Browser may reject some constraint combinations — best effort */
      });
  }, [resolution, fps, isPreviewArmed, getDisplayVideoConstraints]);

  // Tear down the armed live preview session
  const stopPreview = useCallback(() => {
    cleanupStreams();
  }, [cleanupStreams]);

  // Shared handler for the browser's "stop sharing" floating bar across all
  // phases (armed preview, countdown, recording). Uses refs so the closure
  // captured by media events always reflects the current phase.
  const handleDisplayTrackEnded = () => {
    setHasScreenSource(false);
    const state = recordStateRef.current;
    if (state === "recording" || state === "paused") {
      stopRecording();
    } else if (state === "countdown") {
      // Countdown aborted because the source disappeared
      cancelCountdown();
    } else {
      stopPreview();
    }
  };

  // Arm a live WYSIWYG preview (screen + camera bubble exactly as it will be
  // recorded) WITHOUT starting the recorder. Streams stay live so hitting
  // "Record" starts instantly without re-prompting for screen selection.
  // Returns true when the preview is ready.
  const preparePreview = useCallback(
    async (overrides?: {
      layoutMode?: RecordingLayoutMode;
      enableWebcam?: boolean;
    }): Promise<boolean> => {
      setError("");
      const effectiveLayout = overrides?.layoutMode ?? layoutMode;
      const effectiveWebcam = overrides?.enableWebcam ?? isWebcamEnabled;

      try {
        // Keep React state aligned with the effective session so the
        // compositor-sync effect never fights the armed preview
        if (effectiveLayout !== layoutMode) {
          setLayoutMode(effectiveLayout);
        }
        if (effectiveWebcam && !isWebcamEnabled) {
          setIsWebcamEnabled(true);
        }

        // 1. Screen display stream (not required for camera-only layout)
        if (!displayStreamRef.current && effectiveLayout !== "camera-only") {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: getDisplayVideoConstraints(resolution, fps),
            audio: true,
          });
          displayStreamRef.current = displayStream;
          setHasScreenSource(true);

          // User stopped the share from the browser floating bar
          displayStream.getVideoTracks()[0].onended = handleDisplayTrackEnded;

          // Attach to a compositor that is already live (re-arm scenario)
          compositorRef.current?.setScreenStream(displayStream);
        }

        // 2. Canvas compositor — renders the exact frames that get recorded
        if (!compositorRef.current) {
          const compositor = new RecordingCompositor({
            webcamCorner,
            webcamShape,
            webcamSize,
            isWebcamEnabled: effectiveWebcam || effectiveLayout === "camera-only",
            layoutMode: effectiveLayout,
          });
          compositorRef.current = compositor;
          compositor.setScreenStream(displayStreamRef.current);
          // Re-attach a webcam stream that was acquired before arming
          if (webcamStreamRef.current) {
            compositor.setWebcamStream(webcamStreamRef.current);
          }
        }

        // 3. Webcam stream when the layout needs it
        if (
          (effectiveWebcam || effectiveLayout === "camera-only") &&
          !webcamStreamRef.current
        ) {
          if (!isWebcamEnabled) {
            setIsWebcamEnabled(true);
          }
          const camStream = await setupWebcamStream();
          if (!camStream && effectiveLayout === "camera-only") {
            stopPreview();
            return false;
          }
        }

        // 4. Start the canvas render loop & attach the video-only composite
        if (
          !compositeStreamRef.current ||
          compositeStreamRef.current.getVideoTracks().length === 0 ||
          compositeStreamRef.current
            .getVideoTracks()
            .every((track) => track.readyState !== "live")
        ) {
          const canvasVideoStream = compositorRef.current.start(fps);
          compositeStreamRef.current = new MediaStream([
            ...canvasVideoStream.getVideoTracks(),
          ]);
        }

        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = compositeStreamRef.current;
        }

        armedPreviewRef.current = true;
        setIsPreviewArmed(true);
        return true;
      } catch (err) {
        console.error("Live preview setup failed:", err);
        if ((err as { name?: string })?.name !== "NotAllowedError") {
          setError(
            (err as { message?: string })?.message ||
              "Failed to start the live preview"
          );
          // Only tear down on real failures — dismissing the browser picker
          // should keep any live session (and its camera) intact
          stopPreview();
        }
        return false;
      }
    },
    [
      layoutMode,
      isWebcamEnabled,
      resolution,
      fps,
      webcamCorner,
      webcamShape,
      webcamSize,
      getDisplayVideoConstraints,
      setupWebcamStream,
      stopPreview,
    ]
  );

  // Start Screen Recording with Canvas Compositer Engine & Optimized Compression.
  // Reuses the streams from an armed live preview session when available
  // (no second permission prompt) — otherwise acquires everything itself.
  const startRecording = async () => {
    setError("");
    setWasMicEnabledOnStart(isMicEnabled);
    try {
      // 1. Get Screen Display Stream (reuse the armed preview stream when live)
      let displayStream = displayStreamRef.current;
      if (!displayStream && layoutMode !== "camera-only") {
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: getDisplayVideoConstraints(resolution, fps),
          audio: true,
        });
        displayStreamRef.current = displayStream;
        setHasScreenSource(true);
      }

      // Handle user stopping screen share via browser floating bar
      if (displayStream) {
        displayStream.getVideoTracks()[0].onended = handleDisplayTrackEnded;
      }

      // 2. Initialize Canvas Compositor (reuse the armed preview compositor)
      let compositor = compositorRef.current;
      if (!compositor) {
        compositor = new RecordingCompositor({
          webcamCorner,
          webcamShape,
          webcamSize,
          isWebcamEnabled: isWebcamEnabled || layoutMode === "camera-only",
          layoutMode,
        });
        compositorRef.current = compositor;
        compositor.setScreenStream(displayStream ?? null);
        // Re-attach a webcam stream that was acquired before recording
        if (webcamStreamRef.current) {
          compositor.setWebcamStream(webcamStreamRef.current);
        }
      }

      // 3. Acquire webcam stream if enabled or if in camera-only layout mode
      if (
        (isWebcamEnabled || layoutMode === "camera-only") &&
        !webcamStreamRef.current
      ) {
        if (!isWebcamEnabled) {
          setIsWebcamEnabled(true);
        }
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

      // Canvas video stream — reuse the armed preview capture, or start fresh
      let canvasVideoStream = compositeStreamRef.current;
      if (
        !canvasVideoStream ||
        canvasVideoStream.getVideoTracks().length === 0 ||
        canvasVideoStream
          .getVideoTracks()
          .every((track) => track.readyState !== "live")
      ) {
        canvasVideoStream = compositor.start(targetFps);
        compositeStreamRef.current = new MediaStream([
          ...canvasVideoStream.getVideoTracks(),
        ]);
      }

      // 4. Handle microphone audio mixing if enabled
      let audioTracks: MediaStreamTrack[] = [];

      if (displayStream && displayStream.getAudioTracks().length > 0) {
        audioTracks.push(...displayStream.getAudioTracks());
      }

      if (isMicEnabled) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = micStream;

          const audioCtx = new AudioContext();
          audioContextRef.current = audioCtx;
          const dest = audioCtx.createMediaStreamDestination();

          if (displayStream && displayStream.getAudioTracks().length > 0) {
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

      // 5. Build final composite stream (canvas video + mixed audio)
      const compositeStream = new MediaStream([
        ...canvasVideoStream.getVideoTracks(),
        ...audioTracks,
      ]);
      compositeStreamRef.current = compositeStream;

      // Recording is live — the armed preview session is over
      armedPreviewRef.current = false;
      setIsPreviewArmed(false);

      // Set live preview stream
      if (
        videoPreviewRef.current &&
        videoPreviewRef.current.srcObject !== compositeStream
      ) {
        videoPreviewRef.current.srcObject = compositeStream;
      }

      // 6. Prepare MediaRecorder
      const mimeType = "video/webm";

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
        setIsProcessing(true);
        setProcessingStatus("Repairing video container & duration...");
        const rawBlob = new Blob(recordedChunksRef.current, { type: mimeType });
        const elapsedMs = Math.max(1000, Date.now() - (recordingStartTimeRef.current || Date.now()));
        const durationSec = Math.max(1, Math.round(elapsedMs / 1000));

        let finalBlob = rawBlob;
        try {
          finalBlob = await fixWebmDuration(rawBlob, mimeType);
        } catch (e) {
          console.warn("Container transmuxing/indexing failed:", e);
        }

        setProcessingStatus("Generating 4 thumbnails & metadata...");
        const now = new Date();
        const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
          now.getDate()
        ).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const fileName = `Studio Recording ${formattedDate}.webm`;
        const outputMime = finalBlob.type || "video/webm";
        const file = new File([finalBlob], fileName, { type: outputMime });

        setRecordedFile(file);
        setOriginalRecordedFile(file);
        setIsTrimmed(false);
        setTitle(`Studio Recording ${formattedDate}`);

        const url = URL.createObjectURL(finalBlob);
        setPreviewUrl(url);
        setOriginalPreviewUrl(url);

        let meta: VideoMetadata | null = null;
        try {
          meta = await extractVideoMetadataAndThumbnail(file, durationSec);
          setMetadata(meta);
          setOriginalMetadata(meta);
        } catch (metaErr) {
          console.warn("Metadata extraction warning:", metaErr);
        } finally {
          setIsProcessing(false);
          setProcessingStatus("");
          setRecordState("recorded");
        }

        if (options?.onRecordingComplete && meta) {
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
    setIsProcessing(true);
    setProcessingStatus("Finalizing recording & indexing cues...");
    cleanupStreams();
  };

  // Ensure a screen source is attached to the live compositor. Prompts the
  // user only when no display stream exists yet — e.g. switching from the
  // camera-only layout back to screen+cam mid-session or mid-recording.
  const ensureScreenStream = async (): Promise<boolean> => {
    if (displayStreamRef.current) return true;
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: getDisplayVideoConstraints(resolution, fps),
        audio: true,
      });
      displayStreamRef.current = displayStream;
      setHasScreenSource(true);

      displayStream.getVideoTracks()[0].onended = handleDisplayTrackEnded;
      compositorRef.current?.setScreenStream(displayStream);
      return true;
    } catch (err) {
      console.warn("Screen selection dismissed or failed:", err);
      if ((err as { name?: string })?.name !== "NotAllowedError") {
        setError(
          (err as { message?: string })?.message || "Failed to select a screen"
        );
      }
      return false;
    }
  };

  const handleReRecord = () => {
    resetAll();
  };

  const handleDownload = (customFilename?: string) => {
    if (!recordedFile && !previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl || URL.createObjectURL(recordedFile!);
    const nameToUse = customFilename?.trim() || title.trim() || "Studio Recording";
    a.download = nameToUse.endsWith(".webm") ? nameToUse : `${nameToUse}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const applyTrimmedVideo = (
    newFile: File,
    newMetadata: VideoMetadata,
    newPreviewUrl: string
  ) => {
    if (previewUrl && previewUrl !== originalPreviewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setRecordedFile(newFile);
    setMetadata(newMetadata);
    setPreviewUrl(newPreviewUrl);
    setIsTrimmed(true);
  };

  const revertToOriginalRecording = () => {
    if (!originalRecordedFile || !originalMetadata) return;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (originalPreviewUrl && originalPreviewUrl !== previewUrl) {
      URL.revokeObjectURL(originalPreviewUrl);
    }
    const freshUrl = URL.createObjectURL(originalRecordedFile);
    setRecordedFile(originalRecordedFile);
    setMetadata(originalMetadata);
    setPreviewUrl(freshUrl);
    setOriginalPreviewUrl(freshUrl);
    setIsTrimmed(false);
  };

  // Cleanup component unmount
  useEffect(() => {
    return () => {
      cleanupStreams();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (originalPreviewUrl && originalPreviewUrl !== previewUrl) {
        URL.revokeObjectURL(originalPreviewUrl);
      }
    };
  }, [cleanupStreams, previewUrl, originalPreviewUrl]);

  return {
    recordState,
    setRecordState,
    isProcessing,
    processingStatus,
    isMicEnabled,
    wasMicEnabledOnStart,
    setIsMicEnabled,
    handleToggleMic,
    recordingTime,
    recordedFile,
    previewUrl,
    originalRecordedFile,
    originalPreviewUrl,
    originalMetadata,
    isTrimmed,
    applyTrimmedVideo,
    revertToOriginalRecording,
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
    layoutMode,
    setLayoutMode,
    handleSetLayoutMode,
    handleToggleLayoutMode,
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
