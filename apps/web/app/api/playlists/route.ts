import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { getPresignedPlaybackUrl } from "@/lib/s3";
import { db } from "@videohost/db";

export async function GET(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const playlists = await db.playlist.findMany({
      where: {
        organizationId: authCtx.orgId,
      },
      include: {
        items: {
          orderBy: { order: "asc" },
          include: {
            video: {
              select: {
                id: true,
                title: true,
                durationSeconds: true,
                thumbnailKey: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedPlaylists = await Promise.all(
      playlists.map(async (playlist) => {
        const itemCount = playlist.items.length;
        let totalDurationSeconds = 0;
        let firstThumbnailUrl: string | null = null;

        for (let i = 0; i < playlist.items.length; i++) {
          const video = playlist.items[i].video;
          if (video.durationSeconds) {
            totalDurationSeconds += video.durationSeconds;
          }
          if (!firstThumbnailUrl && video.thumbnailKey) {
            try {
              firstThumbnailUrl = await getPresignedPlaybackUrl(video.thumbnailKey);
            } catch (e) {
              console.error("Error signing thumbnail URL for playlist:", e);
            }
          }
        }

        return {
          id: playlist.id,
          title: playlist.title,
          description: playlist.description,
          shareAccessMode: playlist.shareAccessMode,
          itemCount,
          totalDurationSeconds,
          thumbnailUrl: firstThumbnailUrl,
          createdAt: playlist.createdAt,
          updatedAt: playlist.updatedAt,
        };
      })
    );

    return NextResponse.json({ playlists: formattedPlaylists });
  } catch (error: any) {
    console.error("Error fetching playlists:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch playlists" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const title = body.title?.trim();
    const description = body.description ? body.description.trim() : null;

    if (!title) {
      return NextResponse.json({ error: "Playlist title is required" }, { status: 400 });
    }

    const playlist = await db.playlist.create({
      data: {
        organizationId: authCtx.orgId,
        title,
        description,
        shareAccessMode: "PUBLIC",
      },
    });

    return NextResponse.json({ playlist }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating playlist:", error);
    return NextResponse.json({ error: error.message || "Failed to create playlist" }, { status: 500 });
  }
}
