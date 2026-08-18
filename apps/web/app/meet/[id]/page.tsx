"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, AlertCircle, Radio, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import MeetingLobby from "@/components/meetings/MeetingLobby";
import MeetingRoom from "@/components/meetings/MeetingRoom";

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
  const [canRecord, setCanRecord] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(false);

  // Fetch initial meeting info
  useEffect(() => {
    if (!id) return;

    async function loadMeeting() {
      try {
        setIsLoading(true);
        setError(null);
        setRequiresAuth(false);

        const res = await fetch(`/api/meetings/${id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Meeting not found or has ended");
        }

        if (data.meeting?.status === "ENDED") {
          throw new Error("This meeting has ended.");
        }
        if (data.meeting?.status === "CANCELLED") {
          throw new Error("This meeting has been cancelled.");
        }

        setMeeting(data.meeting);

        const currentUserId = session?.user?.id;
        if (currentUserId && data.meeting.createdById === currentUserId) {
          setIsHost(true);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load meeting details");
      } finally {
        setIsLoading(false);
      }
    }

    if (authStatus !== "loading") {
      loadMeeting();
    }
  }, [id, session?.user?.id, authStatus]);

  // Handle Joining from Lobby
  const handleJoinFromLobby = async (options: {
    displayName: string;
    audioEnabled: boolean;
    videoEnabled: boolean;
  }) => {
    try {
      setIsLoading(true);
      setError(null);
      setRequiresAuth(false);

      const res = await fetch(`/api/meetings/${id}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantName: options.displayName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.requireAuth) {
          setRequiresAuth(true);
        }
        throw new Error(data.error || "Failed to join meeting");
      }

      setToken(data.token);
      setLivekitUrl(data.url);
      setIsHost(Boolean(data.isHost));
      setCanRecord(Boolean(data.canRecord));
      setAudioEnabled(options.audioEnabled);
      setVideoEnabled(options.videoEnabled);
      setIsInRoom(true);
    } catch (err: any) {
      setError(err.message || "Failed to generate meeting token");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !meeting && !isInRoom) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-[hsl(var(--primary))] mb-4" />
        <p className="text-sm font-medium text-slate-400">Connecting to meeting room...</p>
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
                onClick={() => router.push(`/auth/login?callbackUrl=/meet/${id}`)}
                className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-black font-bold"
              >
                Sign In to Join Call
              </Button>
            ) : (
              <Button
                onClick={() => router.push("/dashboard/meetings")}
                className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-black font-bold gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
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
          themeId: meeting.organization?.themeId,
          isHost,
          canRecord,
        }}
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        onLeave={() => {
          setIsInRoom(false);
          if (session?.user) {
            router.push("/dashboard/meetings");
          } else {
            setError("This meeting has ended.");
          }
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
