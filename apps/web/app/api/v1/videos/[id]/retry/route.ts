import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { addTranscodeJob } from "@/lib/queue";
import { db } from "@videohost/db";
import { deleteS3Prefix } from "@/lib/s3";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authCtx = await authenticateRequest(req);
  if (!authCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const video = await db.video.findFirst({
    where: { id, organizationId: authCtx.orgId },
  });

  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  // Best-effort cleanup: delete any residual dash folder before re-encoding (e.g. partial uploads after SIGTERM/cancellation/failure)
  const dashPrefix = `${authCtx.orgId}/${id}/dash`;
  try {
    console.log(`[Retry] Cleaning up residual S3 prefix before requeue: ${dashPrefix}`);
    await deleteS3Prefix(dashPrefix);
  } catch (e: any) {
    console.warn(`[Retry] Failed to cleanup S3 prefix ${dashPrefix}:`, e?.message || e);
    // Non-fatal: proceed to requeue even if cleanup fails
  }

  // Also clear stale renditions that may reference the deleted prefix
  try {
    await db.videoRendition.deleteMany({ where: { videoId: id } });
  } catch (e) {
    console.warn("[Retry] Failed to clear stale renditions:", e);
  }

  await db.video.update({
    where: { id },
    data: {
      status: "QUEUED",
      progress: 0,
      requireHls: true,
    },
  });

  await addTranscodeJob(video.id, authCtx.orgId);

  return NextResponse.json({
    success: true,
    id: video.id,
    status: "QUEUED",
    message: "Transcoding job requeued successfully",
  });
}
