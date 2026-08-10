import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { getPublicCdnUrl } from "@/lib/s3";
import { db } from "@videohost/db";

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
        organization: true,
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
        organization: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const baseUrl = process.env.APP_URL || "http://localhost:3000";

    const videoItems = sharedVideos.map((video) => ({
      id: video.id,
      shareUrl: `${baseUrl}/share/${video.id}`,
      accessMode: video.shareAccessMode,
      requireLogin: video.shareAccessMode === "RESTRICTED",
      type: "video" as const,
      title: video.title,
      description: video.description,
      thumbnailUrl: video.thumbnailKey ? getPublicCdnUrl(video.thumbnailKey) : null,
      durationSeconds: video.durationSeconds,
      organizationName: video.organization.name,
      organizationLogo: video.organization.logoUrl,
      createdAt: video.createdAt,
    }));

    const folderItems = sharedFolders.map((folder) => ({
      id: folder.id,
      shareUrl: `${baseUrl}/share/${folder.id}`,
      accessMode: folder.shareAccessMode,
      requireLogin: folder.shareAccessMode === "RESTRICTED",
      type: "folder" as const,
      title: folder.name,
      organizationName: folder.organization.name,
      organizationLogo: folder.organization.logoUrl,
      createdAt: folder.createdAt,
    }));

    const items = [...videoItems, ...folderItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error("GET /api/user/shared-with-me error:", error);
    return NextResponse.json({ error: "Failed to fetch shared items" }, { status: 500 });
  }
}
