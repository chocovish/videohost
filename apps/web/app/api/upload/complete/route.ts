import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addTranscodeJob } from "@/lib/queue";
import { db } from "@videohost/db";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id || !(session as any).organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (session as any).organizationId as string;
    const { videoId, hasThumbnail } = await req.json();

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const video = await db.video.findFirst({
      where: { id: videoId, organizationId: orgId },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // If client explicitly indicated no thumbnail was uploaded, ensure thumbnailKey is null
    if (hasThumbnail === false && video.thumbnailKey) {
      await db.video.update({
        where: { id: videoId },
        data: { thumbnailKey: null },
      });
    }

    const skipThumbnail =
      hasThumbnail !== undefined ? Boolean(hasThumbnail) : Boolean(video.thumbnailKey);

    if (video.requireHls) {
      // Update status to QUEUED and queue transcoding job
      await db.video.update({
        where: { id: videoId },
        data: { status: "QUEUED" },
      });

      await addTranscodeJob(videoId, orgId, { skipThumbnail });

      return NextResponse.json({ success: true, status: "QUEUED", videoId, requireHls: true, skipThumbnail });
    } else {
      // Direct video playback without HLS transcoding - set status to READY
      await db.video.update({
        where: { id: videoId },
        data: { status: "READY" },
      });

      return NextResponse.json({ success: true, status: "READY", videoId, requireHls: false });
    }
  } catch (error: any) {
    console.error("Upload complete route error:", error);
    return NextResponse.json({ error: "Failed to queue video" }, { status: 500 });
  }
}
