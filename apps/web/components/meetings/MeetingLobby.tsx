"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Settings,
  Sparkles,
  User,
  Radio,
  Volume2,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Disc,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeviceOption {
  deviceId: string;
  label: string;
}

interface MeetingLobbyProps {
  meeting: {
    id: string;
    code: string;
    title: string;
    description?: string | null;
    hostName?: string;
    themeId?: string;
    recordOnStart?: boolean;
    allowGuests?: boolean;
  };
  initialName: string;
  isHost: boolean;
  onJoin: (options: {
    displayName: string;
    audioEnabled: boolean;
    videoEnabled: boolean;
    audioDeviceId?: string;
    videoDeviceId?: string;
  }) => void;
}

export default function MeetingLobby({
  meeting,
  initialName,
  isHost,
  onJoin,
}: MeetingLobbyProps) {
  const [displayName, setDisplayName] = useState(initialName || "");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  const [audioDevices, setAudioDevices] = useState<DeviceOption[]>([]);
  const [videoDevices, setVideoDevices] = useState<DeviceOption[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");

  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Enumerate devices helper
  const refreshDeviceList = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const vDevs: DeviceOption[] = devices
        .filter((d) => d.kind === "videoinput")
        .map((d, idx) => ({
          deviceId: d.deviceId,
          label: d.label ? d.label : `Camera ${idx + 1} (${d.deviceId ? d.deviceId.slice(0, 5) : "Default"})`,
        }));

      const aDevs: DeviceOption[] = devices
        .filter((d) => d.kind === "audioinput")
        .map((d, idx) => ({
          deviceId: d.deviceId,
          label: d.label ? d.label : `Microphone ${idx + 1} (${d.deviceId ? d.deviceId.slice(0, 5) : "Default"})`,
        }));

      setVideoDevices(vDevs);
      setAudioDevices(aDevs);

      if (vDevs.length > 0) {
        setSelectedVideoDevice((curr) => (curr && vDevs.some((v) => v.deviceId === curr) ? curr : vDevs[0].deviceId));
      }
      if (aDevs.length > 0) {
        setSelectedAudioDevice((curr) => (curr && aDevs.some((a) => a.deviceId === curr) ? curr : aDevs[0].deviceId));
      }
    } catch (e) {
      console.warn("Failed to enumerate devices:", e);
    }
  }, []);

  // Setup Audio Analyser
  const setupAudioMeter = useCallback((stream: MediaStream) => {
    try {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioCtx = new AudioContextClass();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.4;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (e) {
      console.warn("Audio meter setup skipped:", e);
    }
  }, []);

  // Request media with independent fallbacks for camera & mic
  const initMedia = useCallback(async () => {
    setIsInitializing(true);
    setPermissionError(null);

    // Initial device query
    await refreshDeviceList();

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setPermissionError(
        "Media access is not supported or not allowed in this context. If accessing via IP (e.g. 192.168.x.x), please use http://localhost:3000 or HTTPS."
      );
      setIsInitializing(false);
      return;
    }

    const newCombinedStream = new MediaStream();
    let videoSuccess = false;
    let audioSuccess = false;
    let errorMsg: string | null = null;

    // 1. Acquire Video
    try {
      const vStream = await navigator.mediaDevices.getUserMedia({
        video: selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : true,
      });
      vStream.getVideoTracks().forEach((track) => newCombinedStream.addTrack(track));
      videoSuccess = true;
    } catch (vErr: any) {
      console.warn("Could not acquire video track:", vErr);
      if (vErr.name === "NotAllowedError" || vErr.name === "PermissionDeniedError") {
        errorMsg = "Camera or microphone permission was denied in your browser settings.";
      }
    }

    // 2. Acquire Audio
    try {
      const aStream = await navigator.mediaDevices.getUserMedia({
        audio: selectedAudioDevice
          ? { deviceId: { exact: selectedAudioDevice }, echoCancellation: true, noiseSuppression: true }
          : { echoCancellation: true, noiseSuppression: true },
      });
      aStream.getAudioTracks().forEach((track) => newCombinedStream.addTrack(track));
      audioSuccess = true;
    } catch (aErr: any) {
      console.warn("Could not acquire audio track:", aErr);
      if (aErr.name === "NotAllowedError" || aErr.name === "PermissionDeniedError") {
        errorMsg = "Camera or microphone permission was denied in your browser settings.";
      }
    }

    if (videoSuccess || audioSuccess) {
      // Clean up previous stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      streamRef.current = newCombinedStream;
      setVideoEnabled(videoSuccess);
      setAudioEnabled(audioSuccess);

      // Attach video stream to DOM
      if (videoRef.current && videoSuccess) {
        videoRef.current.srcObject = newCombinedStream;
        videoRef.current.play().catch(() => {});
      }

      if (audioSuccess) {
        setupAudioMeter(newCombinedStream);
      }

      // Re-enumerate to get full device labels
      await refreshDeviceList();
      setPermissionError(null);
    } else {
      setPermissionError(
        errorMsg || "Unable to start camera or microphone. Please check your browser permissions."
      );
    }

    setIsInitializing(false);
  }, [refreshDeviceList, selectedAudioDevice, selectedVideoDevice, setupAudioMeter]);

  useEffect(() => {
    initMedia();

    const handleDeviceChangeEvent = () => {
      refreshDeviceList();
    };

    if (typeof navigator !== "undefined" && navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener("devicechange", handleDeviceChangeEvent);
    }

    return () => {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.removeEventListener) {
        navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChangeEvent);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Ensure video element srcObject is synced whenever stream or videoEnabled changes
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [videoEnabled]);

  // Toggle Video
  const toggleVideo = async () => {
    const nextState = !videoEnabled;
    setVideoEnabled(nextState);

    if (streamRef.current) {
      const vTracks = streamRef.current.getVideoTracks();
      if (vTracks.length > 0) {
        vTracks.forEach((t) => {
          t.enabled = nextState;
        });
      } else if (nextState) {
        try {
          const vStream = await navigator.mediaDevices.getUserMedia({
            video: selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : true,
          });
          const track = vStream.getVideoTracks()[0];
          if (track) {
            streamRef.current.addTrack(track);
            if (videoRef.current) {
              videoRef.current.srcObject = streamRef.current;
              videoRef.current.play().catch(() => {});
            }
            await refreshDeviceList();
          }
        } catch (err) {
          console.warn("Could not start video track:", err);
        }
      }
    }
  };

  // Toggle Audio
  const toggleAudio = async () => {
    const nextState = !audioEnabled;
    setAudioEnabled(nextState);

    if (streamRef.current) {
      const aTracks = streamRef.current.getAudioTracks();
      if (aTracks.length > 0) {
        aTracks.forEach((t) => {
          t.enabled = nextState;
        });
      } else if (nextState) {
        try {
          const aStream = await navigator.mediaDevices.getUserMedia({
            audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true,
          });
          const track = aStream.getAudioTracks()[0];
          if (track) {
            streamRef.current.addTrack(track);
            setupAudioMeter(streamRef.current);
            await refreshDeviceList();
          }
        } catch (err) {
          console.warn("Could not start audio track:", err);
        }
      }
    }
  };

  // Switch Media Devices
  const handleDeviceChange = async (type: "video" | "audio", deviceId: string) => {
    if (type === "video") {
      setSelectedVideoDevice(deviceId);
      try {
        const vStream = await navigator.mediaDevices.getUserMedia({
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
        });
        const newVTrack = vStream.getVideoTracks()[0];
        if (newVTrack && streamRef.current) {
          streamRef.current.getVideoTracks().forEach((t) => {
            t.stop();
            streamRef.current?.removeTrack(t);
          });
          streamRef.current.addTrack(newVTrack);
          if (videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(() => {});
          }
        }
      } catch (err) {
        console.warn("Failed to switch video device:", err);
      }
    }

    if (type === "audio") {
      setSelectedAudioDevice(deviceId);
      try {
        const aStream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        });
        const newATrack = aStream.getAudioTracks()[0];
        if (newATrack && streamRef.current) {
          streamRef.current.getAudioTracks().forEach((t) => {
            t.stop();
            streamRef.current?.removeTrack(t);
          });
          streamRef.current.addTrack(newATrack);
          setupAudioMeter(streamRef.current);
        }
      } catch (err) {
        console.warn("Failed to switch audio device:", err);
      }
    }
  };

  const handleJoinClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    // Clean up local preview stream before joining LiveKit room
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }

    onJoin({
      displayName: displayName.trim(),
      audioEnabled,
      videoEnabled,
      audioDeviceId: selectedAudioDevice || undefined,
      videoDeviceId: selectedVideoDevice || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[hsl(var(--primary))]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl mx-auto space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/30 text-[hsl(var(--primary))] text-xs font-bold uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 animate-pulse" /> LiveKit Video Lobby
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {meeting.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-mono">
            Room Code: <span className="text-[hsl(var(--primary))] font-semibold">{meeting.code}</span>
            {meeting.hostName && ` • Hosted by ${meeting.hostName}`}
          </p>
        </div>

        {/* Main Grid: Video Preview (Left) + Join Settings (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Left Column: Camera Preview Box */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            <div className="relative aspect-video w-full rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner flex items-center justify-center">
              {/* The video element is ALWAYS mounted to preserve srcObject connection */}
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-200 ${
                  videoEnabled && !permissionError ? "opacity-100" : "opacity-0 absolute pointer-events-none"
                }`}
              />

              {/* Camera Off / Fallback Placeholder Avatar */}
              {(!videoEnabled || permissionError) && (
                <div className="flex flex-col items-center justify-center gap-3 text-slate-500 p-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                    <User className="w-8 h-8" />
                  </div>
                  <p className="text-xs font-medium text-slate-400">
                    {permissionError ? "Camera preview unavailable" : "Camera is turned off"}
                  </p>
                </div>
              )}

              {/* Audio visualizer bar in video preview */}
              {audioEnabled && !permissionError && (
                <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5 flex items-center gap-2 backdrop-blur-md">
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-75"
                      style={{ width: `${Math.max(5, audioLevel)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Auto Record notification badge if enabled */}
              {meeting.recordOnStart && (
                <div className="absolute top-3 right-3 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-[11px] font-bold">
                  <Disc className="w-3.5 h-3.5 animate-pulse" /> Auto-Record
                </div>
              )}

              {/* Quick toggle controls floating over video preview */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleAudio}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer shadow-lg ${
                    audioEnabled
                      ? "bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-white"
                      : "bg-rose-500 hover:bg-rose-600 border-rose-600 text-white"
                  }`}
                  title={audioEnabled ? "Mute Microphone" : "Unmute Microphone"}
                >
                  {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={toggleVideo}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer shadow-lg ${
                    videoEnabled
                      ? "bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-white"
                      : "bg-rose-500 hover:bg-rose-600 border-rose-600 text-white"
                  }`}
                  title={videoEnabled ? "Turn Off Camera" : "Turn On Camera"}
                >
                  {videoEnabled ? <VideoIcon className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Permission warning banner with retry button */}
            {permissionError && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-white">Media Device Notice</p>
                    <p className="text-amber-300/90 leading-relaxed">{permissionError}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => initMedia()}
                  className="h-8 px-2.5 border-amber-500/40 hover:bg-amber-500/20 text-amber-200 text-xs shrink-0 gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </Button>
              </div>
            )}

            {/* Device selection dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 font-medium mb-1.5 block">Microphone</label>
                <select
                  value={selectedAudioDevice}
                  onChange={(e) => handleDeviceChange("audio", e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-[hsl(var(--primary))] [color-scheme:dark]"
                >
                  {audioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label}
                    </option>
                  ))}
                  {audioDevices.length === 0 && <option value="">Default Microphone</option>}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-medium mb-1.5 block">Camera</label>
                <select
                  value={selectedVideoDevice}
                  onChange={(e) => handleDeviceChange("video", e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-[hsl(var(--primary))] [color-scheme:dark]"
                >
                  {videoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label}
                    </option>
                  ))}
                  {videoDevices.length === 0 && <option value="">Default Camera</option>}
                </select>
              </div>
            </div>
          </div>

          {/* Right Column: Participant Info & Join Action */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6 pt-2">
            <form onSubmit={handleJoinClick} className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    {isHost ? "Joining as Host" : (meeting.allowGuests ? "Guest & Attendee Access" : "Registered Attendee")}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">Enter your name</h3>
                <p className="text-xs text-slate-400">
                  Other participants in the video conference will identify you by this name.
                </p>
              </div>

              <div>
                <input
                  type="text"
                  required
                  placeholder="Your full name or handle"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))] font-semibold transition-all"
                />
              </div>

              <Button
                type="submit"
                disabled={!displayName.trim() || isInitializing}
                className="w-full py-3.5 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-black font-extrabold text-sm rounded-xl shadow-lg shadow-[hsl(var(--primary))]/20 gap-2 cursor-pointer"
              >
                {isInitializing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting preview...
                  </>
                ) : (
                  <>
                    <span>Join Meeting</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Quick features summary */}
            <div className="pt-4 border-t border-slate-800/80 space-y-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>HD Audio & Video with adaptive LiveKit WebRTC</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Screen sharing, meeting chat & participant list</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Instant invite link & video recording integration</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
