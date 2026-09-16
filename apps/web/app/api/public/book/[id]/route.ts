import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import { getBaseUrl } from "@/lib/utils";
import { sendAppointmentConfirmationEmail } from "@/lib/mail";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { getCashfreeOrder, getCashfreeOrderPayments } from "@/lib/cashfree";
import { calculateSaleSplit } from "@/lib/platform-fees";
import { createNotification } from "@/lib/notifications";

const DEFAULT_WEEKLY_HOURS = [
  { day: "monday", isEnabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  { day: "tuesday", isEnabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  { day: "wednesday", isEnabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  { day: "thursday", isEnabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  { day: "friday", isEnabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  { day: "saturday", isEnabled: false, slots: [{ start: "10:00", end: "16:00" }] },
  { day: "sunday", isEnabled: false, slots: [{ start: "10:00", end: "16:00" }] },
];

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function safeTimeZone(tz: string | null | undefined, fallback = "UTC"): string {
  const candidate = (tz || fallback).trim() || fallback;
  try {
    // Throws RangeError for unknown zones
    new Intl.DateTimeFormat("en-US", { timeZone: candidate });
    return candidate;
  } catch {
    return fallback;
  }
}

function getTimeZoneOffsetMs(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour) % 24,
    Number(map.minute),
    Number(map.second)
  );
  return asUTC - date.getTime();
}

/**
 * Convert a wall-clock time in `timeZone` (YYYY-MM-DD HH:mm) to the
 * corresponding UTC instant. Iterated to handle DST transitions.
 */
function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
  second = 0
): Date {
  let utc = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 3; i++) {
    const offset = getTimeZoneOffsetMs(timeZone, new Date(utc));
    const next = Date.UTC(year, month - 1, day, hour, minute, second) - offset;
    if (next === utc) break;
    utc = next;
  }
  return new Date(utc);
}

function getZonedDateParts(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day) };
}

