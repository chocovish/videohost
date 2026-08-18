import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import { createMeetingAccessToken } from "@/lib/livekit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    // Find meeting by either id or code
    const meeting = await db.meeting.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true, logoUrl: true, themeId: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    if (meeting.status === "CANCELLED") {
      return NextResponse.json({ error: "This meeting has been cancelled." }, { status: 410 });
    }

    if (meeting.status === "ENDED") {
      return NextResponse.json({ error: "This meeting has ended." }, { status: 410 });
    }

    const session = await auth();
    const isAuthUser = Boolean(session?.user?.id);
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    if (!isAuthUser && meeting.allowGuests === false) {
      return NextResponse.json(
        { error: "The host requires all attendees to sign in before joining this meeting.", requireAuth: true },
        { status: 403 }
      );
    }

    // Check host and organization member privileges:
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
      if (membership) {
        isOrgMember = true;
      }
    }

    const isHost = isCreator;
    const canRecord = isCreator || isOrgMember;

    // Determine participant identity and display name
    const participantName =
      (body.participantName && String(body.participantName).trim()) ||
      session?.user?.name ||
      (userEmail ? userEmail.split("@")[0] : `Guest-${Math.floor(1000 + Math.random() * 9000)}`);

    const identity = isAuthUser
      ? `user_${userId}`
      : (body.identity || `guest_${Math.random().toString(36).substring(2, 10)}`);

    const image = session?.user?.image || undefined;

    // If meeting was in SCHEDULED status and host joins, update to ACTIVE
    if (meeting.status === "SCHEDULED" && isHost) {
      await db.meeting.update({
        where: { id: meeting.id },
        data: { status: "ACTIVE" },
      });
      meeting.status = "ACTIVE";
    }

    const token = await createMeetingAccessToken({
      roomName: meeting.id,
      identity,
      name: participantName,
      image,
      isHost,
      canPublish: true,
      canSubscribe: true,
    });

    const livekitPublicUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL || "ws://127.0.0.1:7880";

    return NextResponse.json({
      token,
      url: livekitPublicUrl,
      isHost,
      canRecord,
      participantName,
      identity,
      meeting: {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        status: meeting.status,
        recordOnStart: meeting.recordOnStart,
        allowGuests: meeting.allowGuests,
        isRecording: meeting.isRecording,
        canRecord,
        organizationName: meeting.organization?.name,
        themeId: meeting.organization?.themeId || "lime",
        createdById: meeting.createdById,
        hostName: meeting.createdBy?.name || "Host",
        hostImage: meeting.createdBy?.image,
      },
    });
  } catch (err: any) {
    console.error("POST /api/meetings/[id]/token error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate meeting token" }, { status: 500 });
  }
}
