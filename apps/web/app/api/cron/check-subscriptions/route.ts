import { NextResponse } from "next/server";
import { db } from "@videohost/db";

async function processSubscriptionExpirations(req: Request) {
  const cronSecret = process.env.CRON_SECRET || "default_midnight_cron_secret_123";
  const url = new URL(req.url);

  // Authenticate cron caller via Bearer Token, x-cron-secret header, or ?secret query param
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  const headerSecret = req.headers.get("x-cron-secret");
  const querySecret = url.searchParams.get("secret");

  const providedSecret = bearerToken || headerSecret || querySecret;

  if (providedSecret !== cronSecret) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid cron secret header or token" },
      { status: 401 }
    );
  }

  try {
    const freePlan = await db.plan.findFirst({
      where: { name: "free" },
    });

    if (!freePlan) {
      return NextResponse.json(
        { error: "Free plan definition not found in database." },
        { status: 500 }
      );
    }

    const now = new Date();

    // Query all non-free organizations whose validity expiration date has passed
    const expiredOrganizations = await db.organization.findMany({
      where: {
        planId: { not: freePlan.id },
        planExpiresAt: {
          not: null,
          lt: now,
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        planExpiresAt: true,
        subscriptionStatus: true,
      },
    });

    const updatedList = [];

    for (const org of expiredOrganizations) {
      // Downgrade organization back to free plan upon validity expiry
      const updatedOrg = await db.organization.update({
        where: { id: org.id },
        data: {
          planId: freePlan.id,
          customMinutesLimit: null,
          customStorageLimitGb: null,
          subscriptionStatus: "EXPIRED",
        },
        select: {
          id: true,
          name: true,
          slug: true,
          planExpiresAt: true,
          subscriptionStatus: true,
        },
      });

      console.log(
        `[Midnight Cron Expiry]: Organization '${org.name}' (${org.id}) plan expired on ${org.planExpiresAt?.toISOString()}. Reverted to Free plan.`
      );
      updatedList.push(updatedOrg);
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      expiredCount: updatedList.length,
      expiredOrganizations: updatedList,
      message: `Cron completed successfully. ${updatedList.length} expired subscriptions reverted to Free plan.`,
    });
  } catch (error: any) {
    console.error("[Midnight Cron Expiry Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process subscription expirations" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return processSubscriptionExpirations(req);
}

export async function POST(req: Request) {
  return processSubscriptionExpirations(req);
}
