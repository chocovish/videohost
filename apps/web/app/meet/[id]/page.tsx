"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Loader2,
  AlertCircle,
  Radio,
  ArrowLeft,
  WifiOff,
  CheckCircle2,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MeetingLobby from "@/components/meetings/MeetingLobby";
import MeetingRoom from "@/components/meetings/MeetingRoom";

export type LeaveReason = "user_left" | "meeting_ended" | "network_error" | "removed_by_host";

export default function MeetPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meeting, setMeeting] = useState<any>(null);

  // Lobby vs Active Room State
  const [isInRoom, setIsInRoom] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [isOrgMember, setIsOrgMember] = useState(false);
  const [canModerate, setCanModerate] = useState(false);
  const [canRecord, setCanRecord] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(false);

  // Distinguish exit / disconnect states
  const [leaveState, setLeaveState] = useState<{
    reason: LeaveReason;
    message: string;
  } | null>(null);
  const [isReopening, setIsReopening] = useState(false);

  // Fetch initial meeting info
  useEffect(() => {
    if (!id) return;

    async function loadMeeting() {
      try {
        setIsLoading(true);
        setError(null);
        setLeaveState(null);
        setRequiresAuth(false);

        const res = await fetch(`/api/meetings/${id}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (res.status === 410 || data?.error?.includes("ended")) {
            setLeaveState({
              reason: "meeting_ended",
              message: data.error || "This meeting has already ended.",
            });
            return;
          }
          throw new Error(data.error || "Meeting not found or has ended");
        }

        const currentUserId = session?.user?.id;
        const userIsHost = Boolean(
          data.isHost ||
          (currentUserId && data.meeting?.createdById === currentUserId)
        );
        const userIsOrgMember = Boolean(data.isOrgMember || userIsHost);

        setIsHost(userIsHost);
        setIsOrgMember(userIsOrgMember);
        setCanModerate(Boolean(data.canModerate || userIsHost || userIsOrgMember));
        setCanRecord(Boolean(data.canRecord || userIsHost || userIsOrgMember));
        setMeeting(data.meeting);

        if (data.meeting?.status === "CANCELLED") {
          setError("This meeting has been cancelled.");
          return;
        }

        if (data.meeting?.status === "ENDED") {
          setLeaveState({
            reason: "meeting_ended",
            message:
              userIsHost || userIsOrgMember
                ? "This meeting was previously ended. As a host or team member, you can reopen it to start the room again."
                : "This meeting has ended.",
          });
          return;
        }
      } catch (err: any) {
        if (err.name === "TypeError" || err.message?.includes("fetch")) {
          setLeaveState({
            reason: "network_error",
            message:
              "Network Connection Issue: Failed to reach the meeting server. Please check your internet connection or network setup.",
          });
        } else {
          setError(err.message || "Failed to load meeting details");
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (authStatus !== "loading") {
      loadMeeting();
    }
  }, [id, session?.user?.id, authStatus]);

  // Handle Reopening Meeting Room
  const handleReopenMeeting = async () => {
    try {
      setIsReopening(true);
      setError(null);
      const res = await fetch(`/api/meetings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to reopen meeting room");
      }
      if (data.meeting) {
        setMeeting(data.meeting);
      } else {
        setMeeting((prev: any) => (prev ? { ...prev, status: "ACTIVE" } : null));
      }
      setLeaveState(null);
    } catch (err: any) {
      setError(err.message || "Failed to reopen meeting room");
    } finally {
      setIsReopening(false);
    }
  };

  // Handle Joining from Lobby
  const handleJoinFromLobby = async (options: {
    displayName: string;
    audioEnabled: boolean;
    videoEnabled: boolean;
  }) => {
    try {
      setIsLoading(true);
      setError(null);
      setLeaveState(null);
      setRequiresAuth(false);

      const res = await fetch(`/api/meetings/${id}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantName: options.displayName,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.requireAuth) {
          setRequiresAuth(true);
        }
        if (res.status === 410 || data?.error?.includes("ended")) {
          setLeaveState({
            reason: "meeting_ended",
            message: data.error || "This meeting has ended.",
          });
          return;
        }
        throw new Error(data.error || "Failed to join meeting");
      }

      setToken(data.token);
      setLivekitUrl(data.url);
      setIsHost(Boolean(data.isHost));
      setCanRecord(Boolean(data.canRecord));
      setIsOrgMember(Boolean(data.isOrgMember || data.isHost));
      setCanModerate(Boolean(data.canModerate || data.isHost || data.isOrgMember));
      setAudioEnabled(options.audioEnabled);
      setVideoEnabled(options.videoEnabled);
      setIsInRoom(true);
    } catch (err: any) {
      if (err.name === "TypeError" || err.message?.includes("fetch")) {
        setLeaveState({
          reason: "network_error",
          message:
            "Network Connection Issue: Failed to connect to video services. Please check your internet connection.",
        });
      } else {
        setError(err.message || "Failed to generate meeting token");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !meeting && !isInRoom && !leaveState) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-sm font-medium text-slate-400">Connecting to meeting room...</p>
      </div>
    );
  }

  // Render Leave/Ended/Network Error/Removed Screen
  if (leaveState && !isInRoom) {
    const isNetwork = leaveState.reason === "network_error";
    const isEnded = leaveState.reason === "meeting_ended";
    const isRemoved = leaveState.reason === "removed_by_host";
    const isUserLeft = leaveState.reason === "user_left";
    const canReopen =
      isEnded &&
      (isHost || isOrgMember || (session?.user?.id && meeting?.createdById === session.user.id));

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div
            className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center border ${
              isNetwork
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : isEnded
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : isRemoved
                ? "bg-rose-500/15 border-rose-500/40 text-rose-400"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            }`}
          >
            {isNetwork ? (
              <WifiOff className="w-7 h-7" />
            ) : isEnded ? (
              <Radio className="w-7 h-7" />
            ) : isRemoved ? (
              <ShieldAlert className="w-7 h-7" />
            ) : (
              <CheckCircle2 className="w-7 h-7" />
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">
              {isNetwork
                ? "Network Connection Issue"
                : isEnded
                ? "Meeting Has Ended"
                : isRemoved
                ? "Removed from Meeting"
                : "You Left the Meeting"}
            </h2>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              {leaveState.message}
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            {isUserLeft || isNetwork ? (
              <Button
                variant="lime"
                size="lg"
                onClick={() => {
                  setLeaveState(null);
                }}
                className="w-full gap-2 font-bold cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isNetwork ? "Retry Connection" : "Rejoin Meeting"}</span>
              </Button>
            ) : canReopen ? (
              <Button
                variant="lime"
                size="lg"
                disabled={isReopening}
                onClick={handleReopenMeeting}
                className="w-full gap-2 font-bold cursor-pointer"
              >
                {isReopening ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                <span>{isReopening ? "Reopening Room..." : "Reopen Meeting Room"}</span>
              </Button>
            ) : null}

            <Button
              variant={!isUserLeft && !isNetwork && !canReopen ? "lime" : "dark"}
              size="lg"
              onClick={() => router.push(session?.user ? "/dashboard/meetings" : "/")}
              className="w-full gap-2 font-bold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{session?.user ? "Back to Dashboard" : "Go to Home"}</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (error && !isInRoom) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {requiresAuth ? "Sign In Required" : "Meeting Unavailable"}
            </h2>
            <p className="text-sm text-slate-400 mt-2">{error}</p>
          </div>
          <div className="space-y-2 pt-2">
            {requiresAuth ? (
              <Button
                variant="lime"
                size="lg"
                onClick={() => router.push(`/auth/login?callbackUrl=/meet/${id}`)}
                className="w-full font-bold"
              >
                Sign In to Join Call
              </Button>
            ) : (
              <Button
                variant="lime"
                size="lg"
                onClick={() => router.push(session?.user ? "/dashboard/meetings" : "/")}
                className="w-full gap-2 font-bold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{session?.user ? "Back to Dashboard" : "Go to Home"}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isInRoom && token && livekitUrl && meeting) {
    return (
      <MeetingRoom
        token={token}
        serverUrl={livekitUrl}
        meeting={{
          id: meeting.id,
          title: meeting.title,
          description: meeting.description,
          isRecording: meeting.isRecording,
          recordOnStart: meeting.recordOnStart,
          organizationName: meeting.organization?.name,
          organizationLogoUrl: meeting.organization?.logoUrl,
          themeId: meeting.organization?.themeId,
          isHost,
          isOrgMember,
          canModerate,
          canRecord,
        }}
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        onLeave={(reason, customMessage) => {
          setIsInRoom(false);
          setLeaveState((prev) => {
            if (prev?.reason === "user_left" || prev?.reason === "meeting_ended" || prev?.reason === "removed_by_host") {
              return prev;
            }
            return {
              reason: reason || "user_left",
              message:
                customMessage ||
                (reason === "meeting_ended"
                  ? "This meeting has ended."
                  : reason === "removed_by_host"
                  ? "You were removed from the meeting by an organization moderator."
                  : reason === "network_error"
                  ? "Network Connection Issue: Disconnected from the meeting server."
                  : "You have left the meeting."),
            };
          });
        }}
      />
    );
  }

  return (
    <MeetingLobby
      meeting={meeting}
      initialName={session?.user?.name || ""}
      isHost={isHost}
      onJoin={handleJoinFromLobby}
    />
  );
}
