import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";
import { razorpayClient } from "@/lib/razorpay";
import {
  createCashfreeOrder,
  createCashfreeSubscription,
  getCashfreeConfig,
} from "@/lib/cashfree";
import { getActivePaymentGateway } from "@/lib/payment-gateway";

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
    const body = await req.json();
    const { planName, billingMode = "ONE_TIME", billingCycle = "MONTHLY", preferredGateway } = body;

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
      return NextResponse.json(
        { error: `Plan '${cleanPlanName}' not found in database.` },
        { status: 404 }
      );
    }

    if (targetPlan.priceMonthlyCents <= 0) {
      return NextResponse.json(
        { error: "Selected plan is free and does not require checkout." },
        { status: 400 }
      );
    }

    // Yearly cycle offers 2 months free (10x monthly price)
    const baseAmount = targetPlan.priceMonthlyCents; // in INR paise
    const finalAmount = cleanBillingCycle === "YEARLY" ? baseAmount * 10 : baseAmount;

    // Determine active gateway (server env or optional client preferred gateway)
    const activeGateway =
      preferredGateway === "cashfree" || preferredGateway === "razorpay"
        ? preferredGateway
        : getActivePaymentGateway();

    // Fetch user details for prefilling customer contact
    const user = await db.user.findUnique({
      where: { id: authCtx.userId },
      select: { id: true, name: true, email: true },
    });

    if (activeGateway === "cashfree") {
      const cfConfig = getCashfreeConfig();
      const amountInRupees = finalAmount / 100;

      // 1A. CASHFREE RECURRING SUBSCRIPTION MODE
      if (cleanBillingMode === "RECURRING") {
        const subscriptionId = `cf_sub_${authCtx.orgId.slice(0, 6)}_${Date.now()}`;

        const cfSub = await createCashfreeSubscription({
          subscriptionId,
          planName: targetPlan.name,
          planAmount: amountInRupees,
          planIntervalType: cleanBillingCycle === "YEARLY" ? "YEAR" : "MONTH",
          customer: {
            customer_id: authCtx.userId,
            customer_name: user?.name || "Workspace Member",
            customer_email: user?.email || "billing@taped.in",
            customer_phone: "9999999999",
          },
          notes: {
            organizationId: authCtx.orgId,
            userId: authCtx.userId,
            planId: targetPlan.id,
            planName: targetPlan.name,
            billingMode: cleanBillingMode,
            billingCycle: cleanBillingCycle,
            gateway: "cashfree",
          },
        });

        // Record recurring payment order / mandate in database
        await db.paymentOrder.create({
          data: {
            organizationId: authCtx.orgId,
            userId: authCtx.userId,
            planId: targetPlan.id,
            gateway: "cashfree",
            cashfreeOrderId: subscriptionId,
            cashfreeSubscriptionId: cfSub.subscription_id || subscriptionId,
            cashfreeSessionId: cfSub.payment_session_id || cfSub.subscription_session_id,
            amount: finalAmount,
            currency: "INR",
            billingMode: "RECURRING",
            billingCycle: cleanBillingCycle,
            status: "PENDING",
          },
        });

        return NextResponse.json({
          success: true,
          gateway: "cashfree",
          mode: "subscription",
          subscriptionId: cfSub.subscription_id || subscriptionId,
          orderId: cfSub.subscription_id || subscriptionId,
          paymentSessionId: cfSub.payment_session_id || cfSub.subscription_session_id,
          authLink: cfSub.auth_link,
          amount: finalAmount,
          currency: "INR",
          cfEnv: cfConfig.clientMode,
          planName: targetPlan.name,
        });
      }

      // 1B. CASHFREE ONE-TIME ORDER MODE
      const orderId = `cf_ord_${authCtx.orgId.slice(0, 6)}_${Date.now()}`;

      const cfOrder = await createCashfreeOrder({
        orderId,
        orderAmount: amountInRupees,
        orderCurrency: "INR",
        customer: {
          customer_id: authCtx.userId,
          customer_name: user?.name || "Workspace Member",
          customer_email: user?.email || "billing@taped.in",
          customer_phone: "9999999999",
        },
        notes: {
          organizationId: authCtx.orgId,
          userId: authCtx.userId,
          planId: targetPlan.id,
          planName: targetPlan.name,
          billingMode: cleanBillingMode,
          billingCycle: cleanBillingCycle,
          gateway: "cashfree",
        },
      });

      // Record Payment Order in database
      await db.paymentOrder.create({
        data: {
          organizationId: authCtx.orgId,
          userId: authCtx.userId,
          planId: targetPlan.id,
          gateway: "cashfree",
          cashfreeOrderId: orderId,
          cashfreeSessionId: cfOrder.payment_session_id,
          amount: finalAmount,
          currency: "INR",
          billingMode: cleanBillingMode,
          billingCycle: cleanBillingCycle,
          status: "PENDING",
        },
      });

      return NextResponse.json({
        success: true,
        gateway: "cashfree",
        mode: "order",
        orderId: cfOrder.order_id,
        paymentSessionId: cfOrder.payment_session_id,
        amount: finalAmount,
        currency: "INR",
        cfEnv: cfConfig.clientMode,
        planName: targetPlan.name,
      });
    } else {
      // 2. RAZORPAY GATEWAY FLOW (Default)
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
          gateway: "razorpay",
        },
      });

      // Record Payment Order in database
      await db.paymentOrder.create({
        data: {
          organizationId: authCtx.orgId,
          userId: authCtx.userId,
          planId: targetPlan.id,
          gateway: "razorpay",
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
        gateway: "razorpay",
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: keyId,
        planName: targetPlan.name,
      });
    }
  } catch (error: any) {
    console.error("[API /api/payments/create-order Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment order" },
      { status: 500 }
    );
  }
}
