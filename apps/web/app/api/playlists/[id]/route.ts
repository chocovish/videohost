import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { getPlaybackUrl, getPresignedPlaybackUrl } from "@/lib/s3";
import { resolveThumbnailUrl } from "@/lib/storage";
import { db } from "@videohost/db";
import { getBaseUrl } from "@/lib/utils";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: playlistId } = await params;
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const playlist = await db.playlist.findFirst({
      where: {
        id: playlistId,
        organizationId: authCtx.orgId,
      },
      include: {
        items: {
          orderBy: { order: "asc" },
          include: {
            video: {
              include: {
                folder: {
                  select: { id: true, name: true },
                },
                renditions: true,
              },
            },
          },
        },
        sharedEmails: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    let totalDurationSeconds = 0;
    const formattedVideos = await Promise.all(
      playlist.items.map(async (item) => {
        const v = item.video;
        if (v.durationSeconds) {
          totalDurationSeconds += v.durationSeconds;
        }

        const thumbnailUrl = await resolveThumbnailUrl(v as any);
        const playbackUrl = await getPlaybackUrl(v);

        return {
          itemId: item.id,
          order: item.order,
          videoId: v.id,
          title: v.title,
          description: v.description,
          status: v.status,
          durationSeconds: v.durationSeconds,
          sizeBytes: v.sizeBytes !== null ? Number(v.sizeBytes) : null,
          thumbnailUrl,
          playbackUrl,
          folderId: v.folderId,
          folderName: v.folder?.name || null,
          createdAt: v.createdAt,
        };
      })
    );

    const baseUrl = getBaseUrl();
    const shareUrl = `${baseUrl}/share/${playlist.id}`;

    return NextResponse.json({
      playlist: {
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        shareAccessMode: playlist.shareAccessMode,
        price: playlist.price,
        currency: playlist.currency || "USD",
        countryPricing: playlist.countryPricing || [],
        shareUrl,
        itemCount: playlist.items.length,
        totalDurationSeconds,
        videos: formattedVideos,
        sharedEmails: playlist.sharedEmails,
        createdAt: playlist.createdAt,
        updatedAt: playlist.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Error fetching playlist:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch playlist" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: playlistId } = await params;
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const playlist = await db.playlist.findFirst({
      where: {
        id: playlistId,
        organizationId: authCtx.orgId,
      },
    });

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    const body = await req.json();
    const dataToUpdate: any = {};

    if (body.title !== undefined) {
      const trimmed = body.title.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "Playlist title cannot be empty" }, { status: 400 });
      }
      dataToUpdate.title = trimmed;
    }

    if (body.description !== undefined) {
      dataToUpdate.description = body.description ? body.description.trim() : null;
    }

    if (body.shareAccessMode !== undefined) {
      if (!["PUBLIC", "RESTRICTED", "PRIVATE", "PURCHASABLE"].includes(body.shareAccessMode)) {
        return NextResponse.json({ error: "Invalid share access mode" }, { status: 400 });
      }
      dataToUpdate.shareAccessMode = body.shareAccessMode;
    }

    if (body.price !== undefined) {
      dataToUpdate.price = body.price !== null ? parseFloat(body.price) : null;
    }
    if (body.currency !== undefined) {
      dataToUpdate.currency = body.currency;
    }
    if (body.countryPricing !== undefined) {
      dataToUpdate.countryPricing = body.countryPricing;
    }

    const updated = await db.playlist.update({
      where: { id: playlistId },
      data: dataToUpdate,
    });

    return NextResponse.json({ playlist: updated });
  } catch (error: any) {
    console.error("Error updating playlist:", error);
    return NextResponse.json({ error: error.message || "Failed to update playlist" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: playlistId } = await params;
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const playlist = await db.playlist.findFirst({
      where: {
        id: playlistId,
        organizationId: authCtx.orgId,
      },
    });

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    await db.playlist.delete({
      where: { id: playlistId },
    });

    return NextResponse.json({ success: true, message: "Playlist deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting playlist:", error);
    return NextResponse.json({ error: error.message || "Failed to delete playlist" }, { status: 500 });
  }
}
