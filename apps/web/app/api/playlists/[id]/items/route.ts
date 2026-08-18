import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";

// Helper function to recursively get all subfolder IDs
async function getAllSubfolderIds(folderId: string, orgId: string): Promise<string[]> {
  const folderIds = [folderId];
  const queue = [folderId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = await db.folder.findMany({
      where: { parentId: currentId, organizationId: orgId },
      select: { id: true },
    });
    for (const child of children) {
      folderIds.push(child.id);
      queue.push(child.id);
    }
  }

  return folderIds;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: playlistId } = await params;
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const playlist = await db.playlist.findFirst({
      where: { id: playlistId, organizationId: authCtx.orgId },
      include: {
        items: {
          select: { videoId: true, order: true },
        },
      },
    });

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    const existingVideoIds = new Set(playlist.items.map((i) => i.videoId));
    const maxOrder = playlist.items.length > 0 ? Math.max(...playlist.items.map((i) => i.order)) : -1;

    const body = await req.json();
    const { videoId, videoIds, folderId } = body;

    let targetVideoIds: string[] = [];

    if (folderId) {
      // Find all folders (including nested subfolders)
      const allFolderIds = await getAllSubfolderIds(folderId, authCtx.orgId);
      const folderVideos = await db.video.findMany({
        where: {
          folderId: { in: allFolderIds },
          organizationId: authCtx.orgId,
        },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      targetVideoIds = folderVideos.map((v) => v.id);
    } else if (Array.isArray(videoIds) && videoIds.length > 0) {
      targetVideoIds = videoIds;
    } else if (videoId) {
      targetVideoIds = [videoId];
    } else {
      return NextResponse.json(
        { error: "Must provide videoId, videoIds, or folderId" },
        { status: 400 }
      );
    }

    // Filter out videos not belonging to the org or already present
    const validVideos = await db.video.findMany({
      where: {
        id: { in: targetVideoIds },
        organizationId: authCtx.orgId,
      },
      select: { id: true },
    });

    const validVideoIdSet = new Set(validVideos.map((v) => v.id));
    const toAdd = targetVideoIds.filter((id) => validVideoIdSet.has(id) && !existingVideoIds.has(id));

    if (toAdd.length === 0) {
      return NextResponse.json({
        success: true,
        addedCount: 0,
        message: "No new videos to add (videos may already be in the playlist).",
      });
    }

    let nextOrder = maxOrder + 1;
    const itemsToCreate = toAdd.map((vid) => ({
      playlistId,
      videoId: vid,
      order: nextOrder++,
    }));

    await db.playlistItem.createMany({
      data: itemsToCreate,
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      addedCount: toAdd.length,
      addedVideoIds: toAdd,
    });
  } catch (error: any) {
    console.error("Error adding playlist items:", error);
    return NextResponse.json({ error: error.message || "Failed to add videos to playlist" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: playlistId } = await params;
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const playlist = await db.playlist.findFirst({
      where: { id: playlistId, organizationId: authCtx.orgId },
    });

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    const body = await req.json();
    const { orderedItemIds, orderedVideoIds } = body;

    if (Array.isArray(orderedItemIds) && orderedItemIds.length > 0) {
      await db.$transaction(
        orderedItemIds.map((itemId: string, index: number) =>
          db.playlistItem.update({
            where: { id: itemId },
            data: { order: index },
          })
        )
      );
    } else if (Array.isArray(orderedVideoIds) && orderedVideoIds.length > 0) {
      await db.$transaction(
        orderedVideoIds.map((vid: string, index: number) =>
          db.playlistItem.updateMany({
            where: { playlistId, videoId: vid },
            data: { order: index },
          })
        )
      );
    } else {
      return NextResponse.json(
        { error: "Must provide orderedItemIds or orderedVideoIds" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: "Playlist order updated" });
  } catch (error: any) {
    console.error("Error reordering playlist items:", error);
    return NextResponse.json({ error: error.message || "Failed to reorder playlist" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: playlistId } = await params;
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const playlist = await db.playlist.findFirst({
      where: { id: playlistId, organizationId: authCtx.orgId },
    });

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    let itemId = searchParams.get("itemId");
    let videoId = searchParams.get("videoId");

    if (!itemId && !videoId) {
      try {
        const body = await req.json();
        itemId = body.itemId;
        videoId = body.videoId;
      } catch (e) {
        // body might be empty
      }
    }

    if (itemId) {
      await db.playlistItem.deleteMany({
        where: { id: itemId, playlistId },
      });
    } else if (videoId) {
      await db.playlistItem.deleteMany({
        where: { videoId, playlistId },
      });
    } else {
      return NextResponse.json({ error: "itemId or videoId required" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Video removed from playlist" });
  } catch (error: any) {
    console.error("Error removing item from playlist:", error);
    return NextResponse.json({ error: error.message || "Failed to remove video from playlist" }, { status: 500 });
  }
}
