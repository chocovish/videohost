import { db } from "@videohost/db";

export type RescheduleRole = "HOST" | "CLIENT";

export interface AppointmentParticipant {
  isHost: boolean;
  isClient: boolean;
  role: RescheduleRole | null;
}

/**
 * Resolve whether the current user participates in an appointment,
 * either as the host side (owner / org member) or the client side (booker).
 * HOST takes precedence when a user qualifies as both (e.g. internal booking).
 */
export async function resolveAppointmentAccess(
  appointment: { hostId: string; clientId: string | null; clientEmail: string; organizationId: string },
  userId: string,
  userEmail?: string | null
): Promise<AppointmentParticipant> {
  const normalizedEmail = (userEmail || "").toLowerCase().trim();
  const appointmentEmail = (appointment.clientEmail || "").toLowerCase().trim();

  let isHost = appointment.hostId === userId;
  if (!isHost) {
    try {
      const membership = await db.organizationMember.findFirst({
        where: { userId, organizationId: appointment.organizationId },
        select: { id: true },
      });
      isHost = Boolean(membership);
    } catch {
      isHost = false;
    }
  }

  const isClient =
    (appointment.clientId != null && appointment.clientId === userId) ||
    (Boolean(normalizedEmail) && normalizedEmail === appointmentEmail);

  return {
    isHost,
    isClient,
    role: isHost ? "HOST" : isClient ? "CLIENT" : null,
  };
}

export function formatRescheduleDateTime(iso: string | Date, timezone?: string) {
  try {
    const d = new Date(iso);
    const datePart = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: timezone || "UTC",
    }).format(d);
    const timePart = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone: timezone || "UTC",
    }).format(d);
    return `${datePart} • ${timePart}`;
  } catch {
    return new Date(iso).toLocaleString();
  }
}
