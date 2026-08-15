import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";
import { razorpayClient } from "@/lib/razorpay";

export async function POST(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only OWNER or ADMIN can purchase/upgrade workspace plan
  if (authCtx.role !== "OWNER" && authCtx.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Only Organization Owners and Admins can purchase plans" },
      { status: 403 }
    );
  }

  try {
    const { planName, billingMode = "ONE_TIME", billingCycle = "MONTHLY" } = await req.json();
    if (!planName || !["basic", "pro", "enterprise"].includes(planName.toLowerCase())) {
      return NextResponse.json(
        { error: "Invalid paid plan specified. Choose 'basic', 'pro', or 'enterprise'." },
        { status: 400 }
      );
    }

    const cleanPlanName = planName.toLowerCase();
    const cleanBillingMode = billingMode.toUpperCase() === "RECURRING" ? "RECURRING" : "ONE_TIME";
    const cleanBillingCycle = billingCycle.toUpperCase() === "YEARLY" ? "YEARLY" : "MONTHLY";

    const targetPlan = await db.plan.findFirst({
      where: { name: cleanPlanName },
    });

    if (!targetPlan) {
      return NextResponse.json({ error: `Plan '${cleanPlanName}' not found in database.` }, { status: 404 });
    }

    if (targetPlan.priceMonthlyCents <= 0) {
      return NextResponse.json(
        { error: "Selected plan is free and does not require Razorpay checkout." },
        { status: 400 }
      );
    }

    // Yearly cycle offers 2 months free (10x monthly price)
    const baseAmount = targetPlan.priceMonthlyCents;
    const finalAmount = cleanBillingCycle === "YEARLY" ? baseAmount * 10 : baseAmount;

    // Create Razorpay Order
    const receiptId = `rcpt_${authCtx.orgId.slice(0, 8)}_${Date.now()}`;
    const razorpayOrder = await razorpayClient.orders.create({
      amount: finalAmount,
      currency: "INR",
      receipt: receiptId,
      notes: {
        organizationId: authCtx.orgId,
        userId: authCtx.userId,
        planId: targetPlan.id,
        planName: targetPlan.name,
        billingMode: cleanBillingMode,
        billingCycle: cleanBillingCycle,
      },
    });

    // Record Payment Order in database
    await db.paymentOrder.create({
      data: {
        organizationId: authCtx.orgId,
        userId: authCtx.userId,
        planId: targetPlan.id,
        razorpayOrderId: razorpayOrder.id,
        amount: finalAmount,
        currency: "INR",
        billingMode: cleanBillingMode,
        billingCycle: cleanBillingCycle,
        status: "PENDING",
      },
    });

    const keyId =
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
      process.env.RAZORPAY_KEY_ID ||
      "rzp_test_example12345";

    return NextResponse.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: keyId,
      planName: targetPlan.name,
    });
  } catch (error: any) {
    console.error("[API /api/payments/create-order Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create Razorpay payment order" },
      { status: 500 }
    );
  }
}