function shiftDateYMD(year: number, month: number, day: number, deltaDays: number) {
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function weekdayKeyForYMD(year: number, month: number, day: number): string {
  return DAY_NAMES[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

// GET /api/public/book/[id] - Fetch public offering and available time slots for a given date
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const searchParams = req.nextUrl.searchParams;
  const dateStr = searchParams.get("date"); // e.g. "2026-09-15"
  const clientTz = searchParams.get("timezone") || "UTC";
  const excludeAppointmentId = searchParams.get("excludeAppointmentId"); // used by reschedule flow to ignore the current booking

  try {
    const offering = await db.appointmentOffering.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        isPublished: true,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            themeId: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!offering) {
      return NextResponse.json({ error: "Offering not found or is unpublished" }, { status: 404 });
    }

    // If no date query provided, return just the offering info
    if (!dateStr) {
      return NextResponse.json({ offering });
    }

    // Fetch host availability
    const availability = await db.appointmentAvailability.findUnique({
      where: {
        organizationId_userId: {
          organizationId: offering.organizationId,
          userId: offering.createdById,
        },
      },
    });

    const weeklyHours = (availability?.weeklyHours as any[]) || DEFAULT_WEEKLY_HOURS;
    const hostTz = safeTimeZone(availability?.timezone || "UTC");
    const clientTzSafe = safeTimeZone(clientTz || hostTz, hostTz);

    // Parse the requested date (YYYY-MM-DD). The calendar day number the
    // visitor clicked is interpreted as a date IN the visitor's selected
    // timezone (dateStr is built from those calendar numbers on the client).
    const [year, month, day] = dateStr.split("-").map(Number);
    if (!year || !month || !day) {
      return NextResponse.json({ error: "Invalid date format. Expected YYYY-MM-DD." }, { status: 400 });
    }

    // UTC bounds of the visitor's selected day in their timezone. DST-safe:
    // end is start-of-next-day minus 1ms.
    const clientDayStartUtc = zonedTimeToUtc(year, month, day, 0, 0, clientTzSafe);
    const nextDay = shiftDateYMD(year, month, day, 1);
    const clientNextDayStartUtc = zonedTimeToUtc(nextDay.year, nextDay.month, nextDay.day, 0, 0, clientTzSafe);
    const clientDayEndUtc = new Date(clientNextDayStartUtc.getTime() - 1);

    // Fetch existing appointments that could overlap the visitor's day
    const existingAppointments = await db.appointment.findMany({
      where: {
        organizationId: offering.organizationId,
        hostId: offering.createdById,
        status: "CONFIRMED",
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
        scheduledStart: { lte: clientDayEndUtc },
        scheduledEnd: { gte: clientDayStartUtc },
      },
      select: {
        scheduledStart: true,
        scheduledEnd: true,
      },
    });

    const duration = offering.duration;
    const buffer = offering.bufferMinutes;
    const slotStepMinutes = duration + buffer;

    const minNoticeMs = (offering.bookingNoticeHours || 1) * 60 * 60 * 1000;
    const earliestBookableTime = Date.now() + minNoticeMs;

    const availableSlots: Array<{
      start: string;
      end: string;
      timeLabel: string;
    }> = [];

    // Host weekly hours are wall-clock times IN the host timezone. A
    // visitor day can span two host calendar days (and vice versa), so
    // generate from every host date that could overlap the visitor day,
    // then keep only slots starting inside the visitor day.
    const hostDateKeys = new Map<string, { year: number; month: number; day: number }>();
    for (const anchor of [clientDayStartUtc, clientDayEndUtc]) {
      const hp = getZonedDateParts(anchor, hostTz);
      for (const delta of [-1, 0, 1]) {
        const s = shiftDateYMD(hp.year, hp.month, hp.day, delta);
        const key = `${s.year}-${String(s.month).padStart(2, "0")}-${String(s.day).padStart(2, "0")}`;
        if (!hostDateKeys.has(key)) hostDateKeys.set(key, s);
      }
    }

    for (const hostDate of hostDateKeys.values()) {
      const dayOfWeek = weekdayKeyForYMD(hostDate.year, hostDate.month, hostDate.day);
      const dayConfig = weeklyHours.find((d: any) => d.day?.toLowerCase() === dayOfWeek);
      if (!dayConfig || !dayConfig.isEnabled || !Array.isArray(dayConfig.slots) || dayConfig.slots.length === 0) {
        continue;
      }

      for (const timeBlock of dayConfig.slots) {
        const [startHour, startMin] = String(timeBlock.start || "").split(":").map(Number);
        const [endHour, endMin] = String(timeBlock.end || "").split(":").map(Number);
        if (
          !Number.isFinite(startHour) || !Number.isFinite(startMin) ||
          !Number.isFinite(endHour) || !Number.isFinite(endMin)
        ) {
          continue;
        }

        // Interpret the configured hours in the HOST timezone, not UTC.
        const blockStartTime = zonedTimeToUtc(hostDate.year, hostDate.month, hostDate.day, startHour, startMin, hostTz);
        const blockEndTime = zonedTimeToUtc(hostDate.year, hostDate.month, hostDate.day, endHour, endMin, hostTz);
        if (blockEndTime.getTime() <= blockStartTime.getTime()) continue;

        let currentSlotStart = new Date(blockStartTime.getTime());

        while (currentSlotStart.getTime() + duration * 60 * 1000 <= blockEndTime.getTime()) {
          const currentSlotEnd = new Date(currentSlotStart.getTime() + duration * 60 * 1000);

          // Only show slots that fall on the visitor's selected date
          const fallsOnSelectedDate =
            currentSlotStart.getTime() >= clientDayStartUtc.getTime() &&
            currentSlotStart.getTime() < clientNextDayStartUtc.getTime();

          // Check if slot is in the future past notice requirement
          if (fallsOnSelectedDate && currentSlotStart.getTime() >= earliestBookableTime) {
            // Check collision with existing confirmed appointments
            const isColliding = existingAppointments.some((appt) => {
              const apptStart = new Date(appt.scheduledStart).getTime();
              const apptEnd = new Date(appt.scheduledEnd).getTime();
              return currentSlotStart.getTime() < apptEnd && currentSlotEnd.getTime() > apptStart;
            });

            if (!isColliding) {
              let label = `${currentSlotStart.getUTCHours().toString().padStart(2, "0")}:${currentSlotStart.getUTCMinutes().toString().padStart(2, "0")}`;
              try {
                label = new Intl.DateTimeFormat("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: clientTzSafe,
                }).format(currentSlotStart);
              } catch {}

              availableSlots.push({
                start: currentSlotStart.toISOString(),
                end: currentSlotEnd.toISOString(),
                timeLabel: label,
              });
            }
          }

          // Advance by slotStepMinutes
          currentSlotStart = new Date(currentSlotStart.getTime() + slotStepMinutes * 60 * 1000);
        }
      }
    }

    availableSlots.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return NextResponse.json({
      offering,
      availableSlots,
      hostTimezone: hostTz,
    });
  } catch (error: any) {
    console.error("[GET /api/public/book/[id] Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to load booking details" }, { status: 500 });
  }
}

