import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { getOrganizationUsage } from "@/lib/usage";
import { db } from "@videohost/db";

export async function GET(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await db.organization.findUnique({
    where: { id: authCtx.orgId },
    include: { plan: true },
  });

  const usage = await getOrganizationUsage(authCtx.orgId);

  return NextResponse.json({
    organizationId: authCtx.orgId,
    plan: org?.plan.name || "free",
    usage,
  });
}
