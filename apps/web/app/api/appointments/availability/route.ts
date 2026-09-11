import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";

const DEFAULT_WEEKLY_HOURS = [
  { day: "monday", isEnabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  { day: "tuesday", isEnabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  { day: "wednesday", isEnabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  { day: "thursday", isEnabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  { day: "friday", isEnabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  { day: "saturday", isEnabled: false, slots: [{ start: "10:00", end: "16:00" }] },
  { day: "sunday", isEnabled: false, slots: [{ start: "10:00", end: "16:00" }] },
];

// GET /api/appointments/availability - Get host's availability schedule
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = (session as any).organizationId;
  const userId = session.user.id;

  if (!organizationId) {
    return NextResponse.json({ error: "Active organization required" }, { status: 400 });
  }

  try {
    let availability = await db.appointmentAvailability.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!availability) {
      return NextResponse.json({
        availability: {
          timezone: "UTC",
          weeklyHours: DEFAULT_WEEKLY_HOURS,
          dateOverrides: [],
          isDefault: true,
        },
      });
    }

    return NextResponse.json({ availability });
  } catch (error: any) {
    console.error("[GET /api/appointments/availability Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch availability" }, { status: 500 });
  }
}

// PUT /api/appointments/availability - Save/update host's availability schedule
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = (session as any).organizationId;
  const userId = session.user.id;

  if (!organizationId) {
    return NextResponse.json({ error: "Active organization required" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { timezone = "UTC", weeklyHours = DEFAULT_WEEKLY_HOURS, dateOverrides = [] } = body;

    // Validate weeklyHours structure
    if (!Array.isArray(weeklyHours)) {
      return NextResponse.json({ error: "weeklyHours must be an array" }, { status: 400 });
    }

    const availability = await db.appointmentAvailability.upsert({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      update: {
        timezone: String(timezone || "UTC"),
        weeklyHours,
        dateOverrides: Array.isArray(dateOverrides) ? dateOverrides : [],
      },
      create: {
        organizationId,
        userId,
        timezone: String(timezone || "UTC"),
        weeklyHours,
        dateOverrides: Array.isArray(dateOverrides) ? dateOverrides : [],
      },
    });

    return NextResponse.json({ availability, success: true });
  } catch (error: any) {
    console.error("[PUT /api/appointments/availability Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to save availability" }, { status: 500 });
  }
}

