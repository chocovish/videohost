import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import { getRoomServiceClient, getEgressClient } from "@/lib/livekit";
import { getPresignedPlaybackUrl } from "@/lib/s3";
import { EgressStatus } from "livekit-server-sdk";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Find by id
    const meeting = await db.meeting.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true, logoUrl: true, themeId: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        invites: true,
        recordedVideo: {
          select: { id: true, title: true, status: true, durationSeconds: true, thumbnailKey: true },
        },
        folder: {
          select: { id: true, name: true },
        },
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    if (meeting.organization) {
      meeting.organization.logoUrl = await getPresignedPlaybackUrl(meeting.organization.logoUrl);
    }

    return NextResponse.json({ meeting });
  } catch (err: any) {
    console.error("GET /api/meetings/[id] error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch meeting" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const meeting = await db.meeting.findUnique({
      where: { id },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (typeof body.title === "string") updateData.title = body.title.trim();
    if (typeof body.description === "string") updateData.description = body.description.trim();
    if (body.scheduledStart) updateData.scheduledStart = new Date(body.scheduledStart);
    if (body.scheduledEnd) updateData.scheduledEnd = new Date(body.scheduledEnd);
    if (typeof body.status === "string") {
      updateData.status = body.status;
      if (body.status === "ENDED") {
        updateData.endedAt = new Date();
        updateData.isRecording = false;

        // Stop active egress recording if applicable
        try {
          const egressClient = getEgressClient();
          let activeEgresses = await egressClient.listEgress({ active: true }).catch(() => []);
          if (!activeEgresses || activeEgresses.length === 0) {
            activeEgresses = await egressClient.listEgress({}).catch(() => []);
          }
          for (const egress of activeEgresses) {
            const egressJson = JSON.stringify(egress);
            const isMatch =
              egress.roomName === id ||
              egress.roomId === id ||
              egressJson.includes(`/meet/${id}`) ||
              egressJson.includes(id);

            if (isMatch && egress.egressId) {
              const isEnded =
                egress.status === EgressStatus.EGRESS_ENDING ||
                egress.status === EgressStatus.EGRESS_COMPLETE ||
                egress.status === EgressStatus.EGRESS_FAILED ||
                egress.status === EgressStatus.EGRESS_ABORTED;

              if (!isEnded) {
                await egressClient.stopEgress(egress.egressId).catch(() => {});
              }
            }
          }
        } catch (egressErr: any) {
          console.warn("Could not stop egress on meeting end:", egressErr?.message || egressErr);
        }

        // Delete LiveKit room to disconnect all connected participants immediately
        try {
          const roomServiceClient = getRoomServiceClient();
          await roomServiceClient.deleteRoom(id);
        } catch (lkErr: any) {
          console.warn("Could not delete LiveKit room on meeting end:", lkErr?.message || lkErr);
        }
      }
    }
    if (typeof body.isRecording === "boolean") updateData.isRecording = body.isRecording;
    if (body.recordedVideoId) updateData.recordedVideoId = body.recordedVideoId;

    const updated = await db.meeting.update({
      where: { id: meeting.id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        invites: true,
      },
    });

    return NextResponse.json({ meeting: updated });
  } catch (err: any) {
    console.error("PATCH /api/meetings/[id] error:", err);
    return NextResponse.json({ error: err.message || "Failed to update meeting" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const meeting = await db.meeting.findUnique({
      where: { id },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Only host or organization member can delete
    try {
      const roomServiceClient = getRoomServiceClient();
      await roomServiceClient.deleteRoom(id);
    } catch (lkErr: any) {
      console.warn("Could not delete LiveKit room on meeting DELETE:", lkErr?.message || lkErr);
    }

    await db.meeting.delete({
      where: { id: meeting.id },
    });

    return NextResponse.json({ success: true, message: "Meeting deleted successfully" });
  } catch (err: any) {
    console.error("DELETE /api/meetings/[id] error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete meeting" }, { status: 500 });
  }
}
