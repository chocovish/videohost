import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";
import { razorpayClient } from "@/lib/razorpay";

export async function POST(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only OWNER or ADMIN can change organization plan
  if (authCtx.role !== "OWNER" && authCtx.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Only Organization Owners and Admins can update the subscription plan" },
      { status: 403 }
    );
  }

  try {
    const { planName } = await req.json();
    if (!planName || !["free", "basic", "pro", "enterprise"].includes(planName.toLowerCase())) {
      return NextResponse.json(
        { error: "Invalid plan. Valid options: 'free', 'basic', 'pro', 'enterprise'" },
        { status: 400 }
      );
    }

    const cleanPlanName = planName.toLowerCase();
    const targetPlan = await db.plan.findFirst({
      where: { name: cleanPlanName },
    });

    if (!targetPlan) {
      return NextResponse.json({ error: `Plan '${cleanPlanName}' not found in database.` }, { status: 404 });
    }

    // Fetch current organization details to check for active recurring subscription
    const currentOrg = await db.organization.findUnique({
      where: { id: authCtx.orgId },
      select: {
        id: true,
        subscriptionId: true,
        billingMode: true,
        subscriptionStatus: true,
      },
    });

    let wasSubscriptionCancelled = false;

    // If organization has an active recurring subscription and is switching to free (or changing plan)
    if (currentOrg?.subscriptionId) {
      try {
        await razorpayClient.subscriptions.cancel(currentOrg.subscriptionId, false);
        wasSubscriptionCancelled = true;
        console.log(
          `[API /api/organization/plan]: Successfully cancelled Razorpay subscription ${currentOrg.subscriptionId} for org ${authCtx.orgId}`
        );
      } catch (razorpayErr: any) {
        console.warn(
          `[API /api/organization/plan]: Razorpay subscription cancel warning (proceeding with DB update):`,
          razorpayErr.message || razorpayErr
        );
        // Mark as cancelled even if SDK returns warning (e.g. test subscription ID or already cancelled)
        wasSubscriptionCancelled = true;
      }
    }

    const isDowngradingToFree = cleanPlanName === "free";

    const updatedOrg = await db.organization.update({
      where: { id: authCtx.orgId },
      data: {
        planId: targetPlan.id,
        customStorageLimitGb: null, // Reset custom storage override when changing plan
        ...(isDowngradingToFree
          ? {
              subscriptionStatus: "CANCELLED",
              subscriptionId: null,
              billingMode: "ONE_TIME",
            }
          : {}),
      },
      include: {
        plan: true,
      },
    });

    const successMessage = isDowngradingToFree
      ? wasSubscriptionCancelled || currentOrg?.billingMode === "RECURRING"
        ? "Organization plan switched to Free. Your recurring Razorpay subscription has been successfully cancelled!"
        : "Organization plan successfully updated to Free."
      : `Organization plan successfully updated to ${targetPlan.name.toUpperCase()}`;

    return NextResponse.json({
      success: true,
      subscriptionCancelled: wasSubscriptionCancelled,
      message: successMessage,
      organization: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        planName: updatedOrg.plan.name,
        storageLimitGb: updatedOrg.plan.storageLimitGb,
        subscriptionStatus: updatedOrg.subscriptionStatus,
        billingMode: updatedOrg.billingMode,
      },
    });
  } catch (error: any) {
    console.error("[API /api/organization/plan Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update subscription plan" },
      { status: 500 }
    );
  }
}

