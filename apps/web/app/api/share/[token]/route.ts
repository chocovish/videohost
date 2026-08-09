import { NextResponse } from "next/server";
import { db } from "@videohost/db";
import { getPublicCdnUrl, getPlaybackUrl } from "@/lib/s3";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const url = new URL(req.url);
    const subfolderId = url.searchParams.get("subfolderId");

    const sharedLink = await db.sharedLink.findUnique({
      where: { token },
      include: {
        organization: true,
        video: {
          include: { renditions: true },
        },
        folder: true,
      },
    });

    if (!sharedLink) {
      return NextResponse.json({ error: "Shared link not found or has expired." }, { status: 404 });
    }

    const organization = {
      name: sharedLink.organization.name,
      logoUrl: sharedLink.organization.logoUrl,
      slug: sharedLink.organization.slug,
    };

    // Shared Video
    if (sharedLink.videoId && sharedLink.video) {
      const video = sharedLink.video;
      const playbackUrl = getPlaybackUrl(video);

      return NextResponse.json({
        type: "video",
        organization,
        message: sharedLink.message,
        video: {
          id: video.id,
          title: video.title,
          description: video.description,
          status: video.status,
          durationSeconds: video.durationSeconds,
          thumbnailUrl: video.thumbnailUrl,
          playbackUrl,
          createdAt: video.createdAt,
        },
      });
    }

    // Shared Folder
    if (sharedLink.folderId && sharedLink.folder) {
      let activeFolderId = sharedLink.folderId;

      // If user requested a subfolder, verify it belongs to the same organization
      if (subfolderId) {
        const requestedSubfolder = await db.folder.findFirst({
          where: { id: subfolderId, organizationId: sharedLink.organizationId },
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

      // Fetch videos in active folder
      const rawVideos = await db.video.findMany({
        where: { folderId: activeFolderId, organizationId: sharedLink.organizationId },
        include: { renditions: true },
        orderBy: { createdAt: "desc" },
      });

      const videos = rawVideos.map((v) => ({
        id: v.id,
        title: v.title,
        description: v.description,
        status: v.status,
        durationSeconds: v.durationSeconds,
        thumbnailUrl: v.thumbnailUrl,
        playbackUrl: getPlaybackUrl(v),
        createdAt: v.createdAt,
      }));

      // Fetch subfolders in active folder
      const subfolders = await db.folder.findMany({
        where: { parentId: activeFolderId, organizationId: sharedLink.organizationId },
        orderBy: { name: "asc" },
      });

      return NextResponse.json({
        type: "folder",
        organization,
        message: sharedLink.message,
        rootFolder: {
          id: sharedLink.folder.id,
          name: sharedLink.folder.name,
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

    return NextResponse.json({ error: "Invalid shared link target." }, { status: 400 });
  } catch (err: any) {
    console.error("[GET Shared Link Error]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
