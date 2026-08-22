import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { authenticateRequest } from "@/lib/api-auth";
import { getPresignedPlaybackUrl } from "@/lib/s3";
import { db } from "@videohost/db";

export async function GET(req: Request) {
  let userId: string | null = null;

  // 1. Try API auth context
  const authCtx = await authenticateRequest(req);
  if (authCtx?.userId) {
    userId = authCtx.userId;
  } else {
    // 2. Fall back to NextAuth session
    const session = await auth();
    if (session?.user?.id) {
      userId = session.user.id;
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rawPurchases = await db.contentPurchase.findMany({
      where: {
        userId,
        status: "COMPLETED",
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
        video: {
          include: {
            renditions: true,
          },
        },
        playlist: {
          include: {
            items: {
              orderBy: { order: "asc" },
              include: {
                video: {
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    durationSeconds: true,
                    thumbnailKey: true,
                    status: true,
                  },
                },
              },
            },
            _count: { select: { items: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const baseUrl = process.env.APP_URL || "http://localhost:3000";

    const purchases = await Promise.all(
      rawPurchases.map(async (purchase) => {
        const isVideo = purchase.contentType === "VIDEO";
        const isPlaylist = purchase.contentType === "PLAYLIST";

        let title = "Unknown Item";
        let description: string | null = null;
        let thumbnailUrl: string | null = null;
        let durationSeconds: number | null = null;
        let itemCount: number | null = null;
        let playlistVideos: Array<{
          id: string;
          title: string;
          durationSeconds: number | null;
          thumbnailUrl: string | null;
        }> = [];

        if (isVideo && purchase.video) {
          title = purchase.video.title;
          description = purchase.video.description;
          durationSeconds = purchase.video.durationSeconds;
          if (purchase.video.thumbnailKey) {
            try {
              thumbnailUrl = await getPresignedPlaybackUrl(purchase.video.thumbnailKey);
            } catch (e) {
              console.error("Error signing video thumbnail URL in purchases route:", e);
            }
          }
        } else if (isPlaylist && purchase.playlist) {
          title = purchase.playlist.title;
          description = purchase.playlist.description;
          itemCount = purchase.playlist._count.items;

          // Compute total duration for playlist
          durationSeconds = purchase.playlist.items.reduce(
            (acc, it) => acc + (it.video?.durationSeconds || 0),
            0
          );

          // Get first video thumbnail as default playlist thumbnail
          const firstThumbKey = purchase.playlist.items[0]?.video?.thumbnailKey;
          if (firstThumbKey) {
            try {
              thumbnailUrl = await getPresignedPlaybackUrl(firstThumbKey);
            } catch (e) {
              console.error("Error signing playlist thumbnail URL in purchases route:", e);
            }
          }

          // Map top items for quick preview
          playlistVideos = await Promise.all(
            purchase.playlist.items.slice(0, 10).map(async (it) => ({
              id: it.video.id,
              title: it.video.title,
              durationSeconds: it.video.durationSeconds,
              thumbnailUrl: it.video.thumbnailKey
                ? await getPresignedPlaybackUrl(it.video.thumbnailKey)
                : null,
            }))
          );
        }

        let orgLogoUrl: string | null = null;
        if (purchase.organization?.logoUrl) {
          try {
            orgLogoUrl = await getPresignedPlaybackUrl(purchase.organization.logoUrl);
          } catch (e) {
            console.error("Error signing org logo URL in purchases route:", e);
          }
        }

        const shareUrl = isVideo && purchase.videoId
          ? `${baseUrl}/share/${purchase.videoId}`
          : isPlaylist && purchase.playlistId
          ? `${baseUrl}/share/${purchase.playlistId}`
          : "";

        return {
          id: purchase.id,
          contentType: purchase.contentType as "VIDEO" | "PLAYLIST",
          contentId: purchase.videoId || purchase.playlistId || "",
          title,
          description,
          thumbnailUrl,
          durationSeconds,
          itemCount,
          playlistVideos,
          shareUrl,
          amount: purchase.amount,
          currency: purchase.currency || "USD",
          countryCode: purchase.countryCode,
          paymentMethod: purchase.paymentMethod || "CARD",
          paymentId: purchase.paymentId,
          status: purchase.status,
          purchasedAt: purchase.createdAt.toISOString(),
          organization: {
            id: purchase.organization.id,
            name: purchase.organization.name,
            slug: purchase.organization.slug,
            logoUrl: orgLogoUrl,
          },
        };
      })
    );

    // Calculate aggregated stats
    const totalPurchases = purchases.length;
    const totalVideos = purchases.filter((p) => p.contentType === "VIDEO").length;
    const totalPlaylists = purchases.filter((p) => p.contentType === "PLAYLIST").length;

    const totalSpentByCurrency: Record<string, number> = {};
    for (const p of purchases) {
      const curr = p.currency || "USD";
      totalSpentByCurrency[curr] = (totalSpentByCurrency[curr] || 0) + (p.amount || 0);
    }

    return NextResponse.json({
      success: true,
      purchases,
      stats: {
        totalPurchases,
        totalVideos,
        totalPlaylists,
        totalSpentByCurrency,
      },
    });
  } catch (error: any) {
    console.error("GET /api/user/purchased-items error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch purchased items" },
      { status: 500 }
    );
  }
}
