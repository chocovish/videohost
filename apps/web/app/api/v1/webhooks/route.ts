import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import crypto from "crypto";
import { db } from "@videohost/db";

export async function POST(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url, events } = await req.json();
  if (!url || !Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: "url and events array are required" }, { status: 400 });
  }

  const secret = `whsec_${crypto.randomBytes(16).toString("hex")}`;

  const webhook = await db.webhook.create({
    data: {
      organizationId: authCtx.orgId,
      url,
      secret,
      events,
    },
  });

  return NextResponse.json({
    id: webhook.id,
    url: webhook.url,
    secret: webhook.secret,
    events: webhook.events,
    createdAt: webhook.createdAt,
  });
}

export async function GET(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const webhooks = await db.webhook.findMany({
    where: { organizationId: authCtx.orgId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: webhooks });
}
