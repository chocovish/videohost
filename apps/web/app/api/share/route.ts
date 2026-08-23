import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";
import { sendShareEmail } from "@/lib/mail";

export async function GET(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const targetType = searchParams.get("targetType") as "video" | "playlist" | "meeting" | null;
    const targetId = searchParams.get("targetId");

    if (!targetType || !["video", "playlist", "meeting"].includes(targetType) || !targetId) {
      return NextResponse.json(
        { error: "Invalid parameters. Required: targetType ('video'|'playlist'|'meeting') and targetId." },
        { status: 400 }
      );
    }

    let targetTitle = "";
    let accessMode: "PUBLIC" | "RESTRICTED" | "PRIVATE" | "PURCHASABLE" = "PUBLIC";
    let price: number | null = null;
    let currency = "USD";
    let countryPricing: any[] = [];
    let allowedEmails: any[] = [];

    if (targetType === "video") {
      const video = await db.video.findFirst({
        where: { id: targetId, organizationId: authCtx.orgId },
        include: { sharedEmails: { orderBy: { createdAt: "desc" } } },
      });
      if (!video) {
        return NextResponse.json({ error: "Video not found in organization" }, { status: 404 });
      }
      targetTitle = video.title;
      accessMode = video.shareAccessMode as any;
      price = video.price;
      currency = video.currency || "USD";
      countryPricing = (video.countryPricing as any[]) || [];
      allowedEmails = video.sharedEmails;
    } else if (targetType === "playlist") {
      const playlist = await db.playlist.findFirst({
        where: { id: targetId, organizationId: authCtx.orgId },
        include: { sharedEmails: { orderBy: { createdAt: "desc" } } },
      });
      if (!playlist) {
        return NextResponse.json({ error: "Playlist not found in organization" }, { status: 404 });
      }
      targetTitle = playlist.title;
      accessMode = playlist.shareAccessMode as any;
      price = playlist.price;
      currency = playlist.currency || "USD";
      countryPricing = (playlist.countryPricing as any[]) || [];
      allowedEmails = playlist.sharedEmails;
    } else {
      const meeting = await db.meeting.findFirst({
        where: { id: targetId, organizationId: authCtx.orgId },
        include: { invites: true },
      });
      if (!meeting) {
        return NextResponse.json({ error: "Meeting not found in organization" }, { status: 404 });
      }
      targetTitle = meeting.title;
      accessMode = meeting.shareAccessMode as any;
      price = meeting.price;
      currency = meeting.currency || "USD";
      countryPricing = (meeting.countryPricing as any[]) || [];
      allowedEmails = meeting.invites.map((i) => ({ id: i.id, email: i.email, createdAt: i.sentAt.toISOString() }));
    }

    const baseUrl = process.env.APP_URL || "http://localhost:3000";
    const shareUrl = `${baseUrl}/share/${targetId}`;

    return NextResponse.json({
      success: true,
      id: targetId,
      shareUrl,
      accessMode,
      price,
      currency,
      countryPricing,
      allowedEmails,
      targetType,
      targetId,
      targetTitle,
    });
  } catch (err: any) {
    console.error("[GET /api/share Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch share details" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, targetType, targetId, accessMode, price, currency, countryPricing, email, emailId, message } = body;

    if (!targetType || !["video", "playlist", "meeting"].includes(targetType) || !targetId) {
      return NextResponse.json(
        { error: "Invalid parameters. Required: targetType ('video'|'playlist'|'meeting'), targetId." },
        { status: 400 }
      );
    }

    const org = await db.organization.findUnique({
      where: { id: authCtx.orgId },
      include: { plan: true },
    });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    let targetTitle = "";
    let currentAccessMode: "PUBLIC" | "RESTRICTED" | "PRIVATE" | "PURCHASABLE" = "PUBLIC";
    let currentPrice: number | null = null;
    let currentCurrency = "USD";
    let currentCountryPricing: any[] = [];

    if (targetType === "video") {
      const video = await db.video.findFirst({
        where: { id: targetId, organizationId: authCtx.orgId },
      });
      if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });
      targetTitle = video.title;
      currentAccessMode = video.shareAccessMode as any;
      currentPrice = video.price;
      currentCurrency = video.currency || "USD";
      currentCountryPricing = (video.countryPricing as any[]) || [];
    } else if (targetType === "playlist") {
      const playlist = await db.playlist.findFirst({
        where: { id: targetId, organizationId: authCtx.orgId },
      });
      if (!playlist) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
      targetTitle = playlist.title;
      currentAccessMode = playlist.shareAccessMode as any;
      currentPrice = playlist.price;
      currentCurrency = playlist.currency || "USD";
      currentCountryPricing = (playlist.countryPricing as any[]) || [];
    } else {
      const meeting = await db.meeting.findFirst({
        where: { id: targetId, organizationId: authCtx.orgId },
      });
      if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
      targetTitle = meeting.title;
      currentAccessMode = meeting.shareAccessMode as any;
      currentPrice = meeting.price;
      currentCurrency = meeting.currency || "USD";
      currentCountryPricing = (meeting.countryPricing as any[]) || [];
    }

    const baseUrl = process.env.APP_URL || "http://localhost:3000";
    const shareUrl = `${baseUrl}/share/${targetId}`;

    // Handle Action 1: UPDATE_MODE
    if (action === "UPDATE_MODE" || accessMode) {
      const validModes = ["PUBLIC", "RESTRICTED", "PRIVATE", "PURCHASABLE"];
      const newMode = accessMode && validModes.includes(accessMode) ? accessMode : currentAccessMode;

      const updateData: any = {
        shareAccessMode: newMode,
      };

      if (price !== undefined) {
        updateData.price = price !== null ? parseFloat(price) : null;
      }
      if (currency !== undefined) {
        updateData.currency = currency;
      }
      if (countryPricing !== undefined) {
        updateData.countryPricing = countryPricing;
      }

      if (targetType === "video") {
        await db.video.update({
          where: { id: targetId },
          data: updateData,
        });
      } else if (targetType === "playlist") {
        await db.playlist.update({
          where: { id: targetId },
          data: updateData,
        });
      } else {
        await db.meeting.update({
          where: { id: targetId },
          data: updateData,
        });
      }
      currentAccessMode = newMode;
      if (updateData.price !== undefined) currentPrice = updateData.price;
      if (updateData.currency !== undefined) currentCurrency = updateData.currency;
      if (updateData.countryPricing !== undefined) currentCountryPricing = updateData.countryPricing;
    }

    // Handle Action 2: ADD_EMAIL
    if (action === "ADD_EMAIL" || (email && !emailId && action !== "REMOVE_EMAIL")) {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes("@")) {
        return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
      }

      if (targetType === "meeting") {
        await db.meetingInvite.upsert({
          where: { meetingId_email: { meetingId: targetId, email: cleanEmail } },
          create: { meetingId: targetId, email: cleanEmail, role: "attendee" },
          update: {},
        });
      } else {
        // Upsert into SharedEmail table
        await db.sharedEmail.upsert({
          where:
            targetType === "video"
              ? { videoId_email: { videoId: targetId, email: cleanEmail } }
              : { playlistId_email: { playlistId: targetId, email: cleanEmail } },
          create: {
            videoId: targetType === "video" ? targetId : null,
            playlistId: targetType === "playlist" ? targetId : null,
            email: cleanEmail,
          },
          update: {},
        });
      }

      // Switch mode to RESTRICTED if currently PUBLIC
      if (currentAccessMode === "PUBLIC") {
        currentAccessMode = "RESTRICTED";
        if (targetType === "video") {
          await db.video.update({
            where: { id: targetId },
            data: { shareAccessMode: "RESTRICTED" },
          });
        } else if (targetType === "playlist") {
          await db.playlist.update({
            where: { id: targetId },
            data: { shareAccessMode: "RESTRICTED" },
          });
        } else {
          await db.meeting.update({
            where: { id: targetId },
            data: { shareAccessMode: "RESTRICTED" },
          });
        }
      }

      const user = await db.user.findUnique({
        where: { id: authCtx.userId },
        select: { name: true, email: true },
      });
      const senderName = user?.name || user?.email?.split("@")[0] || "A teammate";

      try {
        await sendShareEmail({
          toEmail: cleanEmail,
          senderName,
          organizationName: org.name,
          targetType: targetType as "video" | "playlist",
          targetTitle,
          shareUrl,
          message: message || undefined,
        });
      } catch (mailErr) {
        console.error("[Share API] Error sending email invite:", mailErr);
      }
    }

    // Handle Action 3: REMOVE_EMAIL
    if (action === "REMOVE_EMAIL" || emailId) {
      if (targetType === "meeting") {
        if (emailId) {
          await db.meetingInvite.deleteMany({ where: { id: emailId } });
        } else if (email) {
          await db.meetingInvite.deleteMany({ where: { meetingId: targetId, email: email.trim().toLowerCase() } });
        }
      } else {
        if (emailId) {
          await db.sharedEmail.deleteMany({
            where: { id: emailId },
          });
        } else if (email) {
          const cleanEmail = email.trim().toLowerCase();
          await db.sharedEmail.deleteMany({
            where:
              targetType === "video"
                ? { videoId: targetId, email: cleanEmail }
                : { playlistId: targetId, email: cleanEmail },
          });
        }
      }
    }

    // Return updated details
    let allowedEmails: any[] = [];
    if (targetType === "video") {
      const v = await db.video.findUnique({
        where: { id: targetId },
        include: { sharedEmails: { orderBy: { createdAt: "desc" } } },
      });
      allowedEmails = v?.sharedEmails || [];
      if (v) {
        currentPrice = v.price;
        currentCurrency = v.currency || "USD";
        currentCountryPricing = (v.countryPricing as any[]) || [];
      }
    } else if (targetType === "playlist") {
      const p = await db.playlist.findUnique({
        where: { id: targetId },
        include: { sharedEmails: { orderBy: { createdAt: "desc" } } },
      });
      allowedEmails = p?.sharedEmails || [];
      if (p) {
        currentPrice = p.price;
        currentCurrency = p.currency || "USD";
        currentCountryPricing = (p.countryPricing as any[]) || [];
      }
    } else {
      const m = await db.meeting.findUnique({
        where: { id: targetId },
        include: { invites: true },
      });
      allowedEmails = (m?.invites || []).map((i) => ({ id: i.id, email: i.email, createdAt: i.sentAt.toISOString() }));
      if (m) {
        currentPrice = m.price;
        currentCurrency = m.currency || "USD";
        currentCountryPricing = (m.countryPricing as any[]) || [];
      }
    }

    return NextResponse.json({
      success: true,
      shareUrl,
      accessMode: currentAccessMode,
      price: currentPrice,
      currency: currentCurrency,
      countryPricing: currentCountryPricing,
      allowedEmails,
      targetType,
      targetId,
      targetTitle,
    });
  } catch (err: any) {
    console.error("[POST /api/share Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to update share settings" }, { status: 500 });
  }
}

