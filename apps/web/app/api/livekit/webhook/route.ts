import { NextRequest, NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { db } from "@videohost/db";
import { getLiveKitCredentials } from "@/lib/livekit";

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

    // Handle Egress Ended Event
    if (event.event === "egress_ended") {
      const egressInfo = event.egressInfo;
      if (!egressInfo) {
        return NextResponse.json({ received: true });
      }

      const roomName = egressInfo.roomName;
      const egressId = egressInfo.egressId;

      console.log(
        `[LiveKit Webhook] Egress ended for room: ${roomName}, egressId: ${egressId}, status: ${egressInfo.status}`
      );

      // Locate the meeting in the database
      const meeting = await db.meeting.findFirst({
        where: {
          OR: [
            ...(roomName ? [{ id: roomName }] : []),
            ...(egressId ? [{ recordingId: egressId }] : []),
          ],
        },
      });

      if (!meeting) {
        console.warn(`[LiveKit Webhook] Meeting not found for room: ${roomName} / egressId: ${egressId}`);
        return NextResponse.json({ received: true, warning: "Meeting not found" });
      }

      // Extract file details from EgressInfo (fileResults or file)
      const fileResult =
        (egressInfo.fileResults && egressInfo.fileResults[0]) ||
        (egressInfo as any).file;

      if (fileResult) {
        const s3Key = fileResult.filename || fileResult.location;
        const durationNanos = Number(fileResult.duration || 0);
        const durationSeconds = durationNanos > 0 ? Math.round(durationNanos / 1_000_000_000) : null;
        const sizeBytes = fileResult.size ? BigInt(fileResult.size) : null;

        if (s3Key) {
          // 1. Get or create parent folder: "Meeting Recordings"
          const parentFolder = await getOrCreateFolder(
            meeting.organizationId,
            "Meeting Recordings",
            null
          );

          // 2. Get or create meeting subfolder: "Meeting Recordings/{Meeting Name}"
          const meetingFolderName = (meeting.title && meeting.title.trim()) || `Meeting-${meeting.id}`;
          const meetingFolder = await getOrCreateFolder(
            meeting.organizationId,
            meetingFolderName,
            parentFolder ? parentFolder.id : null
          );

          // 3. Count existing recordings in this meeting folder (a meeting might generate more than 1 recording)
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

          // 4. Create Video record in DB stored inside "Meeting Recordings/{Meeting Name}"
          const video = await db.video.create({
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

          // 5. Update Meeting state without ending the meeting/interview
          await db.meeting.update({
            where: { id: meeting.id },
            data: {
              recordedVideoId: video.id,
              isRecording: false,
              recordingId: null,
              // Meeting status is intentionally preserved (never changed to ENDED)
            },
          });

          console.log(
            `[LiveKit Webhook] Created Video ${video.id} in folder "${meetingFolderName}" and linked to Meeting ${meeting.id}`
          );
        }
      } else {
        // Egress stopped without file output - reset recording flag without ending meeting
        await db.meeting.update({
          where: { id: meeting.id },
          data: {
            isRecording: false,
            recordingId: null,
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[LiveKit Webhook] Error processing webhook:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
