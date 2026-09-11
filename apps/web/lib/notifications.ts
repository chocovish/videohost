import { db } from "@videohost/db";

export type NotificationType =
  | "APPOINTMENT_RESCHEDULE_REQUEST"
  | "APPOINTMENT_RESCHEDULE_APPROVED"
  | "APPOINTMENT_RESCHEDULE_REJECTED"
  | "APPOINTMENT_RESCHEDULE_CANCELLED"
  | "APPOINTMENT_BOOKED"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_REMINDER"
  | "GENERIC";

export interface CreateNotificationInput {
  userId: string;
  organizationId?: string | null;
  type: NotificationType | string;
  title: string;
  message: string;
  link?: string | null;
  data?: Record<string, unknown> | null;
}

/** Best-effort notification creation — never throws. */
export async function createNotification(input: CreateNotificationInput) {
  try {
    if (!input.userId) return null;
    return await (db as any).notification.create({
      data: {
        userId: input.userId,
        organizationId: input.organizationId || null,
        type: String(input.type),
        title: String(input.title).slice(0, 200),
        message: String(input.message).slice(0, 2000),
        link: input.link || null,
        data: (input.data as any) || null,
      },
    });
  } catch (err) {
    console.error("[createNotification]", err);
    return null;
  }
}

/** Notify the OTHER party of a reschedule request — the core guarantee. */
export async function notifyRescheduleRequestParties(opts: {
  appointment: {
    id: string;
    organizationId: string;
    hostId: string;
    clientId: string | null;
    clientEmail: string;
    offeringTitle: string;
  };
  requestId: string;
  proposedById: string;
  proposedByRole: "HOST" | "CLIENT";
  proposedStart: Date | string;
}) {
  const { appointment, requestId, proposedById, proposedByRole, proposedStart } = opts;
  const when = (() => {
    try {
      return new Date(proposedStart).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return String(proposedStart);
    }
  })();

  const jobs: Promise<unknown>[] = [];

  if (proposedByRole === "HOST") {
    // Other party = client. Resolve client user id (may differ from proposer).
    const clientUserId = appointment.clientId;
    if (clientUserId && clientUserId !== proposedById) {
      jobs.push(
        createNotification({
          userId: clientUserId,
          organizationId: appointment.organizationId,
          type: "APPOINTMENT_RESCHEDULE_REQUEST",
          title: `Reschedule requested: ${appointment.offeringTitle}`,
          message: `Your host proposed a new time (${when}). Approve or decline from your bookings — your original slot stays booked until you respond.`,
          link: `/dashboard/purchased-items`,
          data: { appointmentId: appointment.id, requestId, proposedByRole },
        })
      );
    }
    // Fallback: if client has no userId (guest email booking), still try host org members? No — email covers them.
  } else {
    // Other party = host side: notify host + all org members so someone on the offering side sees it.
    const hostUserId = appointment.hostId;
    const recipients = new Set<string>();
    if (hostUserId && hostUserId !== proposedById) recipients.add(hostUserId);
    try {
      const members = await db.organizationMember.findMany({
        where: { organizationId: appointment.organizationId },
        select: { userId: true },
        take: 25,
      });
      for (const m of members) {
        if (m.userId !== proposedById) recipients.add(m.userId);
      }
    } catch {}
    for (const userId of recipients) {
      jobs.push(
        createNotification({
          userId,
          organizationId: appointment.organizationId,
          type: "APPOINTMENT_RESCHEDULE_REQUEST",
          title: `Reschedule requested: ${appointment.offeringTitle}`,
          message: `A client proposed a new time (${when}). Review and approve or decline from Scheduled appointments.`,
          link: `/dashboard/appointments`,
          data: { appointmentId: appointment.id, requestId, proposedByRole },
        })
      );
    }
  }

  await Promise.allSettled(jobs);
}

export async function notifyRescheduleDecision(opts: {
  appointment: { id: string; organizationId: string; hostId: string; clientId: string | null; offeringTitle: string };
  requestId: string;
  decision: "APPROVED" | "REJECTED" | "CANCELLED";
  decidedById: string;
  proposedById: string;
  proposedByRole: "HOST" | "CLIENT";
}) {
  const { appointment, requestId, decision, decidedById, proposedById } = opts;
  const typeMap = {
    APPROVED: "APPOINTMENT_RESCHEDULE_APPROVED",
    REJECTED: "APPOINTMENT_RESCHEDULE_REJECTED",
    CANCELLED: "APPOINTMENT_RESCHEDULE_CANCELLED",
  } as const;
  const copyMap = {
    APPROVED: { title: `Rescheduled: ${appointment.offeringTitle}`, message: "The new appointment time was approved and confirmed." },
    REJECTED: { title: `Reschedule declined: ${appointment.offeringTitle}`, message: "The proposed time was declined — the original slot stays booked." },
    CANCELLED: { title: `Reschedule withdrawn: ${appointment.offeringTitle}`, message: "The pending reschedule request was withdrawn." },
  } as const;
  const copy = copyMap[decision];
  const jobs: Promise<unknown>[] = [];
  const recipients = new Set<string>();

  // Always inform the proposer (unless they performed the cancel themselves — still confirm it).
  recipients.add(proposedById);
  // Inform the other side as well.
  if (appointment.clientId) recipients.add(appointment.clientId);
  recipients.add(appointment.hostId);
  try {
    const members = await db.organizationMember.findMany({
      where: { organizationId: appointment.organizationId },
      select: { userId: true },
      take: 25,
    });
    for (const m of members) recipients.add(m.userId);
  } catch {}

  const linkFor = (userId: string) =>
    userId === appointment.clientId && decidedById !== userId
      ? `/dashboard/purchased-items`
      : `/dashboard/appointments`;

  for (const userId of recipients) {
    jobs.push(
      createNotification({
        userId,
        organizationId: appointment.organizationId,
        type: typeMap[decision],
        title: copy.title,
        message: copy.message,
        link: linkFor(userId),
        data: { appointmentId: appointment.id, requestId, decision },
      })
    );
  }
  await Promise.allSettled(jobs);
}
