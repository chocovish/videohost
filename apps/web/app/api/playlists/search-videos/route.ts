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
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("query") || "").trim();
    const playlistId = searchParams.get("playlistId");

    let existingVideoIds = new Set<string>();
    if (playlistId) {
      const existingItems = await db.playlistItem.findMany({
        where: { playlistId },
        select: { videoId: true },
      });
      existingVideoIds = new Set(existingItems.map((i) => i.videoId));
    }

    const whereClause: any = {
      organizationId: authCtx.orgId,
    };

    if (query) {
      whereClause.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { id: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ];
    }

    const videos = await db.video.findMany({
      where: whereClause,
      include: {
        folder: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const formatted = await Promise.all(
      videos.map(async (v) => {
        const thumbnailUrl = v.thumbnailKey ? await getPresignedPlaybackUrl(v.thumbnailKey) : null;
        return {
          id: v.id,
          title: v.title,
          description: v.description,
          durationSeconds: v.durationSeconds,
          status: v.status,
          thumbnailUrl,
          folderId: v.folderId,
          folderName: v.folder?.name || null,
          alreadyInPlaylist: existingVideoIds.has(v.id),
          createdAt: v.createdAt,
        };
      })
    );

    return NextResponse.json({ videos: formatted });
  } catch (error: any) {
    console.error("Error searching videos for playlist:", error);
    return NextResponse.json({ error: error.message || "Failed to search videos" }, { status: 500 });
  }
}
