import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { db } from "@videohost/db";

export async function POST(req: Request) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  try {
    const body = await req.json();
    const { userId, isBlocked, reason } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const targetUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const shouldBlock = Boolean(isBlocked);

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        isBlocked: shouldBlock,
        blockedReason: shouldBlock ? (reason?.trim() || "Blocked by administrator") : null,
        blockedAt: shouldBlock ? new Date() : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isBlocked: true,
        blockedReason: true,
        blockedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: shouldBlock
        ? `User ${updatedUser.name || updatedUser.email || updatedUser.id} has been blocked.`
        : `User ${updatedUser.name || updatedUser.email || updatedUser.id} has been unblocked.`,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("[API /api/admin/users/block Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update user block status" },
      { status: 500 }
    );
  }
}
