import { NextResponse } from "next/server";
import { db } from "@videohost/db";
import { getPlaybackUrl } from "@/lib/s3";
import { auth } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params; // token is video ID or folder ID
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
      return NextResponse.json({ error: "Shared item not found or has expired." }, { status: 404 });
    }

    const item = video || folder;
    const isVideo = Boolean(video);
    const targetType = isVideo ? "video" : "folder";
    const itemTitle = isVideo ? video!.title : folder!.name;

    const organization = {
      name: item.organization.name,
      logoUrl: item.organization.logoUrl,
      slug: item.organization.slug,
    };

    const accessMode = item.shareAccessMode;
    const sharedEmails: Array<{ email: string }> = item.sharedEmails;

    // 3. Check PRIVATE Access Mode
    if (accessMode === "PRIVATE") {
      return NextResponse.json(
        {
          error: "PRIVATE_CONTENT",
          accessMode: "PRIVATE",
          token,
          organization,
          type: targetType,
          itemTitle,
        },
        { status: 403 }
      );
    }

    // 4. Check RESTRICTED Access Mode (Specific Emails)
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
          },
          { status: 403 }
        );
      }
    }

    // 5. Return Video Response
    if (isVideo && video) {
      return NextResponse.json({
        type: "video",
        accessMode,
        organization,
        video: {
          id: video.id,
          title: video.title,
          description: video.description,
          status: video.status,
          durationSeconds: video.durationSeconds,
          thumbnailUrl: video.thumbnailUrl,
          playbackUrl: getPlaybackUrl(video),
          createdAt: video.createdAt,
        },
      });
    }

    // 6. Return Folder Response
    if (!isVideo && folder) {
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

      const subfolders = await db.folder.findMany({
        where: { parentId: activeFolderId, organizationId: folder.organizationId },
        orderBy: { name: "asc" },
      });

      return NextResponse.json({
        type: "folder",
        accessMode,
        organization,
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
