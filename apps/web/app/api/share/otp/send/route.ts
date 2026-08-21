import { NextResponse } from "next/server";
import { db } from "@videohost/db";
import { generateShareOtp } from "@/lib/share-otp";
import { sendShareOtpEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const { token, email } = await req.json();

    if (!token || !email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Token and email are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // 1. Find Video
    let video = await db.video.findUnique({
      where: { id: token },
      include: {
        organization: true,
        sharedEmails: true,
      },
    });

    let folder: any = null;
    let playlist: any = null;

    if (!video) {
      // 2. Find Folder
      folder = await db.folder.findUnique({
        where: { id: token },
        include: {
          organization: true,
          sharedEmails: true,
        },
      });
    }

    if (!video && !folder) {
      // 3. Find Playlist
      playlist = await db.playlist.findUnique({
        where: { id: token },
        include: {
          organization: true,
          sharedEmails: true,
        },
      });
    }

    if (!video && !folder && !playlist) {
      return NextResponse.json(
        { error: "Shared item not found or has expired." },
        { status: 404 }
      );
    }

    const item = video || folder || playlist;
    const isVideo = Boolean(video);
    const isPlaylist = Boolean(playlist);
    const targetType: "video" | "folder" | "playlist" = isVideo ? "video" : isPlaylist ? "playlist" : "folder";
    const itemTitle = isVideo ? video!.title : isPlaylist ? playlist!.title : folder!.name;

    if (item.shareAccessMode !== "RESTRICTED") {
      return NextResponse.json(
        { error: "One-time code verification is only applicable to restricted content." },
        { status: 400 }
      );
    }

    // Check if email is in the allowed sharedEmails list
    const isEmailAllowed = item.sharedEmails.some(
      (se: { email: string }) => se.email.toLowerCase() === normalizedEmail
    );

    // Also check if email belongs to an organization member
    let isOrgMember = false;
    const memberUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (memberUser) {
      const member = await db.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: item.organizationId,
            userId: memberUser.id,
          },
        },
      });
      if (member) isOrgMember = true;
    }

    if (!isEmailAllowed && !isOrgMember) {
      return NextResponse.json(
        {
          error: "EMAIL_NOT_AUTHORIZED",
          message: "This email address is not in the invited viewer list for this content.",
        },
        { status: 403 }
      );
    }

    // Generate 6-digit OTP code
    const otpCode = await generateShareOtp(normalizedEmail, token);

    // Send email
    try {
      await sendShareOtpEmail({
        toEmail: normalizedEmail,
        otpCode,
        targetTitle: itemTitle,
        organizationName: item.organization.name,
        targetType,
      });
    } catch (mailErr) {
      console.error("[sendShareOtpEmail Error]:", mailErr);
      return NextResponse.json(
        { error: "Failed to send access code email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `A 6-digit access code has been sent to ${normalizedEmail}.`,
    });
  } catch (error: any) {
    console.error("[OTP Send Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
