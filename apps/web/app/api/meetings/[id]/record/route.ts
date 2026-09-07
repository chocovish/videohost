import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import {
  startMeetingRecording,
  stopMeetingRecording,
  ALLOWED_RECORDING_LAYOUTS,
} from "@/lib/meeting-recording";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const {
      action = "toggle",
      layout = "grid",
    } = body;

    const compositeLayout = (ALLOWED_RECORDING_LAYOUTS as readonly string[]).includes(layout)
      ? layout
      : "grid";

    const meeting = await db.meeting.findUnique({
      where: { id },
      include: {
        organization: {
          include: { plan: true },
        },
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const orgPlanName = meeting.organization?.plan?.name?.toLowerCase() || "free";
    const isFreePlan = orgPlanName === "free";

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

    if (nextRecordingState && isFreePlan) {
      return NextResponse.json(
        {
          error: "Meeting recording is not available on the Free plan. Please upgrade your organization plan to enable recording.",
          code: "PLAN_RESTRICTION",
        },
        { status: 403 }
      );
    }

    const providedEgressId = body.egressId || body.recordingId;

    if (nextRecordingState) {
      const result = await startMeetingRecording({
        meetingId: meeting.id,
        layout: compositeLayout,
        userId,
      });

      if (!result.success) {
        return NextResponse.json(
          {
            error: result.error || "Failed to start recording",
            code: result.code,
            egressFailed: result.egressFailed,
            fallbackUrl: result.fallbackUrl,
          },
          { status: result.code === "PLAN_RESTRICTION" ? 403 : 500 }
        );
      }

      return NextResponse.json({
        success: true,
        isRecording: result.isRecording,
        videoId: result.videoId,
        egressId: result.egressId,
        message: result.message || "Recording started",
      });
    } else {
      const stopResult = await stopMeetingRecording(meeting.id, providedEgressId);
      return NextResponse.json({
        success: stopResult.success,
        isRecording: false,
        message: stopResult.message,
      });
    }
  } catch (err: any) {
    console.error("POST /api/meetings/[id]/record error:", err);
    return NextResponse.json({ error: err.message || "Failed to update recording state" }, { status: 500 });
  }
}
