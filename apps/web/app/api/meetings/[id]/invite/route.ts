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

    const meeting = await db.meeting.findUnique({
      where: { id },
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
    const joinUrl = `${baseUrl}/meet/${meeting.id}`;

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
    }

    // Concurrently await and dispatch emails
    const sendResults = await Promise.allSettled(
      validEmails.map((email) =>
        sendMeetingInvitationEmail({
          toEmail: email,
          hostName: senderName,
          meetingTitle: meeting.title,
          meetingDescription: meeting.description,
          scheduledStart: meeting.scheduledStart,
          scheduledEnd: meeting.scheduledEnd,
          joinUrl,
          meetingId: meeting.id,
          organizationName: meeting.organization?.name || "Taped",
        })
      )
    );

    const successfulSends = sendResults.filter((r) => r.status === "fulfilled");
    const failedSends = sendResults.filter((r): r is PromiseRejectedResult => r.status === "rejected");

    if (failedSends.length > 0) {
      console.error(
        "Some meeting invite emails failed to deliver:",
        failedSends.map((f) => f.reason instanceof Error ? f.reason.message : String(f.reason))
      );
    }

    if (successfulSends.length === 0 && validEmails.length > 0) {
      const firstError = failedSends[0]?.reason instanceof Error ? failedSends[0].reason.message : String(failedSends[0]?.reason || "Failed to deliver invite email");
      return NextResponse.json(
        {
          error: `Failed to deliver invitation email: ${firstError}`,
          count: validEmails.length,
          sentCount: 0,
          failedCount: failedSends.length,
          invites: createdInvites,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Invitations sent to ${successfulSends.length} recipient(s)${failedSends.length > 0 ? ` (${failedSends.length} delivery failed)` : ""}`,
      count: validEmails.length,
      sentCount: successfulSends.length,
      failedCount: failedSends.length,
      invites: createdInvites,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to send meeting invites";
    console.error("POST /api/meetings/[id]/invite error:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
