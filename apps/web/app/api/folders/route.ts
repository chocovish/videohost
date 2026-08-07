import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";

export async function GET(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const rawParentId = searchParams.get("parentId");
  const parentId = !rawParentId || rawParentId === "root" || rawParentId === "null" ? null : rawParentId;

  try {
    let currentFolder = null;
    const breadcrumbs: { id: string; name: string }[] = [];

    if (parentId) {
      currentFolder = await db.folder.findFirst({
        where: { id: parentId, organizationId: authCtx.orgId },
      });

      if (!currentFolder) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      }

      // Build breadcrumbs path from current folder up to root
      let current: typeof currentFolder | null = currentFolder;
      while (current) {
        breadcrumbs.unshift({ id: current.id, name: current.name });
        if (current.parentId) {
          current = await db.folder.findFirst({
            where: { id: current.parentId, organizationId: authCtx.orgId },
          });
        } else {
          current = null;
        }
      }
    }

    const folders = await db.folder.findMany({
      where: {
        organizationId: authCtx.orgId,
        parentId: parentId,
      },
      include: {
        _count: {
          select: {
            children: true,
            videos: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const formattedFolders = folders.map((f) => ({
      id: f.id,
      name: f.name,
      parentId: f.parentId,
      itemCount: f._count.children + f._count.videos,
      createdAt: f.createdAt,
    }));

    return NextResponse.json({
      folders: formattedFolders,
      currentFolder,
      breadcrumbs,
    });
  } catch (error) {
    console.error("Error fetching folders:", error);
    return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, parentId: rawParentId } = await req.json();
    const folderName = name?.trim();

    if (!folderName) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    }

    const parentId = !rawParentId || rawParentId === "root" || rawParentId === "null" ? null : rawParentId;

    if (parentId) {
      const parentFolder = await db.folder.findFirst({
        where: { id: parentId, organizationId: authCtx.orgId },
      });
      if (!parentFolder) {
        return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
      }
    }

    // Check duplicate folder name in same parent
    const existing = await db.folder.findFirst({
      where: {
        organizationId: authCtx.orgId,
        parentId: parentId,
        name: folderName,
      },
    });

    if (existing) {
      return NextResponse.json({ error: "A folder with this name already exists here" }, { status: 400 });
    }

    const folder = await db.folder.create({
      data: {
        organizationId: authCtx.orgId,
        name: folderName,
        parentId: parentId,
      },
    });

    return NextResponse.json({ folder }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating folder:", error);
    return NextResponse.json({ error: error.message || "Failed to create folder" }, { status: 500 });
  }
}
