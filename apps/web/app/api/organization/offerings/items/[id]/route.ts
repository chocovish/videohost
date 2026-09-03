import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import {
  parseBase64Image,
  deleteOldImage,
  uploadBase64Image,
} from "@/lib/branding-image";
import { resolveOfferingItem } from "@/lib/offerings-resolver";

export async function PUT(
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

    const existingItem = await db.offeringItem.findFirst({
      where: { id, organizationId },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Offering item not found." }, { status: 404 });
    }

    const itemType = body.type !== undefined ? body.type : existingItem.type;
    const isPlaylistOrVideo =
      itemType === "PLAYLIST" ||
      itemType === "COURSE" ||
      (itemType === "VIDEO" && !(body.ctaUrl || existingItem.ctaUrl)?.startsWith("http"));

    let newCoverImageKey = existingItem.coverImageKey;

    if (isPlaylistOrVideo) {
      newCoverImageKey = null;
    } else if (body.removeCoverImage) {
      await deleteOldImage(existingItem.coverImageKey);
      newCoverImageKey = null;
    } else if (body.coverImageData) {
      if (parseBase64Image(body.coverImageData)) {
        await deleteOldImage(existingItem.coverImageKey);
        newCoverImageKey = await uploadBase64Image({
          organizationId,
          base64Data: body.coverImageData,
          folder: "offerings-items",
          filenamePrefix: "cover",
          preset: "offering-cover",
        });
      }
    } else if (body.coverImageKey !== undefined || body.coverImageUrl !== undefined) {
      newCoverImageKey = body.coverImageKey || body.coverImageUrl || null;
    }

    const updated = await db.offeringItem.update({
      where: { id },
      data: {
        type: body.type !== undefined ? body.type : undefined,
        title: body.title !== undefined ? body.title : undefined,
        subtitle: isPlaylistOrVideo ? null : (body.subtitle !== undefined ? body.subtitle : undefined),
        description: isPlaylistOrVideo ? null : (body.description !== undefined ? body.description : undefined),
        price: isPlaylistOrVideo ? null : (body.price !== undefined ? body.price : undefined),
        pricePeriod: isPlaylistOrVideo ? null : (body.pricePeriod !== undefined ? body.pricePeriod : undefined),
        badge: body.badge !== undefined ? body.badge : undefined,
        coverImageKey: isPlaylistOrVideo ? null : newCoverImageKey,
        ctaText: isPlaylistOrVideo ? "Watch" : (body.ctaText !== undefined ? body.ctaText : undefined),
        ctaAction: isPlaylistOrVideo ? "EXTERNAL_LINK" : (body.ctaAction !== undefined ? body.ctaAction : undefined),
        ctaUrl: body.ctaUrl !== undefined ? body.ctaUrl : undefined,
        highlights: Array.isArray(body.highlights) ? body.highlights.filter(Boolean) : undefined,
        meetingDuration: itemType === "MEETING" ? (body.meetingDuration !== undefined ? body.meetingDuration : undefined) : null,
        deliveryFormat: isPlaylistOrVideo ? null : (body.deliveryFormat !== undefined ? body.deliveryFormat : undefined),
        order: typeof body.order === "number" ? body.order : undefined,
        isFeatured: body.isFeatured !== undefined ? body.isFeatured : undefined,
        isPublished: body.isPublished !== undefined ? body.isPublished : undefined,
      },
    });

    const resolved = await resolveOfferingItem(updated, { isOrgMember: true });

    return NextResponse.json({
      success: true,
      item: resolved,
    });
  } catch (err: any) {
    console.error("[PUT Offering Item Error]:", err);
    return NextResponse.json({ error: "Failed to update offering item." }, { status: 500 });
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

    const existingItem = await db.offeringItem.findFirst({
      where: { id, organizationId },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Offering item not found." }, { status: 404 });
    }

    await deleteOldImage(existingItem.coverImageKey);

    await db.offeringItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE Offering Item Error]:", err);
    return NextResponse.json({ error: "Failed to delete offering item." }, { status: 500 });
  }
}
