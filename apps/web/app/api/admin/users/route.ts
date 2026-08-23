import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { db } from "@videohost/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const filter = url.searchParams.get("filter") || "ALL"; // ALL | ACTIVE | BLOCKED
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (filter === "ACTIVE") {
      whereClause.isBlocked = false;
    } else if (filter === "BLOCKED") {
      whereClause.isBlocked = true;
    }

    const [total, users] = await Promise.all([
      db.user.count({ where: whereClause }),
      db.user.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          viewMode: true,
          isBlocked: true,
          blockedReason: true,
          blockedAt: true,
          createdAt: true,
          updatedAt: true,
          memberships: {
            select: {
              role: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  plan: {
                    select: {
                      id: true,
                      name: true,
                      isCustom: true,
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              paymentOrders: true,
              createdMeetings: true,
              withdrawalRequests: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("[API /api/admin/users Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}
