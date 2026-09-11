import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import { isAllowedCurrency } from "@/lib/utils";

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// GET /api/appointments/offerings - List offerings for current active organization
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = (session as any).organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "Active organization required" }, { status: 400 });
  }

  try {
    const offerings = await db.appointmentOffering.findMany({
      where: { organizationId },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      include: {
        _count: {
          select: {
            appointments: {
              where: { status: "CONFIRMED" },
            },
          },
        },
      },
    });

    return NextResponse.json({ offerings });
  } catch (error: any) {
    console.error("[GET /api/appointments/offerings Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch offerings" }, { status: 500 });
  }
}

// POST /api/appointments/offerings - Create a new offering
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = (session as any).organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "Active organization required" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const {
      title,
      slug: customSlug,
      description,
      duration = 30,
      price = 0,
      currency = "INR",
      color = "#84cc16",
      isPublished = true,
      locationType = "LIVEKIT",
      bookingNoticeHours = 1,
      bufferMinutes = 0,
    } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const durationNum = parseInt(String(duration), 10);
    if (isNaN(durationNum) || durationNum <= 0) {
      return NextResponse.json({ error: "Valid duration in minutes is required" }, { status: 400 });
    }

    let baseSlug = customSlug ? generateSlug(customSlug) : generateSlug(title);
    if (!baseSlug) baseSlug = "session";

    let finalSlug = baseSlug;
    let count = 1;
    while (
      await db.appointmentOffering.findUnique({
        where: { organizationId_slug: { organizationId, slug: finalSlug } },
      })
    ) {
      finalSlug = `${baseSlug}-${count++}`;
    }

    const sanitizedCurrency = isAllowedCurrency(currency) ? currency.toUpperCase() : "INR";

    const sanitizedCountryPricing = Array.isArray(body.countryPricing)
      ? body.countryPricing
          .filter(
            (c: any) =>
              c &&
              typeof c.countryCode === "string" &&
              c.countryCode.trim() &&
              !isNaN(Number(c.amount)) &&
              Number(c.amount) >= 0
          )
          .map((c: any) => ({
            countryCode: c.countryCode.trim().toUpperCase(),
            countryName: typeof c.countryName === "string" ? c.countryName.trim() : c.countryCode.trim().toUpperCase(),
            amount: Number(c.amount),
            currency: isAllowedCurrency(c.currency) ? c.currency.toUpperCase() : "USD",
          }))
      : [];

    const offering = await db.appointmentOffering.create({
      data: {
        organizationId,
        createdById: session.user.id,
        title: title.trim(),
        slug: finalSlug,
        description: description ? description.trim() : null,
        duration: durationNum,
        price: Math.max(0, parseFloat(String(price)) || 0),
        currency: sanitizedCurrency,
        countryPricing: sanitizedCountryPricing,
        color: color || "#84cc16",
        isPublished: Boolean(isPublished),
        locationType: locationType || "LIVEKIT",
        bookingNoticeHours: Math.max(0, parseInt(String(bookingNoticeHours), 10) || 1),
        bufferMinutes: Math.max(0, parseInt(String(bufferMinutes), 10) || 0),
      },
    });

    return NextResponse.json({ offering }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/appointments/offerings Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to create offering" }, { status: 500 });
  }
}

