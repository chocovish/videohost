import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { resolveThumbnailUrl } from "@/lib/storage";
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
                organizationId: true,
                title: true,
                durationSeconds: true,
                thumbnailKey: true,
                status: true,
                storageType: true,
                bunnyVideoId: true,
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
          if (!firstThumbnailUrl) {
            try {
              firstThumbnailUrl = await resolveThumbnailUrl(video as any);
            } catch (e) {
              console.error("Error resolving thumbnail URL for playlist:", e);
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
    const shareAccessMode = body.shareAccessMode || "PUBLIC";
    const price = body.price;
    const currency = body.currency || "USD";
    const countryPricing = body.countryPricing;
    const inviteEmails = body.inviteEmails || [];

    if (!title) {
      return NextResponse.json({ error: "Playlist title is required" }, { status: 400 });
    }

    const validModes = ["PUBLIC", "RESTRICTED", "PRIVATE", "PURCHASABLE"];
    const resolvedMode = validModes.includes(shareAccessMode) ? shareAccessMode : "PUBLIC";
    const parsedPrice = resolvedMode === "PURCHASABLE" && price !== undefined && price !== null ? parseFloat(String(price)) : null;

    const playlist = await db.playlist.create({
      data: {
        organizationId: authCtx.orgId,
        title,
        description,
        shareAccessMode: resolvedMode as any,
        price: parsedPrice,
        currency: currency || "USD",
        countryPricing: resolvedMode === "PURCHASABLE" && countryPricing ? countryPricing : undefined,
      },
    });

    if (resolvedMode === "RESTRICTED" && Array.isArray(inviteEmails) && inviteEmails.length > 0) {
      try {
        await db.sharedEmail.createMany({
          data: inviteEmails.map((email: string) => ({
            playlistId: playlist.id,
            email: email.trim().toLowerCase(),
          })),
          skipDuplicates: true,
        });
      } catch (emailErr) {
        console.warn("Failed to create initial shared emails for playlist:", emailErr);
      }
    }

    return NextResponse.json({ playlist }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating playlist:", error);
    return NextResponse.json({ error: error.message || "Failed to create playlist" }, { status: 500 });
  }
}
