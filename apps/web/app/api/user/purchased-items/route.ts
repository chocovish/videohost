import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { authenticateRequest } from "@/lib/api-auth";
import { getPresignedPlaybackUrl } from "@/lib/s3";
import { db } from "@videohost/db";
import { getBaseUrl } from "@/lib/utils";

export async function GET(req: Request) {
  let userId: string | null = null;

  // 1. Try API auth context
  const authCtx = await authenticateRequest(req);
  if (authCtx?.userId) {
    userId = authCtx.userId;
  } else {
    // 2. Fall back to NextAuth session
    const session = await auth();
    if (session?.user?.id) {
      userId = session.user.id;
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userRecord = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    const userEmail = userRecord?.email?.toLowerCase().trim();

    // Retroactively link any guest appointments booked with this user's email
    if (userEmail) {
      try {
        await db.appointment.updateMany({
          where: {
            clientEmail: userEmail,
            clientId: null,
          },
          data: {
            clientId: userId,
          },
        });
      } catch (err) {
        console.error("Error linking guest appointments:", err);
      }
    }

    // 1. Fetch user's appointments (booked 1:1 sessions)
    const userAppointments = await db.appointment.findMany({
      where: {
        OR: [
          { clientId: userId },
          ...(userEmail ? [{ clientEmail: userEmail }] : []),
        ],
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
        offering: true,
        host: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
        meeting: true,
        purchases: true,
        rescheduleRequests: {
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { scheduledStart: "desc" },
    });

    // 2. Fetch completed content purchases
    const rawPurchases = await db.contentPurchase.findMany({
      where: {
        userId,
        status: "COMPLETED",
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
        video: {
          include: {
            renditions: true,
          },
        },
        playlist: {
          include: {
            items: {
              orderBy: { order: "asc" },
              include: {
                video: {
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    durationSeconds: true,
                    thumbnailKey: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
        meeting: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                image: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const baseUrl = getBaseUrl();
    const matchedPurchaseIds = new Set<string>();

    // Process user appointments
    const formattedAppointments = await Promise.all(
      userAppointments.map(async (appt) => {
        // Find if an associated ContentPurchase exists
        const matchingPurchase =
          appt.purchases?.[0] ||
          rawPurchases.find(
            (p) =>
              (p.appointmentId && p.appointmentId === appt.id) ||
              (p.meetingId && appt.meetingId && p.meetingId === appt.meetingId)
          );

        if (matchingPurchase) {
          matchedPurchaseIds.add(matchingPurchase.id);
        }

        let hostImage = appt.host?.image || null;
        if (hostImage && !hostImage.startsWith("http")) {
          try {
            hostImage = await getPresignedPlaybackUrl(hostImage);
          } catch (e) {
            console.error("Error signing host avatar in appointments:", e);
          }
        }

        let orgLogoUrl: string | null = null;
        if (appt.organization?.logoUrl) {
          try {
            orgLogoUrl = await getPresignedPlaybackUrl(appt.organization.logoUrl);
          } catch (e) {
            console.error("Error signing org logo URL in appointments:", e);
          }
        }

        const joinUrl =
          appt.joinUrl ||
          (appt.meetingId ? `/meet/${appt.meetingId}` : `/dashboard/appointments`);
        const shareUrl = appt.offering
          ? `${baseUrl}/share/${appt.offering.slug || appt.offering.id}`
          : "";

        return {
          id: matchingPurchase?.id || appt.id,
          contentType: "APPOINTMENT" as const,
          contentId: appt.id,
          title: appt.offering?.title || "1:1 Appointment",
          description: appt.offering?.description || appt.clientNotes || null,
          thumbnailUrl: hostImage,
          durationSeconds: appt.durationMinutes ? appt.durationMinutes * 60 : null,
          itemCount: null,
          playlistVideos: [],
          appointmentInfo: {
            id: appt.id,
            offeringId: (appt as any).offering?.id || null,
            offeringTitle: appt.offering?.title || "1:1 Appointment",
            scheduledStart: appt.scheduledStart ? appt.scheduledStart.toISOString() : null,
            scheduledEnd: appt.scheduledEnd ? appt.scheduledEnd.toISOString() : null,
            durationMinutes: appt.durationMinutes,
            timezone: appt.timezone,
            status: appt.status,
            hostName: appt.host?.name || "Host",
            hostImage,
            hostEmail: appt.host?.email || null,
            clientName: appt.clientName,
            clientEmail: appt.clientEmail,
            meetingId: appt.meetingId,
            joinUrl,
            rescheduleCount: (appt as any).rescheduleCount ?? 0,
            pendingReschedule: ((appt as any).rescheduleRequests?.[0] as any)
              ? {
                  id: ((appt as any).rescheduleRequests[0] as any).id,
                  proposedStart: ((appt as any).rescheduleRequests[0] as any).proposedStart.toISOString(),
                  proposedEnd: ((appt as any).rescheduleRequests[0] as any).proposedEnd.toISOString(),
                  timezone: ((appt as any).rescheduleRequests[0] as any).timezone,
                  reason: ((appt as any).rescheduleRequests[0] as any).reason,
                  proposedByRole: ((appt as any).rescheduleRequests[0] as any).proposedByRole,
                  proposedByName: ((appt as any).rescheduleRequests[0] as any).proposedByName,
                  createdAt: ((appt as any).rescheduleRequests[0] as any).createdAt.toISOString(),
                }
              : null,
          },
          meetingInfo: {
            scheduledStart: appt.scheduledStart ? appt.scheduledStart.toISOString() : null,
            scheduledEnd: appt.scheduledEnd ? appt.scheduledEnd.toISOString() : null,
            status: appt.status,
            isInstant: false,
            recordOnStart: false,
            hostName: appt.host?.name || "Host",
            hostImage,
            joinUrl,
          },
          shareUrl,
          amount: matchingPurchase?.amount ?? appt.offering?.price ?? 0,
          currency: matchingPurchase?.currency || appt.offering?.currency || "USD",
          countryCode: matchingPurchase?.countryCode || null,
          paymentMethod:
            matchingPurchase?.paymentMethod ||
            (matchingPurchase ? "ONLINE" : "FREE"),
          paymentId: matchingPurchase?.paymentId || null,
          status: appt.status === "CONFIRMED" ? "COMPLETED" : appt.status,
          purchasedAt: (matchingPurchase?.createdAt || appt.createdAt).toISOString(),
          organization: {
            id: appt.organization.id,
            name: appt.organization.name,
            slug: appt.organization.slug,
            logoUrl: orgLogoUrl,
          },
        };
      })
    );

    // Process remaining standard content purchases
    const remainingPurchases = rawPurchases.filter(
      (p) => !matchedPurchaseIds.has(p.id) && p.contentType !== "APPOINTMENT"
    );

    const formattedPurchases = await Promise.all(
      remainingPurchases.map(async (purchase) => {
        const isVideo = purchase.contentType === "VIDEO";
        const isPlaylist = purchase.contentType === "PLAYLIST";
        const isMeeting = purchase.contentType === "MEETING";

        let title = "Unknown Item";
        let description: string | null = null;
        let thumbnailUrl: string | null = null;
        let durationSeconds: number | null = null;
        let itemCount: number | null = null;
        let playlistVideos: Array<{
          id: string;
          title: string;
          durationSeconds: number | null;
          thumbnailUrl: string | null;
        }> = [];

        let meetingInfo: any = null;

        if (isVideo && purchase.video) {
          title = purchase.video.title;
          description = purchase.video.description;
          durationSeconds = purchase.video.durationSeconds;
          if (purchase.video.thumbnailKey) {
            try {
              thumbnailUrl = await getPresignedPlaybackUrl(purchase.video.thumbnailKey);
            } catch (e) {
              console.error("Error signing video thumbnail URL in purchases route:", e);
            }
          }
        } else if (isPlaylist && purchase.playlist) {
          title = purchase.playlist.title;
          description = purchase.playlist.description;
          itemCount = purchase.playlist.items?.length || 0;

          // Compute total duration for playlist
          durationSeconds = purchase.playlist.items.reduce(
            (acc, it) => acc + (it.video?.durationSeconds || 0),
            0
          );

          // Get first video thumbnail as default playlist thumbnail
          const firstThumbKey = purchase.playlist.items[0]?.video?.thumbnailKey;
          if (firstThumbKey) {
            try {
              thumbnailUrl = await getPresignedPlaybackUrl(firstThumbKey);
            } catch (e) {
              console.error("Error signing playlist thumbnail URL in purchases route:", e);
            }
          }

          // Map top items for quick preview
          playlistVideos = await Promise.all(
            purchase.playlist.items.slice(0, 10).map(async (it) => ({
              id: it.video.id,
              title: it.video.title,
              durationSeconds: it.video.durationSeconds,
              thumbnailUrl: it.video.thumbnailKey
                ? await getPresignedPlaybackUrl(it.video.thumbnailKey)
                : null,
            }))
          );
        } else if (isMeeting && purchase.meeting) {
          title = purchase.meeting.title;
          description = purchase.meeting.description;

          let hostImage = purchase.meeting.createdBy?.image || null;
          if (hostImage && !hostImage.startsWith("http")) {
            try {
              hostImage = await getPresignedPlaybackUrl(hostImage);
            } catch (e) {
              console.error("Error signing host avatar in purchases route:", e);
            }
          }
          thumbnailUrl = hostImage;

          meetingInfo = {
            scheduledStart: purchase.meeting.scheduledStart ? purchase.meeting.scheduledStart.toISOString() : null,
            scheduledEnd: purchase.meeting.scheduledEnd ? purchase.meeting.scheduledEnd.toISOString() : null,
            status: purchase.meeting.status,
            isInstant: purchase.meeting.isInstant,
            recordOnStart: purchase.meeting.recordOnStart,
            hostName: purchase.meeting.createdBy?.name || "Host",
            hostImage,
            joinUrl: `/meet/${purchase.meeting.id}`,
          };
        }

        let orgLogoUrl: string | null = null;
        if (purchase.organization?.logoUrl) {
          try {
            orgLogoUrl = await getPresignedPlaybackUrl(purchase.organization.logoUrl);
          } catch (e) {
            console.error("Error signing org logo URL in purchases route:", e);
          }
        }

        const shareUrl = isVideo && purchase.videoId
          ? `${baseUrl}/share/${purchase.videoId}`
          : isPlaylist && purchase.playlistId
          ? `${baseUrl}/share/${purchase.playlistId}`
          : isMeeting && purchase.meetingId
          ? `${baseUrl}/share/${purchase.meetingId}`
          : "";

        return {
          id: purchase.id,
          contentType: purchase.contentType as "VIDEO" | "PLAYLIST" | "MEETING",
          contentId: purchase.videoId || purchase.playlistId || purchase.meetingId || "",
          title,
          description,
          thumbnailUrl,
          durationSeconds,
          itemCount,
          playlistVideos,
          appointmentInfo: null,
          meetingInfo,
          shareUrl,
          amount: purchase.amount,
          currency: purchase.currency || "USD",
          countryCode: purchase.countryCode,
          paymentMethod: purchase.paymentMethod || "CARD",
          paymentId: purchase.paymentId,
          status: purchase.status,
          purchasedAt: purchase.createdAt.toISOString(),
          organization: {
            id: purchase.organization.id,
            name: purchase.organization.name,
            slug: purchase.organization.slug,
            logoUrl: orgLogoUrl,
          },
        };
      })
    );

    const allItems = [...formattedAppointments, ...formattedPurchases].sort(
      (a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()
    );

    // Calculate aggregated stats
    const totalPurchases = allItems.length;
    const totalVideos = allItems.filter((p) => p.contentType === "VIDEO").length;
    const totalPlaylists = allItems.filter((p) => p.contentType === "PLAYLIST").length;
    const totalMeetings = allItems.filter((p) => p.contentType === "MEETING").length;
    const totalAppointments = allItems.filter((p) => p.contentType === "APPOINTMENT").length;

    const totalSpentByCurrency: Record<string, number> = {};
    for (const p of allItems) {
      const curr = p.currency || "USD";
      totalSpentByCurrency[curr] = (totalSpentByCurrency[curr] || 0) + (p.amount || 0);
    }

    return NextResponse.json({
      success: true,
      purchases: allItems,
      stats: {
        totalPurchases,
        totalVideos,
        totalPlaylists,
        totalMeetings,
        totalAppointments,
        totalSpentByCurrency,
      },
    });
  } catch (error: any) {
    console.error("GET /api/user/purchased-items error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch purchased items" },
      { status: 500 }
    );
  }
}
