import { NextResponse } from "next/server";
import { db } from "@videohost/db";
import { auth } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const session = await auth();

    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    // 1. Resolve shared item (Video, Folder, or Playlist)
    let video = await db.video.findUnique({
      where: { id: token },
      select: { id: true, title: true, organizationId: true, shareAccessMode: true },
    });

    let folder: any = null;
    let playlist: any = null;

    if (!video) {
      folder = await db.folder.findUnique({
        where: { id: token },
        select: { id: true, name: true, organizationId: true, shareAccessMode: true },
      });
    }

    if (!video && !folder) {
      playlist = await db.playlist.findUnique({
        where: { id: token },
        select: { id: true, title: true, organizationId: true, shareAccessMode: true },
      });
    }

    const item = video || folder || playlist;
    if (!item) {
      return NextResponse.json({ error: "Shared item not found." }, { status: 404 });
    }

    const itemType = video ? "video" : playlist ? "playlist" : "folder";
    const itemTitle = video ? video.title : playlist ? playlist.title : folder.name;

    const email = (body.email || session?.user?.email || "").trim().toLowerCase();
    const name = (body.name || session?.user?.name || email.split("@")[0] || "Visitor").trim();
    const customMessage = (body.message || "").trim();

    if (!email) {
      return NextResponse.json({ error: "A valid email address is required to request access." }, { status: 400 });
    }

    // Check if an inquiry from this email for this item/title was already submitted recently
    const existingInquiry = await db.offeringInquiry.findFirst({
      where: {
        organizationId: item.organizationId,
        email: email,
        offeringTitle: `Access Request: ${itemTitle}`,
        status: "PENDING",
      },
    });

    if (existingInquiry) {
      return NextResponse.json({
        success: true,
        alreadySubmitted: true,
        message: "Your access request has already been submitted and is pending review by the creator.",
      });
    }

    const finalMessage = customMessage || `User (${email}) has requested access to restricted ${itemType}: "${itemTitle}".`;

    const inquiry = await db.offeringInquiry.create({
      data: {
        organizationId: item.organizationId,
        name: name,
        email: email,
        offeringTitle: `Access Request: ${itemTitle}`,
        message: finalMessage,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Access request submitted! The creator has been notified and can grant access to your account.",
      inquiryId: inquiry.id,
    });
  } catch (err: any) {
    console.error("[POST /api/share/[token]/request-access Error]:", err);
    return NextResponse.json({ error: "Failed to submit access request. Please try again." }, { status: 500 });
  }
}
