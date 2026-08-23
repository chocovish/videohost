import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "LOGIN_REQUIRED", message: "You must be signed in to purchase content." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { contentType: rawContentType, contentId, countryCode, paymentMethod = "CARD", paymentId } = body;
    const contentType = (rawContentType || "").toLowerCase();

    if (!contentType || !["video", "playlist", "meeting"].includes(contentType) || !contentId) {
      return NextResponse.json(
        { error: "Invalid parameters. Required contentType ('video' | 'playlist' | 'meeting') and contentId." },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    let organizationId = "";
    let targetPrice = 0;
    let targetCurrency = "USD";
    let contentTitle = "";

    if (contentType === "video") {
      const video = await db.video.findUnique({
        where: { id: contentId },
        include: { organization: true },
      });

      if (!video) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 });
      }

      if (video.shareAccessMode !== "PURCHASABLE") {
        return NextResponse.json(
          { error: "This content is not available for purchase." },
          { status: 400 }
        );
      }

      organizationId = video.organizationId;
      contentTitle = video.title;
      targetPrice = video.price || 0;
      targetCurrency = video.currency || "USD";

      // Check country pricing override
      if (countryCode && Array.isArray(video.countryPricing)) {
        const countryRule = (video.countryPricing as any[]).find(
          (c) => c.countryCode?.toUpperCase() === countryCode.toUpperCase()
        );
        if (countryRule && countryRule.amount !== undefined) {
          targetPrice = Number(countryRule.amount);
          if (countryRule.currency) targetCurrency = countryRule.currency;
        }
      }

      // Check if already purchased
      const existingPurchase = await db.contentPurchase.findFirst({
        where: {
          userId,
          videoId: contentId,
          status: "COMPLETED",
        },
      });

      if (existingPurchase) {
        return NextResponse.json({
          success: true,
          message: "You have already purchased this video.",
          purchase: existingPurchase,
        });
      }

      // Create purchase record
      const purchase = await db.contentPurchase.create({
        data: {
          organizationId,
          userId,
          contentType: "VIDEO",
          videoId: contentId,
          amount: targetPrice,
          currency: targetCurrency,
          countryCode: countryCode ? countryCode.toUpperCase() : null,
          paymentMethod,
          paymentId: paymentId || `pay_vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          status: "COMPLETED",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully purchased "${contentTitle}"!`,
        purchase,
      });
    } else if (contentType === "meeting") {
      // MEETING ENTRY PASS PURCHASE
      const meeting = await db.meeting.findUnique({
        where: { id: contentId },
        include: { organization: true },
      });

      if (!meeting) {
        return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
      }

      if (meeting.shareAccessMode !== "PURCHASABLE") {
        return NextResponse.json(
          { error: "This meeting is not configured for paid entry pass." },
          { status: 400 }
        );
      }

      organizationId = meeting.organizationId;
      contentTitle = meeting.title;
      targetPrice = meeting.price || 0;
      targetCurrency = meeting.currency || "USD";

      // Check country pricing override
      if (countryCode && Array.isArray(meeting.countryPricing)) {
        const countryRule = (meeting.countryPricing as any[]).find(
          (c) => c.countryCode?.toUpperCase() === countryCode.toUpperCase()
        );
        if (countryRule && countryRule.amount !== undefined) {
          targetPrice = Number(countryRule.amount);
          if (countryRule.currency) targetCurrency = countryRule.currency;
        }
      }

      // Check if user is host
      if (meeting.createdById === userId) {
        return NextResponse.json({
          success: true,
          message: "You are the host of this meeting.",
        });
      }

      // Check if already purchased
      const existingPurchase = await db.contentPurchase.findFirst({
        where: {
          userId,
          meetingId: contentId,
          status: "COMPLETED",
        },
      });

      if (existingPurchase) {
        return NextResponse.json({
          success: true,
          message: "You already own an entry pass for this meeting.",
          purchase: existingPurchase,
        });
      }

      // Create purchase record
      const purchase = await db.contentPurchase.create({
        data: {
          organizationId,
          userId,
          contentType: "MEETING",
          meetingId: contentId,
          amount: targetPrice,
          currency: targetCurrency,
          countryCode: countryCode ? countryCode.toUpperCase() : null,
          paymentMethod,
          paymentId: paymentId || `pay_meet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          status: "COMPLETED",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully purchased entry pass for "${contentTitle}"!`,
        purchase,
      });
    } else {
      // PLAYLIST PURCHASE
      const playlist = await db.playlist.findUnique({
        where: { id: contentId },
        include: { organization: true },
      });

      if (!playlist) {
        return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
      }

      if (playlist.shareAccessMode !== "PURCHASABLE") {
        return NextResponse.json(
          { error: "This playlist is not available for purchase." },
          { status: 400 }
        );
      }

      organizationId = playlist.organizationId;
      contentTitle = playlist.title;
      targetPrice = playlist.price || 0;
      targetCurrency = playlist.currency || "USD";

      // Check country pricing override
      if (countryCode && Array.isArray(playlist.countryPricing)) {
        const countryRule = (playlist.countryPricing as any[]).find(
          (c) => c.countryCode?.toUpperCase() === countryCode.toUpperCase()
        );
        if (countryRule && countryRule.amount !== undefined) {
          targetPrice = Number(countryRule.amount);
          if (countryRule.currency) targetCurrency = countryRule.currency;
        }
      }

      // Check if already purchased
      const existingPurchase = await db.contentPurchase.findFirst({
        where: {
          userId,
          playlistId: contentId,
          status: "COMPLETED",
        },
      });

      if (existingPurchase) {
        return NextResponse.json({
          success: true,
          message: "You have already purchased this playlist.",
          purchase: existingPurchase,
        });
      }

      // Create purchase record
      const purchase = await db.contentPurchase.create({
        data: {
          organizationId,
          userId,
          contentType: "PLAYLIST",
          playlistId: contentId,
          amount: targetPrice,
          currency: targetCurrency,
          countryCode: countryCode ? countryCode.toUpperCase() : null,
          paymentMethod,
          paymentId: paymentId || `pay_pl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          status: "COMPLETED",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully purchased "${contentTitle}"! All videos in this playlist are now unlocked for you.`,
        purchase,
      });
    }
  } catch (error: any) {
    console.error("[POST /api/content-purchases/checkout Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process content purchase." },
      { status: 500 }
    );
  }
}
