import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import { razorpayClient } from "@/lib/razorpay";
import { createCashfreeOrder, getCashfreeConfig } from "@/lib/cashfree";
import { getActivePaymentGateway } from "@/lib/payment-gateway";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: "LOGIN_REQUIRED", message: "You must be signed in to purchase an appointment." },
        { status: 401 }
      );
    }

    const clientId = session.user.id;
    const clientEmail = session.user.email.toLowerCase().trim();

    const offering = await db.appointmentOffering.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        isPublished: true,
      },
      include: {
        organization: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!offering) {
      return NextResponse.json(
        { error: "Appointment offering not found or is unpublished" },
        { status: 404 }
      );
    }

    if (offering.price <= 0) {
      return NextResponse.json({
        isFree: true,
        message: "This session is free and does not require payment initialization.",
      });
    }

    const body = await req.json();
    const {
      scheduledStart,
      scheduledEnd,
      clientName: rawClientName,
      clientNotes,
      timezone = "UTC",
      preferredGateway,
      countryCode,
    } = body;

    const clientName =
      (typeof rawClientName === "string" && rawClientName.trim()) ||
      session.user.name ||
      "Client";

    if (!scheduledStart || !scheduledEnd) {
      return NextResponse.json({ error: "Appointment time slot is required" }, { status: 400 });
    }

    const startDate = new Date(scheduledStart);
    const endDate = new Date(scheduledEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid start or end time format" }, { status: 400 });
    }

    if (startDate.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "Appointment must be scheduled in the future" },
        { status: 400 }
      );
    }

    // Check collision with existing confirmed appointments
    const overlapping = await db.appointment.findFirst({
      where: {
        organizationId: offering.organizationId,
        hostId: offering.createdById,
        status: "CONFIRMED",
        scheduledStart: { lt: endDate },
        scheduledEnd: { gt: startDate },
      },
    });

    if (overlapping) {
      return NextResponse.json(
        { error: "This time slot was just booked by someone else. Please choose another slot." },
        { status: 409 }
      );
    }

    const activeGateway =
      preferredGateway === "cashfree" || preferredGateway === "razorpay"
        ? preferredGateway
        : getActivePaymentGateway();

    let targetPrice = offering.price;
    let targetCurrency = offering.currency || "USD";

    // Check country pricing override
    if (countryCode && Array.isArray(offering.countryPricing)) {
      const countryRule = (offering.countryPricing as any[]).find(
        (c) => c.countryCode?.toUpperCase() === String(countryCode).toUpperCase()
      );
      if (countryRule && countryRule.amount !== undefined) {
        targetPrice = Number(countryRule.amount);
        if (countryRule.currency) targetCurrency = countryRule.currency;
      }
    }

    if (targetPrice <= 0) {
      return NextResponse.json({
        isFree: true,
        message: "This session is free and does not require payment initialization.",
      });
    }

    // 1. CASHFREE GATEWAY
    if (activeGateway === "cashfree") {
      const cfConfig = getCashfreeConfig();
      const orderId = `cf_apt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const cfOrder = await createCashfreeOrder({
        orderId,
        orderAmount: targetPrice,
        orderCurrency: targetCurrency === "INR" ? "INR" : "USD",
        customer: {
          customer_id: `user_${clientId.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30)}`,
          customer_name: clientName,
          customer_email: clientEmail,
          customer_phone: "9999999999",
        },
        notes: {
          offeringId: offering.id,
          clientId,
          scheduledStart,
          scheduledEnd,
          clientName,
          clientEmail,
          countryCode: countryCode ? String(countryCode) : "",
        },
      });

      return NextResponse.json({
        gateway: "cashfree",
        orderId: cfOrder.order_id,
        paymentSessionId: cfOrder.payment_session_id,
        cfEnv: cfConfig.env === "PRODUCTION" ? "production" : "sandbox",
        amount: targetPrice,
        currency: targetCurrency,
        offeringTitle: offering.title,
      });
    }

    // 2. RAZORPAY GATEWAY (Default)
    const amountInSubunits = Math.round(targetPrice * 100);
    const rzpOrder = await razorpayClient.orders.create({
      amount: amountInSubunits,
      currency: targetCurrency,
      receipt: `rcpt_apt_${Date.now().toString().slice(-8)}`,
      notes: {
        type: "appointment",
        offeringId: offering.id,
        organizationId: offering.organizationId,
        hostId: offering.createdById,
        clientId,
        clientName,
        clientEmail,
        scheduledStart,
        scheduledEnd,
        timezone,
        countryCode: countryCode ? String(countryCode) : "",
      },
    });

    const keyId =
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
      process.env.RAZORPAY_KEY_ID ||
      "rzp_test_example12345";

    return NextResponse.json({
      gateway: "razorpay",
      key: keyId,
      orderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      offeringTitle: offering.title,
      prefill: {
        name: clientName.trim(),
        email: clientEmail.trim().toLowerCase(),
      },
    });
  } catch (error: any) {
    console.error("[POST /api/public/book/[id]/payment-order Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initialize payment order for appointment." },
      { status: 500 }
    );
  }
}

