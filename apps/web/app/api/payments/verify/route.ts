import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import {
  getCashfreeOrder,
  getCashfreeOrderPayments,
  getCashfreeSubscription,
  getCashfreeSubscriptionPayments,
} from "@/lib/cashfree";

export async function POST(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      gateway,
      // Razorpay params
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      // Cashfree params
      order_id,
      cf_order_id,
      subscription_id,
      cf_subscription_id,
    } = body;

    // Detect if this is a Cashfree verification request
    const isCashfree =
      gateway === "cashfree" ||
      (Boolean(order_id || cf_order_id || subscription_id || cf_subscription_id) &&
        !razorpay_order_id &&
        !razorpay_payment_id);

    if (isCashfree) {
      // ----------------------------------------------------
      // 1. CASHFREE PAYMENT & SUBSCRIPTION VERIFICATION
      // ----------------------------------------------------
      const targetIdentifier = subscription_id || cf_subscription_id || order_id || cf_order_id;
      if (!targetIdentifier) {
        return NextResponse.json(
          { error: "Missing required order_id or subscription_id for Cashfree payment verification" },
          { status: 400 }
        );
      }

      const existingOrder = await db.paymentOrder.findFirst({
        where: {
          OR: [
            { cashfreeSubscriptionId: targetIdentifier },
            { cashfreeOrderId: targetIdentifier },
            { id: targetIdentifier },
          ],
        },
        include: { plan: true },
      });

      if (!existingOrder) {
        return NextResponse.json(
          { error: `Payment order record '${targetIdentifier}' not found` },
          { status: 404 }
        );
      }

      const isRecurring =
        existingOrder.billingMode === "RECURRING" ||
        Boolean(existingOrder.cashfreeSubscriptionId) ||
        targetIdentifier.startsWith("cf_sub_");

      let paymentId = "";

      if (isRecurring) {
        // A. Verify Cashfree Recurring Subscription
        const subId = existingOrder.cashfreeSubscriptionId || targetIdentifier;
        let cfSub;
        try {
          cfSub = await getCashfreeSubscription(subId);
        } catch (subErr: any) {
          console.warn(`[Cashfree Verify Subscription query error]:`, subErr.message || subErr);
        }

        const subPayments = await getCashfreeSubscriptionPayments(subId).catch(() => []);
        const successfulPayment = subPayments.find((p) => p.payment_status === "SUCCESS");

        const isSubActiveOrPaid =
          cfSub?.subscription_status === "ACTIVE" ||
          cfSub?.subscription_status === "INITIALIZED" ||
          cfSub?.subscription_status === "BANK_APPROVAL_PENDING" ||
          cfSub?.subscription_status === "COMPLETED" ||
          Boolean(successfulPayment);

        if (!isSubActiveOrPaid && cfSub?.subscription_status === "CANCELLED") {
          await db.paymentOrder.update({
            where: { id: existingOrder.id },
            data: { status: "FAILED" },
          });

          return NextResponse.json(
            {
              error: `Subscription mandate is cancelled. Status: ${cfSub?.subscription_status}`,
              subscriptionStatus: cfSub?.subscription_status,
            },
            { status: 400 }
          );
        }

        paymentId =
          successfulPayment?.cf_payment_id ||
          cfSub?.cf_subscription_id ||
          String(cfSub?.subscription_id || subId);

        // Mark Payment Order as SUCCESS
        await db.paymentOrder.update({
          where: { id: existingOrder.id },
          data: {
            status: "SUCCESS",
            cashfreeSubscriptionId: subId,
            cashfreePaymentId: paymentId,
          },
        });

        // Calculate expiration date based on billing cycle (30 days or 365 days)
        const durationDays = existingOrder.billingCycle === "YEARLY" ? 365 : 30;
        const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

        // Upgrade Organization Plan & set Subscription Status
        const updatedOrg = await db.organization.update({
          where: { id: existingOrder.organizationId },
          data: {
            planId: existingOrder.planId,
            customStorageLimitGb: null,
            planExpiresAt: expiresAt,
            billingMode: "RECURRING",
            billingCycle: existingOrder.billingCycle,
            subscriptionId: subId,
            subscriptionStatus: "ACTIVE",
          },
          include: { plan: true },
        });

        return NextResponse.json({
          success: true,
          message: `Subscription verified! Organization plan upgraded to ${updatedOrg.plan.name.toUpperCase()} (Auto-renewing)`,
          organization: {
            id: updatedOrg.id,
            name: updatedOrg.name,
            planName: updatedOrg.plan.name,
            storageLimitGb: updatedOrg.plan.storageLimitGb,
            planExpiresAt: updatedOrg.planExpiresAt,
            billingMode: updatedOrg.billingMode,
            billingCycle: updatedOrg.billingCycle,
            subscriptionStatus: updatedOrg.subscriptionStatus,
          },
        });
      } else {
        // B. Verify Cashfree One-Time Order
        const cfOrder = await getCashfreeOrder(targetIdentifier);
        const cfPayments = await getCashfreeOrderPayments(targetIdentifier).catch(() => []);

        const successfulPayment = cfPayments.find(
          (p) => p.payment_status === "SUCCESS"
        );

        const isPaid = cfOrder.order_status === "PAID" || Boolean(successfulPayment);

        if (!isPaid) {
          // If order expired or terminated
          if (cfOrder.order_status === "EXPIRED" || cfOrder.order_status === "TERMINATED") {
            await db.paymentOrder.update({
              where: { id: existingOrder.id },
              data: { status: "FAILED" },
            });
          }

          return NextResponse.json(
            {
              error: `Payment is not completed. Cashfree status: ${cfOrder.order_status}`,
              orderStatus: cfOrder.order_status,
            },
            { status: 400 }
          );
        }

        paymentId = successfulPayment?.cf_payment_id || String(cfOrder.cf_order_id);

        // Mark Payment Order as SUCCESS
        await db.paymentOrder.update({
          where: { id: existingOrder.id },
          data: {
            status: "SUCCESS",
            cashfreePaymentId: paymentId,
          },
        });

        // Calculate expiration date based on billing cycle (30 days or 365 days)
        const durationDays = existingOrder.billingCycle === "YEARLY" ? 365 : 30;
        const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

        // Upgrade Organization Plan & set Expiration Status
        const updatedOrg = await db.organization.update({
          where: { id: existingOrder.organizationId },
          data: {
            planId: existingOrder.planId,
            customStorageLimitGb: null,
            planExpiresAt: expiresAt,
            billingMode: existingOrder.billingMode,
            billingCycle: existingOrder.billingCycle,
            subscriptionStatus: "ACTIVE",
          },
          include: { plan: true },
        });

        return NextResponse.json({
          success: true,
          message: `Payment verified! Organization plan upgraded to ${updatedOrg.plan.name.toUpperCase()}`,
          organization: {
            id: updatedOrg.id,
            name: updatedOrg.name,
            planName: updatedOrg.plan.name,
            storageLimitGb: updatedOrg.plan.storageLimitGb,
            planExpiresAt: updatedOrg.planExpiresAt,
            billingMode: updatedOrg.billingMode,
            billingCycle: updatedOrg.billingCycle,
            subscriptionStatus: updatedOrg.subscriptionStatus,
          },
        });
      }
    } else {
      // ----------------------------------------------------
      // 2. RAZORPAY PAYMENT VERIFICATION
      // ----------------------------------------------------
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return NextResponse.json(
          { error: "Missing required Razorpay payment verification parameters" },
          { status: 400 }
        );
      }

      // Verify HMAC SHA256 Signature
      const isValid = verifyRazorpaySignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      });

      const existingOrder = await db.paymentOrder.findFirst({
        where: {
          OR: [
            { razorpayOrderId: razorpay_order_id },
            { id: razorpay_order_id },
          ],
        },
        include: { plan: true },
      });

      if (!existingOrder) {
        return NextResponse.json({ error: "Payment order record not found" }, { status: 404 });
      }

      if (!isValid) {
        await db.paymentOrder.update({
          where: { id: existingOrder.id },
          data: { status: "FAILED" },
        });

        return NextResponse.json(
          { error: "Invalid payment signature. Payment verification failed." },
          { status: 400 }
        );
      }

      // Mark Payment Order as SUCCESS
      await db.paymentOrder.update({
        where: { id: existingOrder.id },
        data: {
          status: "SUCCESS",
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
        },
      });

      // Calculate expiration date based on billing cycle (30 days or 365 days)
      const durationDays = existingOrder.billingCycle === "YEARLY" ? 365 : 30;
      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

      // Upgrade Organization Plan & set Expiration/Subscription Status
      const updatedOrg = await db.organization.update({
        where: { id: existingOrder.organizationId },
        data: {
          planId: existingOrder.planId,
          customStorageLimitGb: null,
          planExpiresAt: expiresAt,
          billingMode: existingOrder.billingMode,
          billingCycle: existingOrder.billingCycle,
          subscriptionStatus: "ACTIVE",
        },
        include: { plan: true },
      });

      return NextResponse.json({
        success: true,
        message: `Payment verified! Organization plan upgraded to ${updatedOrg.plan.name.toUpperCase()}`,
        organization: {
          id: updatedOrg.id,
          name: updatedOrg.name,
          planName: updatedOrg.plan.name,
          storageLimitGb: updatedOrg.plan.storageLimitGb,
          planExpiresAt: updatedOrg.planExpiresAt,
          billingMode: updatedOrg.billingMode,
          billingCycle: updatedOrg.billingCycle,
          subscriptionStatus: updatedOrg.subscriptionStatus,
        },
      });
    }
  } catch (error: any) {
    console.error("[API /api/payments/verify Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify payment" },
      { status: 500 }
    );
  }
}
