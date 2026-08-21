import { NextResponse } from "next/server";
import { db } from "@videohost/db";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";
import { verifyCashfreeWebhookSignature } from "@/lib/cashfree";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const razorpaySignature = req.headers.get("x-razorpay-signature");
    const cashfreeSignature = req.headers.get("x-webhook-signature");
    const cashfreeTimestamp = req.headers.get("x-webhook-timestamp");

    // ----------------------------------------------------
    // 1. CASHFREE WEBHOOK HANDLER
    // ----------------------------------------------------
    if (cashfreeSignature && cashfreeTimestamp) {
      const isValid = verifyCashfreeWebhookSignature({
        rawBody,
        signature: cashfreeSignature,
        timestamp: cashfreeTimestamp,
      });

      if (!isValid) {
        console.warn("[Cashfree Webhook]: Invalid webhook signature.");
        return NextResponse.json({ error: "Invalid Cashfree webhook signature" }, { status: 400 });
      }

      const event = JSON.parse(rawBody);
      const eventType = event.type || event.event;
      console.log(`[Cashfree Webhook]: Received event ${eventType}`);

      // Handle Cashfree Subscription Recurring Payment Success
      if (
        eventType === "SUBSCRIPTION_PAYMENT_SUCCESS" ||
        eventType === "SUBSCRIPTION_PAYMENT_SUCCESS_WEBHOOK"
      ) {
        const subscriptionId =
          event.data?.subscription?.subscription_id ||
          event.data?.subscription_id ||
          event.data?.order?.order_id;
        const paymentId = String(
          event.data?.payment?.cf_payment_id ||
          event.data?.payment?.payment_id ||
          event.data?.cf_payment_id ||
          ""
        );

        if (subscriptionId) {
          const orderRecord = await db.paymentOrder.findFirst({
            where: {
              OR: [
                { cashfreeSubscriptionId: subscriptionId },
                { cashfreeOrderId: subscriptionId },
                { id: subscriptionId },
              ],
            },
          });

          if (orderRecord) {
            const durationDays = orderRecord.billingCycle === "YEARLY" ? 365 : 30;
            const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

            await db.paymentOrder.update({
              where: { id: orderRecord.id },
              data: {
                status: "SUCCESS",
                cashfreePaymentId: paymentId || orderRecord.cashfreePaymentId,
                cashfreeSubscriptionId: subscriptionId,
              },
            });

            await db.organization.update({
              where: { id: orderRecord.organizationId },
              data: {
                planId: orderRecord.planId,
                customStorageLimitGb: null,
                planExpiresAt: expiresAt,
                billingMode: "RECURRING",
                billingCycle: orderRecord.billingCycle,
                subscriptionId: subscriptionId,
                subscriptionStatus: "ACTIVE",
              },
            });

            console.log(
              `[Cashfree Webhook]: Organization ${orderRecord.organizationId} subscription renewed & extended until ${expiresAt.toISOString()}.`
            );
          }
        }
      }
      // Handle Cashfree Subscription Status Changes (Active, Cancelled, Halted)
      else if (
        eventType === "SUBSCRIPTION_STATUS_CHANGE" ||
        eventType === "SUBSCRIPTION_STATUS_CHANGED" ||
        eventType === "SUBSCRIPTION_CANCELLED" ||
        eventType === "SUBSCRIPTION_HALTED" ||
        eventType === "SUBSCRIPTION_AUTH_STATUS" ||
        eventType === "SUBSCRIPTION_NEW"
      ) {
        const subscriptionId =
          event.data?.subscription?.subscription_id ||
          event.data?.subscription_id;
        const subStatus = String(
          event.data?.subscription?.subscription_status ||
          event.data?.subscription_status ||
          ""
        ).toUpperCase();

        if (subscriptionId) {
          const targetOrg = await db.organization.findFirst({
            where: {
              OR: [
                { subscriptionId },
                ...(event.data?.subscription?.subscription_tags?.organizationId
                  ? [{ id: event.data.subscription.subscription_tags.organizationId }]
                  : []),
              ],
            },
          });

          if (targetOrg) {
            let mappedStatus = "ACTIVE";
            if (
              subStatus === "CANCELLED" ||
              eventType === "SUBSCRIPTION_CANCELLED" ||
              subStatus === "TERMINATED"
            ) {
              mappedStatus = "CANCELLED";
            } else if (
              subStatus === "ON_HOLD" ||
              subStatus === "HALTED" ||
              eventType === "SUBSCRIPTION_HALTED"
            ) {
              mappedStatus = "HALTED";
            }

            await db.organization.update({
              where: { id: targetOrg.id },
              data: {
                subscriptionStatus: mappedStatus,
                ...(mappedStatus === "CANCELLED" ? { billingMode: "ONE_TIME" } : {}),
              },
            });

            console.log(
              `[Cashfree Webhook]: Organization ${targetOrg.id} subscription status changed to ${mappedStatus}.`
            );
          }
        }
      }
      // Handle Standard One-Time Order Paid
      else if (eventType === "PAYMENT_SUCCESS_WEBHOOK" || eventType === "ORDER_PAID_WEBHOOK") {
        const orderId = event.data?.order?.order_id;
        const paymentId = String(
          event.data?.payment?.cf_payment_id || event.data?.payment?.payment_id || ""
        );

        if (orderId) {
          const orderRecord = await db.paymentOrder.findFirst({
            where: {
              OR: [
                { cashfreeOrderId: orderId },
                { cashfreeSubscriptionId: orderId },
                { id: orderId },
              ],
            },
          });

          if (orderRecord) {
            const durationDays = orderRecord.billingCycle === "YEARLY" ? 365 : 30;
            const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

            await db.paymentOrder.update({
              where: { id: orderRecord.id },
              data: {
                status: "SUCCESS",
                cashfreePaymentId: paymentId || orderRecord.cashfreePaymentId,
              },
            });

            await db.organization.update({
              where: { id: orderRecord.organizationId },
              data: {
                planId: orderRecord.planId,
                customStorageLimitGb: null,
                planExpiresAt: expiresAt,
                billingMode: orderRecord.billingMode,
                billingCycle: orderRecord.billingCycle,
                subscriptionStatus: "ACTIVE",
              },
            });

            console.log(
              `[Cashfree Webhook]: Organization ${orderRecord.organizationId} plan updated & extended until ${expiresAt.toISOString()}.`
            );
          }
        }
      }

      return NextResponse.json({ received: true });
    }

    // ----------------------------------------------------
    // 2. RAZORPAY WEBHOOK HANDLER
    // ----------------------------------------------------
    if (razorpaySignature) {
      const isValid = verifyRazorpayWebhookSignature({ rawBody, signature: razorpaySignature });
      if (!isValid) {
        console.warn("[Razorpay Webhook]: Invalid webhook signature.");
        return NextResponse.json({ error: "Invalid Razorpay webhook signature" }, { status: 400 });
      }

      const event = JSON.parse(rawBody);
      const eventType = event.event;
      console.log(`[Razorpay Webhook]: Received event ${eventType}`);

      if (
        eventType === "order.paid" ||
        eventType === "payment.captured" ||
        eventType === "subscription.charged"
      ) {
        const paymentEntity = event.payload?.payment?.entity;
        const razorpayOrderId = paymentEntity?.order_id || event.payload?.order?.entity?.id;
        const razorpayPaymentId = paymentEntity?.id;

        if (razorpayOrderId) {
          const orderRecord = await db.paymentOrder.findFirst({
            where: {
              OR: [
                { razorpayOrderId },
                { id: razorpayOrderId },
              ],
            },
          });

          if (orderRecord) {
            const durationDays = orderRecord.billingCycle === "YEARLY" ? 365 : 30;
            const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

            await db.paymentOrder.update({
              where: { id: orderRecord.id },
              data: {
                status: "SUCCESS",
                razorpayPaymentId: razorpayPaymentId || orderRecord.razorpayPaymentId,
              },
            });

            await db.organization.update({
              where: { id: orderRecord.organizationId },
              data: {
                planId: orderRecord.planId,
                customStorageLimitGb: null,
                planExpiresAt: expiresAt,
                billingMode: orderRecord.billingMode,
                billingCycle: orderRecord.billingCycle,
                subscriptionStatus: "ACTIVE",
              },
            });

            console.log(
              `[Razorpay Webhook]: Organization ${orderRecord.organizationId} plan updated & extended until ${expiresAt.toISOString()}.`
            );
          }
        }
      } else if (eventType === "subscription.halted" || eventType === "subscription.cancelled") {
        const subEntity = event.payload?.subscription?.entity;
        const subId = subEntity?.id;
        const notesOrgId = subEntity?.notes?.organizationId;

        const targetOrg = await db.organization.findFirst({
          where: {
            OR: [
              ...(subId ? [{ subscriptionId: subId }] : []),
              ...(notesOrgId ? [{ id: notesOrgId }] : []),
            ],
          },
        });

        if (targetOrg) {
          const newStatus = eventType === "subscription.halted" ? "HALTED" : "CANCELLED";
          await db.organization.update({
            where: { id: targetOrg.id },
            data: {
              subscriptionStatus: newStatus,
            },
          });
          console.log(
            `[Razorpay Webhook]: Organization ${targetOrg.id} subscription status changed to ${newStatus}. Plan remains active until ${targetOrg.planExpiresAt?.toISOString() || "expiry"}.`
          );
        }
      }

      return NextResponse.json({ received: true });
    }

    return NextResponse.json(
      { error: "Missing recognized payment gateway webhook signature header" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[Payments Webhook Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process payment webhook" },
      { status: 500 }
    );
  }
}
