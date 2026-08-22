import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user || !(session as any).organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const organizationId = (session as any).organizationId;
    const body = await req.json();

    const existing = await db.offeringInquiry.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
    }

    const updated = await db.offeringInquiry.update({
      where: { id },
      data: {
        status: body.status !== undefined ? body.status : undefined, // "PENDING" | "CONTACTED" | "RESOLVED"
      },
    });

    return NextResponse.json({ success: true, inquiry: updated });
  } catch (err: any) {
    console.error("[PATCH Inquiry Error]:", err);
    return NextResponse.json({ error: "Failed to update inquiry." }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user || !(session as any).organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const organizationId = (session as any).organizationId;

    const existing = await db.offeringInquiry.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
    }

    await db.offeringInquiry.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE Inquiry Error]:", err);
    return NextResponse.json({ error: "Failed to delete inquiry." }, { status: 500 });
  }
}
