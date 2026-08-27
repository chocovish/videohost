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
import "@livekit/components-styles";
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
  Sliders,
  X,
  MoreVertical,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import InMeetingInviteModal from "@/components/meetings/InMeetingInviteModal";
import MeetingSettingsModal from "@/components/meetings/MeetingSettingsModal";
import ParticipantsPanel from "@/components/meetings/ParticipantsPanel";
import RecordOptionsModal from "@/components/meetings/RecordOptionsModal";
import RecordingUpgradeModal from "@/components/meetings/RecordingUpgradeModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
    organizationLogoUrl?: string | null;
    themeId?: string;
    isHost?: boolean;
    isOrgMember?: boolean;
    canModerate?: boolean;
    canRecord?: boolean;
    isFreePlan?: boolean;
    planName?: string;
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
  const [isEndMeetingConfirmOpen, setIsEndMeetingConfirmOpen] = useState(false);
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);

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
  const [isRecordOptionsOpen, setIsRecordOptionsOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
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

  // Active Recording Configuration (persisted across live updates)
  const [activeRecordingLayout, setActiveRecordingLayout] = useState<
    "grid" | "speaker" | "single-speaker"
  >("grid");

  // Trigger Record Button Click: If not recording, open options popup or upgrade popup on Free plan
  const handleRecordButtonClick = () => {
    if (meeting.isFreePlan) {
      setIsUpgradeModalOpen(true);
      return;
    }
    setRecordingError(null);
    setIsRecordOptionsOpen(true);
  };

  // Stop Recording Handler
  const handleStopRecording = async () => {
    if (isUpdatingRecord) return;
    setIsUpdatingRecord(true);
    setRecordingError(null);

    try {
      const res = await fetch(`/api/meetings/${meeting.id}/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsRecording(false);
        showToast("Recording stopped and saved to organization library.", "info");
      } else {
        throw new Error(data.error || "Failed to stop recording.");
      }
    } catch (err: any) {
      console.error("Failed to stop recording:", err);
      showToast(err.message || "Failed to stop recording.", "error");
    } finally {
      setIsUpdatingRecord(false);
    }
  };

  // Start Recording Handler with chosen Room Composite layout
  const handleStartRecordingWithLayout = async (options: {
    layout: "grid" | "speaker" | "single-speaker";
  }) => {
    if (isRecording) {
      showToast("Stop the current recording before starting a new one.", "info");
      return;
    }

    setIsUpdatingRecord(true);
    setRecordingError(null);

    try {
      const res = await fetch(`/api/meetings/${meeting.id}/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          layout: options.layout,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsRecording(true);
        setActiveRecordingLayout(options.layout);
        setIsRecordOptionsOpen(false);

        const layoutLabel =
          options.layout === "single-speaker"
            ? "Single Speaker"
            : options.layout === "speaker"
            ? "Speaker"
            : "Grid";
        showToast(`Meeting recording started (${layoutLabel} layout).`, "success");
      } else {
        throw new Error(data.error || "Recording start failed.");
      }
    } catch (err: any) {
      console.error("Failed to start recording:", err);
      const hostUrl = typeof window !== "undefined" ? window.location.origin : "";
      const fallback = `${hostUrl}/dashboard/uploaded-videos`;
      const message = err.message || "Recording start failed. You may use screen recording.";
      setRecordingError(message);
      setRecordingFallbackUrl(fallback);
      showToast(message, "error");
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

  const handleEndMeetingForAll = () => {
    setIsEndMeetingConfirmOpen(true);
  };

  const confirmEndMeetingForAll = async () => {
    setIsEndingMeeting(true);
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
    } finally {
      setIsEndingMeeting(false);
      setIsEndMeetingConfirmOpen(false);
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
      <header className="h-14 px-3 sm:px-5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between z-20 backdrop-blur-md gap-2">
        {/* Left: Organization Logo & Meeting Title */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {meeting.organizationLogoUrl ? (
            <img
              src={meeting.organizationLogoUrl}
              alt={meeting.organizationName || "Organization"}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover border border-slate-700/60 shrink-0 bg-slate-900 shadow-xs"
            />
          ) : (
            <img
              src="/taped-in-logo.webp"
              alt="Taped"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain border border-slate-700/60 shrink-0 bg-slate-900 p-1 shadow-xs"
            />
          )}

          <div className="flex items-center gap-2 min-w-0">
            <div className="flex flex-col min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-[130px] sm:max-w-xs md:max-w-md leading-tight">
                {meeting.title}
              </h2>
              {meeting.organizationName && (
                <span className="text-[10px] text-slate-400 truncate hidden sm:inline leading-none mt-0.5">
                  {meeting.organizationName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: In-meeting Timer, Recording Status & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Meeting duration call timer with animated pulse */}
          <div className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-full bg-slate-950/60 border border-slate-800 text-[11px] sm:text-xs font-mono text-slate-300 font-semibold inline-flex items-center gap-1.5 sm:gap-2">
            <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500" />
            </span>
            <span className="leading-none tracking-tight">{formatTimer(meetingSeconds)}</span>
          </div>

          {/* Recording Badge (Restricted to Org Members / Host) */}
          {isRecording && Boolean(meeting.isOrgMember || meeting.isHost) && (
            <div className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11px] sm:text-xs font-mono font-bold inline-flex items-center gap-1.5 animate-pulse">
              <Disc className="w-3.5 h-3.5 shrink-0" />
              <span className="leading-none tracking-tight">REC {formatTimer(recordingSeconds)}</span>
            </div>
          )}

          {/* --- Desktop Controls (hidden on mobile, visible on sm/md and up) --- */}
          <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
            {/* Recording Controls for Host / Authorized Members */}
            {(meeting.canRecord || meeting.isHost || meeting.isOrgMember) && (
              <div className="flex items-center gap-1.5">
                {meeting.isFreePlan ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsUpgradeModalOpen(true)}
                    className="inline-flex gap-1.5 text-slate-300 hover:text-white border-slate-700/80 bg-slate-900/60 hover:bg-slate-800 transition-colors shadow-xs"
                    title="Meeting recording is not available on the Free plan. Click to view upgrade options."
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden md:inline">Record</span>
                    <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">
                      Upgrade
                    </span>
                  </Button>
                ) : (
                  <>
                    {/* If Recording: Show Live Adjust Layout Button */}
                    {isRecording && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRecordingError(null);
                          setIsRecordOptionsOpen(true);
                        }}
                        className="inline-flex gap-1.5 text-amber-300 hover:text-amber-200 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20"
                        title="Adjust live recording layout"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">REC Layout</span>
                      </Button>
                    )}

                    {/* Start Record or Stop Record Button */}
                    <Button
                      variant={isRecording ? "destructive" : "default"}
                      size="sm"
                      onClick={isRecording ? handleStopRecording : handleRecordButtonClick}
                      disabled={isUpdatingRecord}
                      className="inline-flex gap-1.5"
                      title={isRecording ? "Stop Recording" : "Record Meeting"}
                    >
                      {isUpdatingRecord ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Disc className={`w-3.5 h-3.5 ${isRecording ? "animate-pulse" : ""}`} />
                      )}
                      <span className="hidden md:inline">{isRecording ? "Stop REC" : "Record"}</span>
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Invite Button (Org Members / Host Only) */}
            {(meeting.isOrgMember || meeting.isHost) && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsInviteOpen(true)}
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Invite</span>
              </Button>
            )}

            {/* Participants Drawer Toggle Button (Desktop only, hidden on mobile) */}
            <Button
              variant={isParticipantsOpen ? "secondary" : "outline"}
              size="icon-sm"
              onClick={() => setIsParticipantsOpen(!isParticipantsOpen)}
              className={`hidden sm:inline-flex relative transition-colors ${
                isParticipantsOpen ? "text-primary border-primary/40" : ""
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
                variant="destructive"
                size="sm"
                onClick={handleEndMeetingForAll}
                title="End meeting for everyone"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span className="hidden md:inline">End for All</span>
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleLeaveMeeting}
                title="Leave meeting"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Leave</span>
              </Button>
            )}
          </div>

          {/* --- Mobile View 3-dot Menu (visible on mobile only, sm:hidden) --- */}
          <div className="sm:hidden flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="text-slate-300 hover:text-white"
                  title="More meeting options"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-slate-900 border border-slate-800 text-slate-200 shadow-2xl p-1.5 z-50"
              >
                {/* Participants list in 3-dot menu */}
                <DropdownMenuItem
                  onClick={() => setIsParticipantsOpen(true)}
                  className="gap-2.5 text-xs cursor-pointer focus:bg-slate-800 focus:text-white py-2 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-sky-400" />
                    <span>Participants</span>
                  </div>
                  <span className="bg-slate-800 text-[10px] font-bold rounded-full px-2 py-0.5 border border-slate-700 text-slate-300">
                    {participants.length}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-800 my-1" />

                {/* Recording Controls in 3-dot Menu */}
                {(meeting.canRecord || meeting.isHost || meeting.isOrgMember) && (
                  <>
                    <DropdownMenuLabel className="text-[10px] text-slate-400 uppercase tracking-wider font-bold px-2 py-1 flex items-center justify-between">
                      <span>Recording</span>
                      {meeting.isFreePlan && (
                        <span className="text-[9px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                          Paid Plan
                        </span>
                      )}
                    </DropdownMenuLabel>

                    {meeting.isFreePlan ? (
                      <DropdownMenuItem
                        onClick={() => setIsUpgradeModalOpen(true)}
                        className="gap-2.5 text-xs cursor-pointer focus:bg-slate-800 focus:text-white py-2 text-slate-300"
                      >
                        <Lock className="w-4 h-4 text-amber-400" />
                        <span>Record Meeting (Upgrade)</span>
                      </DropdownMenuItem>
                    ) : (
                      <>
                        <DropdownMenuItem
                          onClick={isRecording ? handleStopRecording : handleRecordButtonClick}
                          disabled={isUpdatingRecord}
                          className="gap-2.5 text-xs cursor-pointer focus:bg-slate-800 focus:text-white py-2"
                        >
                          {isUpdatingRecord ? (
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          ) : (
                            <Disc
                              className={`w-4 h-4 ${
                                isRecording ? "text-rose-400 animate-pulse" : "text-slate-400"
                              }`}
                            />
                          )}
                          <span className={isRecording ? "text-rose-300 font-semibold" : ""}>
                            {isRecording ? "Stop Recording" : "Start Recording"}
                          </span>
                        </DropdownMenuItem>

                        {isRecording && (
                          <DropdownMenuItem
                            onClick={() => {
                              setRecordingError(null);
                              setIsRecordOptionsOpen(true);
                            }}
                            className="gap-2.5 text-xs cursor-pointer focus:bg-slate-800 focus:text-white py-2 text-amber-300"
                          >
                            <Sliders className="w-4 h-4 text-amber-400" />
                            <span>Adjust REC Layout</span>
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                    <DropdownMenuSeparator className="bg-slate-800 my-1" />
                  </>
                )}

                {/* Invite Options in 3-dot Menu (Org Members / Host Only) */}
                {(meeting.isOrgMember || meeting.isHost) && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setIsInviteOpen(true)}
                      className="gap-2.5 text-xs cursor-pointer focus:bg-slate-800 focus:text-white py-2"
                    >
                      <Plus className="w-4 h-4 text-lime-400" />
                      <span className="font-semibold text-lime-300">Invite People</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-800 my-1" />
                  </>
                )}

                {/* End / Leave Actions in 3-dot Menu */}
                {meeting.isHost ? (
                  <>
                    <DropdownMenuItem
                      onClick={handleEndMeetingForAll}
                      className="gap-2.5 text-xs cursor-pointer focus:bg-rose-950/60 focus:text-rose-200 text-rose-400 py-2"
                    >
                      <PhoneOff className="w-4 h-4 text-rose-400" />
                      <span className="font-bold">End Meeting for All</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleLeaveMeeting}
                      className="gap-2.5 text-xs cursor-pointer focus:bg-slate-800 focus:text-slate-200 text-slate-400 py-2"
                    >
                      <PhoneOff className="w-4 h-4" />
                      <span>Leave (Keep Active)</span>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem
                    onClick={handleLeaveMeeting}
                    className="gap-2.5 text-xs cursor-pointer focus:bg-rose-950/60 focus:text-rose-200 text-rose-400 py-2"
                  >
                    <PhoneOff className="w-4 h-4 text-rose-400" />
                    <span className="font-bold">Leave Meeting</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
          isOrgMember={Boolean(meeting.isOrgMember || meeting.isHost)}
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

      {/* Recording Options Modal */}
      {isRecordOptionsOpen && (
        <RecordOptionsModal
          isOpen={isRecordOptionsOpen}
          onClose={() => setIsRecordOptionsOpen(false)}
          onStartRecording={handleStartRecordingWithLayout}
          meetingTitle={meeting.title}
          isStarting={isUpdatingRecord}
          initialLayout={activeRecordingLayout}
          error={recordingError}
          onClearError={() => setRecordingError(null)}
        />
      )}

      {/* Recording Upgrade Modal for Free Plan Users */}
      <RecordingUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        planName={meeting.planName || (meeting.isFreePlan ? "free" : "paid")}
      />

      {/* End Meeting for All Confirmation Dialog */}
      <ConfirmDialog
        open={isEndMeetingConfirmOpen}
        onOpenChange={setIsEndMeetingConfirmOpen}
        title="End Meeting for Everyone?"
        description="Are you sure you want to end this meeting for all participants? All active attendees will be disconnected and recording will be finalized."
        confirmText="End Meeting"
        cancelText="Cancel"
        variant="danger"
        theme="dark"
        isLoading={isEndingMeeting}
        onConfirm={confirmEndMeetingForAll}
      />
    </div>
  );
}
