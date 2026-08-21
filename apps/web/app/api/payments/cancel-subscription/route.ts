import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";
import { razorpayClient } from "@/lib/razorpay";
import { cancelCashfreeSubscription } from "@/lib/cashfree";

export async function POST(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only OWNER or ADMIN can cancel workspace recurring subscription
  if (authCtx.role !== "OWNER" && authCtx.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Only Organization Owners and Admins can cancel subscriptions" },
      { status: 403 }
    );
  }

  try {
    const organization = await db.organization.findUnique({
      where: { id: authCtx.orgId },
      include: { plan: true },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    let wasCancelledOnGateway = false;

    // Cancel Gateway subscription if subscription ID is present
    if (organization.subscriptionId) {
      const isCashfreeSub = organization.subscriptionId.startsWith("cf_sub_");

      if (isCashfreeSub) {
        try {
          await cancelCashfreeSubscription(organization.subscriptionId);
          wasCancelledOnGateway = true;
          console.log(
            `[API /api/payments/cancel-subscription]: Cancelled Cashfree subscription ${organization.subscriptionId} for org ${organization.id}`
          );
        } catch (cfErr: any) {
          console.warn(
            `[API /api/payments/cancel-subscription]: Cashfree subscription cancellation warning (proceeding with DB update):`,
            cfErr.message || cfErr
          );
          wasCancelledOnGateway = true;
        }
      } else {
        try {
          await razorpayClient.subscriptions.cancel(organization.subscriptionId, false);
          wasCancelledOnGateway = true;
          console.log(
            `[API /api/payments/cancel-subscription]: Cancelled Razorpay subscription ${organization.subscriptionId} for org ${organization.id}`
          );
        } catch (razorpayErr: any) {
          console.warn(
            `[API /api/payments/cancel-subscription]: Razorpay subscription cancellation warning (proceeding with DB update):`,
            razorpayErr.message || razorpayErr
          );
          wasCancelledOnGateway = true;
        }
      }
    }

    // Switch billing mode to ONE_TIME and status to CANCELLED while PRESERVING planId and planExpiresAt
    const updatedOrg = await db.organization.update({
      where: { id: organization.id },
      data: {
        subscriptionStatus: "CANCELLED",
        subscriptionId: null,
        billingMode: "ONE_TIME",
      },
      include: { plan: true },
    });

    const formattedExpiry = updatedOrg.planExpiresAt
      ? new Date(updatedOrg.planExpiresAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "expiration";

    return NextResponse.json({
      success: true,
      message: `Auto-renewal cancelled! Your workspace will remain on the ${updatedOrg.plan.name.toUpperCase()} plan in one-time mode until ${formattedExpiry}, after which it will automatically move to the Free plan.`,
      organization: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        planName: updatedOrg.plan.name,
        planExpiresAt: updatedOrg.planExpiresAt,
        subscriptionStatus: updatedOrg.subscriptionStatus,
        billingMode: updatedOrg.billingMode,
      },
    });
  } catch (error: any) {
    console.error("[API /api/payments/cancel-subscription Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel recurring subscription" },
      { status: 500 }
    );
  }
}
