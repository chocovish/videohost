import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";

export async function GET(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await db.user.findUnique({
      where: { id: authCtx.userId },
      select: { activeOrganizationId: true },
    });

    const memberships = await db.organizationMember.findMany({
      where: { userId: authCtx.userId },
      include: {
        organization: {
          include: {
            plan: {
              select: { name: true, minutesLimit: true },
            },
            _count: {
              select: { members: true },
            },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    const activeOrgId = user?.activeOrganizationId || authCtx.orgId;

    const organizations = memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      themeId: m.organization.themeId,
      planName: m.organization.plan.name,
      role: m.role,
      joinedAt: m.joinedAt,
      memberCount: m.organization._count.members,
      isActive: m.organization.id === activeOrgId,
    }));

    return NextResponse.json({
      activeOrganizationId: activeOrgId,
      organizations,
    });
  } catch (error: any) {
    console.error("[Organizations GET API] Error:", error);
    return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = body.name?.trim();
    let requestedSlug = body.slug?.trim();

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Organization name must be at least 2 characters long" },
        { status: 400 }
      );
    }

    // Check user's current memberships & active plan for multi-org entitlement
    const existingMemberships = await db.organizationMember.findMany({
      where: { userId: authCtx.userId },
      include: {
        organization: {
          include: { plan: true },
        },
      },
    });

    if (existingMemberships.length > 0) {
      // Find if any existing org has enterprise plan
      const hasEnterprisePlan = existingMemberships.some(
        (m) => m.organization.plan.name.toLowerCase() === "enterprise"
      );

      if (!hasEnterprisePlan) {
        return NextResponse.json(
          {
            error: "Creating new organizations can only be done on an Enterprise plan. Upgrade to Enterprise to create additional workspaces.",
            code: "PLAN_RESTRICTION",
          },
          { status: 403 }
        );
      }

      if (existingMemberships.length >= 5) {
        return NextResponse.json(
          {
            error: "Organization limit reached: You can create up to 5 organizations maximum on the Enterprise plan.",
            code: "ORGANIZATION_LIMIT_REACHED",
          },
          { status: 403 }
        );
      }
    }

    let defaultPlan = await db.plan.findFirst({ where: { name: "free" } });
    if (!defaultPlan) {
      defaultPlan = await db.plan.create({
        data: {
          name: "free",
          minutesLimit: 200,
          maxResolution: "1080p",
          seatLimit: 3,
          priceMonthlyCents: 0,
        },
      });
    }

    const baseSlug = requestedSlug
      ? requestedSlug.toLowerCase().replace(/[^a-z0-9]/g, "-")
      : name.toLowerCase().replace(/[^a-z0-9]/g, "-") || "workspace";

    let slug = baseSlug;
    let counter = 1;
    while (await db.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}-${Math.random().toString(36).substring(2, 6)}`;
      counter++;
    }

    const result = await db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name,
          slug,
          planId: defaultPlan.id,
          themeId: "lime",
          members: {
            create: {
              userId: authCtx.userId,
              role: "OWNER",
            },
          },
        },
      });

      await tx.user.update({
        where: { id: authCtx.userId },
        data: { activeOrganizationId: org.id },
      });

      return org;
    });

    return NextResponse.json({
      success: true,
      message: "Organization created successfully",
      organization: {
        id: result.id,
        name: result.name,
        slug: result.slug,
      },
    });
  } catch (error: any) {
    console.error("[Organizations POST API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create organization" },
      { status: 500 }
    );
  }
}
