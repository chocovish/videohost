import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "@videohost/db";
import { getLiveKitCredentials, createMeetingAccessToken } from "@/lib/livekit";
import EgressRecordingView from "./EgressRecordingView";

interface EgressPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    token?: string;
    mode?: "room" | "participant";
    target?: string;
    cam?: string;
    screen?: string;
    pip?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
    internal?: string;
  }>;
}

export default async function EgressPage({ params, searchParams }: EgressPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const reqHeaders = await headers();

  const meeting = await db.meeting.findUnique({
    where: { id },
  });

  if (!meeting) {
    notFound();
  }

  // Detect if request originated from LiveKit Egress container
  const isEgressBot = sp.internal === "1"

  // Use internal private network URL (e.g. ws://livekit:7880) inside egress, fallback to public LIVEKIT_URL
  const { livekitUrl } = getLiveKitCredentials();
  const serverUrl =
    isEgressBot && process.env.LIVEKIT_INTERNAL_URL
      ? process.env.LIVEKIT_INTERNAL_URL
      : livekitUrl;

  let token = sp.token;
  if (!token) {
    // Generate secure egress bot token if not supplied in query
    token = await createMeetingAccessToken({
      roomName: meeting.id,
      identity: "egress-recorder-bot",
      name: "Egress Recorder",
      canPublish: false,
      canSubscribe: true,
      canModerate: false,
      isHidden: true,
    });
  }

  const mode = sp.mode === "participant" ? "participant" : "room";
  const targetIdentity = sp.target || "";
  const showCamera = sp.cam !== "0";
  const showScreen = sp.screen !== "0";
  const pipPosition = sp.pip || "bottom-right";

  return (
    <main className="h-screen w-screen bg-slate-950 overflow-hidden">
      <EgressRecordingView
        token={token}
        serverUrl={serverUrl}
        meetingId={meeting.id}
        initialMode={mode}
        initialTargetIdentity={targetIdentity}
        initialShowCamera={showCamera}
        initialShowScreen={showScreen}
        initialPipPosition={pipPosition}
      />
    </main>
  );
}
