import { db } from "@videohost/db";

export interface UsageReport {
  usedMinutes: number;
  minutesLimit: number;
  percentageUsed: number;
  isLimitReached: boolean;
  isCustomLimit: boolean;
}

export async function getOrganizationUsage(organizationId: string): Promise<UsageReport> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    include: { plan: true },
  });

  if (!org) {
    throw new Error("Organization not found");
  }

  // Sum total duration of READY videos in seconds
  const aggregateResult = await db.video.aggregate({
    where: {
      organizationId,
      status: "READY",
    },
    _sum: {
      durationSeconds: true,
    },
  });

  const totalSeconds = aggregateResult._sum.durationSeconds || 0;
  const usedMinutes = Math.ceil(totalSeconds / 60);

  const effectiveLimit = org.customMinutesLimit ?? org.plan.minutesLimit;
  const percentageUsed = Math.min(100, Math.round((usedMinutes / effectiveLimit) * 100));
  const isLimitReached = usedMinutes >= effectiveLimit;

  return {
    usedMinutes,
    minutesLimit: effectiveLimit,
    percentageUsed,
    isLimitReached,
    isCustomLimit: org.customMinutesLimit !== null,
  };
}
