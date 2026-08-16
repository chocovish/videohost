import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: folderId } = await params;
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const folder = await db.folder.findFirst({
      where: { id: folderId, organizationId: authCtx.orgId },
    });

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const { name, parentId: rawParentId } = await req.json();

    const dataToUpdate: any = {};
    if (name !== undefined) {
      const trimmed = name.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "Folder name cannot be empty" }, { status: 400 });
      }
      dataToUpdate.name = trimmed;
    }

    if (rawParentId !== undefined) {
      const newParentId = !rawParentId || rawParentId === "root" || rawParentId === "null" ? null : rawParentId;
      if (newParentId === folderId) {
        return NextResponse.json({ error: "Cannot move folder into itself" }, { status: 400 });
      }

      if (newParentId) {
        // Validate target parent exists in organization
        const targetParent = await db.folder.findFirst({
          where: { id: newParentId, organizationId: authCtx.orgId },
        });

        if (!targetParent) {
          return NextResponse.json({ error: "Destination folder not found" }, { status: 404 });
        }

        // Circular reference check: traverse up from newParentId to make sure folderId is not in the ancestor path
        let currAncestor: typeof targetParent | null = targetParent;
        while (currAncestor) {
          if (currAncestor.id === folderId) {
            return NextResponse.json(
              { error: "Cannot move folder into one of its own subfolders" },
              { status: 400 }
            );
          }
          if (currAncestor.parentId) {
            currAncestor = await db.folder.findFirst({
              where: { id: currAncestor.parentId, organizationId: authCtx.orgId },
            });
          } else {
            currAncestor = null;
          }
        }
      }

      dataToUpdate.parentId = newParentId;
    }

    // Check duplicate folder name in target parent
    const targetParentId = rawParentId !== undefined ? dataToUpdate.parentId : folder.parentId;
    const targetName = dataToUpdate.name ?? folder.name;

    const existingNameInDest = await db.folder.findFirst({
      where: {
        organizationId: authCtx.orgId,
        parentId: targetParentId,
        name: targetName,
        NOT: { id: folderId },
      },
    });

    if (existingNameInDest) {
      return NextResponse.json(
        { error: "A folder with this name already exists in the destination" },
        { status: 400 }
      );
    }

    const updatedFolder = await db.folder.update({
      where: { id: folderId },
      data: dataToUpdate,
    });

    return NextResponse.json({ folder: updatedFolder });
  } catch (error: any) {
    console.error("Error updating folder:", error);
    return NextResponse.json({ error: error.message || "Failed to update folder" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: folderId } = await params;
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const folder = await db.folder.findFirst({
      where: { id: folderId, organizationId: authCtx.orgId },
    });

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    // Unlink videos in this folder before deleting
    await db.video.updateMany({
      where: { folderId: folderId, organizationId: authCtx.orgId },
      data: { folderId: null },
    });

    // Delete folder (Prisma cascading delete handles child folders)
    await db.folder.delete({
      where: { id: folderId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting folder:", error);
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
  }
}
