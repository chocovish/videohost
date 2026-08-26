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

    return NextResponse.json({ id: video.id, status: "QUEUED", message: "Transcoding job queued", skipThumbnail });
  } else {
    await db.video.update({
      where: { id },
      data: { status: "READY" },
    });

    return NextResponse.json({ id: video.id, status: "READY", message: "Video upload marked ready without transcoding" });
  }
}
