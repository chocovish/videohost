import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";
import { getCommissionRateForPlan } from "@/lib/platform-fees";

export async function GET(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch organization and its active subscription plan
    const org = await db.organization.findUnique({
      where: { id: authCtx.orgId },
      include: { plan: true },
    });

    const activePlanName = org?.plan?.name || "free";
    const activeCommissionPercent =
      typeof org?.plan?.commissionPercent === "number"
        ? org.plan.commissionPercent
        : getCommissionRateForPlan(activePlanName);

    // 2. Perform parallel indexed DB-level aggregations and counts
    const [
      salesAgg,
      withdrawalsAgg,
      videoPurchasesCount,
      playlistPurchasesCount,
      meetingPurchasesCount,
      bankAccount,
      rawPurchases,
    ] = await Promise.all([
      // A. SQL DB-level aggregation of gross sales, platform fees, gateway fees, and net earnings
      db.contentPurchase.aggregate({
        where: {
          organizationId: authCtx.orgId,
          status: "COMPLETED",
        },
        _sum: {
          amount: true,
          commissionAmount: true,
          gatewayFeeAmount: true,
          creatorEarnings: true,
        },
        _count: {
          id: true,
        },
      }),

      // B. SQL DB-level aggregation of all pending, processing, approved, and completed withdrawals
      db.withdrawalRequest.aggregate({
        where: {
          organizationId: authCtx.orgId,
          status: { in: ["PENDING", "PROCESSING", "APPROVED", "COMPLETED"] },
        },
        _sum: {
          amount: true,
        },
      }),

      // C. Fast indexed counts for item types
      db.contentPurchase.count({
        where: {
          organizationId: authCtx.orgId,
          contentType: "VIDEO",
          status: "COMPLETED",
        },
      }),
      db.contentPurchase.count({
        where: {
          organizationId: authCtx.orgId,
          contentType: "PLAYLIST",
          status: "COMPLETED",
        },
      }),
      db.contentPurchase.count({
        where: {
          organizationId: authCtx.orgId,
          contentType: "MEETING",
          status: "COMPLETED",
        },
      }),

      // D. Connected bank account for payout currency
      db.bankAccount.findUnique({
        where: { organizationId: authCtx.orgId },
      }),

      // E. Bounded query for the recent ledger table
      db.contentPurchase.findMany({
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
          meeting: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 300,
      }),
    ]);

    // Financial calculations directly from Postgres DB sums
    const totalGrossRevenue = salesAgg._sum.amount || 0;
    const totalPlatformFees = salesAgg._sum.commissionAmount || 0;
    const totalGatewayFees = salesAgg._sum.gatewayFeeAmount || 0;
    const totalNetEarnings = salesAgg._sum.creatorEarnings || 0;
    const totalWithdrawnOrPending = withdrawalsAgg._sum.amount || 0;
    const completedPurchasesCount = salesAgg._count.id || 0;

    const availableBalance = Math.max(
      0,
      Math.round((totalNetEarnings - totalWithdrawnOrPending) * 100) / 100
    );

    const effectiveGatewayFeePercent =
      totalGrossRevenue > 0
        ? Math.round(((totalGatewayFees / totalGrossRevenue) * 100) * 100) / 100
        : 0;

    const currency =
      bankAccount?.currency ||
      (rawPurchases.length > 0 && rawPurchases[0].currency ? rawPurchases[0].currency : "USD");

    return NextResponse.json({
      success: true,
      purchases: rawPurchases,
      stats: {
        totalGrossRevenue: Math.round(totalGrossRevenue * 100) / 100,
        totalPlatformFees: Math.round(totalPlatformFees * 100) / 100,
        totalGatewayFees: Math.round(totalGatewayFees * 100) / 100,
        totalNetEarnings: Math.round(totalNetEarnings * 100) / 100,
        availableBalance,
        totalWithdrawnOrPending: Math.round(totalWithdrawnOrPending * 100) / 100,
        totalPurchasesCount: completedPurchasesCount,
        videoPurchasesCount,
        playlistPurchasesCount,
        meetingPurchasesCount,
        activePlanName,
        activeCommissionPercent,
        gatewayFeePercent: effectiveGatewayFeePercent,
        currency,
      },
    });
  } catch (err: any) {
    console.error("[GET /api/organization/purchases Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch purchases" },
      { status: 500 }
    );
  }
}

