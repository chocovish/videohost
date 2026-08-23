import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { db } from "@videohost/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requireAdminApi();
  if (authError) return authError;

  try {
    const [
      totalUsers,
      blockedUsers,
      totalOrgs,
      totalVideos,
      videosStorageAgg,
      totalPlans,
      customPlans,
      payoutRequests,
      purchasesAgg,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { isBlocked: true } }),
      db.organization.count(),
      db.video.count(),
      db.video.aggregate({
        _sum: { sizeBytes: true },
      }),
      db.plan.count(),
      db.plan.count({ where: { isCustom: true } }),
      db.withdrawalRequest.findMany({
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
        },
      }),
      db.contentPurchase.aggregate({
        where: { status: "COMPLETED" },
        _sum: {
          amount: true,
          commissionAmount: true,
          creatorEarnings: true,
        },
        _count: { id: true },
      }),
    ]);

    const totalStorageBytes = Number(videosStorageAgg._sum.sizeBytes || 0n);
    const totalStorageGb = parseFloat((totalStorageBytes / (1024 * 1024 * 1024)).toFixed(2));

    const pendingPayouts = payoutRequests.filter((p) => p.status === "PENDING");
    const processingPayouts = payoutRequests.filter((p) => p.status === "PROCESSING");
    const completedPayouts = payoutRequests.filter((p) => p.status === "COMPLETED");
    const rejectedPayouts = payoutRequests.filter((p) => p.status === "REJECTED");

    const pendingAmount = pendingPayouts.reduce((acc, p) => acc + (p.amount || 0), 0);
    const processingAmount = processingPayouts.reduce((acc, p) => acc + (p.amount || 0), 0);
    const completedAmount = completedPayouts.reduce((acc, p) => acc + (p.amount || 0), 0);

    return NextResponse.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          active: totalUsers - blockedUsers,
          blocked: blockedUsers,
        },
        organizations: {
          total: totalOrgs,
        },
        storage: {
          totalBytes: totalStorageBytes,
          totalGb: totalStorageGb,
          totalVideos,
        },
        plans: {
          total: totalPlans,
          custom: customPlans,
        },
        payouts: {
          total: payoutRequests.length,
          pendingCount: pendingPayouts.length,
          pendingAmount: Math.round(pendingAmount * 100) / 100,
          processingCount: processingPayouts.length,
          processingAmount: Math.round(processingAmount * 100) / 100,
          completedCount: completedPayouts.length,
          completedAmount: Math.round(completedAmount * 100) / 100,
          rejectedCount: rejectedPayouts.length,
        },
        monetization: {
          totalPurchases: purchasesAgg._count.id || 0,
          grossSales: Math.round((purchasesAgg._sum.amount || 0) * 100) / 100,
          platformCommission: Math.round((purchasesAgg._sum.commissionAmount || 0) * 100) / 100,
          creatorEarnings: Math.round((purchasesAgg._sum.creatorEarnings || 0) * 100) / 100,
        },
      },
    });
  } catch (error: any) {
    console.error("[API /api/admin/overview Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch admin overview statistics" },
      { status: 500 }
    );
  }
}
