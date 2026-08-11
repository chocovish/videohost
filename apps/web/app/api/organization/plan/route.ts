import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";

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
    if (!planName || !["free", "pro", "enterprise"].includes(planName.toLowerCase())) {
      return NextResponse.json(
        { error: "Invalid plan. Valid options: 'free', 'pro', 'enterprise'" },
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

    const updatedOrg = await db.organization.update({
      where: { id: authCtx.orgId },
      data: {
        planId: targetPlan.id,
        customStorageLimitGb: null, // Reset custom storage override when changing plan
      },
      include: {
        plan: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Organization plan successfully updated to ${targetPlan.name.toUpperCase()}`,
      organization: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        planName: updatedOrg.plan.name,
        storageLimitGb: updatedOrg.plan.storageLimitGb,
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
