import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { db } from "@videohost/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requireAdminApi();
  if (authError) return authError;

  try {
    const plans = await db.plan.findMany({
      orderBy: [{ isCustom: "asc" }, { priceMonthlyCents: "asc" }],
      include: {
        _count: {
          select: {
            organizations: true,
          },
        },
      },
    });

    const enrichedPlans = plans.map((p) => ({
      id: p.id,
      name: p.name,
      minutesLimit: p.minutesLimit,
      storageLimitGb: p.storageLimitGb,
      maxResolution: p.maxResolution,
      seatLimit: p.seatLimit,
      priceMonthlyCents: p.priceMonthlyCents,
      commissionPercent: p.commissionPercent,
      isCustom: p.isCustom,
      organizationsCount: p._count.organizations,
    }));

    return NextResponse.json({
      success: true,
      plans: enrichedPlans,
    });
  } catch (error: any) {
    console.error("[API /api/admin/plans GET Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch plans" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  try {
    const body = await req.json();
    const {
      name,
      minutesLimit = 1000,
      storageLimitGb = 10,
      maxResolution = "1080p",
      seatLimit = 5,
      priceMonthlyCents = 0,
      commissionPercent = 5.0,
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Plan name is required" },
        { status: 400 }
      );
    }

    const cleanName = name.trim();

    // Check if a plan with same name already exists
    const existing = await db.plan.findFirst({
      where: { name: { equals: cleanName, mode: "insensitive" } },
    });

    if (existing) {
      return NextResponse.json(
        { error: `A plan named '${cleanName}' already exists` },
        { status: 400 }
      );
    }

    const newPlan = await db.plan.create({
      data: {
        name: cleanName,
        minutesLimit: Math.max(0, parseInt(minutesLimit, 10) || 0),
        storageLimitGb: Math.max(0, parseInt(storageLimitGb, 10) || 0),
        maxResolution: ["720p", "1080p", "1440p", "4k"].includes(maxResolution)
          ? maxResolution
          : "1080p",
        seatLimit: Math.max(1, parseInt(seatLimit, 10) || 1),
        priceMonthlyCents: Math.max(0, parseInt(priceMonthlyCents, 10) || 0),
        commissionPercent: Math.max(0, Math.min(100, parseFloat(commissionPercent) || 5.0)),
        isCustom: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Custom plan '${newPlan.name}' created successfully.`,
      plan: newPlan,
    });
  } catch (error: any) {
    console.error("[API /api/admin/plans POST Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create custom plan" },
      { status: 500 }
    );
  }
}
