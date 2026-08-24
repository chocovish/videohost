import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "LOGIN_REQUIRED", message: "You must be signed in to claim this content." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { contentType: rawContentType, contentId, countryCode } = body;
    const contentType = (rawContentType || "").toLowerCase();

    if (!contentType || !["video", "playlist", "meeting"].includes(contentType) || !contentId) {
      return NextResponse.json(
        { error: "Invalid parameters. Required contentType ('video' | 'playlist' | 'meeting') and contentId." },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    let organizationId = "";
    let effectivePrice = 0;
    let targetCurrency = "USD";
    let contentTitle = "";
    let internalId = contentId;

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
          { error: "This video is not configured as purchasable content." },
          { status: 400 }
        );
      }

      organizationId = video.organizationId;
      contentTitle = video.title;
      effectivePrice = video.price ?? 0;
      targetCurrency = video.currency || "USD";
      internalId = video.id;

      // Check country pricing override from DB
      if (countryCode && Array.isArray(video.countryPricing)) {
        const countryRule = (video.countryPricing as any[]).find(
          (c) => c.countryCode?.toUpperCase() === countryCode.toUpperCase()
        );
        if (countryRule && countryRule.amount !== undefined) {
          effectivePrice = Number(countryRule.amount);
          if (countryRule.currency) targetCurrency = countryRule.currency;
        }
      }

      // CRITICAL SECURITY VALIDATION: Price must be 0
      if (effectivePrice > 0) {
        return NextResponse.json(
          {
            error: "PAYMENT_REQUIRED",
            message: `This item requires payment (${targetCurrency} ${effectivePrice.toFixed(2)}) and cannot be claimed for free.`,
          },
          { status: 403 }
        );
      }

      // Check if already purchased
      const existingPurchase = await db.contentPurchase.findFirst({
        where: {
          userId,
          videoId: video.id,
          status: "COMPLETED",
        },
      });

      if (existingPurchase) {
        return NextResponse.json({
          success: true,
          alreadyPurchased: true,
          message: "You already own access to this video.",
          purchase: existingPurchase,
        });
      }

      // Check if user purchased a playlist containing this video
      const playlistItems = await db.playlistItem.findMany({
        where: { videoId: video.id },
        select: { playlistId: true },
      });
      const playlistIds = playlistItems.map((pi) => pi.playlistId);
      if (playlistIds.length > 0) {
        const existingPlaylistPurchase = await db.contentPurchase.findFirst({
          where: {
            userId,
            playlistId: { in: playlistIds },
            status: "COMPLETED",
          },
        });
        if (existingPlaylistPurchase) {
          return NextResponse.json({
            success: true,
            alreadyPurchased: true,
            message: "You have unlocked this video via a purchased playlist.",
            purchase: existingPlaylistPurchase,
          });
        }
      }

      // Create Free Purchase Record
      const purchase = await db.contentPurchase.create({
        data: {
          organizationId,
          userId,
          contentType: "VIDEO",
          videoId: internalId,
          amount: 0,
          currency: targetCurrency,
          countryCode: countryCode ? countryCode.toUpperCase() : null,
          commissionPercent: 0,
          commissionAmount: 0,
          gatewayFeePercent: 0,
          gatewayFeeAmount: 0,
          creatorEarnings: 0,
          planSnapshot: "FREE_CLAIM",
          paymentMethod: "FREE",
          paymentId: `free_vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          status: "COMPLETED",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully claimed "${contentTitle}" for free!`,
        purchase,
      });
    } else if (contentType === "meeting") {
      const meeting = await db.meeting.findUnique({
        where: { id: contentId },
        include: { organization: true },
      });

      if (!meeting) {
        return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
      }

      if (meeting.shareAccessMode !== "PURCHASABLE") {
        return NextResponse.json(
          { error: "This meeting is not configured as purchasable." },
          { status: 400 }
        );
      }

      organizationId = meeting.organizationId;
      contentTitle = meeting.title;
      effectivePrice = meeting.price ?? 0;
      targetCurrency = meeting.currency || "USD";
      internalId = meeting.id;

      // Check country pricing override from DB
      if (countryCode && Array.isArray(meeting.countryPricing)) {
        const countryRule = (meeting.countryPricing as any[]).find(
          (c) => c.countryCode?.toUpperCase() === countryCode.toUpperCase()
        );
        if (countryRule && countryRule.amount !== undefined) {
          effectivePrice = Number(countryRule.amount);
          if (countryRule.currency) targetCurrency = countryRule.currency;
        }
      }

      // CRITICAL SECURITY VALIDATION: Price must be 0
      if (effectivePrice > 0) {
        return NextResponse.json(
          {
            error: "PAYMENT_REQUIRED",
            message: `This meeting pass requires payment (${targetCurrency} ${effectivePrice.toFixed(2)}) and cannot be claimed for free.`,
          },
          { status: 403 }
        );
      }

      // Check if user is the meeting host
      if (meeting.createdById === userId) {
        return NextResponse.json({
          success: true,
          alreadyPurchased: true,
          message: "You are the host of this meeting.",
        });
      }

      // Check if already purchased
      const existingPurchase = await db.contentPurchase.findFirst({
        where: {
          userId,
          meetingId: meeting.id,
          status: "COMPLETED",
        },
      });

      if (existingPurchase) {
        return NextResponse.json({
          success: true,
          alreadyPurchased: true,
          message: "You already own an entry pass for this meeting.",
          purchase: existingPurchase,
        });
      }

      // Create Free Purchase Record
      const purchase = await db.contentPurchase.create({
        data: {
          organizationId,
          userId,
          contentType: "MEETING",
          meetingId: internalId,
          amount: 0,
          currency: targetCurrency,
          countryCode: countryCode ? countryCode.toUpperCase() : null,
          commissionPercent: 0,
          commissionAmount: 0,
          gatewayFeePercent: 0,
          gatewayFeeAmount: 0,
          creatorEarnings: 0,
          planSnapshot: "FREE_CLAIM",
          paymentMethod: "FREE",
          paymentId: `free_meet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          status: "COMPLETED",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully claimed free entry pass for "${contentTitle}"!`,
        purchase,
      });
    } else {
      // PLAYLIST
      const playlist = await db.playlist.findUnique({
        where: { id: contentId },
        include: { organization: true },
      });

      if (!playlist) {
        return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
      }

      if (playlist.shareAccessMode !== "PURCHASABLE") {
        return NextResponse.json(
          { error: "This playlist is not configured as purchasable." },
          { status: 400 }
        );
      }

      organizationId = playlist.organizationId;
      contentTitle = playlist.title;
      effectivePrice = playlist.price ?? 0;
      targetCurrency = playlist.currency || "USD";
      internalId = playlist.id;

      // Check country pricing override from DB
      if (countryCode && Array.isArray(playlist.countryPricing)) {
        const countryRule = (playlist.countryPricing as any[]).find(
          (c) => c.countryCode?.toUpperCase() === countryCode.toUpperCase()
        );
        if (countryRule && countryRule.amount !== undefined) {
          effectivePrice = Number(countryRule.amount);
          if (countryRule.currency) targetCurrency = countryRule.currency;
        }
      }

      // CRITICAL SECURITY VALIDATION: Price must be 0
      if (effectivePrice > 0) {
        return NextResponse.json(
          {
            error: "PAYMENT_REQUIRED",
            message: `This playlist requires payment (${targetCurrency} ${effectivePrice.toFixed(2)}) and cannot be claimed for free.`,
          },
          { status: 403 }
        );
      }

      // Check if already purchased
      const existingPurchase = await db.contentPurchase.findFirst({
        where: {
          userId,
          playlistId: playlist.id,
          status: "COMPLETED",
        },
      });

      if (existingPurchase) {
        return NextResponse.json({
          success: true,
          alreadyPurchased: true,
          message: "You already own access to this playlist.",
          purchase: existingPurchase,
        });
      }

      // Create Free Purchase Record
      const purchase = await db.contentPurchase.create({
        data: {
          organizationId,
          userId,
          contentType: "PLAYLIST",
          playlistId: internalId,
          amount: 0,
          currency: targetCurrency,
          countryCode: countryCode ? countryCode.toUpperCase() : null,
          commissionPercent: 0,
          commissionAmount: 0,
          gatewayFeePercent: 0,
          gatewayFeeAmount: 0,
          creatorEarnings: 0,
          planSnapshot: "FREE_CLAIM",
          paymentMethod: "FREE",
          paymentId: `free_pl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          status: "COMPLETED",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully claimed free playlist access for "${contentTitle}"!`,
        purchase,
      });
    }
  } catch (error: any) {
    console.error("[Content Purchase Free Claim Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process free claim." },
      { status: 500 }
    );
  }
}
