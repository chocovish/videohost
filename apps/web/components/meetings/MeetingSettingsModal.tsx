"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  useRoomContext,
  useLocalParticipant,
  useMaybeLayoutContext,
  useConnectionState,
  useParticipants,
} from "@livekit/components-react";
import { Track, ConnectionState } from "livekit-client";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Volume2,
  VolumeX,
  Settings as SettingsIcon,
  Sliders,
  ShieldCheck,
  Check,
  Copy,
  Radio,
  X,
  Info,
  Play,
  RotateCw,
  Sparkles,
  Layers,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DeviceOption {
  deviceId: string;
  label: string;
}

export default function MeetingSettingsModal() {
  const room = useRoomContext();
  const layoutContext = useMaybeLayoutContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const participants = useParticipants();
  const connectionState = useConnectionState();

  const [activeTab, setActiveTab] = useState<"audio" | "video" | "general">("audio");

  // Device lists
  const [audioInputDevices, setAudioInputDevices] = useState<DeviceOption[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<DeviceOption[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<DeviceOption[]>([]);

  const [activeAudioInput, setActiveAudioInput] = useState<string>("");
  const [activeAudioOutput, setActiveAudioOutput] = useState<string>("");
  const [activeVideoInput, setActiveVideoInput] = useState<string>("");

  // Video Preview & Mirror
  const [isMirrored, setIsMirrored] = useState(true);
  const [videoQuality, setVideoQuality] = useState<"auto" | "1080p" | "720p" | "480p">("auto");
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Audio Testing (VU meter)
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isTestingSpeaker, setIsTestingSpeaker] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Noise Suppression / Echo Cancellation state
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);

  // Copy meeting link
  const [copiedLink, setCopiedLink] = useState(false);

  const handleClose = useCallback(() => {
    if (layoutContext?.widget?.dispatch) {
      layoutContext.widget.dispatch({ msg: "toggle_settings" });
    }
  }, [layoutContext]);

  // Handle escape key & backdrop click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    const handleBackdropClick = (e: MouseEvent) => {
      const modal = document.querySelector(".lk-settings-menu-modal");
      if (modal && e.target === modal) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("click", handleBackdropClick);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("click", handleBackdropClick);
    };
  }, [handleClose]);

  // Load and refresh devices
  const loadDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const aInputs: DeviceOption[] = devices
        .filter((d) => d.kind === "audioinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${i + 1}`,
        }));

      const aOutputs: DeviceOption[] = devices
        .filter((d) => d.kind === "audiooutput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Speaker ${i + 1}`,
        }));

      const vInputs: DeviceOption[] = devices
        .filter((d) => d.kind === "videoinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${i + 1}`,
        }));

      setAudioInputDevices(aInputs);
      setAudioOutputDevices(aOutputs);
      setVideoInputDevices(vInputs);

      if (room) {
        setActiveAudioInput(room.getActiveDevice("audioinput") || (aInputs[0]?.deviceId ?? ""));
        setActiveAudioOutput(room.getActiveDevice("audiooutput") || (aOutputs[0]?.deviceId ?? ""));
        setActiveVideoInput(room.getActiveDevice("videoinput") || (vInputs[0]?.deviceId ?? ""));
      }
    } catch (e) {
      console.warn("Error enumerating devices:", e);
    }
  }, [room]);

  useEffect(() => {
    loadDevices();
    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener("devicechange", loadDevices);
      return () => {
        navigator.mediaDevices.removeEventListener("devicechange", loadDevices);
      };
    }
  }, [loadDevices]);

  // Switch Audio Input
  const handleAudioInputChange = async (deviceId: string) => {
    setActiveAudioInput(deviceId);
    if (room) {
      try {
        await room.switchActiveDevice("audioinput", deviceId);
      } catch (err) {
        console.error("Failed to switch audio input device:", err);
      }
    }
  };

  // Switch Audio Output
  const handleAudioOutputChange = async (deviceId: string) => {
    setActiveAudioOutput(deviceId);
    if (room) {
      try {
        await room.switchActiveDevice("audiooutput", deviceId);
      } catch (err) {
        console.error("Failed to switch audio output device:", err);
      }
    }
  };

  // Switch Video Input
  const handleVideoInputChange = async (deviceId: string) => {
    setActiveVideoInput(deviceId);
    if (room) {
      try {
        await room.switchActiveDevice("videoinput", deviceId);
      } catch (err) {
        console.error("Failed to switch video input device:", err);
      }
    }
  };

  // Attach local camera preview to video element
  useEffect(() => {
    const camPub = localParticipant?.getTrackPublication(Track.Source.Camera);
    const videoElem = videoPreviewRef.current;
    if (camPub?.track && videoElem) {
      camPub.track.attach(videoElem);
      return () => {
        camPub.track?.detach(videoElem);
      };
    }
  }, [localParticipant, isCameraEnabled, activeVideoInput]);

  // Live Microphone Audio Level Meter
  useEffect(() => {
    const micPub = localParticipant?.getTrackPublication(Track.Source.Microphone);
    const mediaStreamTrack = micPub?.track?.mediaStreamTrack;

    if (!mediaStreamTrack || !isMicrophoneEnabled || mediaStreamTrack.readyState !== "live") {
      setAudioLevel(0);
      return;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      const audioCtx = new AudioCtxClass();
      const stream = new MediaStream([mediaStreamTrack]);
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const checkLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        let total = 0;
        for (let i = 0; i < data.length; i++) {
          total += data[i];
        }
        const avg = total / data.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(checkLevel);
      };

      checkLevel();

      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (audioCtx.state !== "closed") audioCtx.close().catch(() => {});
      };
    } catch (e) {
      console.warn("Audio meter setup error:", e);
    }
  }, [localParticipant, isMicrophoneEnabled, activeAudioInput]);

  // Test Speaker Chime
  const handleTestSpeaker = () => {
    if (isTestingSpeaker) return;
    setIsTestingSpeaker(true);

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) {
        setIsTestingSpeaker(false);
        return;
      }
      const ctx = new AudioCtxClass();

      // Play a pleasant two-tone chime (A4 -> C#5 -> E5)
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      playTone(440, now, 0.3); // A4
      playTone(554.37, now + 0.15, 0.3); // C#5
      playTone(659.25, now + 0.3, 0.5); // E5

      setTimeout(() => {
        setIsTestingSpeaker(false);
        ctx.close().catch(() => {});
      }, 900);
    } catch (e) {
      console.error("Failed to play speaker test:", e);
      setIsTestingSpeaker(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div
      className="w-full max-w-2xl bg-slate-900/95 border border-slate-800/90 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-2xl flex flex-col max-h-[90vh] text-slate-100 animate-in fade-in zoom-in-95 duration-150 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Modal Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/30 flex items-center justify-center text-[hsl(var(--primary))]">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-tight">Meeting Settings</h3>
            <p className="text-xs text-slate-400">Configure devices, audio, video & meeting options</p>
          </div>
        </div>

        <button
          onClick={handleClose}
          className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          title="Close Settings"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800/80 bg-slate-950/40 px-6 gap-2">
        <button
          onClick={() => setActiveTab("audio")}
          className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
            activeTab === "audio"
              ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Mic className="w-4 h-4" />
          <span>Audio</span>
        </button>

        <button
          onClick={() => setActiveTab("video")}
          className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
            activeTab === "video"
              ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <VideoIcon className="w-4 h-4" />
          <span>Video</span>
        </button>

        <button
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
            activeTab === "general"
              ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Info className="w-4 h-4" />
          <span>Meeting Details</span>
        </button>
      </div>

      {/* Modal Body */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* AUDIO TAB */}
        {activeTab === "audio" && (
          <div className="space-y-6">
            {/* Microphone Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Mic className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                  Microphone Input
                </label>
                <span className="text-[11px] text-slate-400">
                  {isMicrophoneEnabled ? "Microphone Unmuted" : "Microphone Muted"}
                </span>
              </div>

              <Select
                value={activeAudioInput || (audioInputDevices.length > 0 ? audioInputDevices[0].deviceId : "default")}
                onValueChange={(val) => handleAudioInputChange(val === "default" ? "" : val)}
              >
                <SelectTrigger className="w-full bg-slate-950 border-slate-800 rounded-xl px-3.5 h-11 text-xs sm:text-sm text-white font-normal focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))]">
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  {audioInputDevices.length === 0 ? (
                    <SelectItem value="default" className="text-xs">
                      Default Microphone
                    </SelectItem>
                  ) : (
                    audioInputDevices.map((d) => (
                      <SelectItem key={d.deviceId || "default"} value={d.deviceId || "default"} className="text-xs">
                        {d.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {/* Real-time Mic Level Indicator */}
              <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Input Volume Level (Speak to test)</span>
                  <span className="font-mono text-[11px] text-slate-300">{audioLevel}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-[hsl(var(--primary))] to-amber-400 rounded-full transition-all duration-75"
                    style={{ width: `${isMicrophoneEnabled ? audioLevel : 0}%` }}
                  />
                </div>
                {!isMicrophoneEnabled && (
                  <p className="text-[11px] text-amber-400/90 flex items-center gap-1.5 pt-1">
                    <MicOff className="w-3 h-3" /> Unmute your microphone on the main control bar to test input
                  </p>
                )}
              </div>
            </div>

            {/* Speaker Selector & Test */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  Speaker Output
                </label>
                <button
                  type="button"
                  onClick={handleTestSpeaker}
                  disabled={isTestingSpeaker}
                  className="text-xs font-bold text-[hsl(var(--primary))] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3 h-3" />
                  {isTestingSpeaker ? "Testing Chime..." : "Test Speaker"}
                </button>
              </div>

              <Select
                value={activeAudioOutput || (audioOutputDevices.length > 0 ? audioOutputDevices[0].deviceId : "default")}
                onValueChange={(val) => handleAudioOutputChange(val === "default" ? "" : val)}
              >
                <SelectTrigger className="w-full bg-slate-950 border-slate-800 rounded-xl px-3.5 h-11 text-xs sm:text-sm text-white font-normal focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))]">
                  <SelectValue placeholder="Select speaker" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  {audioOutputDevices.length === 0 ? (
                    <SelectItem value="default" className="text-xs">
                      Default System Speaker
                    </SelectItem>
                  ) : (
                    audioOutputDevices.map((d) => (
                      <SelectItem key={d.deviceId || "default"} value={d.deviceId || "default"} className="text-xs">
                        {d.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Audio Enhancements */}
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Audio Enhancements</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">Noise Suppression</p>
                    <p className="text-[10px] text-slate-400">Reduce background hums</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={noiseSuppression}
                    onChange={(e) => setNoiseSuppression(e.target.checked)}
                    className="w-4 h-4 rounded text-[hsl(var(--primary))] accent-[hsl(var(--primary))] cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">Echo Cancellation</p>
                    <p className="text-[10px] text-slate-400">Prevent speaker feedback</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={echoCancellation}
                    onChange={(e) => setEchoCancellation(e.target.checked)}
                    className="w-4 h-4 rounded text-[hsl(var(--primary))] accent-[hsl(var(--primary))] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIDEO TAB */}
        {activeTab === "video" && (
          <div className="space-y-6">
            {/* Camera Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <VideoIcon className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                  Camera Device
                </label>
                <span className="text-[11px] text-slate-400">
                  {isCameraEnabled ? "Camera Active" : "Camera Off"}
                </span>
              </div>

              <Select
                value={activeVideoInput || (videoInputDevices.length > 0 ? videoInputDevices[0].deviceId : "default")}
                onValueChange={(val) => handleVideoInputChange(val === "default" ? "" : val)}
              >
                <SelectTrigger className="w-full bg-slate-950 border-slate-800 rounded-xl px-3.5 h-11 text-xs sm:text-sm text-white font-normal focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))]">
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  {videoInputDevices.length === 0 ? (
                    <SelectItem value="default" className="text-xs">
                      Default Camera
                    </SelectItem>
                  ) : (
                    videoInputDevices.map((d) => (
                      <SelectItem key={d.deviceId || "default"} value={d.deviceId || "default"} className="text-xs">
                        {d.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Camera Live Preview Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Live Video Preview</span>
                <button
                  type="button"
                  onClick={() => setIsMirrored(!isMirrored)}
                  className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>{isMirrored ? "Mirrored" : "Normal"}</span>
                </button>
              </div>

              <div className="relative aspect-video w-full max-w-md mx-auto rounded-2xl bg-black border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner">
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transition-transform ${
                    isMirrored ? "scale-x-[-1]" : ""
                  } ${!isCameraEnabled ? "hidden" : "block"}`}
                />

                {!isCameraEnabled && (
                  <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400">
                      <VideoOff className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-slate-300">Camera is currently turned off</p>
                    <p className="text-[11px] text-slate-500">Enable camera in the meeting controls below</p>
                  </div>
                )}

                {isCameraEnabled && (
                  <div className="absolute bottom-2 left-2 bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Active Preview</span>
                  </div>
                )}
              </div>
            </div>

            {/* Video Quality / Preset */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Video Quality Preset
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "auto", label: "Auto (Adaptive)", desc: "Optimal network" },
                  { id: "1080p", label: "1080p Full HD", desc: "Highest clarity" },
                  { id: "720p", label: "720p HD", desc: "Standard meeting" },
                  { id: "480p", label: "480p SD", desc: "Bandwidth saver" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setVideoQuality(item.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      videoQuality === item.id
                        ? "bg-[hsl(var(--primary))]/15 border-[hsl(var(--primary))] text-white"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <p className="text-xs font-bold leading-tight">{item.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* GENERAL & MEETING DETAILS TAB */}
        {activeTab === "general" && (
          <div className="space-y-5">
            {/* Meeting Room Link */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Meeting Room Link</span>
                <Button
                  size="sm"
                  onClick={handleCopyLink}
                  className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-black font-bold text-xs h-7 px-2.5 rounded-lg gap-1"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-black" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
                </Button>
              </div>
              <p className="text-xs font-mono text-slate-300 truncate bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                {typeof window !== "undefined" ? window.location.href : ""}
              </p>
            </div>

            {/* WebRTC Diagnostics & Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Security & Protocol</span>
                </div>
                <p className="text-xs font-bold text-white">LiveKit SFU / WebRTC (E2EE Ready)</p>
                <p className="text-[10px] text-slate-400">Encrypted low-latency video streaming</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <Radio className="w-4 h-4 text-[hsl(var(--primary))]" />
                  <span>Connection State</span>
                </div>
                <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {connectionState === ConnectionState.Connected ? "Connected (Optimal)" : connectionState}
                </p>
                <p className="text-[10px] text-slate-400">
                  {participants.length} participant{participants.length === 1 ? "" : "s"} in call
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Footer */}
      <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
        <span className="text-xs text-slate-500 hidden sm:inline">Preferences are saved automatically for this session</span>
        <Button
          onClick={handleClose}
          className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-black font-bold text-xs h-9 px-5 rounded-xl ml-auto"
        >
          Done
        </Button>
      </div>
    </div>
  );
}