// POST /api/public/book/[id] - Confirm and execute appointment booking
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const offering = await db.appointmentOffering.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        isPublished: true,
      },
      include: {
        organization: {
          include: {
            plan: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!offering) {
      return NextResponse.json({ error: "Offering not found or is unpublished" }, { status: 404 });
    }

    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: "LOGIN_REQUIRED", message: "You must be signed in to book an appointment." },
        { status: 401 }
      );
    }

    const clientId = session.user.id;
    const clientEmail = session.user.email.toLowerCase().trim();

    const body = await req.json();
    const {
      scheduledStart,
      scheduledEnd,
      clientName: rawClientName,
      clientNotes,
      timezone = "UTC",
      gateway,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_id,
      cf_order_id,
      countryCode,
    } = body;

    const clientName =
      (typeof rawClientName === "string" && rawClientName.trim()) ||
      session.user.name ||
      "Client";

    if (!scheduledStart || !scheduledEnd) {
      return NextResponse.json({ error: "Appointment time slot is required" }, { status: 400 });
    }

    const startDate = new Date(scheduledStart);
    const endDate = new Date(scheduledEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid start or end time format" }, { status: 400 });
    }

    if (startDate.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Appointment must be scheduled in the future" }, { status: 400 });
    }

    let effectivePrice = offering.price;
    let effectiveCurrency = offering.currency || "USD";

    if (countryCode && Array.isArray(offering.countryPricing)) {
      const countryRule = (offering.countryPricing as any[]).find(
        (c) => c.countryCode?.toUpperCase() === String(countryCode).toUpperCase()
      );
      if (countryRule && countryRule.amount !== undefined) {
        effectivePrice = Number(countryRule.amount);
        if (countryRule.currency) effectiveCurrency = countryRule.currency;
      }
    }

    // Enforce Payment Verification for Paid Offerings
    let paymentStatus = "FREE";
    let paymentId: string | null = null;

    if (effectivePrice > 0) {
      if (gateway === "cashfree" || (!razorpay_order_id && Boolean(order_id || cf_order_id))) {
        const targetOrderId = order_id || cf_order_id;
        if (!targetOrderId) {
          return NextResponse.json(
            { error: "Payment verification failed: Missing Cashfree order_id." },
            { status: 400 }
          );
        }

        const cfOrder = await getCashfreeOrder(targetOrderId).catch(() => null);
        const payments = await getCashfreeOrderPayments(targetOrderId).catch(() => []);
        const successfulPayment = payments.find((p: any) => p.payment_status === "SUCCESS");

        const isPaid = cfOrder?.order_status === "PAID" || Boolean(successfulPayment);
        if (!isPaid) {
          return NextResponse.json(
            { error: `Payment not completed. Status: ${cfOrder?.order_status || "PENDING"}` },
            { status: 400 }
          );
        }

        paymentStatus = "PAID";
        paymentId = successfulPayment?.cf_payment_id || cfOrder?.cf_order_id || String(targetOrderId);
      } else {
        // Razorpay Gateway
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
          return NextResponse.json(
            { error: "Payment required: Please complete payment before booking." },
            { status: 402 }
          );
        }

        const isValid = verifyRazorpaySignature({
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          signature: razorpay_signature,
        });

        if (!isValid) {
          return NextResponse.json(
            { error: "Payment verification failed: Invalid payment signature." },
            { status: 400 }
          );
        }

        paymentStatus = "PAID";
        paymentId = razorpay_payment_id;
      }
    }

    // Check collision with existing confirmed appointments
    const overlapping = await db.appointment.findFirst({
      where: {
        organizationId: offering.organizationId,
        hostId: offering.createdById,
        status: "CONFIRMED",
        scheduledStart: { lt: endDate },
        scheduledEnd: { gt: startDate },
      },
    });

    if (overlapping) {
      return NextResponse.json(
        { error: "This time slot was just booked by someone else. Please select another slot." },
        { status: 409 }
      );
    }

    // 1. Provision LiveKit Video Meeting record
    const meeting = await db.meeting.create({
      data: {
        organizationId: offering.organizationId,
        createdById: offering.createdById,
        title: `${offering.title} - ${clientName.trim()}`,
        description: clientNotes ? clientNotes.trim() : `Scheduled session for ${offering.title}`,
        scheduledStart: startDate,
        scheduledEnd: endDate,
        status: "SCHEDULED",
        allowGuests: true,
        shareAccessMode: "PUBLIC",
      },
    });

    const baseUrl = getBaseUrl();
    const joinPath = `/meet/${meeting.id}`;
    const joinUrl = `${baseUrl}${joinPath}`;

    // 2. Create Appointment + ContentPurchase atomically. ContentPurchase is
    // the single source of truth for purchase details (same as
    // VIDEO/PLAYLIST/MEETING); the Appointment row holds no payment fields.
    // Always record a purchase, even for FREE (amount 0).
    const appointment = await db.$transaction(async (tx) => {
      const created = await tx.appointment.create({
        data: {
          organizationId: offering.organizationId,
          offeringId: offering.id,
          hostId: offering.createdById,
          clientId,
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim().toLowerCase(),
          clientNotes: clientNotes ? clientNotes.trim() : null,
          scheduledStart: startDate,
          scheduledEnd: endDate,
          durationMinutes: offering.duration,
          timezone: timezone || "UTC",
          status: "CONFIRMED",
          meetingId: meeting.id,
          joinUrl: joinPath,
        },
        include: {
          offering: true,
          meeting: true,
          host: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (paymentStatus === "PAID") {
        const split = calculateSaleSplit(
          effectivePrice,
          offering.organization?.plan?.name || "free",
          offering.organization?.plan?.commissionPercent
        );

        await tx.contentPurchase.create({
          data: {
            organizationId: offering.organizationId,
            userId: clientId,
            contentType: "APPOINTMENT",
            appointmentId: created.id,
            meetingId: meeting.id,
            amount: effectivePrice,
            currency: effectiveCurrency,
            countryCode: countryCode ? String(countryCode).toUpperCase() : null,
            commissionPercent: split.commissionPercent,
            commissionAmount: split.commissionAmount,
            gatewayFeePercent: split.gatewayFeePercent,
            gatewayFeeAmount: split.gatewayFeeAmount,
            creatorEarnings: split.creatorEarnings,
            planSnapshot: split.planSnapshot,
            paymentMethod: gateway === "cashfree" ? "CASHFREE" : "RAZORPAY",
            paymentId,
            status: "COMPLETED",
          },
        });
      } else {
        await tx.contentPurchase.create({
          data: {
            organizationId: offering.organizationId,
            userId: clientId,
            contentType: "APPOINTMENT",
            appointmentId: created.id,
            meetingId: meeting.id,
            amount: 0,
            currency: effectiveCurrency,
            countryCode: countryCode ? String(countryCode).toUpperCase() : null,
            commissionPercent: 0,
            commissionAmount: 0,
            gatewayFeePercent: 0,
            gatewayFeeAmount: 0,
            creatorEarnings: 0,
            planSnapshot: "FREE_CLAIM",
            paymentMethod: "FREE",
            paymentId: `free_appt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            status: "COMPLETED",
          },
        });
      }

      return created;
    });

    // 3. Send confirmation emails to both parties
    const hostName = offering.createdBy?.name || "Host";
    const hostEmail = offering.createdBy?.email;
    const organizationName = offering.organization?.name || "Taped";

    // Send to Attendee / Client
    try {
      await sendAppointmentConfirmationEmail({
        recipientEmail: clientEmail.trim().toLowerCase(),
        recipientRole: "client",
        hostName,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim().toLowerCase(),
        offeringTitle: offering.title,
        offeringDuration: offering.duration,
        scheduledStart: startDate,
        scheduledEnd: endDate,
        timezone,
        joinUrl,
        meetingId: meeting.id,
        price: effectivePrice,
        currency: effectiveCurrency,
        clientNotes: clientNotes ? clientNotes.trim() : null,
        organizationName,
      });
    } catch (emailErr) {
      console.error("[sendAppointmentConfirmationEmail Client Error]:", emailErr);
    }

    // Send to Host
    if (hostEmail) {
      try {
        await sendAppointmentConfirmationEmail({
          recipientEmail: hostEmail,
          recipientRole: "host",
          hostName,
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim().toLowerCase(),
          offeringTitle: offering.title,
          offeringDuration: offering.duration,
          scheduledStart: startDate,
          scheduledEnd: endDate,
          timezone,
          joinUrl,
          meetingId: meeting.id,
          price: effectivePrice,
          currency: effectiveCurrency,
          clientNotes: clientNotes ? clientNotes.trim() : null,
          organizationName,
        });
      } catch (emailErr) {
        console.error("[sendAppointmentConfirmationEmail Host Error]:", emailErr);
      }
    }

    // In-app notifications (general panel): host + org members learn about the new booking.
    try {
      const whenStr = startDate.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      const recipients = new Set<string>([offering.createdById]);
      try {
        const members = await db.organizationMember.findMany({
          where: { organizationId: offering.organizationId },
          select: { userId: true },
          take: 25,
        });
        for (const m of members) recipients.add(m.userId);
      } catch {}
      recipients.delete(clientId);
      for (const userId of recipients) {
        createNotification({
          userId,
          organizationId: offering.organizationId,
          type: "APPOINTMENT_BOOKED",
          title: `New booking: ${offering.title}`,
          message: `${clientName.trim()} booked ${whenStr}.`,
          link: `/dashboard/appointments`,
          data: { appointmentId: appointment.id, offeringId: offering.id },
        }).catch(() => {});
      }
      createNotification({
        userId: clientId,
        organizationId: offering.organizationId,
        type: "APPOINTMENT_BOOKED",
        title: `Booked: ${offering.title}`,
        message: `Your session is confirmed for ${whenStr}.`,
        link: `/dashboard/purchased-items`,
        data: { appointmentId: appointment.id, offeringId: offering.id },
      }).catch(() => {});
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Appointment booked successfully",
      appointment,
      joinUrl: joinPath,
    }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/public/book/[id] Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to book appointment" }, { status: 500 });
  }
}

