import { NextResponse } from "next/server";
import { db } from "@videohost/db";
import { getPlaybackUrl, getPresignedPlaybackUrl } from "@/lib/s3";
import { auth } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params; // token is video ID, folder ID, or playlist ID
    const url = new URL(req.url);
    const subfolderId = url.searchParams.get("subfolderId");
    const session = await auth();

    // 1. Try finding as Video first
    let video = await db.video.findUnique({
      where: { id: token },
      include: {
        organization: true,
        sharedEmails: true,
        renditions: true,
      },
    });

    let folder: any = null;
    let playlist: any = null;

    if (!video) {
      // 2. Try finding as Folder
      folder = await db.folder.findUnique({
        where: { id: token },
        include: {
          organization: true,
          sharedEmails: true,
        },
      });
    }

    if (!video && !folder) {
      // 3. Try finding as Playlist
      playlist = await db.playlist.findUnique({
        where: { id: token },
        include: {
          organization: true,
          sharedEmails: true,
          items: {
            orderBy: { order: "asc" },
            include: {
              video: {
                include: {
                  renditions: true,
                },
              },
            },
          },
        },
      });
    }

    if (!video && !folder && !playlist) {
      return NextResponse.json({ error: "Shared item not found or has expired." }, { status: 404 });
    }

    const item = video || folder || playlist;
    const isVideo = Boolean(video);
    const isFolder = Boolean(folder);
    const isPlaylist = Boolean(playlist);

    const targetType: "video" | "folder" | "playlist" = isVideo ? "video" : isPlaylist ? "playlist" : "folder";
    const itemTitle = isVideo ? video!.title : isPlaylist ? playlist!.title : folder!.name;

    const organization = {
      name: item.organization.name,
      logoUrl: await getPresignedPlaybackUrl(item.organization.logoUrl),
      slug: item.organization.slug,
    };

    const accessMode = item.shareAccessMode;
    const sharedEmails: Array<{ email: string }> = item.sharedEmails;

    // Fetch customization config for this organization
    const rawShareConfig = await db.sharePageConfig.findUnique({
      where: { organizationId: item.organizationId },
    });

    let sharePageConfig: any = rawShareConfig ? { ...rawShareConfig } : null;
    if (sharePageConfig) {
      if (sharePageConfig.customLogoKey) {
        try {
          sharePageConfig.customLogoUrl = await getPresignedPlaybackUrl(sharePageConfig.customLogoKey);
        } catch (e) {
          console.error("Error signing custom logo URL in share route:", e);
        }
      }
      if (sharePageConfig.welcomeBannerKey) {
        try {
          sharePageConfig.welcomeBannerUrl = await getPresignedPlaybackUrl(sharePageConfig.welcomeBannerKey);
        } catch (e) {
          console.error("Error signing welcome banner URL in share route:", e);
        }
      }
    }

    // 4. Check PRIVATE Access Mode
    if (accessMode === "PRIVATE") {
      return NextResponse.json(
        {
          error: "PRIVATE_CONTENT",
          accessMode: "PRIVATE",
          token,
          organization,
          type: targetType,
          itemTitle,
          sharePageConfig,
        },
        { status: 403 }
      );
    }

    // 5. Check RESTRICTED Access Mode (Specific Emails)
    if (accessMode === "RESTRICTED") {
      if (!session || !session.user || !session.user.id) {
        return NextResponse.json(
          {
            error: "LOGIN_REQUIRED",
            requireLogin: true,
            accessMode: "RESTRICTED",
            token,
            organization,
            type: targetType,
            itemTitle,
            sharePageConfig,
          },
          { status: 401 }
        );
      }

      const userEmail = (session.user.email || "").toLowerCase();
      const isEmailAllowed = sharedEmails.some((se) => se.email.toLowerCase() === userEmail);

      let isOrgMember = false;
      if (session.user.id) {
        const member = await db.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: item.organizationId,
              userId: session.user.id,
            },
          },
        });
        if (member) isOrgMember = true;
      }

      if (!isEmailAllowed && !isOrgMember) {
        return NextResponse.json(
          {
            error: "ACCESS_DENIED",
            accessMode: "RESTRICTED",
            userEmail: session.user.email,
            organization,
            type: targetType,
            itemTitle,
            sharePageConfig,
          },
          { status: 403 }
        );
      }
    }

    // 6. Return Video Response
    if (isVideo && video) {
      const folderIdParam = url.searchParams.get("folderId") || url.searchParams.get("fromFolder") || url.searchParams.get("fromFolderId");
      const targetFolderId = folderIdParam || video.folderId;
      let parentFolder: { id: string; name: string } | null = null;

      if (targetFolderId) {
        const folderDoc = await db.folder.findUnique({
          where: { id: targetFolderId },
          select: { id: true, name: true },
        });
        if (folderDoc) {
          parentFolder = {
            id: folderDoc.id,
            name: folderDoc.name,
          };
        }
      }

      return NextResponse.json({
        type: "video",
        accessMode,
        organization,
        sharePageConfig,
        parentFolder,
        video: {
          id: video.id,
          title: video.title,
          description: video.description,
          status: video.status,
          durationSeconds: video.durationSeconds,
          thumbnailUrl: video.thumbnailKey ? await getPresignedPlaybackUrl(video.thumbnailKey) : null,
          playbackUrl: await getPlaybackUrl(video),
          createdAt: video.createdAt,
        },
      });
    }

    // 7. Return Playlist Response
    if (isPlaylist && playlist) {
      let totalDurationSeconds = 0;
      const videos = await Promise.all(
        playlist.items.map(async (item: any) => {
          const v = item.video;
          if (v.durationSeconds) {
            totalDurationSeconds += v.durationSeconds;
          }
          return {
            id: v.id,
            itemId: item.id,
            order: item.order,
            title: v.title,
            description: v.description,
            status: v.status,
            durationSeconds: v.durationSeconds,
            thumbnailUrl: v.thumbnailKey ? await getPresignedPlaybackUrl(v.thumbnailKey) : null,
            playbackUrl: await getPlaybackUrl(v),
            createdAt: v.createdAt,
          };
        })
      );

      return NextResponse.json({
        type: "playlist",
        accessMode,
        organization,
        sharePageConfig,
        playlist: {
          id: playlist.id,
          title: playlist.title,
          description: playlist.description,
          itemCount: playlist.items.length,
          totalDurationSeconds,
          createdAt: playlist.createdAt,
        },
        videos,
      });
    }

    // 8. Return Folder Response
    if (isFolder && folder) {
      let activeFolderId = folder.id;

      if (subfolderId) {
        const requestedSubfolder = await db.folder.findFirst({
          where: { id: subfolderId, organizationId: folder.organizationId },
        });
        if (requestedSubfolder) {
          activeFolderId = requestedSubfolder.id;
        }
      }

      const activeFolder = await db.folder.findUnique({
        where: { id: activeFolderId },
      });

      if (!activeFolder) {
        return NextResponse.json({ error: "Folder not found." }, { status: 404 });
      }

      const rawVideos = await db.video.findMany({
        where: { folderId: activeFolderId, organizationId: folder.organizationId },
        include: { renditions: true },
        orderBy: { createdAt: "desc" },
      });

      const videos = await Promise.all(rawVideos.map(async (v) => ({
        id: v.id,
        title: v.title,
        description: v.description,
        status: v.status,
        durationSeconds: v.durationSeconds,
        thumbnailUrl: v.thumbnailKey ? await getPresignedPlaybackUrl(v.thumbnailKey) : null,
        playbackUrl: await getPlaybackUrl(v),
        createdAt: v.createdAt,
      })));

      const subfolders = await db.folder.findMany({
        where: { parentId: activeFolderId, organizationId: folder.organizationId },
        orderBy: { name: "asc" },
      });

      return NextResponse.json({
        type: "folder",
        accessMode,
        organization,
        sharePageConfig,
        rootFolder: {
          id: folder.id,
          name: folder.name,
        },
        currentFolder: {
          id: activeFolder.id,
          name: activeFolder.name,
          parentId: activeFolder.parentId,
        },
        videos,
        subfolders: subfolders.map((sf) => ({ id: sf.id, name: sf.name })),
      });
    }

    return NextResponse.json({ error: "Invalid shared item." }, { status: 400 });
  } catch (err: any) {
    console.error("[GET Shared Item Error]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
