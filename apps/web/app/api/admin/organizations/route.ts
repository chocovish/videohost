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
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, orgs] = await Promise.all([
      db.organization.count({ where: whereClause }),
      db.organization.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          plan: true,
          members: {
            where: { role: "OWNER" },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  isBlocked: true,
                },
              },
            },
          },
          _count: {
            select: {
              members: true,
              videos: true,
              folders: true,
              meetings: true,
              playlists: true,
            },
          },
        },
      }),
    ]);

    // Fetch storage used for each organization
    const orgIds = orgs.map((o) => o.id);
    const storageAggregates = await db.video.groupBy({
      by: ["organizationId"],
      where: {
        organizationId: { in: orgIds },
      },
      _sum: {
        sizeBytes: true,
      },
    });

    const storageMap = new Map<string, number>();
    storageAggregates.forEach((agg) => {
      storageMap.set(agg.organizationId, Number(agg._sum.sizeBytes || 0n));
    });

    const enrichedOrgs = orgs.map((org) => {
      const usedBytes = storageMap.get(org.id) || 0;
      const usedGb = parseFloat((usedBytes / (1024 * 1024 * 1024)).toFixed(2));
      const effectiveStorageLimitGb =
        org.customStorageLimitGb !== null && org.customStorageLimitGb !== undefined
          ? org.customStorageLimitGb
          : org.plan.storageLimitGb;

      const owner = org.members[0]?.user || null;

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logoUrl: org.logoUrl,
        themeId: org.themeId,
        planId: org.planId,
        plan: org.plan,
        customStorageLimitGb: org.customStorageLimitGb,
        customMinutesLimit: org.customMinutesLimit,
        effectiveStorageLimitGb,
        usedBytes,
        usedGb,
        subscriptionStatus: org.subscriptionStatus,
        billingMode: org.billingMode,
        billingCycle: org.billingCycle,
        owner,
        membersCount: org._count.members,
        videosCount: org._count.videos,
        meetingsCount: org._count.meetings,
        playlistsCount: org._count.playlists,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      organizations: enrichedOrgs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("[API /api/admin/organizations Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}
