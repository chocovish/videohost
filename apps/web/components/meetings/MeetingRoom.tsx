"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
  useParticipants,
  useRoomContext,
  useLocalParticipant,
  useConnectionState,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, ConnectionState, DisconnectReason } from "livekit-client";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Users,
  Disc,
  PhoneOff,
  Copy,
  Check,
  Radio,
  Loader2,
  Plus,
  AlertTriangle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import InMeetingInviteModal from "@/components/meetings/InMeetingInviteModal";
import MeetingSettingsModal from "@/components/meetings/MeetingSettingsModal";

interface MeetingRoomProps {
  token: string;
  serverUrl: string;
  meeting: {
    id: string;
    title: string;
    description?: string | null;
    isRecording?: boolean;
    recordOnStart?: boolean;
    organizationName?: string;
    themeId?: string;
    isHost?: boolean;
    canRecord?: boolean;
  };
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  onLeave?: (reason: "user_left" | "meeting_ended" | "network_error", customMessage?: string) => void;
}

export default function MeetingRoom({
  token,
  serverUrl,
  meeting,
  audioEnabled = true,
  videoEnabled = true,
  onLeave,
}: MeetingRoomProps) {
  const router = useRouter();
  const userIntentionalLeave = useRef(false);

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        video={videoEnabled}
        audio={audioEnabled}
        data-lk-theme="default"
        className="flex-1 flex flex-col h-full overflow-hidden"
        onError={(err) => {
          console.error("LiveKit connection error:", err);
          if (!userIntentionalLeave.current && onLeave) {
            onLeave(
              "network_error",
              "Network Connection Issue: Unable to connect to the meeting video server. Please check your internet connection or network firewall."
            );
          }
        }}
        onDisconnected={(reason) => {
          if (userIntentionalLeave.current) return;

          if (
            reason === DisconnectReason.ROOM_DELETED ||
            reason === DisconnectReason.SERVER_SHUTDOWN ||
            reason === DisconnectReason.ROOM_CLOSED
          ) {
            if (onLeave) onLeave("meeting_ended", "This meeting has ended.");
            else router.push("/dashboard/meetings");
          } else if (
            reason === DisconnectReason.CLIENT_INITIATED ||
            reason === DisconnectReason.UNKNOWN_REASON ||
            reason === undefined
          ) {
            if (onLeave) onLeave("user_left", "You have left the meeting.");
            else router.push("/dashboard/meetings");
          } else if (
            reason === DisconnectReason.JOIN_FAILURE ||
            reason === DisconnectReason.STATE_MISMATCH ||
            reason === DisconnectReason.DUPLICATE_IDENTITY
          ) {
            if (onLeave) {
              onLeave(
                "network_error",
                "Network Connection Issue: Disconnected from the meeting server. Please check your internet connection and try again."
              );
            } else {
              router.push("/dashboard/meetings");
            }
          } else {
            if (onLeave) onLeave("user_left", "You have left the meeting.");
            else router.push("/dashboard/meetings");
          }
        }}
      >
        <RoomContent
          meeting={meeting}
          onLeave={onLeave}
          userIntentionalLeave={userIntentionalLeave}
        />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

function RoomContent({
  meeting,
  onLeave,
  userIntentionalLeave,
}: {
  meeting: MeetingRoomProps["meeting"];
  onLeave?: MeetingRoomProps["onLeave"];
  userIntentionalLeave: React.MutableRefObject<boolean>;
}) {
  const router = useRouter();
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();

  const [copiedCode, setCopiedCode] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);

  // Recording State & Timer
  const [isRecording, setIsRecording] = useState(Boolean(meeting.isRecording || meeting.recordOnStart));
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [meetingSeconds, setMeetingSeconds] = useState(0);
  const [isUpdatingRecord, setIsUpdatingRecord] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [recordingFallbackUrl, setRecordingFallbackUrl] = useState<string | null>(null);

  // Track meeting duration
  useEffect(() => {
    const timer = setInterval(() => {
      setMeetingSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Track recording duration
  useEffect(() => {
    let timer: any;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Toggle Recording Handler
  const handleToggleRecording = async () => {
    if (isUpdatingRecord) return;
    setIsUpdatingRecord(true);
    setRecordingError(null);

    try {
      const nextAction = isRecording ? "stop" : "start";
      const res = await fetch(`/api/meetings/${meeting.id}/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: nextAction }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsRecording(data.isRecording);
      } else {
        const hostUrl = typeof window !== "undefined" ? window.location.origin : "";
        const fallback = data.fallbackUrl || `${hostUrl}/record`;
        const msg = data.error || `Recording start failed. You may use client-side recording at ${fallback}`;
        setRecordingError(msg);
        setRecordingFallbackUrl(fallback);
      }
    } catch (err: any) {
      console.error("Failed to toggle recording:", err);
      const hostUrl = typeof window !== "undefined" ? window.location.origin : "";
      const fallback = `${hostUrl}/record`;
      setRecordingError(`Recording start failed. You may use client-side recording at ${fallback}`);
      setRecordingFallbackUrl(fallback);
    } finally {
      setIsUpdatingRecord(false);
    }
  };

  const handleLeaveMeeting = async () => {
    userIntentionalLeave.current = true;
    try {
      if (room) {
        await room.disconnect();
      }
    } catch (e) {
      console.error("Error disconnecting from room:", e);
    }
    if (onLeave) onLeave("user_left", "You have left the meeting.");
    else router.push("/dashboard/meetings");
  };

  const handleEndMeetingForAll = async () => {
    if (!confirm("Are you sure you want to end this meeting for everyone?")) return;
    userIntentionalLeave.current = true;
    try {
      await fetch(`/api/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ENDED" }),
      });
      if (room) {
        await room.disconnect();
      }
    } catch (e) {
      console.error("Error ending meeting:", e);
    }
    if (onLeave) onLeave("meeting_ended", "The meeting was ended for everyone.");
    else router.push("/dashboard/meetings");
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-slate-950 relative">
      {/* Recording Error Alert Banner */}
      {recordingError && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 max-w-xl w-full px-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="bg-rose-950/95 border border-rose-500/50 text-rose-100 p-4 rounded-xl shadow-2xl backdrop-blur-xl flex items-start justify-between gap-3">
            <div className="flex gap-3 min-w-0">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1.5 min-w-0">
                <p className="font-bold text-white text-sm">Recording Start Failed</p>
                <p className="text-rose-200/90 leading-relaxed">{recordingError}</p>
                {recordingFallbackUrl && (
                  <div className="pt-1">
                    <a
                      href={recordingFallbackUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:text-white hover:bg-emerald-500/30 text-xs font-semibold transition-colors"
                    >
                      Open Client Recording ({recordingFallbackUrl})
                    </a>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setRecordingError(null)}
              className="text-rose-400 hover:text-white p-1 rounded-lg hover:bg-rose-900/50 transition-colors shrink-0"
              title="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Navigation / Status Header Bar */}
      <header className="h-14 px-3 sm:px-6 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between z-20 backdrop-blur-md gap-2">
        {/* Left: Meeting title & code pill */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <h2 className="text-xs sm:text-sm md:text-base font-bold text-white truncate max-w-[120px] sm:max-w-xs md:max-w-md">
              {meeting.title}
            </h2>
          </div>

          <button
            onClick={handleCopyLink}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300 hover:border-slate-700 hover:text-white transition-colors shrink-0"
            title="Click to copy meeting link"
          >
            <span>{meeting.id}</span>
            {copiedCode ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        </div>

        {/* Center: Live Timer & Recording Status Indicator */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Meeting duration timer */}
          <div className="px-2.5 sm:px-3 py-1 rounded-full bg-slate-950/60 border border-slate-800 text-[11px] sm:text-xs font-mono text-slate-300 font-semibold flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-[hsl(var(--primary))]" />
            <span>{formatTimer(meetingSeconds)}</span>
          </div>

          {/* Recording Badge */}
          {isRecording && (
            <div className="px-2.5 sm:px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1.5 animate-pulse">
              <Disc className="w-3.5 h-3.5" />
              <span>REC {formatTimer(recordingSeconds)}</span>
            </div>
          )}
        </div>

        {/* Right: In-meeting Controls (Record, Invite, Participants, End/Leave) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Optional Record Toggle Button for Host */}
          {(meeting.canRecord || meeting.isHost) && (
            <button
              onClick={handleToggleRecording}
              disabled={isUpdatingRecord}
              className={`hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                isRecording
                  ? "bg-rose-500/20 border-rose-500/40 text-rose-400 hover:bg-rose-500/30"
                  : "bg-slate-950 border-slate-800 text-slate-300 hover:text-white"
              }`}
              title={isRecording ? "Stop Recording" : "Record Meeting"}
            >
              {isUpdatingRecord ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Disc className={`w-3.5 h-3.5 ${isRecording ? "animate-pulse" : ""}`} />
              )}
              <span>{isRecording ? "Stop REC" : "Record"}</span>
            </button>
          )}

          {/* Invite Button */}
          <Button
            size="sm"
            onClick={() => setIsInviteOpen(true)}
            className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-black font-bold text-xs h-8 px-2.5 sm:px-3.5 rounded-lg gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Invite</span>
          </Button>

          {/* Participants Drawer Toggle Button */}
          <button
            onClick={() => setIsParticipantsOpen(!isParticipantsOpen)}
            className={`p-2 rounded-lg border text-xs transition-colors relative ${
              isParticipantsOpen
                ? "bg-[hsl(var(--primary))]/15 border-[hsl(var(--primary))]/30 text-[hsl(var(--primary))]"
                : "bg-slate-950 border-slate-800 text-slate-300 hover:text-white"
            }`}
            title="Participants list"
          >
            <Users className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 bg-slate-800 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-slate-700">
              {participants.length}
            </span>
          </button>

          {/* End / Leave Button */}
          {meeting.isHost ? (
            <Button
              size="sm"
              onClick={handleEndMeetingForAll}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-8 px-2.5 sm:px-3 rounded-lg gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer"
              title="End meeting for everyone"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">End for All</span>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleLeaveMeeting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-8 px-2.5 sm:px-3 rounded-lg gap-1.5 cursor-pointer"
              title="Leave meeting"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Leave</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Video Conference Layout + Drawers */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LiveKit Video Conference Stage */}
        <div className="flex-1 h-full w-full relative overflow-hidden bg-slate-950">
          <VideoConference
            chatMessageFormatter={(msg) => msg}
            SettingsComponent={MeetingSettingsModal}
          />
        </div>

        {/* In-Meeting Participants Drawer */}
        {isParticipantsOpen && (
          <aside className="w-80 border-l border-slate-800 bg-slate-900/95 flex flex-col h-full z-20 backdrop-blur-xl animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <Users className="w-4 h-4 text-[hsl(var(--primary))]" />
                <span>Participants ({participants.length})</span>
              </div>
              <button
                onClick={() => setIsParticipantsOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Close
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-2">
              {participants.map((p) => {
                const isLocal = p.isLocal;
                return (
                  <div
                    key={p.identity}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))] font-bold flex items-center justify-center shrink-0">
                        {p.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">
                          {p.name || p.identity}
                          {isLocal && " (You)"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {p.isSpeaking ? "Speaking..." : "Connected"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-400">
                      {p.isMicrophoneEnabled ? (
                        <Mic className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <MicOff className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      {p.isCameraEnabled ? (
                        <VideoIcon className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <VideoOff className="w-3.5 h-3.5 text-rose-400" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-3 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsInviteOpen(true)}
                className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 text-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Invite More People
              </Button>
            </div>
          </aside>
        )}
      </div>

      {/* In-Meeting Invite Modal */}
      {isInviteOpen && (
        <InMeetingInviteModal
          isOpen={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
          meetingId={meeting.id}
          meetingTitle={meeting.title}
        />
      )}
    </div>
  );
}

