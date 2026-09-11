import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";
import { getCommissionRateForPlan, calculateSaleSplit } from "@/lib/platform-fees";

export async function GET(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch organization and its active subscription plan
    const org = await db.organization.findUnique({
      where: { id: authCtx.orgId },
      include: { plan: true },
    });

    const activePlanName = org?.plan?.name || "free";
    const activeCommissionPercent =
      typeof org?.plan?.commissionPercent === "number"
        ? org.plan.commissionPercent
        : getCommissionRateForPlan(activePlanName);

    // 2. Auto-sync any paid appointments that don't have a ContentPurchase row yet
    try {
      const paidAppointments = await db.appointment.findMany({
        where: {
          organizationId: authCtx.orgId,
          offering: { price: { gt: 0 } },
        },
        include: {
          offering: true,
          purchases: { select: { id: true } },
        },
      });

      for (const appt of paidAppointments) {
        if (!appt.purchases || appt.purchases.length === 0) {
          const existing = await db.contentPurchase.findFirst({
            where: {
              organizationId: authCtx.orgId,
              contentType: "APPOINTMENT",
              OR: [
                { appointmentId: appt.id },
                ...(appt.meetingId ? [{ meetingId: appt.meetingId }] : []),
              ],
            },
          });

          if (!existing) {
            let userId = appt.clientId;
            if (!userId && appt.clientEmail) {
              const u = await db.user.findFirst({
                where: { email: appt.clientEmail.toLowerCase().trim() },
                select: { id: true },
              });
              if (u) userId = u.id;
            }
            if (!userId) userId = appt.hostId;

            const split = calculateSaleSplit(
              appt.offering.price,
              org?.plan?.name || "free",
              org?.plan?.commissionPercent
            );

            await db.contentPurchase.create({
              data: {
                organizationId: authCtx.orgId,
                userId,
                contentType: "APPOINTMENT",
                appointmentId: appt.id,
                meetingId: appt.meetingId,
                amount: appt.offering.price,
                currency: appt.offering.currency || "USD",
                commissionPercent: split.commissionPercent,
                commissionAmount: split.commissionAmount,
                gatewayFeePercent: split.gatewayFeePercent,
                gatewayFeeAmount: split.gatewayFeeAmount,
                creatorEarnings: split.creatorEarnings,
                planSnapshot: split.planSnapshot,
                paymentMethod: "CARD",
                status: "COMPLETED",
                createdAt: appt.createdAt,
              },
            });
          } else if (!existing.appointmentId) {
            await db.contentPurchase.update({
              where: { id: existing.id },
              data: { appointmentId: appt.id },
            });
          }
        }
      }
    } catch (syncErr) {
      console.error("[Auto-sync appointment purchases Error]:", syncErr);
    }

    // 3. Perform parallel indexed DB-level aggregations and counts
    const [
      salesAgg,
      withdrawalsAgg,
      videoPurchasesCount,
      playlistPurchasesCount,
      meetingPurchasesCount,
      appointmentPurchasesCount,
      bankAccount,
      rawPurchases,
    ] = await Promise.all([
      // A. SQL DB-level aggregation of gross sales, platform fees, gateway fees, and net earnings
      db.contentPurchase.aggregate({
        where: {
          organizationId: authCtx.orgId,
          status: "COMPLETED",
        },
        _sum: {
          amount: true,
          commissionAmount: true,
          gatewayFeeAmount: true,
          creatorEarnings: true,
        },
        _count: {
          id: true,
        },
      }),

      // B. SQL DB-level aggregation of all pending, processing, approved, and completed withdrawals
      db.withdrawalRequest.aggregate({
        where: {
          organizationId: authCtx.orgId,
          status: { in: ["PENDING", "PROCESSING", "APPROVED", "COMPLETED"] },
        },
        _sum: {
          amount: true,
        },
      }),

      // C. Fast indexed counts for item types
      db.contentPurchase.count({
        where: {
          organizationId: authCtx.orgId,
          contentType: "VIDEO",
          status: "COMPLETED",
        },
      }),
      db.contentPurchase.count({
        where: {
          organizationId: authCtx.orgId,
          contentType: "PLAYLIST",
          status: "COMPLETED",
        },
      }),
      db.contentPurchase.count({
        where: {
          organizationId: authCtx.orgId,
          contentType: "MEETING",
          status: "COMPLETED",
        },
      }),
      db.contentPurchase.count({
        where: {
          organizationId: authCtx.orgId,
          contentType: "APPOINTMENT",
          status: "COMPLETED",
        },
      }),

      // D. Connected bank account for payout currency
      db.bankAccount.findUnique({
        where: { organizationId: authCtx.orgId },
      }),

      // E. Bounded query for the recent ledger table
      db.contentPurchase.findMany({
        where: {
          organizationId: authCtx.orgId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          video: {
            select: {
              id: true,
              title: true,
              durationSeconds: true,
            },
          },
          playlist: {
            select: {
              id: true,
              title: true,
            },
          },
          meeting: {
            select: {
              id: true,
              title: true,
            },
          },
          appointment: {
            select: {
              id: true,
              clientName: true,
              clientEmail: true,
              scheduledStart: true,
              scheduledEnd: true,
              durationMinutes: true,
              offering: {
                select: {
                  id: true,
                  title: true,
                  duration: true,
                  price: true,
                  currency: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 300,
      }),
    ]);

    // Financial calculations directly from Postgres DB sums
    const totalGrossRevenue = salesAgg._sum.amount || 0;
    const totalPlatformFees = salesAgg._sum.commissionAmount || 0;
    const totalGatewayFees = salesAgg._sum.gatewayFeeAmount || 0;
    const totalNetEarnings = salesAgg._sum.creatorEarnings || 0;
    const totalWithdrawnOrPending = withdrawalsAgg._sum.amount || 0;
    const completedPurchasesCount = salesAgg._count.id || 0;

    const availableBalance = Math.max(
      0,
      Math.round((totalNetEarnings - totalWithdrawnOrPending) * 100) / 100
    );

    const effectiveGatewayFeePercent =
      totalGrossRevenue > 0
        ? Math.round(((totalGatewayFees / totalGrossRevenue) * 100) * 100) / 100
        : 0;

    const currency =
      org?.preferredCurrency ||
      bankAccount?.currency ||
      (rawPurchases.length > 0 && rawPurchases[0].currency ? rawPurchases[0].currency : "INR");

    return NextResponse.json({
      success: true,
      purchases: rawPurchases,
      stats: {
        totalGrossRevenue: Math.round(totalGrossRevenue * 100) / 100,
        totalPlatformFees: Math.round(totalPlatformFees * 100) / 100,
        totalGatewayFees: Math.round(totalGatewayFees * 100) / 100,
        totalNetEarnings: Math.round(totalNetEarnings * 100) / 100,
        availableBalance,
        totalWithdrawnOrPending: Math.round(totalWithdrawnOrPending * 100) / 100,
        totalPurchasesCount: completedPurchasesCount,
        videoPurchasesCount,
        playlistPurchasesCount,
        meetingPurchasesCount,
        appointmentPurchasesCount,
        activePlanName,
        activeCommissionPercent,
        gatewayFeePercent: effectiveGatewayFeePercent,
        currency,
      },
    });
  } catch (err: any) {
    console.error("[GET /api/organization/purchases Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch purchases" },
      { status: 500 }
    );
  }
}

