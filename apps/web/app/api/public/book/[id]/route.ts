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
    const hostTz = availability?.timezone || "UTC";

    // Parse the requested date (YYYY-MM-DD)
    const [year, month, day] = dateStr.split("-").map(Number);
    if (!year || !month || !day) {
      return NextResponse.json({ error: "Invalid date format. Expected YYYY-MM-DD." }, { status: 400 });
    }

    const targetDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const dayOfWeek = DAY_NAMES[targetDate.getUTCDay()];

    const dayConfig = weeklyHours.find((d: any) => d.day?.toLowerCase() === dayOfWeek);
    if (!dayConfig || !dayConfig.isEnabled || !Array.isArray(dayConfig.slots) || dayConfig.slots.length === 0) {
      return NextResponse.json({ offering, availableSlots: [] });
    }

    // Calculate start and end of target day in UTC
    const dayStartUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const dayEndUtc = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    // Fetch existing appointments that could overlap
    const existingAppointments = await db.appointment.findMany({
      where: {
        organizationId: offering.organizationId,
        hostId: offering.createdById,
        status: "CONFIRMED",
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
        scheduledStart: { lte: dayEndUtc },
        scheduledEnd: { gte: dayStartUtc },
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

    for (const timeBlock of dayConfig.slots) {
      const [startHour, startMin] = timeBlock.start.split(":").map(Number);
      const [endHour, endMin] = timeBlock.end.split(":").map(Number);

      const blockStartTime = new Date(Date.UTC(year, month - 1, day, startHour, startMin, 0));
      const blockEndTime = new Date(Date.UTC(year, month - 1, day, endHour, endMin, 0));

      let currentSlotStart = new Date(blockStartTime.getTime());

      while (currentSlotStart.getTime() + duration * 60 * 1000 <= blockEndTime.getTime()) {
        const currentSlotEnd = new Date(currentSlotStart.getTime() + duration * 60 * 1000);

        // Check if slot is in the future past notice requirement
        if (currentSlotStart.getTime() >= earliestBookableTime) {
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
                timeZone: clientTz || hostTz,
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
    const joinUrl = `${baseUrl}/meet/${meeting.id}`;

    // 2. Create Appointment record
    const appointment = await db.appointment.create({
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
        price: effectivePrice,
        currency: effectiveCurrency,
        paymentStatus,
        paymentId,
        meetingId: meeting.id,
        joinUrl,
      },
      include: {
        offering: true,
        meeting: true,
        host: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Record ContentPurchase if paid session and client user exists
    if (paymentStatus === "PAID" && clientId) {
      try {
        const split = calculateSaleSplit(
          effectivePrice,
          offering.organization?.plan?.name || "free",
          offering.organization?.plan?.commissionPercent
        );

        await db.contentPurchase.create({
          data: {
            organizationId: offering.organizationId,
            userId: clientId,
            contentType: "APPOINTMENT",
            appointmentId: appointment.id,
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
      } catch (cpErr) {
        console.error("Failed to record ContentPurchase for appointment:", cpErr);
      }
    }

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
        price: offering.price,
        currency: offering.currency,
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
          price: offering.price,
          currency: offering.currency,
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
      joinUrl,
    }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/public/book/[id] Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to book appointment" }, { status: 500 });
  }
}

