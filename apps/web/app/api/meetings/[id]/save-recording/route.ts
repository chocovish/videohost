import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import { getPresignedUploadUrl, uploadBufferToS3 } from "@/lib/s3";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const meeting = await db.meeting.findUnique({
      where: { id },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const session = await auth();
    const orgId = meeting.organizationId;
    const userId = session?.user?.id || meeting.createdById;

    // Check if body is JSON or FormData
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const durationSeconds = Number(formData.get("durationSeconds") || 0);

      if (!file) {
        return NextResponse.json({ error: "No video file uploaded" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.endsWith(".webm") ? "webm" : "mp4";
      const mime = ext === "webm" ? "video/webm" : "video/mp4";

      const video = await db.video.create({
        data: {
          organizationId: orgId,
          uploadedByUserId: userId,
          title: `Recording: ${meeting.title}`,
          description: `Recorded meeting session from ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(meeting.createdAt)}.`,
          status: "READY",
          progress: 100,
          originalKey: "temp",
          requireHls: false,
          durationSeconds: durationSeconds > 0 ? Math.round(durationSeconds) : null,
          sizeBytes: BigInt(buffer.length),
        },
      });

      const originalKey = `${orgId}/${video.id}/original.${ext}`;
      await uploadBufferToS3(originalKey, buffer, mime);

      await db.video.update({
        where: { id: video.id },
        data: { originalKey },
      });

      await db.meeting.update({
        where: { id: meeting.id },
        data: {
          recordedVideoId: video.id,
          isRecording: false,
          status: meeting.status === "ACTIVE" ? "ENDED" : meeting.status,
          endedAt: meeting.endedAt || new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        video: { id: video.id, title: video.title },
        meetingId: meeting.id,
      });
    } else {
      // JSON request to request presigned upload URL or finalize existing videoId
      const body = await req.json();
      const { videoId, title, durationSeconds, sizeBytes } = body;

      if (videoId) {
        // Link existing video
        await db.meeting.update({
          where: { id: meeting.id },
          data: {
            recordedVideoId: videoId,
            isRecording: false,
          },
        });
        return NextResponse.json({ success: true, videoId });
      }

      const newVideo = await db.video.create({
        data: {
          organizationId: orgId,
          uploadedByUserId: userId,
          title: title || `Recording: ${meeting.title}`,
          description: `Recorded meeting session (${meeting.id}).`,
          status: "READY",
          progress: 100,
          originalKey: "temp",
          requireHls: false,
          durationSeconds: durationSeconds ? Math.round(Number(durationSeconds)) : null,
          sizeBytes: sizeBytes ? BigInt(sizeBytes) : null,
        },
      });

      const originalKey = `${orgId}/${newVideo.id}/original.mp4`;
      const uploadUrl = await getPresignedUploadUrl(originalKey, "video/mp4");

      await db.video.update({
        where: { id: newVideo.id },
        data: { originalKey },
      });

      await db.meeting.update({
        where: { id: meeting.id },
        data: {
          recordedVideoId: newVideo.id,
          isRecording: false,
        },
      });

      return NextResponse.json({
        success: true,
        videoId: newVideo.id,
        uploadUrl,
        originalKey,
      });
    }
  } catch (err: any) {
    console.error("POST /api/meetings/[id]/save-recording error:", err);
    return NextResponse.json({ error: err.message || "Failed to save meeting recording" }, { status: 500 });
  }
}
