import { NextResponse } from "next/server";
import { db } from "@videohost/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const plans = await db.plan.findMany({
      orderBy: { priceMonthlyCents: "asc" },
      select: {
        id: true,
        name: true,
        minutesLimit: true,
        storageLimitGb: true,
        maxResolution: true,
        seatLimit: true,
        priceMonthlyCents: true,
        isCustom: true,
      },
    });

    return NextResponse.json({
      success: true,
      plans,
    });
  } catch (error: any) {
    console.error("[API /api/plans Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch subscription plans" },
      { status: 500 }
    );
  }
}
