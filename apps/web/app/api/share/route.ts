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
    const targetType = searchParams.get("targetType") as "video" | "folder" | "playlist" | null;
    const targetId = searchParams.get("targetId");

    if (!targetType || !["video", "folder", "playlist"].includes(targetType) || !targetId) {
      return NextResponse.json(
        { error: "Invalid parameters. Required: targetType ('video'|'folder'|'playlist') and targetId." },
        { status: 400 }
      );
    }

    let targetTitle = "";
    let accessMode: "PUBLIC" | "RESTRICTED" | "PRIVATE" = "PUBLIC";
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
      accessMode = video.shareAccessMode;
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
      accessMode = playlist.shareAccessMode;
      allowedEmails = playlist.sharedEmails;
    } else {
      const folder = await db.folder.findFirst({
        where: { id: targetId, organizationId: authCtx.orgId },
        include: { sharedEmails: { orderBy: { createdAt: "desc" } } },
      });
      if (!folder) {
        return NextResponse.json({ error: "Folder not found in organization" }, { status: 404 });
      }
      targetTitle = folder.name;
      accessMode = folder.shareAccessMode;
      allowedEmails = folder.sharedEmails;
    }

    const baseUrl = process.env.APP_URL || "http://localhost:3000";
    const shareUrl = `${baseUrl}/share/${targetId}`;

    return NextResponse.json({
      success: true,
      id: targetId,
      shareUrl,
      accessMode,
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
    const { action, targetType, targetId, accessMode, email, emailId, message } = body;

    if (!targetType || !["video", "folder", "playlist"].includes(targetType) || !targetId) {
      return NextResponse.json(
        { error: "Invalid parameters. Required: targetType ('video'|'folder'|'playlist'), targetId." },
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
    let currentAccessMode: "PUBLIC" | "RESTRICTED" | "PRIVATE" = "PUBLIC";

    if (targetType === "video") {
      const video = await db.video.findFirst({
        where: { id: targetId, organizationId: authCtx.orgId },
      });
      if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });
      targetTitle = video.title;
      currentAccessMode = video.shareAccessMode;
    } else if (targetType === "playlist") {
      const playlist = await db.playlist.findFirst({
        where: { id: targetId, organizationId: authCtx.orgId },
      });
      if (!playlist) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
      targetTitle = playlist.title;
      currentAccessMode = playlist.shareAccessMode;
    } else {
      const folder = await db.folder.findFirst({
        where: { id: targetId, organizationId: authCtx.orgId },
      });
      if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      targetTitle = folder.name;
      currentAccessMode = folder.shareAccessMode;
    }

    const baseUrl = process.env.APP_URL || "http://localhost:3000";
    const shareUrl = `${baseUrl}/share/${targetId}`;

    // Handle Action 1: UPDATE_MODE
    if (action === "UPDATE_MODE" || accessMode) {
      const validModes = ["PUBLIC", "RESTRICTED", "PRIVATE"];
      const newMode = accessMode && validModes.includes(accessMode) ? accessMode : currentAccessMode;

      if (targetType === "video") {
        await db.video.update({
          where: { id: targetId },
          data: { shareAccessMode: newMode },
        });
      } else if (targetType === "playlist") {
        await db.playlist.update({
          where: { id: targetId },
          data: { shareAccessMode: newMode },
        });
      } else {
        await db.folder.update({
          where: { id: targetId },
          data: { shareAccessMode: newMode },
        });
      }
      currentAccessMode = newMode;
    }

    // Handle Action 2: ADD_EMAIL
    if (action === "ADD_EMAIL" || (email && !emailId && action !== "REMOVE_EMAIL")) {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes("@")) {
        return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
      }

      // Upsert into SharedEmail table
      await db.sharedEmail.upsert({
        where:
          targetType === "video"
            ? { videoId_email: { videoId: targetId, email: cleanEmail } }
            : targetType === "playlist"
            ? { playlistId_email: { playlistId: targetId, email: cleanEmail } }
            : { folderId_email: { folderId: targetId, email: cleanEmail } },
        create: {
          videoId: targetType === "video" ? targetId : null,
          playlistId: targetType === "playlist" ? targetId : null,
          folderId: targetType === "folder" ? targetId : null,
          email: cleanEmail,
        },
        update: {},
      });

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
          await db.folder.update({
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
          targetType: targetType as "video" | "folder" | "playlist",
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
              : targetType === "playlist"
              ? { playlistId: targetId, email: cleanEmail }
              : { folderId: targetId, email: cleanEmail },
        });
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
    } else if (targetType === "playlist") {
      const p = await db.playlist.findUnique({
        where: { id: targetId },
        include: { sharedEmails: { orderBy: { createdAt: "desc" } } },
      });
      allowedEmails = p?.sharedEmails || [];
    } else {
      const f = await db.folder.findUnique({
        where: { id: targetId },
        include: { sharedEmails: { orderBy: { createdAt: "desc" } } },
      });
      allowedEmails = f?.sharedEmails || [];
    }

    return NextResponse.json({
      success: true,
      shareUrl,
      accessMode: currentAccessMode,
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
