import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { db } from "@videohost/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await req.json();
    const {
      name,
      minutesLimit,
      storageLimitGb,
      maxResolution,
      seatLimit,
      priceMonthlyCents,
      commissionPercent,
    } = body;

    const plan = await db.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (name && typeof name === "string" && name.trim()) {
      updateData.name = name.trim();
    }
    if (minutesLimit !== undefined) {
      updateData.minutesLimit = Math.max(0, parseInt(minutesLimit, 10) || 0);
    }
    if (storageLimitGb !== undefined) {
      updateData.storageLimitGb = Math.max(0, parseInt(storageLimitGb, 10) || 0);
    }
    if (maxResolution && ["720p", "1080p", "1440p", "4k"].includes(maxResolution)) {
      updateData.maxResolution = maxResolution;
    }
    if (seatLimit !== undefined) {
      updateData.seatLimit = Math.max(1, parseInt(seatLimit, 10) || 1);
    }
    if (priceMonthlyCents !== undefined) {
      updateData.priceMonthlyCents = Math.max(0, parseInt(priceMonthlyCents, 10) || 0);
    }
    if (commissionPercent !== undefined) {
      updateData.commissionPercent = Math.max(0, Math.min(100, parseFloat(commissionPercent) || 0));
    }

    const updatedPlan = await db.plan.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `Plan '${updatedPlan.name}' updated successfully.`,
      plan: updatedPlan,
    });
  } catch (error: any) {
    console.error("[API /api/admin/plans/[id] PATCH Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update plan" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  try {
    const { id } = await params;
    const plan = await db.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { organizations: true },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    if (plan._count.organizations > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete plan '${plan.name}' because it is assigned to ${plan._count.organizations} organization(s). Reassign them first.`,
        },
        { status: 400 }
      );
    }

    await db.plan.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Plan '${plan.name}' deleted successfully.`,
    });
  } catch (error: any) {
    console.error("[API /api/admin/plans/[id] DELETE Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete plan" },
      { status: 500 }
    );
  }
}
