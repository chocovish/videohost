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
          await db.videoRendition.create({
            data: {
              videoId,
              resolution: rend.resolution,
              bitrateKbps: rend.bitrateKbps,
              storageKey: rend.storageKey,
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
        } else {
          thumbnailKey = incomingThumb;
        }
      }

      const oldThumbKey = video.thumbnailKey;

      await db.video.update({
        where: { id: videoId },
        data: {
          status: "READY",
          progress: 100,
          sizeBytes: combinedSizeBytes,
          durationSeconds: durationSeconds || 0,
          sourceWidth: sourceWidth || 1280,
          sourceHeight: sourceHeight || 720,
          thumbnailKey: thumbnailKey,
        },
      });

      if (oldThumbKey && thumbnailKey && oldThumbKey !== thumbnailKey) {
        deleteFileFromS3(oldThumbKey).catch((err) =>
          console.error("[Transcode Callback] Failed to delete old thumbnail from S3:", err)
        );
      }

      console.log(`[Transcode Callback] Video ${videoId} marked READY with total size: ${combinedSizeBytes} bytes`);

      // Dispatch Webhooks
      triggerWebhooks(orgId, "video.ready", {
        videoId,
        title: video.title,
        durationSeconds,
        thumbnailUrl: thumbnailKey ? await getPresignedPlaybackUrl(thumbnailKey) : null,
      });

      return NextResponse.json({ success: true, status: "READY", videoId });
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
