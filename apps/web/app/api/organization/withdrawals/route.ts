import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";
import { formatMoney } from "@/lib/utils";
import { calculateSaleSplit } from "@/lib/platform-fees";

export async function GET(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const withdrawals = await db.withdrawalRequest.findMany({
      where: { organizationId: authCtx.orgId },
      orderBy: { createdAt: "desc" },
    });

    const pendingCount = withdrawals.filter((w) => w.status === "PENDING" || w.status === "PROCESSING").length;
    const hasPendingWithdrawal = pendingCount > 0;

    return NextResponse.json({
      success: true,
      withdrawals,
      hasPendingWithdrawal,
    });
  } catch (err: any) {
    console.error("[GET /api/organization/withdrawals Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch withdrawal requests" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { amount, currency = "USD" } = body;

    const requestAmount = parseFloat(amount);
    if (isNaN(requestAmount) || requestAmount <= 0) {
      return NextResponse.json(
        { error: "Please enter a valid withdrawal amount greater than 0." },
        { status: 400 }
      );
    }

    // 1. Verify Bank Account is configured
    const bankAccount = await db.bankAccount.findUnique({
      where: { organizationId: authCtx.orgId },
    });

    if (!bankAccount) {
      return NextResponse.json(
        { error: "Please add your bank account details before requesting a payout withdrawal." },
        { status: 400 }
      );
    }

    // 2. Strict Requirement: Withdrawal cannot be made while one withdrawal request is pending
    const existingPending = await db.withdrawalRequest.findFirst({
      where: {
        organizationId: authCtx.orgId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
    });

    if (existingPending) {
      return NextResponse.json(
        {
          error: "You cannot make a new withdrawal request while a previous withdrawal is pending. Please wait until your pending request is processed.",
        },
        { status: 400 }
      );
    }

    // 3. Calculate Available Balance based on Net Creator Earnings
    const org = await db.organization.findUnique({
      where: { id: authCtx.orgId },
      include: { plan: true },
    });
    const activePlanName = org?.plan?.name || "free";

    const purchases = await db.contentPurchase.findMany({
      where: {
        organizationId: authCtx.orgId,
        status: "COMPLETED",
      },
    });

    const totalNetEarnings = purchases.reduce((acc, p) => {
      if (typeof p.creatorEarnings === "number" && p.creatorEarnings > 0) {
        return acc + p.creatorEarnings;
      }
      const split = calculateSaleSplit(
        p.amount,
        p.planSnapshot || activePlanName,
        p.commissionPercent
      );
      return acc + split.creatorEarnings;
    }, 0);

    const pastWithdrawals = await db.withdrawalRequest.findMany({
      where: {
        organizationId: authCtx.orgId,
        status: { in: ["PENDING", "PROCESSING", "APPROVED", "COMPLETED"] },
      },
    });

    const totalWithdrawn = pastWithdrawals.reduce((acc, w) => acc + (w.amount || 0), 0);
    const availableBalance = Math.max(0, Math.round((totalNetEarnings - totalWithdrawn) * 100) / 100);

    const payoutCurrency = bankAccount.currency || currency || "USD";

    if (requestAmount > availableBalance) {
      return NextResponse.json(
        {
          error: `Requested amount (${formatMoney(requestAmount, payoutCurrency)}) exceeds your available balance (${formatMoney(availableBalance, payoutCurrency)}).`,
        },
        { status: 400 }
      );
    }

    // 4. Create Withdrawal Request
    const withdrawal = await db.withdrawalRequest.create({
      data: {
        organizationId: authCtx.orgId,
        requestedById: authCtx.userId,
        amount: requestAmount,
        currency: payoutCurrency,
        status: "PENDING",
        bankDetails: {
          accountHolderName: bankAccount.accountHolderName,
          bankName: bankAccount.bankName,
          accountNumber: bankAccount.accountNumber,
          routingNumber: bankAccount.routingNumber,
          swiftCode: bankAccount.swiftCode,
          accountType: bankAccount.accountType,
          country: bankAccount.country,
          currency: payoutCurrency,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Withdrawal request for ${formatMoney(requestAmount, payoutCurrency)} submitted successfully.`,
      withdrawal,
      availableBalance: availableBalance - requestAmount,
    });
  } catch (err: any) {
    console.error("[POST /api/organization/withdrawals Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to create withdrawal request" }, { status: 500 });
  }
}
