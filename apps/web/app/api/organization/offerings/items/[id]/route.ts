import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import { getPresignedPlaybackUrl, uploadBufferToS3, deleteFileFromS3 } from "@/lib/s3";
import { resolveOfferingItem } from "@/lib/offerings-resolver";

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
      if (existingItem.coverImageKey && !existingItem.coverImageKey.startsWith("http")) {
        await deleteFileFromS3(existingItem.coverImageKey);
      }
      newCoverImageKey = null;
    } else if (body.coverImageData) {
      const parsed = parseBase64Data(body.coverImageData);
      if (parsed) {
        if (existingItem.coverImageKey && !existingItem.coverImageKey.startsWith("http")) {
          await deleteFileFromS3(existingItem.coverImageKey);
        }
        const timestamp = Date.now();
        const key = `offerings-items/${organizationId}/cover-${timestamp}.${parsed.extension}`;
        await uploadBufferToS3(key, parsed.buffer, parsed.contentType);
        newCoverImageKey = key;
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

    if (existingItem.coverImageKey) {
      await deleteFileFromS3(existingItem.coverImageKey);
    }

    await db.offeringItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE Offering Item Error]:", err);
    return NextResponse.json({ error: "Failed to delete offering item." }, { status: 500 });
  }
}
