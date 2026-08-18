import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import { getRoomServiceClient } from "@/lib/livekit";
import { TrackSource, TrackType, DataPacket_Kind } from "livekit-server-sdk";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized: You must be logged in to moderate this meeting." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { targetIdentity, action, trackSid, reason } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Missing required field: action." },
        { status: 400 }
      );
    }

    if (action !== "mute_all" && !targetIdentity) {
      return NextResponse.json(
        { error: "Missing required field: targetIdentity." },
        { status: 400 }
      );
    }

    // Verify meeting and user authorization
    const meeting = await db.meeting.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
    }

    if (meeting.status === "ENDED" || meeting.status === "CANCELLED") {
      return NextResponse.json(
        { error: "This meeting is no longer active." },
        { status: 410 }
      );
    }

    const userId = session.user.id;
    const isCreator = meeting.createdById === userId;
    let isOrgMember = (session as any)?.organizationId === meeting.organizationId;

    if (!isCreator && !isOrgMember) {
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

    const canModerate = Boolean(isCreator || isOrgMember);
    if (!canModerate) {
      return NextResponse.json(
        { error: "Forbidden: Only organization users and hosts have moderator privileges." },
        { status: 403 }
      );
    }

    const moderatorName = session.user.name || "Organization Moderator";
    const roomServiceClient = getRoomServiceClient();

    // Handler: MUTE ALL PARTICIPANTS
    if (action === "mute_all") {
      try {
        const participants = await roomServiceClient.listParticipants(meeting.id);
        const myIdentity = `user_${userId}`;

        for (const p of participants) {
          // Skip self
          if (p.identity === myIdentity) continue;

          for (const track of p.tracks) {
            if (
              (track.source === TrackSource.MICROPHONE || track.type === TrackType.AUDIO) &&
              !track.muted
            ) {
              try {
                await roomServiceClient.mutePublishedTrack(meeting.id, p.identity, track.sid, true);
              } catch (trackErr) {
                console.warn(`Could not mute track ${track.sid} for participant ${p.identity}:`, trackErr);
              }
            }
          }
        }

        // Broadcast realtime data event
        const dataPayload = JSON.stringify({
          type: "MODERATION_EVENT",
          action: "MUTE_ALL",
          moderatorName,
          timestamp: Date.now(),
        });
        await roomServiceClient.sendData(
          meeting.id,
          new TextEncoder().encode(dataPayload),
          DataPacket_Kind.RELIABLE,
          {}
        );

        return NextResponse.json({
          success: true,
          message: "All participant microphones have been muted.",
        });
      } catch (err: any) {
        console.error("Error executing mute_all:", err);
        return NextResponse.json(
          { error: err.message || "Failed to mute all participants." },
          { status: 500 }
        );
      }
    }

    // Single participant moderation actions:
    let participantInfo: any = null;
    try {
      participantInfo = await roomServiceClient.getParticipant(meeting.id, targetIdentity);
    } catch (err) {
      console.warn(`Could not retrieve participant ${targetIdentity} info from LiveKit:`, err);
    }

    switch (action) {
      case "mute_mic": {
        let sid = trackSid;
        if (!sid && participantInfo?.tracks) {
          const micTrack = participantInfo.tracks.find(
            (t: any) => t.source === TrackSource.MICROPHONE || t.type === TrackType.AUDIO
          );
          sid = micTrack?.sid;
        }

        if (sid) {
          try {
            await roomServiceClient.mutePublishedTrack(meeting.id, targetIdentity, sid, true);
          } catch (lkErr: any) {
            console.warn("LiveKit mutePublishedTrack warning:", lkErr?.message || lkErr);
          }
        }

        // Send realtime notification packet to the target participant
        const dataPayload = JSON.stringify({
          type: "MODERATION_EVENT",
          action: "MUTE_MIC",
          targetIdentity,
          moderatorName,
          timestamp: Date.now(),
        });
        await roomServiceClient.sendData(
          meeting.id,
          new TextEncoder().encode(dataPayload),
          DataPacket_Kind.RELIABLE,
          { destinationIdentities: [targetIdentity] }
        );

        return NextResponse.json({
          success: true,
          action: "mute_mic",
          targetIdentity,
          message: "Microphone muted successfully.",
        });
      }

      case "stop_video": {
        let sid = trackSid;
        if (!sid && participantInfo?.tracks) {
          const camTrack = participantInfo.tracks.find(
            (t: any) => t.source === TrackSource.CAMERA || (t.type === TrackType.VIDEO && t.source !== TrackSource.SCREEN_SHARE)
          );
          sid = camTrack?.sid;
        }

        if (sid) {
          try {
            await roomServiceClient.mutePublishedTrack(meeting.id, targetIdentity, sid, true);
          } catch (lkErr: any) {
            console.warn("LiveKit mutePublishedTrack video warning:", lkErr?.message || lkErr);
          }
        }

        // Send realtime notification packet
        const dataPayload = JSON.stringify({
          type: "MODERATION_EVENT",
          action: "STOP_VIDEO",
          targetIdentity,
          moderatorName,
          timestamp: Date.now(),
        });
        await roomServiceClient.sendData(
          meeting.id,
          new TextEncoder().encode(dataPayload),
          DataPacket_Kind.RELIABLE,
          { destinationIdentities: [targetIdentity] }
        );

        return NextResponse.json({
          success: true,
          action: "stop_video",
          targetIdentity,
          message: "Camera turned off successfully.",
        });
      }

      case "stop_screenshare": {
        if (participantInfo?.tracks) {
          const screenTracks = participantInfo.tracks.filter(
            (t: any) => t.source === TrackSource.SCREEN_SHARE || t.source === TrackSource.SCREEN_SHARE_AUDIO
          );
          for (const track of screenTracks) {
            if (track.sid) {
              try {
                await roomServiceClient.mutePublishedTrack(meeting.id, targetIdentity, track.sid, true);
              } catch (lkErr: any) {
                console.warn("LiveKit mutePublishedTrack screenshare warning:", lkErr?.message || lkErr);
              }
            }
          }
        }

        // Send realtime notification packet
        const dataPayload = JSON.stringify({
          type: "MODERATION_EVENT",
          action: "STOP_SCREENSHARE",
          targetIdentity,
          moderatorName,
          timestamp: Date.now(),
        });
        await roomServiceClient.sendData(
          meeting.id,
          new TextEncoder().encode(dataPayload),
          DataPacket_Kind.RELIABLE,
          { destinationIdentities: [targetIdentity] }
        );

        return NextResponse.json({
          success: true,
          action: "stop_screenshare",
          targetIdentity,
          message: "Screen share stopped successfully.",
        });
      }

      case "kick": {
        // First send notification packet to target participant
        try {
          const dataPayload = JSON.stringify({
            type: "MODERATION_EVENT",
            action: "KICK",
            targetIdentity,
            moderatorName,
            reason: reason || "You were removed from the meeting by an organization moderator.",
            timestamp: Date.now(),
          });
          await roomServiceClient.sendData(
            meeting.id,
            new TextEncoder().encode(dataPayload),
            DataPacket_Kind.RELIABLE,
            { destinationIdentities: [targetIdentity] }
          );
        } catch (dataErr) {
          console.warn("Could not dispatch kick data packet:", dataErr);
        }

        // Remove participant from LiveKit Room
        await roomServiceClient.removeParticipant(meeting.id, targetIdentity);

        return NextResponse.json({
          success: true,
          action: "kick",
          targetIdentity,
          message: "Participant has been removed from the meeting.",
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown moderation action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error("POST /api/meetings/[id]/moderate error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to execute moderation action." },
      { status: 500 }
    );
  }
}
