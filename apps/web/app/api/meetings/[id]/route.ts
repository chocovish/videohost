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

    const session = await auth();
    let isHost = false;
    let isOrgMember = false;
    let hasPurchasedPass = false;

    if (session?.user?.id) {
      const userId = session.user.id;
      isHost = meeting.createdById === userId;
      if (isHost) {
        isOrgMember = true;
        hasPurchasedPass = true;
      } else {
        const membership = await db.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: meeting.organizationId,
              userId,
            },
          },
        });
        if (membership) {
          isOrgMember = true;
          hasPurchasedPass = true;
        } else {
          const purchase = await db.contentPurchase.findFirst({
            where: {
              userId,
              meetingId: meeting.id,
              status: "COMPLETED",
            },
          });
          if (purchase) {
            hasPurchasedPass = true;
          }
        }
      }
    }

    return NextResponse.json({
      meeting,
      isHost,
      isOrgMember,
      hasPurchasedPass,
      canModerate: isHost || isOrgMember,
      canRecord: isHost || isOrgMember,
    });
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

    // Check authorization: user must be meeting creator or organization member
    const userId = session.user.id;
    const isCreator = meeting.createdById === userId;
    let isOrgMember = false;
    if (!isCreator && userId) {
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
        { error: "Forbidden: You do not have permission to modify this meeting" },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (typeof body.title === "string") updateData.title = body.title.trim();
    if (typeof body.description === "string") updateData.description = body.description.trim();
    if (body.scheduledStart) updateData.scheduledStart = new Date(body.scheduledStart);
    if (body.scheduledEnd) updateData.scheduledEnd = new Date(body.scheduledEnd);
    if (typeof body.shareAccessMode === "string") {
      const validModes = ["PUBLIC", "RESTRICTED", "PRIVATE", "PURCHASABLE"];
      if (validModes.includes(body.shareAccessMode)) {
        updateData.shareAccessMode = body.shareAccessMode;
      }
    }
    if (body.price !== undefined) {
      updateData.price = body.price !== null ? parseFloat(String(body.price)) : null;
    }
    if (typeof body.currency === "string") updateData.currency = body.currency;
    if (body.countryPricing !== undefined) updateData.countryPricing = body.countryPricing;
    if (typeof body.allowGuests === "boolean") updateData.allowGuests = body.allowGuests;
    if (typeof body.recordOnStart === "boolean") updateData.recordOnStart = body.recordOnStart;

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
      } else if (body.status === "ACTIVE" || body.status === "SCHEDULED") {
        // Reopen or activate meeting
        updateData.endedAt = null;
        updateData.isRecording = false;
      }
    }
    if (typeof body.isRecording === "boolean") updateData.isRecording = body.isRecording;
    if (body.recordedVideoId) updateData.recordedVideoId = body.recordedVideoId;

    // Synchronize restricted inviteEmails if provided
    if (Array.isArray(body.inviteEmails)) {
      const cleanEmails = body.inviteEmails
        .map((e: any) => (typeof e === "string" ? e.trim().toLowerCase() : ""))
        .filter((e: string) => e.includes("@"));

      const currentInvites = await db.meetingInvite.findMany({
        where: { meetingId: meeting.id },
      });
      const currentEmailSet = new Set(currentInvites.map((i) => i.email.toLowerCase()));
      const targetEmailSet = new Set(cleanEmails);

      // Remove deleted
      const toDelete = currentInvites.filter((i) => !targetEmailSet.has(i.email.toLowerCase())).map((i) => i.id);
      if (toDelete.length > 0) {
        await db.meetingInvite.deleteMany({ where: { id: { in: toDelete } } });
      }

      // Add new
      const toAdd = cleanEmails.filter((e: string) => !currentEmailSet.has(e));
      if (toAdd.length > 0) {
        for (const email of toAdd) {
          await db.meetingInvite.upsert({
            where: { meetingId_email: { meetingId: meeting.id, email } },
            create: { meetingId: meeting.id, email, role: "attendee" },
            update: {},
          });
        }
      }
    }

    const updated = await db.meeting.update({
      where: { id: meeting.id },
      data: updateData,
      include: {
        organization: {
          select: { id: true, name: true, logoUrl: true, themeId: true },
        },
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
