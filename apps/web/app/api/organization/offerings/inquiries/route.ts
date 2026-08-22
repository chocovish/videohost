import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !(session as any).organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = (session as any).organizationId;

    const inquiries = await db.offeringInquiry.findMany({
      where: { organizationId },
      include: {
        offeringItem: {
          select: {
            id: true,
            title: true,
            type: true,
            price: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ inquiries });
  } catch (err: any) {
    console.error("[GET Inquiries Error]:", err);
    return NextResponse.json({ error: "Failed to fetch inquiries." }, { status: 500 });
  }
}
