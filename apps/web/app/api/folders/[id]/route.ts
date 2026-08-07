import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const folderId = params.id;
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
        return NextResponse.json({ error: "Cannot set folder as its own parent" }, { status: 400 });
      }
      dataToUpdate.parentId = newParentId;
    }

    const updatedFolder = await db.folder.update({
      where: { id: folderId },
      data: dataToUpdate,
    });

    return NextResponse.json({ folder: updatedFolder });
  } catch (error: any) {
    console.error("Error updating folder:", error);
    return NextResponse.json({ error: "Failed to update folder" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const folderId = params.id;
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
