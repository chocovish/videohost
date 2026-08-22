import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { getCashfreeOrder, getCashfreeOrderPayments } from "@/lib/cashfree";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "LOGIN_REQUIRED", message: "You must be signed in to complete purchase." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const {
      gateway,
      contentType,
      contentId,
      countryCode,
      // Razorpay parameters
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      // Cashfree parameters
      order_id,
      cf_order_id,
    } = body;

    if (!contentType || !["video", "playlist"].includes(contentType) || !contentId) {
      return NextResponse.json(
        { error: "Invalid parameters. Required contentType and contentId." },
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
      });

      if (!video) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 });
      }

      organizationId = video.organizationId;
      contentTitle = video.title;
      targetPrice = video.price || 0;
      targetCurrency = video.currency || "USD";
      internalId = video.id;

      if (countryCode && Array.isArray(video.countryPricing)) {
        const countryRule = (video.countryPricing as any[]).find(
          (c) => c.countryCode?.toUpperCase() === countryCode.toUpperCase()
        );
        if (countryRule && countryRule.amount !== undefined) {
          targetPrice = Number(countryRule.amount);
          if (countryRule.currency) targetCurrency = countryRule.currency;
        }
      }
    } else {
      const playlist = await db.playlist.findUnique({
        where: { id: contentId },
      });

      if (!playlist) {
        return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
      }

      organizationId = playlist.organizationId;
      contentTitle = playlist.title;
      targetPrice = playlist.price || 0;
      targetCurrency = playlist.currency || "USD";
      internalId = playlist.id;

      if (countryCode && Array.isArray(playlist.countryPricing)) {
        const countryRule = (playlist.countryPricing as any[]).find(
          (c) => c.countryCode?.toUpperCase() === countryCode.toUpperCase()
        );
        if (countryRule && countryRule.amount !== undefined) {
          targetPrice = Number(countryRule.amount);
          if (countryRule.currency) targetCurrency = countryRule.currency;
        }
      }
    }

    let verifiedPaymentId = "";
    let paymentProvider = "RAZORPAY";

    // 1. CASHFREE GATEWAY VERIFICATION
    if (gateway === "cashfree" || (!razorpay_order_id && Boolean(order_id || cf_order_id))) {
      const targetOrderId = order_id || cf_order_id;
      if (!targetOrderId) {
        return NextResponse.json(
          { error: "Missing Cashfree order_id for payment verification." },
          { status: 400 }
        );
      }

      let cfOrder = await getCashfreeOrder(targetOrderId).catch(() => null);
      const payments = await getCashfreeOrderPayments(targetOrderId).catch(() => []);
      const successfulPayment = payments.find((p) => p.payment_status === "SUCCESS");

      const isPaid = cfOrder?.order_status === "PAID" || Boolean(successfulPayment);
      if (!isPaid) {
        return NextResponse.json(
          { error: `Payment not completed. Status: ${cfOrder?.order_status || "PENDING"}` },
          { status: 400 }
        );
      }

      verifiedPaymentId =
        successfulPayment?.cf_payment_id ||
        cfOrder?.cf_order_id ||
        String(targetOrderId);
      paymentProvider = "CASHFREE";
    } else {
      // 2. RAZORPAY GATEWAY VERIFICATION
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return NextResponse.json(
          { error: "Missing required Razorpay payment signature parameters." },
          { status: 400 }
        );
      }

      const isValid = verifyRazorpaySignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      });

      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid payment signature. Payment verification failed." },
          { status: 400 }
        );
      }

      verifiedPaymentId = razorpay_payment_id;
      paymentProvider = "RAZORPAY";
    }

    // Check if purchase record already created to prevent duplicate entries
    const existing = await db.contentPurchase.findFirst({
      where: {
        userId,
        contentType: contentType === "video" ? "VIDEO" : "PLAYLIST",
        ...(contentType === "video" ? { videoId: internalId } : { playlistId: internalId }),
        status: "COMPLETED",
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: `You own access to "${contentTitle}".`,
        purchase: existing,
      });
    }

    // Create Verified Purchase Record
    const purchase = await db.contentPurchase.create({
      data: {
        organizationId,
        userId,
        contentType: contentType === "video" ? "VIDEO" : "PLAYLIST",
        videoId: contentType === "video" ? internalId : null,
        playlistId: contentType === "playlist" ? internalId : null,
        amount: targetPrice,
        currency: targetCurrency,
        countryCode: countryCode ? countryCode.toUpperCase() : null,
        paymentMethod: paymentProvider,
        paymentId: verifiedPaymentId,
        status: "COMPLETED",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Payment verified! Successfully unlocked "${contentTitle}"!`,
      purchase,
    });
  } catch (error: any) {
    console.error("[Content Purchase verify Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify content purchase payment." },
      { status: 500 }
    );
  }
}
