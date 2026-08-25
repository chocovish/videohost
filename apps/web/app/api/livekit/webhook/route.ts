import { NextRequest, NextResponse } from "next/server";
import { WebhookReceiver, EgressStatus } from "livekit-server-sdk";
import { db } from "@videohost/db";
import { getLiveKitCredentials, getRoomServiceClient, getEgressClient } from "@/lib/livekit";

const BOT_IDENTITIES = ["egress-recorder-bot"];

/**
 * Helper to retrieve an existing folder or create it if not found.
 * Handles race conditions gracefully.
 */
async function getOrCreateFolder(
  organizationId: string,
  name: string,
  parentId: string | null = null
) {
  let folder = await db.folder.findFirst({
    where: {
      organizationId,
      parentId,
      name,
    },
  });

  if (!folder) {
    try {
      folder = await db.folder.create({
        data: {
          organizationId,
          name,
          parentId,
        },
      });
    } catch (err: any) {
      // Fallback in case of race condition / unique constraint collision
      folder = await db.folder.findFirst({
        where: {
          organizationId,
          parentId,
          name,
        },
      });
    }
  }

  return folder;
}

export async function POST(req: NextRequest) {
  try {
    const { apiKey, apiSecret } = getLiveKitCredentials();
    const receiver = new WebhookReceiver(apiKey, apiSecret);

    const authHeader = req.headers.get("authorization");
    const rawBody = await req.text();

    if (!authHeader) {
      return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
    }

    let event: any;
    try {
      event = await receiver.receive(rawBody, authHeader);
    } catch (err: any) {
      console.error("[LiveKit Webhook] Signature verification failed:", err?.message || err);
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    console.log(`[LiveKit Webhook] Event received: ${event.event}`);

    // Stop web egress when the last human participant leaves.
    // Web egress records a URL and is NOT bound to the room lifecycle, so it
    // never auto-stops. The recorder bot also keeps the room non-empty, which
    // prevents empty_timeout / room_finished from ever firing. So we stop the
    // active egress ourselves once only bots remain in the room.
    if ((event.event === "participant_left" || event.event === "room_finished") && event.room?.name) {
      const roomName: string = event.room.name;

      if (event.event === "participant_left") {
        const roomService = getRoomServiceClient();
        const participants = await roomService
          .listParticipants(roomName)
          .catch(() => [] as { identity?: string }[]);

        const humansRemaining = participants.filter(
          (p) => !BOT_IDENTITIES.includes(p.identity || "") && !(p.identity || "").includes("egress")
        );

        if (humansRemaining.length > 0) {
          return NextResponse.json({ received: true });
        }
      }

      try {
        const egressClient = getEgressClient();
        let activeEgresses = await egressClient.listEgress({ active: true }).catch(() => []);
        if (!activeEgresses || activeEgresses.length === 0) {
          activeEgresses = await egressClient.listEgress({}).catch(() => []);
        }

        for (const egress of activeEgresses) {
          const isMatch =
            egress.roomName === roomName ||
            JSON.stringify(egress).includes(`/meet/${roomName}/egress`) ||
            JSON.stringify(egress).includes(`/meet/${roomName}?`);

          const isActive =
            egress.status === EgressStatus.EGRESS_STARTING ||
            egress.status === EgressStatus.EGRESS_ACTIVE ||
            (egress.status as unknown as number) === 0 || // EGRESS_STARTING
            (egress.status as unknown as number) === 1; // EGRESS_ACTIVE

          if (isMatch && isActive && egress.egressId) {
            console.log(
              `[LiveKit Webhook] Last human left room "${roomName}", stopping egress ${egress.egressId}`
            );
            await egressClient.stopEgress(egress.egressId).catch((err) => {
              console.warn(
                `[LiveKit Webhook] Failed to stop egress ${egress.egressId}:`,
                err?.message || err
              );
            });
          }
        }
      } catch (err: any) {
        console.error("[LiveKit Webhook] Error stopping egress on last participant leave:", err);
      }
    }

    // Handle Egress Ended Event
    if (event.event === "egress_ended") {
      const egressInfo = event.egressInfo;
      if (!egressInfo) {
        return NextResponse.json({ received: true });
      }

      const roomName = egressInfo.roomName;
      const egressId = egressInfo.egressId;

      console.log(
        `[LiveKit Webhook] Egress ended for room: "${roomName || ""}", egressId: ${egressId}, status: ${egressInfo.status}`
      );

      // Extract file details from EgressInfo (fileResults or file or request)
      const fileResult =
        (egressInfo.fileResults && egressInfo.fileResults[0]) ||
        (egressInfo as any).file;

      const s3Key =
        fileResult?.filename ||
        fileResult?.location ||
        (egressInfo as any).request?.fileOutputs?.[0]?.filepath ||
        (egressInfo as any).request?.file?.filepath;

      const durationNanos = Number(fileResult?.duration || 0);
      const durationSeconds = durationNanos > 0 ? Math.round(durationNanos / 1_000_000_000) : null;
      const sizeBytes = fileResult?.size ? BigInt(fileResult.size) : null;

      // Extract video ID from s3Key if available (e.g. "{orgId}/{videoId}/original.mp4")
      let videoIdFromKey: string | null = null;
      if (s3Key && typeof s3Key === "string") {
        const parts = s3Key.split("/").filter(Boolean);
        if (parts.length >= 2) {
          // In standard path "{orgId}/{videoId}/original.mp4", the second-to-last segment is videoId
          videoIdFromKey = parts[parts.length - 2];
        }
      }

      // Extract meeting ID from request URL if web egress (e.g. ".../meet/{meetingId}/egress...")
      let meetingIdFromUrl: string | null = null;
      const requestUrl = (egressInfo as any).request?.url;
      if (requestUrl && typeof requestUrl === "string") {
        const match = requestUrl.match(/\/meet\/([^/?]+)/);
        if (match && match[1]) {
          meetingIdFromUrl = match[1];
        }
      }

      // 1. Locate pre-created video record
      let existingVideo = null;

      // Lookup video by ID parsed from key
      if (videoIdFromKey) {
        existingVideo = await db.video.findUnique({
          where: { id: videoIdFromKey },
        });
      }

      // Fallback lookup video by originalKey
      if (!existingVideo && s3Key) {
        existingVideo = await db.video.findFirst({
          where: {
            originalKey: s3Key,
          },
        });
      }

      // 2. Locate the meeting in the database
      let meeting = await db.meeting.findFirst({
        where: {
          OR: [
            ...(meetingIdFromUrl ? [{ id: meetingIdFromUrl }] : []),
            ...(roomName ? [{ id: roomName }] : []),
            ...(existingVideo ? [{ recordedVideoId: existingVideo.id }] : []),
          ],
        },
      });

      // If video was not found yet, check if meeting has recordedVideoId
      if (!existingVideo && meeting?.recordedVideoId) {
        existingVideo = await db.video.findUnique({
          where: { id: meeting.recordedVideoId },
        });
      }

      const isSuccessfulStatus =
        egressInfo.status === 3 || // EGRESS_COMPLETE
        egressInfo.status === "EGRESS_COMPLETE" ||
        Boolean(fileResult && (fileResult.size || fileResult.duration));

      let fallbackFolderId: string | null = null;

      if (existingVideo) {
        if (isSuccessfulStatus) {
          // Update existing Video entry to READY with file size & duration
          await db.video.update({
            where: { id: existingVideo.id },
            data: {
              status: "READY",
              progress: 100,
              durationSeconds: durationSeconds ?? existingVideo.durationSeconds,
              sizeBytes: sizeBytes ?? existingVideo.sizeBytes,
              ...(s3Key ? { originalKey: s3Key } : {}),
            },
          });

          console.log(
            `[LiveKit Webhook] Updated pre-created Video ${existingVideo.id} to READY for Meeting ${meeting?.id || "unknown"}`
          );
        } else {
          // Egress ended with error or without file result
          await db.video.update({
            where: { id: existingVideo.id },
            data: {
              status: "FAILED",
            },
          });

          console.warn(
            `[LiveKit Webhook] Marked pre-created Video ${existingVideo.id} as FAILED for Meeting ${meeting?.id || "unknown"}`
          );
        }
      } else if (meeting && isSuccessfulStatus && s3Key) {
        // Fallback: If for any reason Video entry was not pre-created on recording start
        const parentFolder = await getOrCreateFolder(
          meeting.organizationId,
          "Meeting Recordings",
          null
        );

        const meetingFolderName = (meeting.title && meeting.title.trim()) || `Meeting-${meeting.id}`;
        const meetingFolder = await getOrCreateFolder(
          meeting.organizationId,
          meetingFolderName,
          parentFolder ? parentFolder.id : null
        );

        if (meetingFolder) {
          fallbackFolderId = meetingFolder.id;
        }

        const existingCount = await db.video.count({
          where: {
            organizationId: meeting.organizationId,
            folderId: meetingFolder ? meetingFolder.id : null,
          },
        });

        const videoTitle =
          existingCount > 0
            ? `${meeting.title} (Part ${existingCount + 1})`
            : `${meeting.title}`;

        const createdVideo = await db.video.create({
          data: {
            organizationId: meeting.organizationId,
            uploadedByUserId: meeting.createdById,
            folderId: meetingFolder ? meetingFolder.id : null,
            title: videoTitle,
            description: `Recorded session from meeting "${meeting.title}" (${new Intl.DateTimeFormat("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date())}).`,
            status: "READY",
            progress: 100,
            originalKey: s3Key,
            requireHls: false,
            durationSeconds,
            sizeBytes,
          },
        });

        existingVideo = createdVideo;

        console.log(
          `[LiveKit Webhook] Fallback created Video ${createdVideo.id} in folder "${meetingFolderName}" for Meeting ${meeting.id}`
        );
      }

      // Update Meeting state if meeting was found
      if (meeting) {
        const resolvedFolderId = fallbackFolderId || existingVideo?.folderId;
        await db.meeting.update({
          where: { id: meeting.id },
          data: {
            isRecording: false,
            ...(resolvedFolderId && !meeting.folderId ? { folderId: resolvedFolderId } : {}),
            ...(existingVideo ? { recordedVideoId: existingVideo.id } : {}),
          },
        });
      } else {
        console.warn(
          `[LiveKit Webhook] Meeting record not found (room: "${roomName || ""}", egressId: "${egressId}", url: "${meetingIdFromUrl || ""}"). Video ${existingVideo?.id || "N/A"} was updated directly.`
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[LiveKit Webhook] Error processing webhook:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
