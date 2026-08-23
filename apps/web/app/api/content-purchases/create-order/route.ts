import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import { razorpayClient } from "@/lib/razorpay";
import { createCashfreeOrder, getCashfreeConfig } from "@/lib/cashfree";
import { getActivePaymentGateway } from "@/lib/payment-gateway";

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
    const { contentType: rawContentType, contentId, countryCode, preferredGateway } = body;
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
          { error: "This video is not available for purchase." },
          { status: 400 }
        );
      }

      organizationId = video.organizationId;
      contentTitle = video.title;
      targetPrice = video.price || 0;
      targetCurrency = video.currency || "USD";
      internalId = video.id;

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
          videoId: video.id,
          status: "COMPLETED",
        },
      });

      if (existingPurchase) {
        return NextResponse.json({
          alreadyPurchased: true,
          message: "You have already purchased this video.",
          purchase: existingPurchase,
        });
      }

      // Check if user purchased playlist containing this video
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
            alreadyPurchased: true,
            message: "You have unlocked this video via a purchased playlist.",
            purchase: existingPlaylistPurchase,
          });
        }
      }
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
          { error: "This meeting is not available for purchase." },
          { status: 400 }
        );
      }

      organizationId = meeting.organizationId;
      contentTitle = meeting.title;
      targetPrice = meeting.price || 0;
      targetCurrency = meeting.currency || "USD";
      internalId = meeting.id;

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

      // Check if host
      if (meeting.createdById === userId) {
        return NextResponse.json({
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
          alreadyPurchased: true,
          message: "You have already purchased an entry pass for this meeting.",
          purchase: existingPurchase,
        });
      }
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
          { error: "This playlist is not available for purchase." },
          { status: 400 }
        );
      }

      organizationId = playlist.organizationId;
      contentTitle = playlist.title;
      targetPrice = playlist.price || 0;
      targetCurrency = playlist.currency || "USD";
      internalId = playlist.id;

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
          playlistId: playlist.id,
          status: "COMPLETED",
        },
      });

      if (existingPurchase) {
        return NextResponse.json({
          alreadyPurchased: true,
          message: "You have already purchased this playlist.",
          purchase: existingPurchase,
        });
      }
    }

    if (targetPrice <= 0) {
      return NextResponse.json(
        { error: "This content is marked as free and does not require payment." },
        { status: 400 }
      );
    }

    const activeGateway =
      preferredGateway === "cashfree" || preferredGateway === "razorpay"
        ? preferredGateway
        : getActivePaymentGateway();

    const buyerUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    // 1. CASHFREE GATEWAY
    if (activeGateway === "cashfree") {
      const cfConfig = getCashfreeConfig();
      const orderId = `cf_ord_buy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const cfOrder = await createCashfreeOrder({
        orderId,
        orderAmount: targetPrice,
        orderCurrency: targetCurrency === "INR" ? "INR" : "USD",
        customer: {
          customer_id: userId,
          customer_name: buyerUser?.name || "Content Buyer",
          customer_email: buyerUser?.email || "buyer@example.com",
          customer_phone: "9999999999",
        },
        notes: {
          contentType,
          contentId: internalId,
          organizationId,
          userId,
          countryCode: countryCode || "GLOBAL",
        },
      });

      return NextResponse.json({
        gateway: "cashfree",
        orderId: cfOrder.order_id,
        cfOrderId: cfOrder.cf_order_id,
        paymentSessionId: cfOrder.payment_session_id,
        cfEnv: cfConfig.env === "PRODUCTION" ? "production" : "sandbox",
        amount: targetPrice,
        currency: targetCurrency,
        contentTitle,
        contentType,
        contentId: internalId,
        countryCode,
      });
    }

    // 2. RAZORPAY GATEWAY (Default)
    const amountInSubunits = Math.round(targetPrice * 100);
    const rzpOrder = await razorpayClient.orders.create({
      amount: amountInSubunits,
      currency: targetCurrency,
      receipt: `rcpt_buy_${Date.now().toString().slice(-8)}`,
      notes: {
        contentType,
        contentId: internalId,
        organizationId,
        userId,
        countryCode: countryCode || "GLOBAL",
      },
    });

    return NextResponse.json({
      gateway: "razorpay",
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "rzp_test_example12345",
      orderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      contentTitle,
      contentType,
      contentId: internalId,
      countryCode,
      prefill: {
        name: buyerUser?.name || "",
        email: buyerUser?.email || "",
      },
    });
  } catch (error: any) {
    console.error("[Content Purchase create-order Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initialize payment gateway order." },
      { status: 500 }
    );
  }
}
