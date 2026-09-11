import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import { getBaseUrl } from "@/lib/utils";
import { resolveAppointmentAccess } from "@/lib/appointment-reschedule";
import { sendAppointmentRescheduleEmail } from "@/lib/mail";
import { notifyRescheduleDecision } from "@/lib/notifications";

// PATCH /api/appointments/[id]/reschedule/[requestId]
// Body: { action: "approve" | "reject" | "cancel" }
// - approve/reject: only the OTHER party (not the proposer)
// - cancel (withdraw): only the proposer while PENDING
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, requestId } = await params;
  const userId = session.user.id as string;
  const userEmail = session.user.email as string | undefined;

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").toLowerCase();
    if (!["approve", "reject", "cancel"].includes(action)) {
      return NextResponse.json({ error: "action must be approve, reject, or cancel" }, { status: 400 });
    }

    const appointment = await db.appointment.findUnique({
      where: { id },
      include: {
        offering: true,
        host: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true } },
      },
    });
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const access = await resolveAppointmentAccess(appointment, userId, userEmail);
    if (!access.role) {
      return NextResponse.json({ error: "You do not have access to this appointment" }, { status: 403 });
    }

    const rescheduleRequest = await (db as any).appointmentRescheduleRequest.findFirst({
      where: { id: requestId, appointmentId: id },
    });
    if (!rescheduleRequest) {
      return NextResponse.json({ error: "Reschedule request not found" }, { status: 404 });
    }
    if (rescheduleRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: `This request is already ${rescheduleRequest.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    const isProposer = rescheduleRequest.proposedById === userId;

    if (action === "cancel") {
      if (!isProposer) {
        return NextResponse.json({ error: "Only the person who proposed can withdraw this request" }, { status: 403 });
      }
      const cancelled = await (db as any).appointmentRescheduleRequest.update({
        where: { id: requestId },
        data: { status: "CANCELLED", decidedAt: new Date(), decidedById: userId },
      });

      // Notify both sides that the proposal was withdrawn
      const baseUrl = getBaseUrl();
      const joinUrl =
        appointment.joinUrl ||
        (appointment.meetingId ? `${baseUrl}/meet/${appointment.meetingId}` : `${baseUrl}/dashboard/appointments`);
      const mailBase = {
        hostName: appointment.host?.name || "Host",
        clientName: appointment.clientName,
        offeringTitle: appointment.offering?.title || "Appointment",
        offeringDuration: appointment.offering?.duration || appointment.durationMinutes,
        previousStart: appointment.scheduledStart,
        previousEnd: appointment.scheduledEnd,
        proposedStart: rescheduleRequest.proposedStart,
        proposedEnd: rescheduleRequest.proposedEnd,
        timezone: rescheduleRequest.timezone || appointment.timezone,
        joinUrl,
        proposedByRole: rescheduleRequest.proposedByRole,
        reason: rescheduleRequest.reason,
        organizationName: (appointment as any).organization?.name || "Taped",
        kind: "CANCELLED" as const,
      };
      if (appointment.host?.email) {
        sendAppointmentRescheduleEmail({ ...mailBase, recipientEmail: appointment.host.email, recipientRole: "host" }).catch(() => {});
      }
      if (appointment.clientEmail) {
        sendAppointmentRescheduleEmail({ ...mailBase, recipientEmail: appointment.clientEmail, recipientRole: "client" }).catch(() => {});
      }

      notifyRescheduleDecision({
        appointment: {
          id: appointment.id,
          organizationId: appointment.organizationId,
          hostId: appointment.hostId,
          clientId: appointment.clientId,
          offeringTitle: appointment.offering?.title || "Appointment",
        },
        requestId,
        decision: "CANCELLED",
        decidedById: userId,
        proposedById: rescheduleRequest.proposedById,
        proposedByRole: rescheduleRequest.proposedByRole,
      }).catch(() => {});

      return NextResponse.json({ success: true, request: cancelled });
    }

    // approve / reject — must come from the OTHER party
    if (isProposer) {
      return NextResponse.json({ error: "You cannot approve your own reschedule request" }, { status: 403 });
    }
    const proposerRole = String(rescheduleRequest.proposedByRole || "");
    if (proposerRole === "HOST" && !access.isClient) {
      return NextResponse.json({ error: "Only the client can respond to a host-proposed reschedule" }, { status: 403 });
    }
    if (proposerRole === "CLIENT" && !access.isHost) {
      return NextResponse.json({ error: "Only the host can respond to a client-proposed reschedule" }, { status: 403 });
    }

    if (action === "reject") {
      const rejected = await (db as any).appointmentRescheduleRequest.update({
        where: { id: requestId },
        data: { status: "REJECTED", decidedAt: new Date(), decidedById: userId },
      });

      const baseUrl = getBaseUrl();
      const joinUrl =
        appointment.joinUrl ||
        (appointment.meetingId ? `${baseUrl}/meet/${appointment.meetingId}` : `${baseUrl}/dashboard/appointments`);
      const mailBase = {
        hostName: appointment.host?.name || "Host",
        clientName: appointment.clientName,
        offeringTitle: appointment.offering?.title || "Appointment",
        offeringDuration: appointment.offering?.duration || appointment.durationMinutes,
        previousStart: appointment.scheduledStart,
        previousEnd: appointment.scheduledEnd,
        proposedStart: rescheduleRequest.proposedStart,
        proposedEnd: rescheduleRequest.proposedEnd,
        timezone: rescheduleRequest.timezone || appointment.timezone,
        joinUrl,
        proposedByRole: rescheduleRequest.proposedByRole,
        reason: rescheduleRequest.reason,
        organizationName: (appointment as any).organization?.name || "Taped",
        kind: "REJECTED" as const,
      };
      if (appointment.host?.email) {
        sendAppointmentRescheduleEmail({ ...mailBase, recipientEmail: appointment.host.email, recipientRole: "host" }).catch(() => {});
      }
      if (appointment.clientEmail) {
        sendAppointmentRescheduleEmail({ ...mailBase, recipientEmail: appointment.clientEmail, recipientRole: "client" }).catch(() => {});
      }

      notifyRescheduleDecision({
        appointment: {
          id: appointment.id,
          organizationId: appointment.organizationId,
          hostId: appointment.hostId,
          clientId: appointment.clientId,
          offeringTitle: appointment.offering?.title || "Appointment",
        },
        requestId,
        decision: "REJECTED",
        decidedById: userId,
        proposedById: rescheduleRequest.proposedById,
        proposedByRole: rescheduleRequest.proposedByRole,
      }).catch(() => {});

      return NextResponse.json({ success: true, request: rejected });
    }

    // ---- APPROVE ----
    if (appointment.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: `Only confirmed appointments can be rescheduled (current: ${appointment.status})` },
        { status: 400 }
      );
    }
    const newStart = new Date(rescheduleRequest.proposedStart);
    const newEnd = new Date(rescheduleRequest.proposedEnd);
    if (newStart.getTime() <= Date.now()) {
      await (db as any).appointmentRescheduleRequest.update({
        where: { id: requestId },
        data: { status: "REJECTED", decidedAt: new Date(), decidedById: userId },
      });
      return NextResponse.json({ error: "Proposed time is no longer in the future" }, { status: 400 });
    }

    // Re-check collisions at decision time
    const overlapping = await db.appointment.findFirst({
      where: {
        id: { not: appointment.id },
        organizationId: appointment.organizationId,
        hostId: appointment.hostId,
        status: "CONFIRMED",
        scheduledStart: { lt: newEnd },
        scheduledEnd: { gt: newStart },
      },
      select: { id: true },
    });
    if (overlapping) {
      return NextResponse.json(
        { error: "Proposed slot now conflicts with another booking. Ask for a different time." },
        { status: 409 }
      );
    }

    const previousStart = appointment.scheduledStart;
    const previousEnd = appointment.scheduledEnd;

    // Transaction: move appointment + meeting, approve this request, supersede stragglers
    const [updatedAppointment, approved] = await db.$transaction(async (tx: any) => {
      const updated = await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          scheduledStart: newStart,
          scheduledEnd: newEnd,
          timezone: rescheduleRequest.timezone || appointment.timezone,
          status: "CONFIRMED",
          rescheduleCount: { increment: 1 },
          lastRescheduledAt: new Date(),
        },
        include: { offering: true, meeting: true },
      });

      if (appointment.meetingId) {
        await tx.meeting
          .update({
            where: { id: appointment.meetingId },
            data: { scheduledStart: newStart, scheduledEnd: newEnd, status: "SCHEDULED" },
          })
          .catch(() => {});
      }

      const ok = await tx.appointmentRescheduleRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED", decidedAt: new Date(), decidedById: userId },
      });

      await tx.appointmentRescheduleRequest.updateMany({
        where: { appointmentId: appointment.id, status: "PENDING", id: { not: requestId } },
        data: { status: "SUPERSEDED", decidedAt: new Date() },
      });

      return [updated, ok];
    });

    const baseUrl = getBaseUrl();
    const joinUrl =
      (updatedAppointment as any).joinUrl ||
      ((updatedAppointment as any).meetingId ? `${baseUrl}/meet/${(updatedAppointment as any).meetingId}` : `${baseUrl}/dashboard/appointments`);
    const mailBase = {
      hostName: appointment.host?.name || "Host",
      clientName: appointment.clientName,
      offeringTitle: appointment.offering?.title || "Appointment",
      offeringDuration: appointment.offering?.duration || appointment.durationMinutes,
      previousStart,
      previousEnd,
      proposedStart: newStart,
      proposedEnd: newEnd,
      timezone: rescheduleRequest.timezone || appointment.timezone,
      joinUrl,
      proposedByRole: rescheduleRequest.proposedByRole,
      reason: rescheduleRequest.reason,
      organizationName: (appointment as any).organization?.name || "Taped",
      kind: "APPROVED" as const,
    };
    if (appointment.host?.email) {
      sendAppointmentRescheduleEmail({ ...mailBase, recipientEmail: appointment.host.email, recipientRole: "host" }).catch(() => {});
    }
    if (appointment.clientEmail) {
      sendAppointmentRescheduleEmail({ ...mailBase, recipientEmail: appointment.clientEmail, recipientRole: "client" }).catch(() => {});
    }

    notifyRescheduleDecision({
      appointment: {
        id: appointment.id,
        organizationId: appointment.organizationId,
        hostId: appointment.hostId,
        clientId: appointment.clientId,
        offeringTitle: appointment.offering?.title || "Appointment",
      },
      requestId,
      decision: "APPROVED",
      decidedById: userId,
      proposedById: rescheduleRequest.proposedById,
      proposedByRole: rescheduleRequest.proposedByRole,
    }).catch(() => {});

    return NextResponse.json({ success: true, request: approved, appointment: updatedAppointment });
  } catch (error: any) {
    console.error("[PATCH reschedule decision Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to decide reschedule request" }, { status: 500 });
  }
}
