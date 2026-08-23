import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import { sendMeetingInvitationEmail } from "@/lib/mail";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !(session as any).organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (session as any).organizationId;
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all"; // "upcoming" | "past" | "active" | "all"

    const now = new Date();

    let whereClause: any = { organizationId: orgId };
    if (filter === "upcoming") {
      whereClause = {
        organizationId: orgId,
        status: { in: ["SCHEDULED", "ACTIVE"] },
      };
    } else if (filter === "past") {
      whereClause = {
        organizationId: orgId,
        status: { in: ["ENDED", "CANCELLED"] },
      };
    } else if (filter === "active") {
      whereClause = {
        organizationId: orgId,
        status: "ACTIVE",
      };
    }

    const organization = await db.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        plan: { select: { id: true, name: true } },
      },
    });

    const isFreePlan = (organization?.plan?.name?.toLowerCase() || "free") === "free";

    const meetings = await db.meeting.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        invites: true,
        recordedVideo: {
          select: { id: true, title: true, status: true, durationSeconds: true, thumbnailKey: true },
        },
        folder: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            purchases: {
              where: { status: "COMPLETED" },
            },
          },
        },
      },
      orderBy: [
        { status: "asc" },
        { scheduledStart: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({
      meetings,
      planName: organization?.plan?.name || "free",
      isFreePlan,
    });
  } catch (err: any) {
    console.error("GET /api/meetings error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch meetings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !(session as any).organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (session as any).organizationId;
    const userId = session.user.id;
    const userName = session.user.name || "Host";
    const body = await req.json();

    const {
      title,
      description,
      scheduledStart,
      scheduledEnd,
      isInstant = false,
      recordOnStart = false,
      allowGuests = true,
      inviteEmails = [],
      shareAccessMode = "PUBLIC",
      price,
      currency = "USD",
      countryPricing,
    } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Meeting title is required" }, { status: 400 });
    }

    const isPurchasable = shareAccessMode === "PURCHASABLE" || (price !== undefined && price !== null && Number(price) > 0);
    const parsedPrice = isPurchasable && price !== undefined && price !== null ? parseFloat(String(price)) : null;

    const organization = await db.organization.findUnique({
      where: { id: orgId },
      select: {
        name: true,
        plan: { select: { id: true, name: true } },
      },
    });

    const isFreePlan = (organization?.plan?.name?.toLowerCase() || "free") === "free";
    const finalRecordOnStart = !isFreePlan && Boolean(recordOnStart);
    const orgName = organization?.name || "Taped Organization";

    const meeting = await db.meeting.create({
      data: {
        organizationId: orgId,
        createdById: userId!,
        title: title.trim(),
        description: description?.trim() || null,
        scheduledStart: scheduledStart ? new Date(scheduledStart) : (isInstant ? new Date() : null),
        scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
        isInstant: Boolean(isInstant),
        recordOnStart: finalRecordOnStart,
        allowGuests: Boolean(allowGuests),
        status: isInstant ? "ACTIVE" : "SCHEDULED",
        shareAccessMode: isPurchasable ? "PURCHASABLE" : (shareAccessMode as any || "PUBLIC"),
        price: parsedPrice,
        currency: currency || "USD",
        countryPricing: Array.isArray(countryPricing) ? countryPricing : undefined,
        invites: {
          create: Array.isArray(inviteEmails)
            ? inviteEmails
                .filter((email: string) => email && email.includes("@"))
                .map((email: string) => ({
                  email: email.trim().toLowerCase(),
                  role: "attendee",
                  status: "pending",
                }))
            : [],
        },
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        invites: true,
        _count: {
          select: {
            purchases: {
              where: { status: "COMPLETED" },
            },
          },
        },
      },
    });

    // Send invitation emails asynchronously
    const baseUrl = process.env.APP_URL || "http://localhost:3000";
    const joinUrl = `${baseUrl}/meet/${meeting.id}`;

    if (Array.isArray(inviteEmails) && inviteEmails.length > 0) {
      for (const rawEmail of inviteEmails) {
        const email = rawEmail.trim().toLowerCase();
        if (email && email.includes("@")) {
          sendMeetingInvitationEmail({
            toEmail: email,
            hostName: userName,
            meetingTitle: meeting.title,
            meetingDescription: meeting.description,
            scheduledStart: meeting.scheduledStart,
            scheduledEnd: meeting.scheduledEnd,
            joinUrl,
            meetingId: meeting.id,
            organizationName: orgName,
          }).catch((e) => console.error("Error sending invite email:", e));
        }
      }
    }

    return NextResponse.json({ meeting, joinUrl }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/meetings error:", err);
    return NextResponse.json({ error: err.message || "Failed to create meeting" }, { status: 500 });
  }
}
