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
    const { planId, customStorageLimitGb, customMinutesLimit, name } = body;

    const org = await db.organization.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (name && typeof name === "string" && name.trim()) {
      updateData.name = name.trim();
    }

    if (planId && typeof planId === "string") {
      const plan = await db.plan.findUnique({
        where: { id: planId },
      });
      if (!plan) {
        return NextResponse.json(
          { error: `Plan with ID '${planId}' does not exist` },
          { status: 400 }
        );
      }
      updateData.planId = planId;
    }

    if (customStorageLimitGb !== undefined) {
      if (customStorageLimitGb === null || customStorageLimitGb === "") {
        updateData.customStorageLimitGb = null;
      } else {
        const parsedGb = parseInt(customStorageLimitGb, 10);
        if (isNaN(parsedGb) || parsedGb < 0) {
          return NextResponse.json(
            { error: "Custom storage limit must be a positive integer or 0 (unlimited)" },
            { status: 400 }
          );
        }
        updateData.customStorageLimitGb = parsedGb;
      }
    }

    if (customMinutesLimit !== undefined) {
      if (customMinutesLimit === null || customMinutesLimit === "") {
        updateData.customMinutesLimit = null;
      } else {
        const parsedMin = parseInt(customMinutesLimit, 10);
        if (isNaN(parsedMin) || parsedMin < 0) {
          return NextResponse.json(
            { error: "Custom minutes limit must be a positive integer" },
            { status: 400 }
          );
        }
        updateData.customMinutesLimit = parsedMin;
      }
    }

    const updatedOrg = await db.organization.update({
      where: { id },
      data: updateData,
      include: {
        plan: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Organization '${updatedOrg.name}' updated successfully.`,
      organization: updatedOrg,
    });
  } catch (error: any) {
    console.error("[API /api/admin/organizations/[id] Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update organization" },
      { status: 500 }
    );
  }
}
