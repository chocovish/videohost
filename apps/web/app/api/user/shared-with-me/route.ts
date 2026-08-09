import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";
import { getPlaybackUrl } from "@/lib/s3";

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

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userEmail = user.email ? user.email.toLowerCase() : "";

    // Find all SharedLinks where recipientEmail matches OR user accessed it
    const sharedLinks = await db.sharedLink.findMany({
      where: {
        OR: [
          ...(userEmail ? [{ recipientEmail: { equals: userEmail, mode: "insensitive" as const } }] : []),
          { accesses: { some: { userId: user.id } } },
        ],
      },
      include: {
        organization: true,
        video: true,
        folder: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const baseUrl = process.env.APP_URL || "http://localhost:3000";

    const items = sharedLinks.map((link) => {
      const isVideo = Boolean(link.videoId && link.video);
      return {
        id: link.id,
        token: link.token,
        shareUrl: `${baseUrl}/share/${link.token}`,
        type: isVideo ? "video" : "folder",
        title: isVideo ? link.video?.title || "Untitled Video" : link.folder?.name || "Untitled Folder",
        description: isVideo ? link.video?.description : undefined,
        thumbnailUrl: isVideo ? link.video?.thumbnailUrl : undefined,
        durationSeconds: isVideo ? link.video?.durationSeconds : undefined,
        organizationName: link.organization.name,
        organizationLogo: link.organization.logoUrl,
        message: link.message,
        requireLogin: link.requireLogin,
        createdAt: link.createdAt,
      };
    });

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error("GET /api/user/shared-with-me error:", error);
    return NextResponse.json({ error: "Failed to fetch shared items" }, { status: 500 });
  }
}
