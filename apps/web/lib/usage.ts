import { db } from "@videohost/db";

export interface UsageReport {
  usedBytes: number;
  storageLimitBytes: number;
  usedGb: number;
  storageLimitGb: number;
  percentageUsed: number;
  isLimitReached: boolean;
  isCustomLimit: boolean;
  usedMinutes?: number;
  minutesLimit?: number;
}

export async function getOrganizationUsage(organizationId: string): Promise<UsageReport> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    include: { plan: true },
  });

  if (!org) {
    throw new Error("Organization not found");
  }

  // Sum total file size of all stored videos in bytes
  const aggregateResult = await db.video.aggregate({
    where: {
      organizationId,
    },
    _sum: {
      sizeBytes: true,
    },
  });

  const usedBytes = Number(aggregateResult._sum.sizeBytes || 0n);
  const storageLimitGb = org.customStorageLimitGb ?? (org.plan as any).storageLimitGb ?? 2;
  const storageLimitBytes = storageLimitGb * 1024 * 1024 * 1024;

  const usedGb = parseFloat((usedBytes / (1024 * 1024 * 1024)).toFixed(2));
  const percentageUsed = Math.min(100, Math.round((usedBytes / storageLimitBytes) * 100));
  const isLimitReached = usedBytes >= storageLimitBytes;

  return {
    usedBytes,
    storageLimitBytes,
    usedGb,
    storageLimitGb,
    percentageUsed,
    isLimitReached,
    isCustomLimit: org.customStorageLimitGb !== null,
    usedMinutes: usedGb,
    minutesLimit: storageLimitGb,
  };
}
