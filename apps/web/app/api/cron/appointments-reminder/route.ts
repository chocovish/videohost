import { NextRequest, NextResponse } from "next/server";
import { db } from "@videohost/db";
import { sendAppointmentReminderEmail } from "@/lib/mail";

async function processAppointmentReminders(req: NextRequest) {
  // Verify optional CRON_SECRET if configured in env
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret) {
    const authHeader = req.headers.get("authorization");
    const querySecret = req.nextUrl.searchParams.get("secret");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const providedSecret = bearerToken || querySecret;

    if (providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized. Invalid cron secret." }, { status: 401 });
    }
  }

  const now = new Date();
  // Window: appointments scheduled between now and next 65 minutes (allowing buffer for 5-15 min cron intervals)
  const windowEnd = new Date(now.getTime() + 65 * 60 * 1000);

  try {
    const upcomingAppointments = await db.appointment.findMany({
      where: {
        status: "CONFIRMED",
        scheduledStart: {
          gte: now,
          lte: windowEnd,
        },
        reminderSentAt: null,
      },
      include: {
        offering: {
          select: { title: true },
        },
        host: {
          select: { name: true, email: true },
        },
        organization: {
          select: { name: true },
        },
      },
      take: 50,
    });

    const results = [];

    for (const appt of upcomingAppointments) {
      const hostName = appt.host?.name || "Host";
      const hostEmail = appt.host?.email;
      const organizationName = appt.organization?.name || "Taped";
      const offeringTitle = appt.offering?.title || "Scheduled Appointment";
      const joinUrl = appt.joinUrl || `/meet/${appt.meetingId || appt.id}`;

      let clientSent = false;
      let hostSent = false;

      // 1. Send reminder to Client
      try {
        await sendAppointmentReminderEmail({
          recipientEmail: appt.clientEmail,
          recipientRole: "client",
          hostName,
          clientName: appt.clientName,
          offeringTitle,
          scheduledStart: appt.scheduledStart,
          timezone: appt.timezone || "UTC",
          joinUrl,
          meetingId: appt.meetingId || appt.id,
          organizationName,
        });
        clientSent = true;
      } catch (err) {
        console.error(`[Cron Reminder] Failed to send client email for appointment ${appt.id}:`, err);
      }

      // 2. Send reminder to Host
      if (hostEmail) {
        try {
          await sendAppointmentReminderEmail({
            recipientEmail: hostEmail,
            recipientRole: "host",
            hostName,
            clientName: appt.clientName,
            offeringTitle,
            scheduledStart: appt.scheduledStart,
            timezone: appt.timezone || "UTC",
            joinUrl,
            meetingId: appt.meetingId || appt.id,
            organizationName,
          });
          hostSent = true;
        } catch (err) {
          console.error(`[Cron Reminder] Failed to send host email for appointment ${appt.id}:`, err);
        }
      }

      // 3. Mark reminder as sent in DB
      await db.appointment.update({
        where: { id: appt.id },
        data: { reminderSentAt: new Date() },
      });

      results.push({
        appointmentId: appt.id,
        scheduledStart: appt.scheduledStart,
        offeringTitle,
        clientEmail: appt.clientEmail,
        hostEmail,
        clientSent,
        hostSent,
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      windowStart: now.toISOString(),
      windowEnd: windowEnd.toISOString(),
      processedCount: results.length,
      appointments: results,
    });
  } catch (error: any) {
    console.error("[Cron Reminder Handler Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process appointment reminders" },
      { status: 500 }
    );
  }
}

// Support both GET and POST for cron runners (Vercel Cron, Google Cloud Scheduler, GitHub Actions, curl)
export async function GET(req: NextRequest) {
  return processAppointmentReminders(req);
}

export async function POST(req: NextRequest) {
  return processAppointmentReminders(req);
}

