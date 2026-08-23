import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import { getEgressClient, createMeetingAccessToken } from "@/lib/livekit";
import { EncodedFileOutput, EncodedFileType, S3Upload, EncodingOptionsPreset, EgressStatus } from "livekit-server-sdk";

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const {
      action = "toggle",
      mode = "room",
      participantIdentity,
      showCamera = true,
      showScreen = true,
      screenShare = true,
      pipPosition = "bottom-right",
    } = body;

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
    let createdVideoId: string | null = null;
    let createdFolderId: string | null = null;
    let egressId: string | null = null;

    // LiveKit Egress Server Integration:
    if (process.env.LIVEKIT_URL) {
      try {
        const egressClient = getEgressClient();
        if (nextRecordingState && !meeting.isRecording) {
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

          if (meetingFolder) {
            createdFolderId = meetingFolder.id;
          }

          // 3. Count existing recordings in this folder to assign a friendly title
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

          // 4. Create Video entry with status UPLOADING
          const video = await db.video.create({
            data: {
              organizationId: meeting.organizationId,
              uploadedByUserId: userId || meeting.createdById,
              folderId: meetingFolder ? meetingFolder.id : null,
              title: videoTitle,
              description: `Recorded session from meeting "${meeting.title}" (${new Intl.DateTimeFormat("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date())}).`,
              status: "UPLOADING",
              progress: 0,
              originalKey: "temp",
              requireHls: false,
            },
          });

          createdVideoId = video.id;

          // 5. Canonical storage path identical to normal uploaded videos: {organizationId}/{videoId}/original.mp4
          const storageKey = `${meeting.organizationId}/${video.id}/original.mp4`;

          await db.video.update({
            where: { id: video.id },
            data: { originalKey: storageKey },
          });

          let fileOutput: EncodedFileOutput;

          if (process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID) {
            fileOutput = new EncodedFileOutput({
              fileType: EncodedFileType.MP4,
              filepath: storageKey,
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
              filepath: storageKey,
            });
          }

          // Generate dedicated egress bot token
          const botToken = await createMeetingAccessToken({
            roomName: meeting.id,
            identity: "egress-recorder-bot",
            name: "Egress Recorder Bot",
            canPublish: false,
            canSubscribe: true,
            canModerate: false,
            isHidden: true,
          });

          // Egress base URL (accessible by headless Chromium inside LiveKit Egress container)
          const egressBaseUrl = (process.env.LIVEKIT_EGRESS_ACCESSIBLE_URL || process.env.APP_URL)!.replace(/\/+$/, "");
          const egressWebUrl = `${egressBaseUrl}/meet/${meeting.id}/egress?token=${botToken}&mode=${mode}&target=${encodeURIComponent(participantIdentity || "")}&cam=${showCamera ? "1" : "0"}&screen=${showScreen ? "1" : "0"}&pip=${pipPosition}&internal=1`;

          let egressInfo;
          try {
            // Attempt high-fidelity Web Egress with Picture-in-Picture layout
            egressInfo = await egressClient.startWebEgress(
              egressWebUrl,
              fileOutput,
              {
                encodingOptions: EncodingOptionsPreset.H264_1080P_30,
              }
            );
          } catch (webErr: any) {
            console.warn("startWebEgress fallback to startRoomCompositeEgress:", webErr?.message || webErr);
            // Fallback to RoomCompositeEgress if web egress endpoint is unavailable
            egressInfo = await egressClient.startRoomCompositeEgress(
              meeting.id,
              fileOutput,
              { layout: "grid" }
            );
          }

          if (egressInfo?.egressId) {
            egressId = egressInfo.egressId;
          }
        } else if (!nextRecordingState) {
          // Stop any active egress recording for this meeting room
          try {
            if (providedEgressId) {
              console.log(`[Record API] Stopping provided egressId: ${providedEgressId}`);
              await egressClient.stopEgress(providedEgressId).catch((err) => {
                console.warn(`[Record API] Could not stop provided egress ${providedEgressId}:`, err?.message || err);
              });
            }

            let activeEgresses = await egressClient.listEgress({ active: true }).catch(() => []);
            if (!activeEgresses || activeEgresses.length === 0) {
              activeEgresses = await egressClient.listEgress({}).catch(() => []);
            }

            for (const egress of activeEgresses) {
              const egressJson = JSON.stringify(egress);
              const isMatch =
                egress.egressId === providedEgressId ||
                egress.roomName === meeting.id ||
                egress.roomId === meeting.id ||
                egressJson.includes(`/meet/${meeting.id}`) ||
                egressJson.includes(meeting.id) ||
                (meeting.recordedVideoId && egressJson.includes(meeting.recordedVideoId));

              if (isMatch && egress.egressId) {
                const isEnded =
                  egress.status === EgressStatus.EGRESS_ENDING ||
                  egress.status === EgressStatus.EGRESS_COMPLETE ||
                  egress.status === EgressStatus.EGRESS_FAILED ||
                  egress.status === EgressStatus.EGRESS_ABORTED;

                if (!isEnded) {
                  console.log(`[Record API] Stopping active matched egress: ${egress.egressId} (status: ${egress.status})`);
                  await egressClient.stopEgress(egress.egressId).catch((err) => {
                    console.warn(`[Record API] Failed to stop egress ${egress.egressId}:`, err?.message || err);
                  });
                }
              }
            }
          } catch (listErr: any) {
            console.warn("Could not stop active egresses:", listErr?.message || listErr);
          }
        }
      } catch (egressErr: any) {
        console.error("LiveKit Egress error:", egressErr);
        if (createdVideoId) {
          // If starting egress fails, clean up the pre-created video record
          await db.video.delete({ where: { id: createdVideoId } }).catch(() => {});
        }
        const fallbackUrl = "/record";
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
        ...(createdFolderId ? { folderId: createdFolderId } : {}),
        ...(createdVideoId ? { recordedVideoId: createdVideoId } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      isRecording: updated.isRecording,
      videoId: createdVideoId || updated.recordedVideoId,
      egressId: egressId,
      message: nextRecordingState ? "Recording started" : "Recording stopped",
    });
  } catch (err: any) {
    console.error("POST /api/meetings/[id]/record error:", err);
    return NextResponse.json({ error: err.message || "Failed to update recording state" }, { status: 500 });
  }
}
