import { NextResponse } from "next/server";
import { db } from "@videohost/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, category, subject, message } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Full Name is required." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "Email Address is required." },
        { status: 400 }
      );
    }

    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    const inquiry = await (db as any).contactInquiry.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        category: category && typeof category === "string" ? category.trim() : "General Inquiry",
        subject: subject && typeof subject === "string" && subject.trim() ? subject.trim() : null,
        message: message.trim(),
        status: "PENDING",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Your inquiry has been submitted successfully.",
        inquiryId: inquiry.id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[API /api/contact Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to submit contact inquiry. Please try again." },
      { status: 500 }
    );
  }
}
