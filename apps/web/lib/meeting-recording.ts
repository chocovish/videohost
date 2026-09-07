import { db } from "@videohost/db";
import { getEgressClient } from "@/lib/livekit";
import { getVideoOriginalS3Key } from "@/lib/s3";
import {
  EncodedFileOutput,
  EncodedFileType,
  S3Upload,
  EncodingOptionsPreset,
  EgressStatus,
} from "livekit-server-sdk";

export const ALLOWED_RECORDING_LAYOUTS = ["grid", "speaker", "single-speaker"] as const;
export type RecordingLayout = (typeof ALLOWED_RECORDING_LAYOUTS)[number];

/**
 * Helper to retrieve an existing folder or create it if not found.
 * Handles race conditions gracefully.
 */
export async function getOrCreateFolder(
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

export interface StartMeetingRecordingOptions {
  meetingId: string;
  layout?: string;
  userId?: string;
}

export interface StartMeetingRecordingResult {
  success: boolean;
  isRecording: boolean;
  alreadyRecording?: boolean;
  videoId?: string | null;
  egressId?: string | null;
  folderId?: string | null;
  message?: string;
  error?: string;
  code?: string;
  egressFailed?: boolean;
  fallbackUrl?: string;
}

/**
 * Start LiveKit Room Composite Egress recording for a meeting.
 * Ensures idempotency to prevent duplicate egress sessions.
 */
export async function startMeetingRecording({
  meetingId,
  layout = "grid",
  userId,
}: StartMeetingRecordingOptions): Promise<StartMeetingRecordingResult> {
  const meeting = await db.meeting.findUnique({
    where: { id: meetingId },
    include: {
      organization: {
        include: { plan: true },
      },
    },
  });

  if (!meeting) {
    return {
      success: false,
      isRecording: false,
      error: "Meeting not found",
    };
  }

  const orgPlanName = meeting.organization?.plan?.name?.toLowerCase() || "free";
  const isFreePlan = orgPlanName === "free";

  if (isFreePlan) {
    return {
      success: false,
      isRecording: false,
      error: "Meeting recording is not available on the Free plan. Please upgrade your organization plan to enable recording.",
      code: "PLAN_RESTRICTION",
    };
  }

  // Idempotency: if meeting is already recording in DB, exit early
  if (meeting.isRecording) {
    return {
      success: true,
      isRecording: true,
      alreadyRecording: true,
      videoId: meeting.recordedVideoId,
      message: "Recording already in progress",
    };
  }

  const compositeLayout = (ALLOWED_RECORDING_LAYOUTS as readonly string[]).includes(layout as any)
    ? layout
    : "grid";

  let createdVideoId: string | null = null;
  let createdFolderId: string | null = null;
  let egressId: string | null = null;

  if (process.env.LIVEKIT_URL) {
    try {
      const egressClient = getEgressClient();

      // Check if an egress is already actively running for this room
      let activeEgresses = await egressClient
        .listEgress({ roomName: meeting.id, active: true })
        .catch(() => []);

      if (activeEgresses && activeEgresses.length > 0) {
        // Egress already running, sync DB if needed
        await db.meeting.update({
          where: { id: meeting.id },
          data: { isRecording: true },
        });
        return {
          success: true,
          isRecording: true,
          alreadyRecording: true,
          egressId: activeEgresses[0]?.egressId || null,
          videoId: meeting.recordedVideoId,
          message: "Recording already active for this room",
        };
      }

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

      // 5. Canonical storage path: videos/{organizationId}/{videoId}/original.mp4
      const originalFileName = "original.mp4";
      const storageKey = getVideoOriginalS3Key(meeting.organizationId, video.id, originalFileName);

      await db.video.update({
        where: { id: video.id },
        data: { originalKey: originalFileName },
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

      // Start Room Composite Egress
      const egressInfo = await egressClient.startRoomCompositeEgress(
        meeting.id,
        fileOutput,
        {
          layout: compositeLayout,
          encodingOptions: EncodingOptionsPreset.H264_1080P_30,
        }
      );

      if (egressInfo?.egressId) {
        egressId = egressInfo.egressId;
      }
    } catch (egressErr: any) {
      console.error("[MeetingRecording] LiveKit Egress error:", egressErr);
      if (createdVideoId) {
        await db.video.delete({ where: { id: createdVideoId } }).catch(() => {});
      }
      const fallbackUrl = "/record";
      const errorMessage = `Recording start failed: ${egressErr?.message || "Egress service unavailable"}. You may use client-side recording at ${fallbackUrl}`;

      return {
        success: false,
        isRecording: false,
        error: errorMessage,
        fallbackUrl,
        egressFailed: true,
      };
    }
  }

  const updated = await db.meeting.update({
    where: { id: meeting.id },
    data: {
      isRecording: true,
      ...(createdFolderId ? { folderId: createdFolderId } : {}),
      ...(createdVideoId ? { recordedVideoId: createdVideoId } : {}),
    },
  });

  return {
    success: true,
    isRecording: updated.isRecording,
    videoId: createdVideoId || updated.recordedVideoId,
    egressId,
    folderId: createdFolderId,
    message: "Recording started",
  };
}

/**
 * Stop active LiveKit Egress recording for a meeting.
 */
export async function stopMeetingRecording(
  meetingId: string,
  providedEgressId?: string
): Promise<{ success: boolean; isRecording: boolean; message: string }> {
  const meeting = await db.meeting.findUnique({
    where: { id: meetingId },
  });

  if (!meeting) {
    return { success: false, isRecording: false, message: "Meeting not found" };
  }

  if (process.env.LIVEKIT_URL) {
    try {
      const egressClient = getEgressClient();
      if (providedEgressId) {
        console.log(`[MeetingRecording] Stopping provided egressId: ${providedEgressId}`);
        await egressClient.stopEgress(providedEgressId).catch((err) => {
          console.warn(`[MeetingRecording] Could not stop provided egress ${providedEgressId}:`, err?.message || err);
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
            console.log(`[MeetingRecording] Stopping active matched egress: ${egress.egressId} (status: ${egress.status})`);
            await egressClient.stopEgress(egress.egressId).catch((err) => {
              console.warn(`[MeetingRecording] Failed to stop egress ${egress.egressId}:`, err?.message || err);
            });
          }
        }
      }
    } catch (listErr: any) {
      console.warn("[MeetingRecording] Could not stop active egresses:", listErr?.message || listErr);
    }
  }

  await db.meeting.update({
    where: { id: meeting.id },
    data: {
      isRecording: false,
    },
  });

  return {
    success: true,
    isRecording: false,
    message: "Recording stopped",
  };
}

