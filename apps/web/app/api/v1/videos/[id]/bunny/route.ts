import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";
import { getBunnyVideo, getBunnyConfig } from "@/lib/bunny";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authCtx = await authenticateRequest(req);
  if (!authCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const video = await db.video.findFirst({
    where: { id, organizationId: authCtx.orgId },
    select: {
      id: true,
      title: true,
      status: true,
      progress: true,
      storageType: true,
      bunnyVideoId: true,
      bunnyLibraryId: true,
      originalKey: true,
      sizeBytes: true,
      sourceWidth: true,
      sourceHeight: true,
      durationSeconds: true,
    },
  });

  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  const storageType = (video as any).storageType?.toLowerCase?.() || "";
  const guid = (video as any).bunnyVideoId || (storageType === "bunny" ? (video as any).originalKey : null) || null;

  const isBunny = storageType === "bunny" || Boolean((video as any).bunnyVideoId);
  if (!isBunny) {
    return NextResponse.json({ error: "Video is not stored on Bunny Stream", storageType }, { status: 400 });
  }
  if (!guid) {
    return NextResponse.json({ error: "Bunny video GUID identifier missing for this video" }, { status: 422 });
  }

  try {
    getBunnyConfig();
  } catch (e: any) {
    return NextResponse.json(
      { error: "Bunny Stream not configured on server", details: e?.message || String(e) },
      { status: 503 }
    );
  }

  try {
    let cfg: any = undefined;
    const storedLibId = (video as any).bunnyLibraryId;
    if (storedLibId) {
      try {
        const baseCfg = getBunnyConfig();
        if (String(storedLibId) !== String(baseCfg.libraryId)) {
          cfg = { ...baseCfg, libraryId: String(storedLibId) };
        }
      } catch {}
    }

    const bunnyVideo = await getBunnyVideo(guid, cfg);
    if (!bunnyVideo) {
      return NextResponse.json({ error: "Video not found on Bunny Stream", guid }, { status: 404 });
    }

    // Bunny availableResolutions is comma-separated like "240,360,480,720,1080" or "360p,720p"
    const rawRes = bunnyVideo.availableResolutions || "";
    const resolutions = rawRes
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean)
      .map((r) => {
        // Normalize to "720p" form if it's just a number
        if (/^\d+$/.test(r)) return `${r}p`;
        return r;
      });

    // Sort by numeric height ascending
    resolutions.sort((a, b) => {
      const na = parseInt(a, 10) || 0;
      const nb = parseInt(b, 10) || 0;
      return na - nb;
    });

    // -----------------------------------------------------------------
    // Sync DB progress/status/size from Bunny Stream — so Refresh button polls
    // current encoding progress and persists it to the database.
    // Bunny Status codes:
    //   0: Queued
    //   1: Processing
    //   2: Encoding
    //   3: Finished
    //   4: ResolutionFinished (playable, with live encodeProgress)
    //   5: Failed
    // -----------------------------------------------------------------
    let syncedVideo: typeof video | null = null;
    try {
      const currentStatus = (video as any).status as string;
      const currentProgress = (video as any).progress as number;
      let newStatus: string | null = null;
      let newProgress: number | null = null;

      const s = bunnyVideo.status;
      const ep = typeof bunnyVideo.encodeProgress === "number" ? Math.max(0, Math.min(100, Math.round(bunnyVideo.encodeProgress))) : null;

      switch (s) {
        case 0: // Queued
          newStatus = currentStatus === "READY" ? "READY" : "QUEUED";
          newProgress = ep !== null ? ep : 0;
          break;
        case 1: // Processing
        case 2: // Encoding
        case 4: // ResolutionFinished — intermediate resolution finished, transcoding still in progress
          newStatus = currentStatus === "READY" ? "READY" : "PROCESSING";
          newProgress = ep !== null ? Math.min(ep, 99) : Math.max(currentProgress || 0, 5);
          break;
        case 3: // Finished — all resolutions completed
          newStatus = "READY";
          newProgress = ep !== null && ep > 0 ? ep : 100;
          break;
        case 5: // Failed
          newStatus = "FAILED";
          newProgress = 0;
          break;
        default:
          if (ep !== null && ep !== currentProgress) {
            newProgress = ep;
          }
          break;
      }

      // Enrich metadata when available
      const extra: any = {};
      if (typeof bunnyVideo.length === "number" && bunnyVideo.length > 0) {
        const dur = Math.round(bunnyVideo.length);
        if (dur !== video.durationSeconds) extra.durationSeconds = dur;
      }
      if (typeof bunnyVideo.width === "number" && bunnyVideo.width > 0 && bunnyVideo.width !== video.sourceWidth) {
        extra.sourceWidth = bunnyVideo.width;
      }
      if (typeof bunnyVideo.height === "number" && bunnyVideo.height > 0 && bunnyVideo.height !== video.sourceHeight) {
        extra.sourceHeight = bunnyVideo.height;
      }
      if (typeof bunnyVideo.storageSize === "number" && bunnyVideo.storageSize > 0) {
        const curSize = video.sizeBytes != null ? Number(video.sizeBytes) : null;
        if (curSize !== bunnyVideo.storageSize) extra.sizeBytes = BigInt(bunnyVideo.storageSize);
      }

      // If video record was missing bunnyVideoId, sync it
      if (!(video as any).bunnyVideoId && guid) {
        extra.bunnyVideoId = guid;
      }

      const shouldUpdateStatus = newStatus !== null && newStatus !== currentStatus;
      const shouldUpdateProgress = newProgress !== null && newProgress !== currentProgress;
      const shouldUpdateExtra = Object.keys(extra).length > 0;

      if (shouldUpdateStatus || shouldUpdateProgress || shouldUpdateExtra) {
        const data: any = {};
        if (shouldUpdateStatus && newStatus) data.status = newStatus as any;
        if (newProgress !== null) data.progress = newProgress;
        Object.assign(data, extra);

        syncedVideo = await db.video.update({
          where: { id: video.id },
          data,
          select: {
            id: true,
            title: true,
            status: true,
            progress: true,
            storageType: true,
            bunnyVideoId: true,
            bunnyLibraryId: true,
            originalKey: true,
            sizeBytes: true,
            sourceWidth: true,
            sourceHeight: true,
            durationSeconds: true,
          },
        });
        console.log(`[Bunny Poll Sync] Video ${video.id} updated: status=${syncedVideo.status}, progress=${syncedVideo.progress}% (bunny status=${s}, ep=${ep}%)`);
      }
    } catch (syncErr: any) {
      console.warn(`[Bunny Poll Sync] Failed to sync DB for video ${video.id}:`, syncErr?.message || syncErr);
    }

    const localSource = syncedVideo || video;

    return NextResponse.json({
      guid: bunnyVideo.guid,
      title: bunnyVideo.title,
      status: bunnyVideo.status,
      encodeProgress: typeof bunnyVideo.encodeProgress === "number" ? Math.max(0, Math.min(100, Math.round(bunnyVideo.encodeProgress))) : 0,
      isPublic: bunnyVideo.isPublic,
      storageSize: bunnyVideo.storageSize,
      length: bunnyVideo.length,
      width: bunnyVideo.width,
      height: bunnyVideo.height,
      framerate: bunnyVideo.framerate,
      views: bunnyVideo.views,
      dateUploaded: bunnyVideo.dateUploaded,
      thumbnailCount: bunnyVideo.thumbnailCount,
      thumbnailFileName: bunnyVideo.thumbnailFileName,
      collectionId: (bunnyVideo as any).collectionId || null,
      availableResolutionsRaw: bunnyVideo.availableResolutions || null,
      availableResolutions: resolutions,
      lastFetchedAt: new Date().toISOString(),
      local: {
        id: localSource.id,
        title: localSource.title,
        status: (localSource as any).status,
        progress: (localSource as any).progress,
        sizeBytes: (localSource as any).sizeBytes != null ? Number((localSource as any).sizeBytes) : null,
        durationSeconds: (localSource as any).durationSeconds,
        sourceResolution:
          (localSource as any).sourceWidth && (localSource as any).sourceHeight
            ? `${(localSource as any).sourceWidth}x${(localSource as any).sourceHeight}`
            : null,
        bunnyVideoId: guid,
        bunnyLibraryId: (localSource as any).bunnyLibraryId || null,
        storageType: (localSource as any).storageType || null,
      },
      synced: Boolean(syncedVideo),
    });
  } catch (e: any) {
    console.error(`[Bunny Renditions Error] GET /api/v1/videos/${id}/bunny failed:`, e);
    return NextResponse.json(
      { error: "Failed to fetch video info from Bunny Stream", details: e?.message || String(e) },
      { status: 502 }
    );
  }
}
