import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";

export async function GET(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const purchases = await db.contentPurchase.findMany({
      where: {
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
        video: {
          select: {
            id: true,
            title: true,
            durationSeconds: true,
          },
        },
        playlist: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate total gross revenue from completed purchases
    const totalGrossRevenue = purchases
      .filter((p) => p.status === "COMPLETED")
      .reduce((acc, p) => acc + (p.amount || 0), 0);

    // Calculate total withdrawals (Pending, Processing, Approved, Completed)
    const existingWithdrawals = await db.withdrawalRequest.findMany({
      where: {
        organizationId: authCtx.orgId,
        status: { in: ["PENDING", "PROCESSING", "APPROVED", "COMPLETED"] },
      },
    });

    const totalWithdrawnOrPending = existingWithdrawals.reduce((acc, w) => acc + (w.amount || 0), 0);
    const availableBalance = Math.max(0, totalGrossRevenue - totalWithdrawnOrPending);

    const videoPurchasesCount = purchases.filter((p) => p.contentType === "VIDEO" && p.status === "COMPLETED").length;
    const playlistPurchasesCount = purchases.filter((p) => p.contentType === "PLAYLIST" && p.status === "COMPLETED").length;

    // Fetch bank account to determine configured payout currency
    const bankAccount = await db.bankAccount.findUnique({
      where: { organizationId: authCtx.orgId },
    });
    const currency = bankAccount?.currency || (purchases.length > 0 && purchases[0].currency ? purchases[0].currency : "USD");

    return NextResponse.json({
      success: true,
      purchases,
      stats: {
        totalGrossRevenue,
        availableBalance,
        totalWithdrawnOrPending,
        totalPurchasesCount: purchases.filter((p) => p.status === "COMPLETED").length,
        videoPurchasesCount,
        playlistPurchasesCount,
        currency,
      },
    });
  } catch (err: any) {
    console.error("[GET /api/organization/purchases Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch purchases" }, { status: 500 });
  }
}
