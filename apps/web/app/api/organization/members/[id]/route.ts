import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (authCtx.role !== "OWNER" && authCtx.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Only Organization Owners and Admins can remove members" },
      { status: 403 }
    );
  }

  try {
    const { id: memberId } = await params;

    const targetMember = await db.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.organizationId !== authCtx.orgId) {
      return NextResponse.json({ error: "Member not found in your organization" }, { status: 404 });
    }

    // Prevent deleting oneself if user is the caller
    if (targetMember.userId === authCtx.userId) {
      return NextResponse.json({ error: "You cannot remove yourself from the organization here" }, { status: 400 });
    }

    // Prevent removing an OWNER unless caller is an OWNER
    if (targetMember.role === "OWNER" && authCtx.role !== "OWNER") {
      return NextResponse.json({ error: "Only Organization Owners can remove another Owner" }, { status: 403 });
    }

    await db.organizationMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true, message: "Member removed successfully" });
  } catch (error: any) {
    console.error("[Organization Members API] Error removing member:", error);
    return NextResponse.json({ error: error.message || "Failed to remove member" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (authCtx.role !== "OWNER" && authCtx.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Only Organization Owners and Admins can update roles" },
      { status: 403 }
    );
  }

  try {
    const { id: memberId } = await params;
    const body = await req.json();
    const { role } = body;

    if (!role || !["ADMIN", "MEMBER", "VIEWER"].includes(role)) {
      return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
    }

    const targetMember = await db.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.organizationId !== authCtx.orgId) {
      return NextResponse.json({ error: "Member not found in your organization" }, { status: 404 });
    }

    const updatedMember = await db.organizationMember.update({
      where: { id: memberId },
      data: { role: role as any },
    });

    return NextResponse.json({ success: true, member: updatedMember });
  } catch (error: any) {
    console.error("[Organization Members API] Error updating role:", error);
    return NextResponse.json({ error: error.message || "Failed to update member role" }, { status: 500 });
  }
}
