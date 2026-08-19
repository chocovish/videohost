"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Scissors,
  Play,
  Pause,
  RotateCcw,
  Check,
  X,
  Loader2,
  Sparkles,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Maximize2,
  Film,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  trimVideo,
  extractFilmstripThumbnails,
  FilmstripFrame,
  formatTimecode,
} from "@/lib/video-trimmer";
import { VideoMetadata, formatDuration, formatBytes } from "@/lib/video-utils";

export interface VideoTrimmerProps {
  videoFile: File;
  previewUrl: string;
  metadata: VideoMetadata | null;
  videoElementRef?: React.RefObject<HTMLVideoElement | null>;
  onTrimSuccess: (newFile: File, newPreviewUrl: string, newMetadata: VideoMetadata) => void;
  onCancel: () => void;
  className?: string;
}

export function VideoTrimmer({
  videoFile,
  previewUrl,
  metadata,
  videoElementRef,
  onTrimSuccess,
  onCancel,
  className = "",
}: VideoTrimmerProps) {
  const totalDuration = Math.max(0.5, metadata?.durationSeconds || 1);

  // Trim range state (in seconds)
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(totalDuration);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Filmstrip state
  const [filmstripFrames, setFilmstripFrames] = useState<FilmstripFrame[]>([]);
  const [isLoadingFilmstrip, setIsLoadingFilmstrip] = useState<boolean>(true);

  // Trimming execution state
  const [isTrimming, setIsTrimming] = useState<boolean>(false);
  const [trimProgress, setTrimProgress] = useState<number>(0);
  const [trimStatusText, setTrimStatusText] = useState<string>("");
  const [trimError, setTrimError] = useState<string>("");

  // Dragging state
  const [activeDrag, setActiveDrag] = useState<"start" | "end" | "playhead" | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  // Min clip duration threshold (0.2s)
  const minDuration = Math.min(0.2, totalDuration * 0.05);

  // Initialize and load filmstrip frames
  useEffect(() => {
    let isMounted = true;
    setIsLoadingFilmstrip(true);

    extractFilmstripThumbnails(videoFile, 10)
      .then((frames) => {
        if (isMounted) {
          setFilmstripFrames(frames);
          setIsLoadingFilmstrip(false);
        }
      })
      .catch((e) => {
        console.warn("Filmstrip extraction error:", e);
        if (isMounted) setIsLoadingFilmstrip(false);
      });

    return () => {
      isMounted = false;
    };
  }, [videoFile]);

  // Sync with video element if provided
  const videoEl = videoElementRef?.current;

  // Auto-pause video when trimmer opens
  useEffect(() => {
    if (videoEl && !videoEl.paused) {
      videoEl.pause();
      setIsPlaying(false);
    }
  }, [videoEl]);

  // Video time update listener
  useEffect(() => {
    if (!videoEl) return;

    const handleTimeUpdate = () => {
      setCurrentTime(videoEl.currentTime);
      // Clean pause when reaching endTime (prevents infinite unwanted looping)
      if (videoEl.currentTime >= endTime) {
        videoEl.pause();
        videoEl.currentTime = startTime;
        setCurrentTime(startTime);
        setIsPlaying(false);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    videoEl.addEventListener("timeupdate", handleTimeUpdate);
    videoEl.addEventListener("play", handlePlay);
    videoEl.addEventListener("pause", handlePause);

    return () => {
      videoEl.removeEventListener("timeupdate", handleTimeUpdate);
      videoEl.removeEventListener("play", handlePlay);
      videoEl.removeEventListener("pause", handlePause);
    };
  }, [videoEl, startTime, endTime]);

  // Handle Seek video element (pauses video so frame can be inspected cleanly)
  const seekVideo = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(totalDuration, time));
      setCurrentTime(clamped);
      if (videoEl) {
        if (!videoEl.paused) {
          videoEl.pause();
          setIsPlaying(false);
        }
        videoEl.currentTime = clamped;
      }
    },
    [videoEl, totalDuration]
  );

  // Play / Pause bounded preview
  const togglePlayPreview = useCallback(() => {
    if (!videoEl) return;
    if (videoEl.paused) {
      if (videoEl.currentTime < startTime || videoEl.currentTime >= endTime - 0.05) {
        videoEl.currentTime = startTime;
      }
      videoEl.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoEl.pause();
      setIsPlaying(false);
    }
  }, [videoEl, startTime, endTime]);

  // Spacebar keyboard shortcut for Play/Pause toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        togglePlayPreview();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlayPreview]);

  // Calculate percentage positions for CSS
  const startPercent = Math.max(0, Math.min(100, (startTime / totalDuration) * 100));
  const endPercent = Math.max(0, Math.min(100, (endTime / totalDuration) * 100));
  const playheadPercent = Math.max(0, Math.min(100, (currentTime / totalDuration) * 100));
  const trimmedDuration = Math.max(0, endTime - startTime);
  const cutDuration = Math.max(0, totalDuration - trimmedDuration);
  const cutPercent = Math.round((cutDuration / totalDuration) * 100);

  // Mouse / Touch Dragging Logic
  const handlePointerDown = (type: "start" | "end" | "playhead", e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDrag(type);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    if (type === "start") {
      seekVideo(startTime);
    } else if (type === "end") {
      seekVideo(endTime);
    }
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!activeDrag || !trackRef.current) return;

      const rect = trackRef.current.getBoundingClientRect();
      const clientX = e.clientX;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const targetTime = Math.round(ratio * totalDuration * 100) / 100;

      if (activeDrag === "start") {
        const nextStart = Math.max(0, Math.min(endTime - minDuration, targetTime));
        setStartTime(nextStart);
        seekVideo(nextStart);
      } else if (activeDrag === "end") {
        const nextEnd = Math.min(totalDuration, Math.max(startTime + minDuration, targetTime));
        setEndTime(nextEnd);
        seekVideo(nextEnd);
      } else if (activeDrag === "playhead") {
        seekVideo(targetTime);
      }
    },
    [activeDrag, totalDuration, endTime, startTime, minDuration, seekVideo]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (activeDrag) {
        try {
          (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {}
        setActiveDrag(null);
      }
    },
    [activeDrag]
  );

  // Track click to jump playhead
  const handleTrackClick = (e: React.MouseEvent) => {
    if (activeDrag || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = Math.round(ratio * totalDuration * 100) / 100;
    seekVideo(targetTime);
  };

  // Nudge Fine-tuning functions
  const nudgeStart = (delta: number) => {
    const next = Math.max(0, Math.min(endTime - minDuration, startTime + delta));
    const rounded = Math.round(next * 10) / 10;
    setStartTime(rounded);
    seekVideo(rounded);
  };

  const nudgeEnd = (delta: number) => {
    const next = Math.min(totalDuration, Math.max(startTime + minDuration, endTime + delta));
    const rounded = Math.round(next * 10) / 10;
    setEndTime(rounded);
    seekVideo(rounded);
  };

  const setStartToCurrent = () => {
    const next = Math.max(0, Math.min(endTime - minDuration, currentTime));
    const rounded = Math.round(next * 100) / 100;
    setStartTime(rounded);
    seekVideo(rounded);
  };

  const setEndToCurrent = () => {
    const next = Math.min(totalDuration, Math.max(startTime + minDuration, currentTime));
    const rounded = Math.round(next * 100) / 100;
    setEndTime(rounded);
    seekVideo(rounded);
  };

  const handleResetRange = () => {
    setStartTime(0);
    setEndTime(totalDuration);
    seekVideo(0);
  };

  // Apply real trimming via Mediabunny
  const handleApplyTrim = async () => {
    if (startTime === 0 && endTime >= totalDuration - 0.05) {
      // Nothing changed, just close
      onCancel();
      return;
    }

    setTrimError("");
    setIsTrimming(true);
    setTrimProgress(5);
    setTrimStatusText("Preparing video trimmer...");

    try {
      const result = await trimVideo(videoFile, {
        startTime,
        endTime,
        onProgress: (percent, status) => {
          setTrimProgress(percent);
          setTrimStatusText(status);
        },
      });

      onTrimSuccess(result.file, result.previewUrl, result.metadata);
    } catch (err: any) {
      console.error("Video trimming failed:", err);
      setTrimError(err?.message || "Failed to trim video. Please try again.");
      setIsTrimming(false);
    }
  };

  return (
    <div
      className={`p-4 rounded-2xl bg-slate-900/95 border border-lime-500/30 text-white shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom-2 ${className}`}
    >
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-linear-to-br from-lime-500 to-emerald-600 text-slate-950 font-black shadow-md shadow-lime-500/20">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2 tracking-tight">
              Precision Video Trimmer
              <span className="text-[10px] font-bold bg-lime-500/20 text-lime-400 border border-lime-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Studio Tool
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Drag handles or use nudge buttons to cut unwanted intro/outro frames.
            </p>
          </div>
        </div>

        {/* Quick Reset Handles */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleResetRange}
          disabled={isTrimming || (startTime === 0 && endTime === totalDuration)}
          className="h-8 text-xs text-slate-400 hover:text-white hover:bg-white/10 rounded-xl gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Range
        </Button>
      </div>

      {/* Error Message */}
      {trimError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium">
          {trimError}
        </div>
      )}

      {/* Timeline Scrubber Viewport */}
      <div className="space-y-2 select-none">
        {/* Scrubber Timecode HUD Readout */}
        <div className="flex items-center justify-between text-xs font-mono font-bold px-1 text-slate-300">
          <div className="flex items-center gap-1.5 text-lime-400">
            <span className="text-[10px] text-slate-400 uppercase font-sans">Start:</span>
            <span>{formatTimecode(startTime)}</span>
          </div>

          <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded-full border border-white/10 text-[11px]">
            <Clock className="w-3 h-3 text-lime-400" />
            <span className="text-slate-200 font-sans">
              Trimmed Clip: <strong className="text-white font-mono">{formatDuration(trimmedDuration)}</strong>
            </span>
            {cutDuration > 0 && (
              <span className="text-slate-400 text-[10px]">
                ({cutPercent}% removed)
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="text-[10px] text-slate-400 uppercase font-sans">End:</span>
            <span>{formatTimecode(endTime)}</span>
          </div>
        </div>

        {/* Multi-Handle Scrubber Track */}
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative h-16 rounded-xl bg-slate-950 border-2 border-slate-800 overflow-hidden cursor-pointer group shadow-inner"
        >
          {/* Filmstrip Frame Previews */}
          <div className="absolute inset-0 flex items-center justify-between opacity-50 group-hover:opacity-65 transition-opacity pointer-events-none">
            {filmstripFrames.length > 0 ? (
              filmstripFrames.map((frame, i) => (
                <div key={i} className="h-full flex-1 border-r border-slate-800/60 overflow-hidden">
                  <img
                    src={frame.url}
                    alt={`Frame ${i}`}
                    className="w-full h-full object-cover grayscale-30"
                  />
                </div>
              ))
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                {isLoadingFilmstrip ? (
                  <span className="flex items-center gap-1.5 text-[11px] text-slate-500 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading timeline filmstrip...
                  </span>
                ) : (
                  <Film className="w-5 h-5 text-slate-700" />
                )}
              </div>
            )}
          </div>

          {/* Left Dimmed Area (Excluded Before Start) */}
          <div
            style={{ width: `${startPercent}%` }}
            className="absolute top-0 bottom-0 left-0 bg-slate-950/80 backdrop-blur-[2px] border-r border-red-500/40 pointer-events-none transition-all duration-75"
          />

          {/* Right Dimmed Area (Excluded After End) */}
          <div
            style={{ left: `${endPercent}%`, right: 0 }}
            className="absolute top-0 bottom-0 bg-slate-950/80 backdrop-blur-[2px] border-l border-red-500/40 pointer-events-none transition-all duration-75"
          />

          {/* Active Highlighted Selected Region */}
          <div
            style={{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }}
            className="absolute top-0 bottom-0 border-y-2 border-lime-500 bg-lime-500/10 pointer-events-none transition-all duration-75"
          />

          {/* Left Handle (Start Trim) */}
          <div
            style={{ left: `${startPercent}%` }}
            onPointerDown={(e) => handlePointerDown("start", e)}
            className="absolute top-0 bottom-0 -ml-2.5 w-5 bg-linear-to-r from-lime-500 to-lime-600 hover:from-lime-400 hover:to-lime-500 rounded-l-md cursor-ew-resize flex items-center justify-center shadow-lg shadow-lime-500/30 z-20 group/handle touch-none active:scale-105 transition-transform"
            title="Drag to trim start"
          >
            <div className="w-0.5 h-6 bg-slate-950 rounded-full" />
            {/* Hover Floating Tooltip */}
            <div className="absolute -top-7 bg-slate-900 border border-lime-500 text-[10px] font-mono font-bold text-lime-400 px-1.5 py-0.5 rounded shadow-sm pointer-events-none whitespace-nowrap opacity-0 group-hover/handle:opacity-100 transition-opacity">
              {formatTimecode(startTime)}
            </div>
          </div>

          {/* Right Handle (End Trim) */}
          <div
            style={{ left: `${endPercent}%` }}
            onPointerDown={(e) => handlePointerDown("end", e)}
            className="absolute top-0 bottom-0 -ml-2.5 w-5 bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-r-md cursor-ew-resize flex items-center justify-center shadow-lg shadow-emerald-500/30 z-20 group/handle touch-none active:scale-105 transition-transform"
            title="Drag to trim end"
          >
            <div className="w-0.5 h-6 bg-slate-950 rounded-full" />
            {/* Hover Floating Tooltip */}
            <div className="absolute -top-7 bg-slate-900 border border-emerald-500 text-[10px] font-mono font-bold text-emerald-400 px-1.5 py-0.5 rounded shadow-sm pointer-events-none whitespace-nowrap opacity-0 group-hover/handle:opacity-100 transition-opacity">
              {formatTimecode(endTime)}
            </div>
          </div>

          {/* Active Video Playhead Needle */}
          <div
            style={{ left: `${playheadPercent}%` }}
            onPointerDown={(e) => handlePointerDown("playhead", e)}
            className="absolute top-0 bottom-0 ml-[-1.5px] w-[3px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] z-30 cursor-ew-resize pointer-events-auto"
          >
            <div className="w-3 h-3 bg-white border border-slate-900 rounded-full ml-[-4.5px] -top-1.5 absolute shadow-xs" />
          </div>
        </div>
      </div>

      {/* Precision Micro-Control Adjustment Rows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Start Point Fine Tuning */}
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
            <span className="flex items-center gap-1 text-lime-400">
              <ChevronLeft className="w-3.5 h-3.5" /> Start Cutpoint
            </span>
            <button
              type="button"
              onClick={setStartToCurrent}
              disabled={isTrimming}
              className="text-[10px] text-lime-400 hover:text-lime-300 underline font-semibold transition-colors"
            >
              Set to Current ({formatTimecode(currentTime)})
            </button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => nudgeStart(-1)}
              disabled={isTrimming || startTime <= 0}
              className="h-7 px-2 text-[10px] font-bold rounded-lg border-white/10 text-slate-300 hover:bg-white/10"
            >
              -1s
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => nudgeStart(-0.1)}
              disabled={isTrimming || startTime <= 0}
              className="h-7 px-2 text-[10px] font-bold rounded-lg border-white/10 text-slate-300 hover:bg-white/10"
            >
              -0.1s
            </Button>
            <div className="flex-1 text-center font-mono font-bold text-xs bg-slate-950 py-1 rounded-lg border border-lime-500/30 text-lime-400">
              {formatTimecode(startTime)}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => nudgeStart(0.1)}
              disabled={isTrimming || startTime >= endTime - minDuration}
              className="h-7 px-2 text-[10px] font-bold rounded-lg border-white/10 text-slate-300 hover:bg-white/10"
            >
              +0.1s
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => nudgeStart(1)}
              disabled={isTrimming || startTime >= endTime - minDuration}
              className="h-7 px-2 text-[10px] font-bold rounded-lg border-white/10 text-slate-300 hover:bg-white/10"
            >
              +1s
            </Button>
          </div>
        </div>

        {/* End Point Fine Tuning */}
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
            <span className="flex items-center gap-1 text-emerald-400">
              End Cutpoint <ChevronRight className="w-3.5 h-3.5" />
            </span>
            <button
              type="button"
              onClick={setEndToCurrent}
              disabled={isTrimming}
              className="text-[10px] text-emerald-400 hover:text-emerald-300 underline font-semibold transition-colors"
            >
              Set to Current ({formatTimecode(currentTime)})
            </button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => nudgeEnd(-1)}
              disabled={isTrimming || endTime <= startTime + minDuration}
              className="h-7 px-2 text-[10px] font-bold rounded-lg border-white/10 text-slate-300 hover:bg-white/10"
            >
              -1s
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => nudgeEnd(-0.1)}
              disabled={isTrimming || endTime <= startTime + minDuration}
              className="h-7 px-2 text-[10px] font-bold rounded-lg border-white/10 text-slate-300 hover:bg-white/10"
            >
              -0.1s
            </Button>
            <div className="flex-1 text-center font-mono font-bold text-xs bg-slate-950 py-1 rounded-lg border border-emerald-500/30 text-emerald-400">
              {formatTimecode(endTime)}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => nudgeEnd(0.1)}
              disabled={isTrimming || endTime >= totalDuration}
              className="h-7 px-2 text-[10px] font-bold rounded-lg border-white/10 text-slate-300 hover:bg-white/10"
            >
              +0.1s
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => nudgeEnd(1)}
              disabled={isTrimming || endTime >= totalDuration}
              className="h-7 px-2 text-[10px] font-bold rounded-lg border-white/10 text-slate-300 hover:bg-white/10"
            >
              +1s
            </Button>
          </div>
        </div>
      </div>

      {/* Trimming Progress Bar */}
      {isTrimming && (
        <div className="space-y-2 p-3.5 rounded-xl bg-lime-500/10 border border-lime-500/20 animate-in fade-in">
          <div className="flex justify-between text-xs font-bold text-lime-400">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {trimStatusText || "Trimming video frames..."}
            </span>
            <span>{trimProgress}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-lime-500 h-full transition-all duration-300"
              style={{ width: `${trimProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
        {/* Left: Preview Trimmed Range */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={togglePlayPreview}
          disabled={isTrimming}
          className="gap-2 text-slate-200"
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current text-amber-400" />
              Pause Preview
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current text-lime-400" />
              Preview Selected Clip
            </>
          )}
        </Button>

        {/* Right: Cancel & Apply Trim */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isTrimming}
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleApplyTrim}
            disabled={isTrimming}
            className="gap-1.5"
          >
            {isTrimming ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Trimming Video...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Apply Trim ({formatDuration(trimmedDuration)})</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
