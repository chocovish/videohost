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

    // ------------------------------------------------------------------
    // Handle thumbnail key cleanup based on client indication
    // ------------------------------------------------------------------
    if (hasThumbnail === false && (video as any).storageType !== "bunny" && video.thumbnailKey) {
      // For S3 we null out if client confirmed no thumbnail; for Bunny we keep
      // placeholder because Bunny thumbnail lives on Bunny side
      await db.video.update({
        where: { id: videoId },
        data: { thumbnailKey: null },
      });
    } else if (hasThumbnail === false && (video as any).storageType === "bunny") {
      // Bunny: if no thumbnail was uploaded, just log – Bunny will auto-generate
      console.log(`[Upload Complete Bunny] No custom thumbnail for video ${videoId} – using Bunny auto-thumb`);
    }

    const skipThumbnail =
      hasThumbnail !== undefined ? Boolean(hasThumbnail) : Boolean(video.thumbnailKey);

    // ------------------------------------------------------------------
    // Bunny branch: Bunny Stream encodes server-side. Mark PROCESSING and
    // let webhook (POST /api/bunny/webhook) flip to READY on Status 3/4.
    // This gives accurate UI (spinner → playable) instead of fake instant READY.
    // ------------------------------------------------------------------
    const storageType = (video as any).storageType || "s3";
    if (storageType === "bunny") {
      console.log(`[Upload Complete Bunny] Finalizing bunny video ${videoId} (guid=${(video as any).bunnyVideoId}) – marking PROCESSING, webhook will set READY`);
      await db.video.update({
        where: { id: videoId },
        data: { status: "PROCESSING", progress: 30 },
      });
      return NextResponse.json({ success: true, status: "PROCESSING", videoId, storageType: "bunny", requireHls: false, skipThumbnail, message: "Bunny encoding started — webhook will mark READY on Status 3/4" });
    }

    // ------------------------------------------------------------------
    // S3 branch (default)
    // ------------------------------------------------------------------
    if (video.requireHls) {
      await db.video.update({
        where: { id: videoId },
        data: { status: "QUEUED" },
      });

      await addTranscodeJob(videoId, orgId, { skipThumbnail });

      return NextResponse.json({ success: true, status: "QUEUED", videoId, requireHls: true, skipThumbnail, storageType: "s3" });
    } else {
      await db.video.update({
        where: { id: videoId },
        data: { status: "READY" },
      });

      return NextResponse.json({ success: true, status: "READY", videoId, requireHls: false, storageType: "s3" });
    }
  } catch (error: any) {
    console.error("Upload complete route error:", error);
    return NextResponse.json({ error: "Failed to queue video" }, { status: 500 });
  }
}
