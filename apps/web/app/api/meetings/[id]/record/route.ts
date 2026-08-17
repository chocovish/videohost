import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import { getEgressClient } from "@/lib/livekit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { action = "toggle" } = body; // "start" | "stop" | "toggle"

    const meeting = await db.meeting.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const session = await auth();
    const userId = session?.user?.id;
    const isAuthUser = Boolean(userId);

    const isCreator = isAuthUser && userId === meeting.createdById;
    let isOrgMember = isAuthUser && (session as any)?.organizationId === meeting.organizationId;
    if (isAuthUser && !isOrgMember && userId) {
      const membership = await db.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: meeting.organizationId,
            userId,
          },
        },
      });
      if (membership) isOrgMember = true;
    }

    if (!isCreator && !isOrgMember) {
      return NextResponse.json(
        { error: "Only the meeting creator or organization members can record this meeting." },
        { status: 403 }
      );
    }

    let nextRecordingState = meeting.isRecording;
    if (action === "start") nextRecordingState = true;
    else if (action === "stop") nextRecordingState = false;
    else if (action === "toggle") nextRecordingState = !meeting.isRecording;

    let egressId = meeting.recordingId;

    // Optional LiveKit Egress Server Integration:
    if (process.env.LIVEKIT_EGRESS_ENDPOINT) {
      try {
        const egressClient = getEgressClient();
        if (nextRecordingState && !meeting.isRecording) {
          // start room composite egress if configured
          // Note: In self-hosted setups without egress, client-side recorder handles capture
        } else if (!nextRecordingState && meeting.recordingId) {
          await egressClient.stopEgress(meeting.recordingId);
        }
      } catch (egressErr) {
        console.warn("LiveKit Egress warning (falling back to client recording):", egressErr);
      }
    }

    const updated = await db.meeting.update({
      where: { id: meeting.id },
      data: {
        isRecording: nextRecordingState,
        recordingId: egressId,
      },
    });

    return NextResponse.json({
      success: true,
      isRecording: updated.isRecording,
      recordingId: updated.recordingId,
      message: nextRecordingState ? "Recording started" : "Recording stopped",
    });
  } catch (err: any) {
    console.error("POST /api/meetings/[id]/record error:", err);
    return NextResponse.json({ error: err.message || "Failed to update recording state" }, { status: 500 });
  }
}
