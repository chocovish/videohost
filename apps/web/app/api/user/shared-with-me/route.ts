import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { getPresignedPlaybackUrl } from "@/lib/s3";
import { db } from "@videohost/db";
import { getBaseUrl } from "@/lib/utils";

export async function GET(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await db.user.findUnique({
      where: { id: authCtx.userId },
      select: { id: true, email: true },
    });

    if (!user || !user.email) {
      return NextResponse.json({ items: [] });
    }

    const userEmail = user.email.toLowerCase();

    // Fetch shared videos
    const sharedVideos = await db.video.findMany({
      where: {
        shareAccessMode: { not: "PRIVATE" },
        sharedEmails: {
          some: {
            email: { equals: userEmail, mode: "insensitive" },
          },
        },
      },
      include: {
        organization: { select: { name: true, logoUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch shared folders
    const sharedFolders = await db.folder.findMany({
      where: {
        shareAccessMode: { not: "PRIVATE" },
        sharedEmails: {
          some: {
            email: { equals: userEmail, mode: "insensitive" },
          },
        },
      },
      include: {
        organization: { select: { name: true, logoUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch shared playlists
    const sharedPlaylists = await db.playlist.findMany({
      where: {
        shareAccessMode: { not: "PRIVATE" },
        sharedEmails: {
          some: {
            email: { equals: userEmail, mode: "insensitive" },
          },
        },
      },
      include: {
        organization: { select: { name: true, logoUrl: true } },
        items: {
          orderBy: { order: "asc" },
          take: 1,
          include: {
            video: { select: { thumbnailKey: true, durationSeconds: true } },
          },
        },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const baseUrl = getBaseUrl();

    const videoItems = await Promise.all(
      sharedVideos.map(async (video) => ({
        id: video.id,
        shareUrl: `${baseUrl}/share/${video.id}`,
        accessMode: video.shareAccessMode,
        requireLogin: video.shareAccessMode === "RESTRICTED",
        type: "video" as const,
        title: video.title,
        description: video.description,
        thumbnailUrl: video.thumbnailKey ? await getPresignedPlaybackUrl(video.thumbnailKey) : null,
        durationSeconds: video.durationSeconds,
        organizationName: video.organization.name,
        organizationLogo: await getPresignedPlaybackUrl(video.organization.logoUrl),
        createdAt: video.createdAt,
      }))
    );

    const folderItems = await Promise.all(
      sharedFolders.map(async (folder) => ({
        id: folder.id,
        shareUrl: `${baseUrl}/share/${folder.id}`,
        accessMode: folder.shareAccessMode,
        requireLogin: folder.shareAccessMode === "RESTRICTED",
        type: "folder" as const,
        title: folder.name,
        organizationName: folder.organization.name,
        organizationLogo: await getPresignedPlaybackUrl(folder.organization.logoUrl),
        createdAt: folder.createdAt,
      }))
    );

    const playlistItems = await Promise.all(
      sharedPlaylists.map(async (pl) => {
        const firstThumbKey = pl.items[0]?.video?.thumbnailKey;
        const thumbnailUrl = firstThumbKey ? await getPresignedPlaybackUrl(firstThumbKey) : null;
        return {
          id: pl.id,
          shareUrl: `${baseUrl}/share/${pl.id}`,
          accessMode: pl.shareAccessMode,
          requireLogin: pl.shareAccessMode === "RESTRICTED",
          type: "playlist" as const,
          title: pl.title,
          description: pl.description,
          thumbnailUrl,
          itemCount: pl._count.items,
          organizationName: pl.organization.name,
          organizationLogo: await getPresignedPlaybackUrl(pl.organization.logoUrl),
          createdAt: pl.createdAt,
        };
      })
    );

    const items = [...videoItems, ...folderItems, ...playlistItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error("GET /api/user/shared-with-me error:", error);
    return NextResponse.json({ error: "Failed to fetch shared items" }, { status: 500 });
  }
}
