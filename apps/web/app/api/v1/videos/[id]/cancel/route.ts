import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { cancelTranscodeJob } from "@/lib/queue";
import { db } from "@videohost/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authCtx = await authenticateRequest(req);
  if (!authCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const video = await db.video.findFirst({
    where: { id, organizationId: authCtx.orgId },
  });

  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  if (video.status !== "QUEUED" && video.status !== "PROCESSING") {
    return NextResponse.json(
      {
        error: `Video is not queued or processing (current status: ${video.status})`,
        status: video.status,
      },
      { status: 409 }
    );
  }

  // Mark CANCELLED first so any in-flight worker callback is ignored
  await db.video.update({
    where: { id },
    data: {
      status: "CANCELLED",
      progress: 0,
    },
  });

  // Stop the job on the worker / remove it from the queue
  await cancelTranscodeJob(video.id);

  return NextResponse.json({
    success: true,
    id: video.id,
    status: "CANCELLED",
    message: "Transcoding job cancelled successfully",
  });
}
