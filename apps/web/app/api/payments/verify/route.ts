import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";
import { verifyRazorpaySignature } from "@/lib/razorpay";

export async function POST(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

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

    const existingOrder = await db.paymentOrder.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
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
        subscriptionStatus: updatedOrg.subscriptionStatus,
      },
    });
  } catch (error: any) {
    console.error("[API /api/payments/verify Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify Razorpay payment" },
      { status: 500 }
    );
  }
}
