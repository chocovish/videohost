import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import { getBaseUrl } from "@/lib/utils";
import { resolveAppointmentAccess } from "@/lib/appointment-reschedule";
import { sendAppointmentRescheduleEmail } from "@/lib/mail";
import { notifyRescheduleRequestParties } from "@/lib/notifications";

// GET /api/appointments/[id]/reschedule — list reschedule history + pending request
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const userId = session.user.id as string;
  const userEmail = session.user.email as string | undefined;

  try {
    const appointment = await db.appointment.findUnique({
      where: { id },
      include: {
        offering: { select: { id: true, title: true, duration: true } },
      },
    });
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const access = await resolveAppointmentAccess(appointment, userId, userEmail);
    if (!access.role) {
      return NextResponse.json({ error: "You do not have access to this appointment" }, { status: 403 });
    }

    const requests = await (db as any).appointmentRescheduleRequest.findMany({
      where: { appointmentId: id },
      orderBy: { createdAt: "desc" },
    });

    const pending = requests.find((r: any) => r.status === "PENDING") || null;

    return NextResponse.json({
      requests,
      pending,
      viewerRole: access.role,
      canPropose: appointment.status === "CONFIRMED" && new Date(appointment.scheduledEnd).getTime() > Date.now(),
    });
  } catch (error: any) {
    console.error("[GET /api/appointments/[id]/reschedule Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch reschedule requests" }, { status: 500 });
  }
}

