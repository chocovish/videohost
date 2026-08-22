import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import { getPresignedPlaybackUrl, uploadBufferToS3 } from "@/lib/s3";

function parseBase64Data(dataString: string): { buffer: Buffer; contentType: string; extension: string } | null {
  const matches = dataString.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return null;

  const contentType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, "base64");

  let extension = "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) extension = "jpg";
  else if (contentType.includes("svg")) extension = "svg";
  else if (contentType.includes("webp")) extension = "webp";
  else if (contentType.includes("gif")) extension = "gif";

  return { buffer, contentType, extension };
}

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

    const itemsWithUrls = await Promise.all(
      items.map(async (item) => {
        let coverImageUrl: string | null = null;
        if (item.coverImageKey) {
          try {
            coverImageUrl = await getPresignedPlaybackUrl(item.coverImageKey);
          } catch (e) {
            console.error("Error signing cover image URL:", e);
          }
        }
        return {
          ...item,
          coverImageUrl,
        };
      })
    );

    return NextResponse.json({ items: itemsWithUrls });
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

    let coverImageKey: string | null = null;
    if (body.coverImageData) {
      const parsed = parseBase64Data(body.coverImageData);
      if (parsed) {
        const timestamp = Date.now();
        const key = `offerings-items/${organizationId}/cover-${timestamp}.${parsed.extension}`;
        await uploadBufferToS3(key, parsed.buffer, parsed.contentType);
        coverImageKey = key;
      }
    }

    // Determine current max order
    const maxOrderItem = await db.offeringItem.findFirst({
      where: { organizationId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const nextOrder = (maxOrderItem?.order ?? -1) + 1;

    const newItem = await db.offeringItem.create({
      data: {
        organizationId,
        type: body.type, // "COURSE" | "MEETING" | "VIDEO" | "PRODUCT" | "SERVICE"
        title: body.title,
        subtitle: body.subtitle || null,
        description: body.description || null,
        price: body.price || null,
        pricePeriod: body.pricePeriod || null,
        badge: body.badge || null,
        coverImageKey,
        ctaText: body.ctaText || "Learn More",
        ctaAction: body.ctaAction || "INQUIRY_MODAL",
        ctaUrl: body.ctaUrl || null,
        highlights: Array.isArray(body.highlights) ? body.highlights.filter(Boolean) : [],
        meetingDuration: body.meetingDuration || null,
        deliveryFormat: body.deliveryFormat || null,
        order: typeof body.order === "number" ? body.order : nextOrder,
        isFeatured: body.isFeatured ?? false,
        isPublished: body.isPublished ?? true,
      },
    });

    let coverImageUrl: string | null = null;
    if (newItem.coverImageKey) {
      coverImageUrl = await getPresignedPlaybackUrl(newItem.coverImageKey);
    }

    return NextResponse.json({
      success: true,
      item: {
        ...newItem,
        coverImageUrl,
      },
    });
  } catch (err: any) {
    console.error("[POST Offering Item Error]:", err);
    return NextResponse.json({ error: "Failed to create offering item." }, { status: 500 });
  }
}
