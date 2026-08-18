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
import { Track, ConnectionState, DisconnectReason, RoomEvent } from "livekit-client";
import "@/styles/livekit.css";
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
  Info,
  ShieldAlert,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import InMeetingInviteModal from "@/components/meetings/InMeetingInviteModal";
import MeetingSettingsModal from "@/components/meetings/MeetingSettingsModal";
import ParticipantsPanel from "@/components/meetings/ParticipantsPanel";

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
    isOrgMember?: boolean;
    canModerate?: boolean;
    canRecord?: boolean;
  };
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  onLeave?: (reason: "user_left" | "meeting_ended" | "network_error" | "removed_by_host", customMessage?: string) => void;
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

  // In-Meeting Notification Toast State
  const [inMeetingToast, setInMeetingToast] = useState<{
    message: string;
    type: "info" | "success" | "warning" | "error";
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: "info" | "success" | "warning" | "error" = "info") => {
      setInMeetingToast({ message, type });
    },
    []
  );

  useEffect(() => {
    if (!inMeetingToast) return;
    const timer = setTimeout(() => setInMeetingToast(null), 4500);
    return () => clearTimeout(timer);
  }, [inMeetingToast]);

  // Listen for incoming realtime moderation events via LiveKit Data Channel
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = async (
      payload: Uint8Array,
      participant?: any
    ) => {
      try {
        const text = new TextDecoder().decode(payload);
        const data = JSON.parse(text);

        if (data?.type === "MODERATION_EVENT") {
          const myIdentity = room.localParticipant.identity;
          const isForMe = data.targetIdentity === myIdentity;
          const moderatorName = data.moderatorName || "An organization moderator";

          if (data.action === "MUTE_ALL") {
            if (!meeting.isHost && myIdentity !== data.moderatorIdentity) {
              await room.localParticipant.setMicrophoneEnabled(false);
              showToast(
                `Your microphone was muted by ${moderatorName} (Mute All).`,
                "warning"
              );
            }
            return;
          }

          if (!isForMe) return;

          if (data.action === "MUTE_MIC") {
            await room.localParticipant.setMicrophoneEnabled(false);
            showToast(
              `Your microphone was muted by ${moderatorName}.`,
              "warning"
            );
          } else if (data.action === "STOP_VIDEO") {
            await room.localParticipant.setCameraEnabled(false);
            showToast(
              `Your camera was turned off by ${moderatorName}.`,
              "warning"
            );
          } else if (data.action === "STOP_SCREENSHARE") {
            await room.localParticipant.setScreenShareEnabled(false);
            showToast(
              `Your screen share was stopped by ${moderatorName}.`,
              "warning"
            );
          } else if (data.action === "KICK") {
            userIntentionalLeave.current = true;
            try {
              await room.disconnect();
            } catch (dcErr) {
              console.warn("Disconnect error after kick:", dcErr);
            }
            if (onLeave) {
              onLeave(
                "user_left",
                data.reason ||
                  `You were removed from the meeting by ${moderatorName}.`
              );
            }
          }
        }
      } catch (err) {
        console.warn("Could not decode LiveKit data packet:", err);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, meeting.isHost, onLeave, showToast, userIntentionalLeave]);

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
        throw new Error(data.error || "Recording start failed.");
      }
    } catch (err: any) {
      console.error("Failed to toggle recording:", err);
      const hostUrl = typeof window !== "undefined" ? window.location.origin : "";
      const fallback = `${hostUrl}/dashboard/uploaded-videos`;
      setRecordingError(`Recording start failed. You may use screen recording`);
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
      {/* Moderation Toast Alert Notification */}
      {inMeetingToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-none">
          <div
            className={`pointer-events-auto p-3.5 rounded-xl shadow-2xl backdrop-blur-xl border flex items-center justify-between gap-3 text-xs font-medium ${
              inMeetingToast.type === "error"
                ? "bg-rose-950/95 border-rose-500/50 text-rose-100"
                : inMeetingToast.type === "warning"
                ? "bg-amber-950/95 border-amber-500/50 text-amber-100"
                : inMeetingToast.type === "success"
                ? "bg-emerald-950/95 border-emerald-500/50 text-emerald-100"
                : "bg-slate-900/95 border-slate-700 text-slate-100"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {inMeetingToast.type === "error" ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : inMeetingToast.type === "warning" ? (
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              ) : inMeetingToast.type === "success" ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-sky-400 shrink-0" />
              )}
              <span className="truncate">{inMeetingToast.message}</span>
            </div>
            <button
              onClick={() => setInMeetingToast(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

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
                      Open Screen Recording
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

          <Button
            variant="darkOutline"
            size="xs"
            onClick={handleCopyLink}
            className="hidden sm:inline-flex font-mono text-slate-300 hover:text-white"
            title="Click to copy meeting link"
          >
            <span>{meeting.id}</span>
            {copiedCode ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400" />
            )}
          </Button>
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
            <Button
              variant={isRecording ? "dangerOutline" : "dark"}
              size="sm"
              onClick={handleToggleRecording}
              disabled={isUpdatingRecord}
              className="hidden md:inline-flex gap-1.5"
              title={isRecording ? "Stop Recording" : "Record Meeting"}
            >
              {isUpdatingRecord ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Disc className={`w-3.5 h-3.5 ${isRecording ? "animate-pulse" : ""}`} />
              )}
              <span>{isRecording ? "Stop REC" : "Record"}</span>
            </Button>
          )}

          {/* Invite Button */}
          <Button
            variant="lime"
            size="sm"
            onClick={() => setIsInviteOpen(true)}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Invite</span>
          </Button>

          {/* Participants Drawer Toggle Button */}
          <Button
            variant={isParticipantsOpen ? "dark" : "darkOutline"}
            size="icon-sm"
            onClick={() => setIsParticipantsOpen(!isParticipantsOpen)}
            className={`relative transition-colors ${
              isParticipantsOpen ? "text-[hsl(var(--primary))] border-[hsl(var(--primary))]/40" : ""
            }`}
            title="Participants list"
          >
            <Users className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 bg-slate-800 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-slate-700 text-slate-200">
              {participants.length}
            </span>
          </Button>

          {/* End / Leave Button */}
          {meeting.isHost ? (
            <Button
              variant="danger"
              size="sm"
              onClick={handleEndMeetingForAll}
              title="End meeting for everyone"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">End for All</span>
            </Button>
          ) : (
            <Button
              variant="danger"
              size="sm"
              onClick={handleLeaveMeeting}
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
        <ParticipantsPanel
          isOpen={isParticipantsOpen}
          onClose={() => setIsParticipantsOpen(false)}
          meetingId={meeting.id}
          canModerate={Boolean(meeting.canModerate || meeting.isHost || meeting.isOrgMember)}
          isHost={Boolean(meeting.isHost)}
          onOpenInvite={() => setIsInviteOpen(true)}
          onToast={showToast}
        />
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

