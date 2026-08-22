import { NextResponse } from "next/server";
import { db } from "@videohost/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();

    if (!slug) {
      return NextResponse.json({ error: "Organization slug is required." }, { status: 400 });
    }

    if (!body.name || !body.email || !body.message) {
      return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
    }

    const org = await db.organization.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    const inquiry = await db.offeringInquiry.create({
      data: {
        organizationId: org.id,
        offeringItemId: body.offeringItemId || null,
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        offeringTitle: body.offeringTitle || null,
        message: body.message.trim(),
        preferredTime: body.preferredTime || null,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Your inquiry has been received! The creator will review and contact you shortly.",
      inquiryId: inquiry.id,
    });
  } catch (err: any) {
    console.error("[POST Public Offering Inquiry Error]:", err);
    return NextResponse.json({ error: "Failed to submit inquiry. Please try again." }, { status: 500 });
  }
}
