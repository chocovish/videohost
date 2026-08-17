import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import { sendMeetingInvitationEmail } from "@/lib/mail";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const meeting = await db.meeting.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
      include: {
        organization: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const session = await auth();
    const senderName = session?.user?.name || meeting.createdBy?.name || "Host";

    const { emails } = body;
    const emailList: string[] = Array.isArray(emails)
      ? emails
      : typeof emails === "string"
      ? emails.split(",").map((e: string) => e.trim())
      : [];

    const validEmails = emailList
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && e.includes("@"));

    if (validEmails.length === 0) {
      return NextResponse.json({ error: "No valid email addresses provided" }, { status: 400 });
    }

    const createdInvites = [];
    const baseUrl = process.env.APP_URL || "http://localhost:3000";
    const joinUrl = `${baseUrl}/meet/${meeting.code}`;

    for (const email of validEmails) {
      const invite = await db.meetingInvite.upsert({
        where: {
          meetingId_email: {
            meetingId: meeting.id,
            email,
          },
        },
        update: {
          sentAt: new Date(),
        },
        create: {
          meetingId: meeting.id,
          email,
          role: "attendee",
          status: "pending",
        },
      });
      createdInvites.push(invite);

      // Dispatch email
      sendMeetingInvitationEmail({
        toEmail: email,
        hostName: senderName,
        meetingTitle: meeting.title,
        meetingDescription: meeting.description,
        scheduledStart: meeting.scheduledStart,
        scheduledEnd: meeting.scheduledEnd,
        joinUrl,
        meetingCode: meeting.code,
        organizationName: meeting.organization?.name || "Taped",
      }).catch((err) => console.error("Error sending invite email to", email, err));
    }

    return NextResponse.json({
      success: true,
      message: `Invitations sent to ${validEmails.length} recipient(s)`,
      count: validEmails.length,
      invites: createdInvites,
    });
  } catch (err: any) {
    console.error("POST /api/meetings/[id]/invite error:", err);
    return NextResponse.json({ error: err.message || "Failed to send meeting invites" }, { status: 500 });
  }
}
