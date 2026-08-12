import { NextResponse } from "next/server";
import { db } from "@videohost/db";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing x-razorpay-signature header" }, { status: 400 });
    }

    const isValid = verifyRazorpayWebhookSignature({ rawBody, signature });
    if (!isValid) {
      console.warn("[Razorpay Webhook]: Invalid webhook signature.");
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;
    console.log(`[Razorpay Webhook]: Received event ${eventType}`);

    if (eventType === "order.paid" || eventType === "payment.captured" || eventType === "subscription.charged") {
      const paymentEntity = event.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id || event.payload?.order?.entity?.id;
      const razorpayPaymentId = paymentEntity?.id;

      if (razorpayOrderId) {
        const orderRecord = await db.paymentOrder.findUnique({
          where: { razorpayOrderId },
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
        // Preserving planExpiresAt so the user retains full paid plan access until the current paid period ends!
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
  } catch (error: any) {
    console.error("[Razorpay Webhook Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process Razorpay webhook" },
      { status: 500 }
    );
  }
}
