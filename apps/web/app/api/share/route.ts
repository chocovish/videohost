import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";
import { sendShareEmail } from "@/lib/mail";
import crypto from "crypto";

export async function POST(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { targetType, targetId, recipientEmail, message, requireLogin } = body;

    if (!targetType || !["video", "folder"].includes(targetType) || !targetId) {
      return NextResponse.json(
        { error: "Invalid parameters. Required: targetType ('video'|'folder'), targetId." },
        { status: 400 }
      );
    }

    const org = await db.organization.findUnique({
      where: { id: authCtx.orgId },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const user = await db.user.findUnique({
      where: { id: authCtx.userId },
      select: { name: true, email: true },
    });

    const senderName = user?.name || user?.email?.split("@")[0] || "A teammate";
    let targetTitle = "";

    if (targetType === "video") {
      const video = await db.video.findFirst({
        where: { id: targetId, organizationId: authCtx.orgId },
      });
      if (!video) {
        return NextResponse.json({ error: "Video not found in organization" }, { status: 404 });
      }
      targetTitle = video.title;
    } else {
      const folder = await db.folder.findFirst({
        where: { id: targetId, organizationId: authCtx.orgId },
      });
      if (!folder) {
        return NextResponse.json({ error: "Folder not found in organization" }, { status: 404 });
      }
      targetTitle = folder.name;
    }

    const token = crypto.randomBytes(16).toString("hex");

    const sharedLink = await db.sharedLink.create({
      data: {
        token,
        organizationId: authCtx.orgId,
        videoId: targetType === "video" ? targetId : null,
        folderId: targetType === "folder" ? targetId : null,
        recipientEmail: recipientEmail || null,
        message: message || null,
        requireLogin: Boolean(requireLogin),
      },
    });

    const baseUrl = process.env.APP_URL || "http://localhost:3000";
    const shareUrl = `${baseUrl}/share/${sharedLink.token}`;

    // Send notification email if recipientEmail provided
    if (recipientEmail) {
      try {
        await sendShareEmail({
          toEmail: recipientEmail,
          senderName,
          organizationName: org.name,
          targetType: targetType as "video" | "folder",
          targetTitle,
          shareUrl,
          message,
        });
      } catch (mailErr) {
        console.error("[Share API] Error sending email via Nodemailer:", mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      token: sharedLink.token,
      shareUrl,
      message: recipientEmail
        ? `Share link created and sent to ${recipientEmail}`
        : "Share link generated successfully",
    });
  } catch (err: any) {
    console.error("[Share API Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to create share link" }, { status: 500 });
  }
}
