import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import { isAllowedCurrency } from "@/lib/utils";

// GET /api/appointments/offerings/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const organizationId = (session as any).organizationId;

  try {
    const offering = await db.appointmentOffering.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: { appointments: true },
        },
      },
    });

    if (!offering) {
      return NextResponse.json({ error: "Offering not found" }, { status: 404 });
    }

    return NextResponse.json({ offering });
  } catch (error: any) {
    console.error("[GET /api/appointments/offerings/[id] Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch offering" }, { status: 500 });
  }
}

// PATCH /api/appointments/offerings/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const organizationId = (session as any).organizationId;

  try {
    const offering = await db.appointmentOffering.findFirst({
      where: { id, organizationId },
    });

    if (!offering) {
      return NextResponse.json({ error: "Offering not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      title,
      description,
      duration,
      price,
      currency,
      color,
      isPublished,
      locationType,
      bookingNoticeHours,
      bufferMinutes,
      order,
    } = body;

    const updateData: any = {};

    if (title !== undefined) updateData.title = String(title).trim();
    if (description !== undefined) updateData.description = description ? String(description).trim() : null;
    if (duration !== undefined) updateData.duration = Math.max(1, parseInt(String(duration), 10));
    if (price !== undefined) updateData.price = Math.max(0, parseFloat(String(price)) || 0);
    if (currency !== undefined) updateData.currency = isAllowedCurrency(currency) ? String(currency).toUpperCase() : "INR";
    if (color !== undefined) updateData.color = String(color);
    if (isPublished !== undefined) updateData.isPublished = Boolean(isPublished);
    if (locationType !== undefined) updateData.locationType = String(locationType);
    if (bookingNoticeHours !== undefined) updateData.bookingNoticeHours = Math.max(0, parseInt(String(bookingNoticeHours), 10));
    if (bufferMinutes !== undefined) updateData.bufferMinutes = Math.max(0, parseInt(String(bufferMinutes), 10));
    if (order !== undefined) updateData.order = parseInt(String(order), 10) || 0;
    if (body.countryPricing !== undefined) {
      updateData.countryPricing = Array.isArray(body.countryPricing)
        ? body.countryPricing
            .filter(
              (c: any) =>
                c &&
                typeof c.countryCode === "string" &&
                c.countryCode.trim() &&
                !isNaN(Number(c.amount)) &&
                Number(c.amount) >= 0
            )
            .map((c: any) => ({
              countryCode: c.countryCode.trim().toUpperCase(),
              countryName: typeof c.countryName === "string" ? c.countryName.trim() : c.countryCode.trim().toUpperCase(),
              amount: Number(c.amount),
              currency: isAllowedCurrency(c.currency) ? c.currency.toUpperCase() : "USD",
            }))
        : [];
    }

    const updated = await db.appointmentOffering.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ offering: updated });
  } catch (error: any) {
    console.error("[PATCH /api/appointments/offerings/[id] Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to update offering" }, { status: 500 });
  }
}

// DELETE /api/appointments/offerings/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const organizationId = (session as any).organizationId;

  try {
    const offering = await db.appointmentOffering.findFirst({
      where: { id, organizationId },
    });

    if (!offering) {
      return NextResponse.json({ error: "Offering not found" }, { status: 404 });
    }

    await db.appointmentOffering.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Offering deleted successfully" });
  } catch (error: any) {
    console.error("[DELETE /api/appointments/offerings/[id] Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to delete offering" }, { status: 500 });
  }
}

