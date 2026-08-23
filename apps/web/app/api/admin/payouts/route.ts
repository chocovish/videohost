import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { db } from "@videohost/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "ALL"; // ALL | PENDING | PROCESSING | COMPLETED | REJECTED
    const search = url.searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (status !== "ALL" && ["PENDING", "PROCESSING", "COMPLETED", "REJECTED"].includes(status)) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { organization: { name: { contains: search, mode: "insensitive" } } },
        { requestedBy: { name: { contains: search, mode: "insensitive" } } },
        { requestedBy: { email: { contains: search, mode: "insensitive" } } },
        { transactionId: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, withdrawals] = await Promise.all([
      db.withdrawalRequest.count({ where: whereClause }),
      db.withdrawalRequest.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              plan: {
                select: {
                  id: true,
                  name: true,
                  commissionPercent: true,
                },
              },
            },
          },
          requestedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              isBlocked: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      withdrawals,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("[API /api/admin/payouts GET Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch payout requests" },
      { status: 500 }
    );
  }
}
