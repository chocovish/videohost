import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { addTranscodeJob } from "@/lib/queue";
import { db } from "@videohost/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authCtx = await authenticateRequest(req);
  if (!authCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const video = await db.video.findFirst({
    where: { id, organizationId: authCtx.orgId },
  });

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  let hasThumbnail: boolean | undefined = undefined;
  try {
    const body = await req.json();
    if (typeof body?.hasThumbnail === "boolean") {
      hasThumbnail = body.hasThumbnail;
    }
  } catch {}

  const storageType = (video as any).storageType || "s3";

  if (storageType === "bunny") {
    if (hasThumbnail === false) {
      console.log(`[Complete Bunny] No thumbnail for video ${id} – Bunny auto-thumb will be used`);
    }
    await db.video.update({ where: { id }, data: { status: "PROCESSING", progress: 30 } });
    console.log(`[Complete Bunny] Video ${id} marked PROCESSING (bunny guid=${(video as any).bunnyVideoId}) — webhook will set READY on Status 3 (Finished)`);
    return NextResponse.json({ id: video.id, status: "PROCESSING", message: "Bunny video processing started", storageType: "bunny" });
  }

  if (video.requireHls) {
    if (hasThumbnail === false && video.thumbnailKey) {
      await db.video.update({
        where: { id },
        data: { thumbnailKey: null },
      });
    }

    const skipThumbnail =
      hasThumbnail !== undefined ? hasThumbnail : Boolean(video.thumbnailKey);

    await db.video.update({
      where: { id },
      data: { status: "QUEUED" },
    });

    await addTranscodeJob(video.id, authCtx.orgId, { skipThumbnail });

    return NextResponse.json({ id: video.id, status: "QUEUED", message: "Transcoding job queued", skipThumbnail, storageType: "s3" });
  } else {
    await db.video.update({
      where: { id },
      data: { status: "READY" },
    });

    return NextResponse.json({ id: video.id, status: "READY", message: "Video upload marked ready without transcoding", storageType: "s3" });
  }
}
