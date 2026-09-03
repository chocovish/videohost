import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import { parseBase64Image, uploadBase64Image } from "@/lib/branding-image";
import { resolveOfferingItem } from "@/lib/offerings-resolver";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !(session as any).organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = (session as any).organizationId;

    const items = await db.offeringItem.findMany({
      where: { organizationId },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    const resolvedItems = await Promise.all(
      items.map((item) =>
        resolveOfferingItem(item, {
          isOrgMember: true,
        })
      )
    );

    return NextResponse.json({ items: resolvedItems });
  } catch (err: any) {
    console.error("[GET Offering Items Error]:", err);
    return NextResponse.json({ error: "Failed to fetch offering items." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !(session as any).organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = (session as any).organizationId;
    const body = await req.json();

    if (!body.title || !body.type) {
      return NextResponse.json({ error: "Title and type are required." }, { status: 400 });
    }

    const isPlaylistOrVideo =
      body.type === "PLAYLIST" ||
      body.type === "COURSE" ||
      (body.type === "VIDEO" && !body.ctaUrl?.startsWith("http"));

    let coverImageKey: string | null = null;
    if (!isPlaylistOrVideo) {
      if (body.coverImageData) {
        if (parseBase64Image(body.coverImageData)) {
          coverImageKey = await uploadBase64Image({
            organizationId,
            base64Data: body.coverImageData,
            folder: "offerings-items",
            filenamePrefix: "cover",
            preset: "offering-cover",
          });
        }
      } else if (body.coverImageKey || body.coverImageUrl) {
        coverImageKey = body.coverImageKey || body.coverImageUrl;
      }
    }

    // Determine current max order
    const maxOrderItem = await db.offeringItem.findFirst({
      where: { organizationId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const nextOrder = (maxOrderItem?.order ?? -1) + 1;

    // For playlists & videos: omit redundant fields, only store reference (ctaUrl), badge, highlights, layout
    const newItem = await db.offeringItem.create({
      data: {
        organizationId,
        type: body.type, // "PLAYLIST" | "COURSE" | "MEETING" | "VIDEO" | "PRODUCT" | "SERVICE"
        title: body.title,
        subtitle: isPlaylistOrVideo ? null : (body.subtitle || null),
        description: isPlaylistOrVideo ? null : (body.description || null),
        price: isPlaylistOrVideo ? null : (body.price || null),
        pricePeriod: isPlaylistOrVideo ? null : (body.pricePeriod || null),
        badge: body.badge || null,
        coverImageKey: isPlaylistOrVideo ? null : coverImageKey,
        ctaText: isPlaylistOrVideo ? "Watch" : (body.ctaText || "Learn More"),
        ctaAction: isPlaylistOrVideo ? "EXTERNAL_LINK" : (body.ctaAction || "INQUIRY_MODAL"),
        ctaUrl: body.ctaUrl || null,
        highlights: Array.isArray(body.highlights) ? body.highlights.filter(Boolean) : [],
        meetingDuration: body.type === "MEETING" ? (body.meetingDuration || null) : null,
        deliveryFormat: isPlaylistOrVideo ? null : (body.deliveryFormat || null),
        order: typeof body.order === "number" ? body.order : nextOrder,
        isFeatured: body.isFeatured ?? false,
        isPublished: body.isPublished ?? true,
      },
    });

    const resolved = await resolveOfferingItem(newItem, { isOrgMember: true });

    return NextResponse.json({
      success: true,
      item: resolved,
    });
  } catch (err: any) {
    console.error("[POST Offering Item Error]:", err);
    return NextResponse.json({ error: "Failed to create offering item." }, { status: 500 });
  }
}
