import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import { getEgressClient } from "@/lib/livekit";
import { EncodedFileOutput, EncodedFileType, S3Upload } from "livekit-server-sdk";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { action = "toggle" } = body; // "start" | "stop" | "toggle"

    const meeting = await db.meeting.findUnique({
      where: { id },
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

    // LiveKit Egress Server Integration:
    if (process.env.LIVEKIT_EGRESS_ENDPOINT || process.env.LIVEKIT_URL) {
      try {
        const egressClient = getEgressClient();
        if (nextRecordingState && !meeting.isRecording) {
          let fileOutput: EncodedFileOutput;

          if (process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID) {
            fileOutput = new EncodedFileOutput({
              fileType: EncodedFileType.MP4,
              filepath: `recordings/${meeting.organizationId}/${meeting.id}/{room_name}-{time}.mp4`,
              output: {
                case: "s3",
                value: new S3Upload({
                  accessKey: process.env.R2_ACCESS_KEY_ID,
                  secret: process.env.R2_SECRET_ACCESS_KEY,
                  region: "auto",
                  endpoint: process.env.R2_ENDPOINT,
                  bucket: process.env.R2_BUCKET_NAME,
                  forcePathStyle: true,
                }),
              },
            });
          } else {
            fileOutput = new EncodedFileOutput({
              fileType: EncodedFileType.MP4,
              filepath: `recordings/${meeting.id}-${Date.now()}.mp4`,
            });
          }

          const egressInfo = await egressClient.startRoomCompositeEgress(
            meeting.id,
            fileOutput,
            { layout: "grid" }
          );

          if (egressInfo?.egressId) {
            egressId = egressInfo.egressId;
          }
        } else if (!nextRecordingState && meeting.recordingId) {
          await egressClient.stopEgress(meeting.recordingId);
          egressId = null;
        }
      } catch (egressErr: any) {
        console.error("LiveKit Egress error:", egressErr);
        const host = req.headers.get("host") || "localhost:3000";
        const protocol = req.headers.get("x-forwarded-proto") || "http";
        const hostUrl = `${protocol}://${host}`;
        const fallbackUrl = `${hostUrl}/record`;
        const errorMessage = `Recording start failed: ${egressErr?.message || "Egress service unavailable"}. You may use client-side recording at ${fallbackUrl}`;

        return NextResponse.json(
          {
            error: errorMessage,
            fallbackUrl,
            egressFailed: true,
          },
          { status: 500 }
        );
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
