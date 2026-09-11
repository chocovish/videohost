import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";

// GET /api/appointments - List scheduled appointments for active organization
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = (session as any).organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "Active organization required" }, { status: 400 });
  }

  const searchParams = req.nextUrl.searchParams;
  const filter = searchParams.get("filter") || "all";
  const now = new Date();

  try {
    const whereClause: any = { organizationId };

    if (filter === "upcoming") {
      whereClause.status = "CONFIRMED";
      whereClause.scheduledEnd = { gte: now };
    } else if (filter === "past") {
      whereClause.OR = [
        { status: "COMPLETED" },
        { status: "CONFIRMED", scheduledEnd: { lt: now } },
      ];
    } else if (filter === "cancelled") {
      whereClause.status = "CANCELLED";
    }

    const [appointments, counts, revenueAgg, org] = await Promise.all([
      db.appointment.findMany({
        where: whereClause,
        orderBy: { scheduledStart: filter === "past" ? "desc" : "asc" },
        include: {
          offering: {
            select: {
              id: true,
              title: true,
              duration: true,
              price: true,
              currency: true,
              color: true,
              locationType: true,
            },
          },
          meeting: {
            select: {
              id: true,
              status: true,
              isRecording: true,
            },
          },
          host: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          purchases: true,
          rescheduleRequests: {
            where: { status: "PENDING" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),

      // Aggregate counts
      Promise.all([
        db.appointment.count({
          where: { organizationId, status: "CONFIRMED", scheduledEnd: { gte: now } },
        }),
        db.appointment.count({
          where: {
            organizationId,
            OR: [
              { status: "COMPLETED" },
              { status: "CONFIRMED", scheduledEnd: { lt: now } },
            ],
          },
        }),
        db.appointment.count({
          where: { organizationId, status: "CANCELLED" },
        }),
        db.appointment.count({
          where: { organizationId },
        }),
        (db as any).appointmentRescheduleRequest.count({
          where: { status: "PENDING", appointment: { organizationId } },
        }),
      ]),

      // Total revenue from confirmed appointment purchases
      db.contentPurchase.aggregate({
        where: { organizationId, contentType: "APPOINTMENT", status: "COMPLETED" },
        _sum: { amount: true },
      }),

      // Organization preferred currency
      db.organization.findUnique({
        where: { id: organizationId },
        select: { preferredCurrency: true },
      }),
    ]);

    const [upcomingCount, pastCount, cancelledCount, totalCount, pendingReschedules] = counts;

    return NextResponse.json({
      appointments,
      stats: {
        total: totalCount,
        upcoming: upcomingCount,
        past: pastCount,
        cancelled: cancelledCount,
        pendingReschedules: pendingReschedules || 0,
        totalRevenue: revenueAgg._sum.amount || 0,
        currency: org?.preferredCurrency || "INR",
      },
    });
  } catch (error: any) {
    console.error("[GET /api/appointments Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch appointments" }, { status: 500 });
  }
}

