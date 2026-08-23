import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";
import { getCommissionRateForPlan, calculateSaleSplit } from "@/lib/platform-fees";

export async function GET(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch organization and its active subscription plan
    const org = await db.organization.findUnique({
      where: { id: authCtx.orgId },
      include: { plan: true },
    });

    const activePlanName = org?.plan?.name || "free";
    const activeCommissionPercent =
      typeof org?.plan?.commissionPercent === "number"
        ? org.plan.commissionPercent
        : getCommissionRateForPlan(activePlanName);

    const rawPurchases = await db.contentPurchase.findMany({
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
    });

    // Normalize and itemize platform fees, gateway fees, and creator earnings for each purchase
    const purchases = rawPurchases.map((p) => {
      let commissionPercent = p.commissionPercent;
      let commissionAmount = p.commissionAmount;
      let gatewayFeePercent = p.gatewayFeePercent ?? 3.0;
      let gatewayFeeAmount = p.gatewayFeeAmount ?? 0;
      let creatorEarnings = p.creatorEarnings;
      let planSnapshot = p.planSnapshot;

      // Handle legacy purchases where commission or gateway fields were not recorded
      if (
        commissionPercent === undefined ||
        commissionPercent === null ||
        commissionAmount === undefined ||
        commissionAmount === null ||
        p.gatewayFeePercent === undefined ||
        p.gatewayFeePercent === null ||
        p.gatewayFeeAmount === undefined ||
        p.gatewayFeeAmount === null ||
        creatorEarnings === undefined ||
        creatorEarnings === null
      ) {
        const split = calculateSaleSplit(
          p.amount,
          p.planSnapshot || activePlanName,
          p.commissionPercent,
          p.gatewayFeePercent
        );
        commissionPercent = split.commissionPercent;
        commissionAmount = split.commissionAmount;
        gatewayFeePercent = split.gatewayFeePercent;
        gatewayFeeAmount = split.gatewayFeeAmount;
        creatorEarnings = split.creatorEarnings;
        planSnapshot = split.planSnapshot;
      }

      return {
        ...p,
        commissionPercent,
        commissionAmount,
        gatewayFeePercent,
        gatewayFeeAmount,
        creatorEarnings,
        planSnapshot: planSnapshot || (activePlanName || "FREE").toUpperCase(),
      };
    });

    // Calculate total gross revenue from completed purchases
    const completedPurchases = purchases.filter((p) => p.status === "COMPLETED");

    const totalGrossRevenue = completedPurchases.reduce(
      (acc, p) => acc + (p.amount || 0),
      0
    );

    const totalPlatformFees = completedPurchases.reduce(
      (acc, p) => acc + (p.commissionAmount || 0),
      0
    );

    const totalGatewayFees = completedPurchases.reduce(
      (acc, p) => acc + (p.gatewayFeeAmount || 0),
      0
    );

    const totalNetEarnings = completedPurchases.reduce(
      (acc, p) => acc + (p.creatorEarnings || 0),
      0
    );

    // Calculate total withdrawals (Pending, Processing, Approved, Completed)
    const existingWithdrawals = await db.withdrawalRequest.findMany({
      where: {
        organizationId: authCtx.orgId,
        status: { in: ["PENDING", "PROCESSING", "APPROVED", "COMPLETED"] },
      },
    });

    const totalWithdrawnOrPending = existingWithdrawals.reduce(
      (acc, w) => acc + (w.amount || 0),
      0
    );

    // Available balance is derived strictly from Net Creator Earnings
    const availableBalance = Math.max(
      0,
      Math.round((totalNetEarnings - totalWithdrawnOrPending) * 100) / 100
    );

    const videoPurchasesCount = purchases.filter(
      (p) => p.contentType === "VIDEO" && p.status === "COMPLETED"
    ).length;
    const playlistPurchasesCount = purchases.filter(
      (p) => p.contentType === "PLAYLIST" && p.status === "COMPLETED"
    ).length;
    const meetingPurchasesCount = purchases.filter(
      (p) => p.contentType === "MEETING" && p.status === "COMPLETED"
    ).length;

    // Fetch bank account to determine configured payout currency
    const bankAccount = await db.bankAccount.findUnique({
      where: { organizationId: authCtx.orgId },
    });
    const currency =
      bankAccount?.currency ||
      (purchases.length > 0 && purchases[0].currency ? purchases[0].currency : "USD");

    return NextResponse.json({
      success: true,
      purchases,
      stats: {
        totalGrossRevenue: Math.round(totalGrossRevenue * 100) / 100,
        totalPlatformFees: Math.round(totalPlatformFees * 100) / 100,
        totalGatewayFees: Math.round(totalGatewayFees * 100) / 100,
        totalNetEarnings: Math.round(totalNetEarnings * 100) / 100,
        availableBalance,
        totalWithdrawnOrPending: Math.round(totalWithdrawnOrPending * 100) / 100,
        totalPurchasesCount: completedPurchases.length,
        videoPurchasesCount,
        playlistPurchasesCount,
        meetingPurchasesCount,
        activePlanName,
        activeCommissionPercent,
        gatewayFeePercent: 3.0,
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