// POST /api/appointments/[id]/reschedule — propose a new time (either party)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const userId = session.user.id as string;
  const userEmail = session.user.email as string | undefined;
  const userName = (session.user.name as string | undefined) || "Participant";

  try {
    const body = await req.json().catch(() => ({}));
    const { proposedStart, proposedEnd, timezone = "UTC", reason } = body;

    if (!proposedStart || !proposedEnd) {
      return NextResponse.json({ error: "proposedStart and proposedEnd are required" }, { status: 400 });
    }

    const startDate = new Date(proposedStart);
    const endDate = new Date(proposedEnd);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format for proposed times" }, { status: 400 });
    }
    if (endDate.getTime() <= startDate.getTime()) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
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

    if (appointment.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: `Only confirmed appointments can be rescheduled (current: ${appointment.status})` },
        { status: 400 }
      );
    }
    if (new Date(appointment.scheduledEnd).getTime() <= Date.now()) {
      return NextResponse.json({ error: "Past appointments cannot be rescheduled" }, { status: 400 });
    }
    if (startDate.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Proposed time must be in the future" }, { status: 400 });
    }

    // Duration must match the offering duration to keep the booking contract intact
    const expectedMinutes = appointment.offering?.duration || appointment.durationMinutes;
    const proposedMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
    if (expectedMinutes && Math.abs(proposedMinutes - expectedMinutes) > 1) {
      return NextResponse.json(
        { error: `Rescheduled slot must be ${expectedMinutes} minutes (got ${proposedMinutes})` },
        { status: 400 }
      );
    }

    // Respect minimum booking notice
    const noticeHours = appointment.offering?.bookingNoticeHours ?? 1;
    if (startDate.getTime() < Date.now() + noticeHours * 60 * 60 * 1000) {
      return NextResponse.json(
        { error: `New time requires at least ${noticeHours} hour(s) notice` },
        { status: 400 }
      );
    }

    // No-op check
    if (
      new Date(appointment.scheduledStart).getTime() === startDate.getTime() &&
      new Date(appointment.scheduledEnd).getTime() === endDate.getTime()
    ) {
      return NextResponse.json({ error: "Proposed time is the same as the current time" }, { status: 400 });
    }

    // Collision check (exclude the appointment being rescheduled)
    const overlapping = await db.appointment.findFirst({
      where: {
        id: { not: appointment.id },
        organizationId: appointment.organizationId,
        hostId: appointment.hostId,
        status: "CONFIRMED",
        scheduledStart: { lt: endDate },
        scheduledEnd: { gt: startDate },
      },
      select: { id: true },
    });
    if (overlapping) {
      return NextResponse.json(
        { error: "This slot conflicts with another booking. Please choose a different time." },
        { status: 409 }
      );
    }

    // Supersede any previous pending requests so there is exactly one active proposal
    await (db as any).appointmentRescheduleRequest.updateMany({
      where: { appointmentId: appointment.id, status: "PENDING" },
      data: { status: "SUPERSEDED", decidedAt: new Date() },
    });

    const created = await (db as any).appointmentRescheduleRequest.create({
      data: {
        appointmentId: appointment.id,
        proposedStart: startDate,
        proposedEnd: endDate,
        timezone: String(timezone || "UTC"),
        reason: reason ? String(reason).trim().slice(0, 1000) : null,
        proposedById: userId,
        proposedByRole: access.role,
        proposedByName: userName,
        status: "PENDING",
      },
    });

    // Notify the OTHER party by email (guaranteed) + confirm to proposer.
    // The appointment never moves until the other side approves.
    const baseUrl = getBaseUrl();
    const joinUrl = appointment.joinUrl || (appointment.meetingId ? `${baseUrl}/meet/${appointment.meetingId}` : `${baseUrl}/dashboard/appointments`);
    const hostName = appointment.host?.name || "Host";
    const hostEmail = appointment.host?.email;
    const orgName = (appointment as any).organization?.name || "Taped";
    const mailBase = {
      hostName,
      clientName: appointment.clientName,
      offeringTitle: appointment.offering?.title || "Appointment",
      offeringDuration: appointment.offering?.duration || appointment.durationMinutes,
      previousStart: appointment.scheduledStart,
      previousEnd: appointment.scheduledEnd,
      proposedStart: startDate,
      proposedEnd: endDate,
      timezone: String(timezone || appointment.timezone || "UTC"),
      joinUrl,
      proposedByRole: access.role,
      reason: reason ? String(reason).trim().slice(0, 1000) : null,
      organizationName: orgName,
      kind: "REQUEST" as const,
    };
    // Explicit other-party routing: HOST proposal -> client email; CLIENT proposal -> host email.
    // We still CC the proposer for their own records, but the other party send is awaited
    // (with catch) so a failure is logged loudly instead of silently skipped.
    const otherPartySends: Promise<unknown>[] = [];
    if (access.role === "HOST") {
      if (appointment.clientEmail) {
        otherPartySends.push(
          sendAppointmentRescheduleEmail({ ...mailBase, recipientEmail: appointment.clientEmail, recipientRole: "client" }).catch((e) =>
            console.error("[reschedule request email to client/other party]", e)
          )
        );
      } else {
        console.error("[reschedule request] no client email to notify (other party)");
      }
      if (hostEmail) {
        sendAppointmentRescheduleEmail({ ...mailBase, recipientEmail: hostEmail, recipientRole: "host" }).catch((e) =>
          console.error("[reschedule request host copy]", e)
        );
      }
    } else {
      if (hostEmail) {
        otherPartySends.push(
          sendAppointmentRescheduleEmail({ ...mailBase, recipientEmail: hostEmail, recipientRole: "host" }).catch((e) =>
            console.error("[reschedule request email to host/other party]", e)
          )
        );
      } else {
        console.error("[reschedule request] no host email to notify (other party)");
      }
      if (appointment.clientEmail) {
        sendAppointmentRescheduleEmail({ ...mailBase, recipientEmail: appointment.clientEmail, recipientRole: "client" }).catch((e) =>
          console.error("[reschedule request client copy]", e)
        );
      }
    }
    await Promise.allSettled(otherPartySends);

    // In-app notification for the other party (drives the header bell + needs-action badges).
    notifyRescheduleRequestParties({
      appointment: {
        id: appointment.id,
        organizationId: appointment.organizationId,
        hostId: appointment.hostId,
        clientId: appointment.clientId,
        clientEmail: appointment.clientEmail,
        offeringTitle: appointment.offering?.title || "Appointment",
      },
      requestId: created.id,
      proposedById: userId,
      proposedByRole: access.role,
      proposedStart: startDate,
    }).catch((e) => console.error("[reschedule notify]", e));

    return NextResponse.json({ success: true, request: created }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/appointments/[id]/reschedule Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to request reschedule" }, { status: 500 });
  }
}
