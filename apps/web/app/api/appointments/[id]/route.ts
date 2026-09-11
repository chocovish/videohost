import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import { createNotification } from "@/lib/notifications";

// GET /api/appointments/[id]
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
    const appointment = await db.appointment.findFirst({
      where: { id, organizationId },
      include: {
        offering: true,
        meeting: true,
        host: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    return NextResponse.json({ appointment });
  } catch (error: any) {
    console.error("[GET /api/appointments/[id] Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch appointment" }, { status: 500 });
  }
}

// PATCH /api/appointments/[id] - Cancel or update appointment status
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
    const appointment = await db.appointment.findFirst({
      where: { id, organizationId },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const body = await req.json();
    const { status, cancelledReason } = body;

    const updateData: any = {};

    if (status) {
      updateData.status = status;
      if (status === "CANCELLED") {
        updateData.cancelledAt = new Date();
        if (cancelledReason) updateData.cancelledReason = String(cancelledReason).trim();

        // Also update associated meeting status if exists
        if (appointment.meetingId) {
          await db.meeting.update({
            where: { id: appointment.meetingId },
            data: { status: "CANCELLED" },
          }).catch((err) => console.error("Could not cancel associated meeting:", err));
        }
      }
    }

    const updated = await db.appointment.update({
      where: { id },
      data: updateData,
      include: {
        offering: true,
        meeting: true,
      },
    });

    if (status === "CANCELLED") {
      // General notification: tell the client their booking was cancelled.
      try {
        const recipients = new Set<string>();
        if (appointment.clientId) recipients.add(appointment.clientId);
        for (const userId of recipients) {
          createNotification({
            userId,
            organizationId: appointment.organizationId,
            type: "APPOINTMENT_CANCELLED",
            title: `Cancelled: ${(updated as any).offering?.title || "Appointment"}`,
            message: cancelledReason ? `Reason: ${String(cancelledReason).slice(0, 300)}` : "Your appointment was cancelled by the host.",
            link: `/dashboard/purchased-items`,
            data: { appointmentId: id },
          }).catch(() => {});
        }
      } catch {}
    }

    return NextResponse.json({ appointment: updated });
  } catch (error: any) {
    console.error("[PATCH /api/appointments/[id] Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to update appointment" }, { status: 500 });
  }
}

// DELETE /api/appointments/[id]
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
    const appointment = await db.appointment.findFirst({
      where: { id, organizationId },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    await db.appointment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Appointment deleted successfully" });
  } catch (error: any) {
    console.error("[DELETE /api/appointments/[id] Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to delete appointment" }, { status: 500 });
  }
}

