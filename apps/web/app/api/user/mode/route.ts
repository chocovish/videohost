import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";

export async function GET(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await db.user.findUnique({
      where: { id: authCtx.userId },
      select: { viewMode: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ viewMode: user.viewMode || "CREATOR" });
  } catch (error: any) {
    console.error("GET /api/user/mode error:", error);
    return NextResponse.json({ error: "Failed to fetch mode" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { viewMode } = body;

    if (!viewMode || !["CREATOR", "VIEWER"].includes(viewMode)) {
      return NextResponse.json(
        { error: "Invalid viewMode. Expected 'CREATOR' or 'VIEWER'." },
        { status: 400 }
      );
    }

    const updatedUser = await db.user.update({
      where: { id: authCtx.userId },
      data: { viewMode },
      select: { id: true, viewMode: true },
    });

    return NextResponse.json({
      success: true,
      viewMode: updatedUser.viewMode,
    });
  } catch (error: any) {
    console.error("PATCH /api/user/mode error:", error);
    return NextResponse.json({ error: "Failed to update mode" }, { status: 500 });
  }
}
