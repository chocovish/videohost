"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useRoomContext,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import { Track, RoomEvent, Participant } from "livekit-client";
import "@/styles/livekit.css";
import {
  User,
  Monitor,
  Video as VideoIcon,
  Mic,
  Disc,
} from "lucide-react";

export interface EgressRecordingViewProps {
  token: string;
  serverUrl: string;
  meetingId: string;
  initialMode?: "room" | "participant";
  initialTargetIdentity?: string;
  initialShowCamera?: boolean;
  initialShowScreen?: boolean;
  initialPipPosition?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

export default function EgressRecordingView({
  token,
  serverUrl,
  meetingId,
  initialMode = "room",
  initialTargetIdentity = "",
  initialShowCamera = true,
  initialShowScreen = true,
  initialPipPosition = "bottom-right",
}: EgressRecordingViewProps) {
  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        video={false}
        audio={false}
        data-lk-theme="default"
        className="flex-1 flex flex-col h-full w-full overflow-hidden"
      >
        <EgressCanvas
          meetingId={meetingId}
          initialMode={initialMode}
          initialTargetIdentity={initialTargetIdentity}
          initialShowCamera={initialShowCamera}
          initialShowScreen={initialShowScreen}
          initialPipPosition={initialPipPosition}
        />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

function EgressCanvas({
  meetingId,
  initialMode,
  initialTargetIdentity,
  initialShowCamera,
  initialShowScreen,
  initialPipPosition,
}: {
  meetingId: string;
  initialMode: "room" | "participant";
  initialTargetIdentity: string;
  initialShowCamera: boolean;
  initialShowScreen: boolean;
  initialPipPosition: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}) {
  const room = useRoomContext();
  const participants = useParticipants();

  // Dynamic layout state that can be updated in real time via DataChannel
  const [mode, setMode] = useState<"room" | "participant">(initialMode);
  const [targetIdentity, setTargetIdentity] = useState<string>(initialTargetIdentity);
  const [showCamera, setShowCamera] = useState<boolean>(initialShowCamera);
  const [showScreen, setShowScreen] = useState<boolean>(initialShowScreen);
  const [pipPosition, setPipPosition] = useState<"bottom-right" | "bottom-left" | "top-right" | "top-left">(initialPipPosition);

  // Listen for real-time live layout updates from the meeting host
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array) => {
      try {
        const text = new TextDecoder().decode(payload);
        const data = JSON.parse(text);

        if (data.type === "RECORDING_CONFIG_UPDATE") {
          console.log("[Egress] Received live layout update:", data);
          if (data.mode === "room" || data.mode === "participant") {
            setMode(data.mode);
          }
          if (typeof data.targetIdentity === "string") {
            setTargetIdentity(data.targetIdentity);
          }
          if (typeof data.showCamera === "boolean") {
            setShowCamera(data.showCamera);
          }
          if (typeof data.showScreen === "boolean") {
            setShowScreen(data.showScreen);
          }
          if (data.pipPosition) {
            setPipPosition(data.pipPosition);
          }
        }
      } catch (err) {
        console.warn("[Egress] Could not parse data channel packet:", err);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room]);

  // Find targeted participant
  const targetParticipant = useMemo(() => {
    if (!targetIdentity && participants.length > 0) {
      // Prioritize someone sharing screen or first participant
      const sharer = participants.find((p) => p.isScreenShareEnabled);
      return sharer || participants[0];
    }
    return participants.find((p) => p.identity === targetIdentity) || participants[0];
  }, [participants, targetIdentity]);

  // Extract track references for participant mode
  const screenTrackPublication = targetParticipant?.getTrackPublication(Track.Source.ScreenShare);
  const cameraTrackPublication = targetParticipant?.getTrackPublication(Track.Source.Camera);

  const isScreenAvailable = Boolean(screenTrackPublication && screenTrackPublication.isSubscribed && !screenTrackPublication.isMuted);
  const isCameraAvailable = Boolean(cameraTrackPublication && cameraTrackPublication.isSubscribed && !cameraTrackPublication.isMuted);

  // Determine if both are actively rendering (triggering Picture-in-Picture)
  const isPipActive = mode === "participant" && showScreen && showCamera && isScreenAvailable && isCameraAvailable;

  // Track references across room for Grid view
  const allCameraTracks = useTracks([Track.Source.Camera], { onlySubscribed: true });
  const allScreenTracks = useTracks([Track.Source.ScreenShare], { onlySubscribed: true });

  const getPipPositionClass = (pos: string) => {
    switch (pos) {
      case "bottom-left":
        return "bottom-6 left-6";
      case "top-right":
        return "top-6 right-6";
      case "top-left":
        return "top-6 left-6";
      case "bottom-right":
      default:
        return "bottom-6 right-6";
    }
  };

  const getParticipantDisplayName = (p?: Participant | null) => {
    if (!p) return "Participant";
    let meta: any = {};
    try {
      if (p.metadata) meta = JSON.parse(p.metadata);
    } catch {}
    return p.name || meta.name || p.identity;
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center">
      {/* Background Watermark/Indicator */}
      <div className="absolute top-4 left-4 z-40 flex items-center gap-2 bg-slate-950/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-800/80 text-xs font-semibold text-slate-300">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
        <span>REC</span>
        {mode === "participant" && targetParticipant && (
          <span className="text-slate-400 font-normal">
            • {getParticipantDisplayName(targetParticipant)}
            {isPipActive ? " (Screen + Cam PiP)" : showScreen && isScreenAvailable ? " (Screen)" : " (Camera)"}
          </span>
        )}
      </div>

      {/* RENDER MODE 1: SINGLE PARTICIPANT (Screen, Camera, or Screen + PiP Cam) */}
      {mode === "participant" && targetParticipant ? (
        <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
          {/* Main Stage Video: Screen share has priority if enabled and available */}
          {showScreen && isScreenAvailable && screenTrackPublication ? (
            <div className="w-full h-full flex items-center justify-center bg-black">
              <TrackVideoRenderer publication={screenTrackPublication} className="w-full h-full object-contain" />
            </div>
          ) : showCamera && isCameraAvailable && cameraTrackPublication ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-900">
              <TrackVideoRenderer publication={cameraTrackPublication} className="w-full h-full object-contain" />
              <div className="absolute bottom-6 left-6 bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800 text-sm font-bold text-white shadow-xl">
                {getParticipantDisplayName(targetParticipant)}
              </div>
            </div>
          ) : (
            /* Standby Placeholder when stream is temporarily paused/muted */
            <div className="flex flex-col items-center justify-center text-center p-8">
              <div className="w-24 h-24 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-4 shadow-2xl">
                <User className="w-12 h-12" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">
                {getParticipantDisplayName(targetParticipant)}
              </h3>
              <p className="text-sm text-slate-400">
                {showScreen && !isScreenAvailable
                  ? "Waiting for screen share stream..."
                  : "Camera is temporarily inactive"}
              </p>
            </div>
          )}

          {/* Picture-in-Picture (PiP) Floating Webcam Overlay */}
          {isPipActive && cameraTrackPublication && (
            <div
              className={`absolute ${getPipPositionClass(
                pipPosition
              )} z-30 w-72 sm:w-80 md:w-96 aspect-video rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700/80 bg-slate-900/95 backdrop-blur-xl transition-all duration-300 animate-in fade-in zoom-in-95`}
            >
              <TrackVideoRenderer publication={cameraTrackPublication} className="w-full h-full object-cover" />
              <div className="absolute bottom-2.5 left-2.5 z-10 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800/80 text-[11px] font-semibold text-white flex items-center gap-1.5 shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{getParticipantDisplayName(targetParticipant)}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* RENDER MODE 2: WHOLE MEETING ROOM COMPOSITE GRID */
        <div className="w-full h-full p-4 flex flex-col justify-center items-center">
          {/* If there are any active screen shares in the room, showcase screen prominent */}
          {allScreenTracks.length > 0 ? (
            <div className="w-full h-full flex flex-col md:flex-row gap-3">
              {/* Primary Screen presentation */}
              <div className="flex-1 h-full rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-slate-800 relative">
                <VideoTrack trackRef={allScreenTracks[0]} className="w-full h-full object-contain" />
                <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold text-white">
                  Presentation: {getParticipantDisplayName(allScreenTracks[0].participant)}
                </div>
              </div>

              {/* Sidebar Cameras */}
              <div className="w-full md:w-72 lg:w-80 flex flex-row md:flex-col gap-3 overflow-auto">
                {allCameraTracks.slice(0, 4).map((trackRef) => (
                  <div
                    key={trackRef.publication.trackSid}
                    className="relative flex-1 min-h-[140px] rounded-xl overflow-hidden bg-slate-900 border border-slate-800"
                  >
                    <VideoTrack trackRef={trackRef} className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-medium text-white">
                      {getParticipantDisplayName(trackRef.participant)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Multi-Participant Responsive Video Grid */
            <div
              className={`w-full h-full grid gap-3 ${
                allCameraTracks.length <= 1
                  ? "grid-cols-1"
                  : allCameraTracks.length <= 2
                  ? "grid-cols-1 md:grid-cols-2"
                  : allCameraTracks.length <= 4
                  ? "grid-cols-2 grid-rows-2"
                  : "grid-cols-2 md:grid-cols-3"
              }`}
            >
              {allCameraTracks.map((trackRef) => (
                <div
                  key={trackRef.publication.trackSid}
                  className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center"
                >
                  <VideoTrack trackRef={trackRef} className="w-full h-full object-cover" />
                  <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-xs font-semibold text-white">
                    {getParticipantDisplayName(trackRef.participant)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Track Video Renderer helper component to safely attach LiveKit video tracks
function TrackVideoRenderer({
  publication,
  className,
}: {
  publication: any;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const track = publication?.track;
    const el = videoRef.current;
    if (track && el) {
      track.attach(el);
      return () => {
        track.detach(el);
      };
    }
  }, [publication, publication?.track]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={className || "w-full h-full object-contain"}
    />
  );
}
