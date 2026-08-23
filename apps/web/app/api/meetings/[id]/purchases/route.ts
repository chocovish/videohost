import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const meeting = await db.meeting.findFirst({
      where: { id, organizationId: authCtx.orgId },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const purchases = await db.contentPurchase.findMany({
      where: {
        meetingId: id,
        organizationId: authCtx.orgId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalRevenue = purchases
      .filter((p) => p.status === "COMPLETED")
      .reduce((acc, p) => acc + (p.amount || 0), 0);

    return NextResponse.json({
      success: true,
      purchases,
      stats: {
        totalRevenue,
        salesCount: purchases.filter((p) => p.status === "COMPLETED").length,
        basePrice: meeting.price,
        currency: meeting.currency || "USD",
        shareAccessMode: meeting.shareAccessMode,
      },
    });
  } catch (err: any) {
    console.error("[GET /api/meetings/[id]/purchases Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch meeting purchases" },
      { status: 500 }
    );
  }
}
