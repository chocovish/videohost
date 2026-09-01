import { NextResponse } from "next/server";
import { db } from "@videohost/db";
import { getPresignedPlaybackUrl, deleteFileFromS3 } from "@/lib/s3";

export async function POST(req: Request) {
  try {
    const workerSecret = process.env.WORKER_SECRET_TOKEN;
    if (workerSecret) {
      const authHeader = req.headers.get("authorization");
      const secretHeader = req.headers.get("x-worker-secret");
      const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : secretHeader;

      if (token !== workerSecret) {
        return NextResponse.json({ error: "Unauthorized callback request" }, { status: 401 });
      }
    }

    const payload = await req.json();
    console.log(`[Transcode Callback] Received callback payload:`, JSON.stringify(payload, null, 2));
    const {
      videoId,
      organizationId,
      status,
      progress,
      durationSeconds,
      sourceWidth,
      sourceHeight,
      thumbnailKey: rawThumbKey,
      thumbnailUrl: rawThumbUrl,
      renditions,
      error,
    } = payload;
    const incomingThumb = rawThumbKey || rawThumbUrl;

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const video = await db.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Video was cancelled or is being deleted — ignore any further updates
    if (video.status === "CANCELLED") {
      console.log(`[Transcode Callback] Ignoring callback for cancelled video ${videoId} (status: ${status})`);
      return NextResponse.json({ success: true, status: "CANCELLED", ignored: true, videoId });
    }

    const orgId = organizationId || video.organizationId;

    if (status === "PROCESSING") {
      const currentProgress = typeof progress === "number" ? Math.min(100, Math.max(0, Math.floor(progress))) : 0;
      await db.video.update({
        where: { id: videoId },
        data: {
          status: "PROCESSING",
          progress: currentProgress,
        },
      });

      console.log(`[Transcode Callback] Video ${videoId} progress updated: ${currentProgress}%`);
      return NextResponse.json({ success: true, status: "PROCESSING", progress: currentProgress, videoId });
    } else if (status === "READY") {
      await db.videoRendition.deleteMany({ where: { videoId } });

      let totalRenditionsSizeBytes = 0;
      if (Array.isArray(renditions)) {
        for (const rend of renditions) {
          const rSize = Number(rend.sizeBytes || 0);
          totalRenditionsSizeBytes += rSize;
          const rawKey = rend.storageKey || "";
          const genericStorageKey = rawKey.replace(/\/(?:master\.(?:mpd|m3u8)|manifest\.mpd)?$/, "");
          await db.videoRendition.create({
            data: {
              videoId,
              resolution: rend.resolution,
              bitrateKbps: rend.bitrateKbps,
              storageKey: genericStorageKey || `videos/${orgId}/${videoId}/dash`,
              sizeBytes: BigInt(rSize),
            },
          });
        }
      }

      const combinedSizeBytes =
        payload.combinedSizeBytes !== undefined && payload.combinedSizeBytes !== null
          ? BigInt(payload.combinedSizeBytes)
          : BigInt(Number(payload.originalSizeBytes || 0) + totalRenditionsSizeBytes);

      let thumbnailKey: string | null = null;
      if (incomingThumb) {
        if (incomingThumb.includes("/o/")) {
          thumbnailKey = incomingThumb.split("/o/")[1];
        } else if (incomingThumb.includes("/videohost/")) {
          thumbnailKey = incomingThumb.split("/videohost/")[1];
        } else if (incomingThumb.startsWith("http://") || incomingThumb.startsWith("https://")) {
          const parts = incomingThumb.split("/");
          thumbnailKey = parts.slice(-3).join("/");
          try {
            const parsedUrl = new URL(incomingThumb);
            const pathParts = parsedUrl.pathname.replace(/^\/+/, "").split("/");
            if (pathParts[0] === "videohost" || (process.env.R2_BUCKET_NAME && pathParts[0] === process.env.R2_BUCKET_NAME)) {
              pathParts.shift();
            }
            thumbnailKey = pathParts.join("/");
          } catch {
            thumbnailKey = incomingThumb;
          }
        } else {
          thumbnailKey = incomingThumb;
        }
      }

      const oldThumbKey = video.thumbnailKey;
      const finalThumbKey = thumbnailKey || oldThumbKey;

      await db.video.update({
        where: { id: videoId },
        data: {
          status: "READY",
          progress: 100,
          sizeBytes: combinedSizeBytes,
          durationSeconds: durationSeconds || 0,
          sourceWidth: sourceWidth || 1280,
          sourceHeight: sourceHeight || 720,
          thumbnailKey: finalThumbKey,
        },
      });

      if (oldThumbKey && thumbnailKey && oldThumbKey !== thumbnailKey) {
        deleteFileFromS3(oldThumbKey).catch((err) =>
          console.error("[Transcode Callback] Failed to delete old thumbnail from S3:", err)
        );
      }

      console.log(`[Transcode Callback] Video ${videoId} marked READY with total size: ${combinedSizeBytes} bytes (thumbnail: ${finalThumbKey || "none"})`);

      // Dispatch Webhooks
      triggerWebhooks(orgId, "video.ready", {
        videoId,
        title: video.title,
        durationSeconds,
        thumbnailUrl: thumbnailKey ? await getPresignedPlaybackUrl(thumbnailKey) : null,
      });

      return NextResponse.json({ success: true, status: "READY", videoId });
    } else if (status === "CANCELLED") {
      await db.video.update({
        where: { id: videoId },
        data: { status: "CANCELLED", progress: 0 },
      });

      // Best-effort cleanup: delete any residual dash folder that may contain partial uploads
      try {
        const { deleteS3Prefix } = await import("@/lib/s3");
        await deleteS3Prefix(`videos/${orgId}/${videoId}/dash`);
        await deleteS3Prefix(`${orgId}/${videoId}/dash`);
      } catch (e) {
        console.warn(`[Transcode Callback] Failed to cleanup dash prefix for cancelled ${videoId}:`, e);
      }

      console.log(`[Transcode Callback] Video ${videoId} marked CANCELLED: ${error || "Cancelled by worker"}`);

      triggerWebhooks(orgId, "video.failed", {
        videoId,
        error: error || "Transcoding cancelled",
      });

      return NextResponse.json({ success: true, status: "CANCELLED", videoId });
    } else {
      await db.video.update({
        where: { id: videoId },
        data: { status: "FAILED" },
      });

      console.log(`[Transcode Callback] Video ${videoId} marked FAILED: ${error || "Unknown error"}`);

      triggerWebhooks(orgId, "video.failed", {
        videoId,
        error: error || "Transcoding failed",
      });

      return NextResponse.json({ success: true, status: "FAILED", videoId });
    }
  } catch (err: any) {
    console.error("[Transcode Callback Error]", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

async function triggerWebhooks(orgId: string, event: string, payload: object) {
  try {
    const webhooks = await db.webhook.findMany({
      where: {
        organizationId: orgId,
        events: { has: event },
      },
    });

    for (const wh of webhooks) {
      fetch(wh.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() }),
      }).catch((e) => console.error(`[Webhook Dispatch Error]`, e));
    }
  } catch (e) {
    console.error("[Webhook Trigger Error]", e);
  }
}
