import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@videohost/db";
import { getPlaybackUrl, getPresignedPlaybackUrl } from "@/lib/s3";
import { auth } from "@/lib/auth";
import { verifySharePassJwt, SHARE_OTP_COOKIE_NAME } from "@/lib/share-otp";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params; // token is video ID, folder ID, or playlist ID
    const url = new URL(req.url);
    const subfolderId = url.searchParams.get("subfolderId");
    const session = await auth();

    // 1. Try finding as Video first
    let video = await db.video.findUnique({
      where: { id: token },
      include: {
        organization: true,
        sharedEmails: true,
        renditions: true,
      },
    });

    let folder: any = null;
    let playlist: any = null;

    if (!video) {
      // 2. Try finding as Folder
      folder = await db.folder.findUnique({
        where: { id: token },
        include: {
          organization: true,
          sharedEmails: true,
        },
      });
    }

    if (!video && !folder) {
      // 3. Try finding as Playlist
      playlist = await db.playlist.findUnique({
        where: { id: token },
        include: {
          organization: true,
          sharedEmails: true,
          items: {
            orderBy: { order: "asc" },
            include: {
              video: {
                include: {
                  renditions: true,
                },
              },
            },
          },
        },
      });
    }

    let meeting: any = null;
    if (!video && !folder && !playlist) {
      // 4. Try finding as Meeting
      meeting = await db.meeting.findUnique({
        where: { id: token },
        include: {
          organization: true,
          createdBy: {
            select: { id: true, name: true, image: true, email: true },
          },
          invites: true,
        },
      });
    }

    if (!video && !folder && !playlist && !meeting) {
      return NextResponse.json({ error: "Shared item not found or has expired." }, { status: 404 });
    }

    const item = video || folder || playlist || meeting;
    const isVideo = Boolean(video);
    const isFolder = Boolean(folder);
    const isPlaylist = Boolean(playlist);
    const isMeeting = Boolean(meeting);

    const targetType: "video" | "folder" | "playlist" | "meeting" = isVideo
      ? "video"
      : isPlaylist
      ? "playlist"
      : isMeeting
      ? "meeting"
      : "folder";
    const itemTitle = isVideo
      ? video!.title
      : isPlaylist
      ? playlist!.title
      : isMeeting
      ? meeting!.title
      : folder!.name;

    const organization = {
      name: item.organization.name,
      logoUrl: await getPresignedPlaybackUrl(item.organization.logoUrl),
      coverUrl: await getPresignedPlaybackUrl(item.organization.coverUrl),
      slug: item.organization.slug,
    };

    const accessMode = item.shareAccessMode;
    const sharedEmails: Array<{ email: string }> = isMeeting ? meeting.invites : item.sharedEmails;

    // Fetch customization config for this organization
    const rawShareConfig = await db.sharePageConfig.findUnique({
      where: { organizationId: item.organizationId },
    });

    let sharePageConfig: any = rawShareConfig ? { ...rawShareConfig } : null;
    if (sharePageConfig) {
      if (sharePageConfig.customLogoKey) {
        try {
          sharePageConfig.customLogoUrl = await getPresignedPlaybackUrl(sharePageConfig.customLogoKey);
        } catch (e) {
          console.error("Error signing custom logo URL in share route:", e);
        }
      }
      if (sharePageConfig.welcomeBannerKey) {
        try {
          sharePageConfig.welcomeBannerUrl = await getPresignedPlaybackUrl(sharePageConfig.welcomeBannerKey);
        } catch (e) {
          console.error("Error signing welcome banner URL in share route:", e);
        }
      }
    }

    const itemDescription = isVideo
      ? video!.description
      : isPlaylist
      ? playlist!.description
      : isMeeting
      ? meeting!.description
      : undefined;

    // 4. Check PRIVATE Access Mode
    if (accessMode === "PRIVATE") {
      return NextResponse.json(
        {
          error: "PRIVATE_CONTENT",
          accessMode: "PRIVATE",
          token,
          organization,
          type: targetType,
          itemTitle,
          itemDescription,
          sharePageConfig,
        },
        { status: 403 }
      );
    }

    // 5. Check RESTRICTED Access Mode (Specific Emails)
    if (accessMode === "RESTRICTED") {
      let isAllowed = false;
      let authenticatedEmail = "";

      // 5a. Check Session (logged in user)
      if (session?.user?.email) {
        const userEmail = session.user.email.toLowerCase();
        authenticatedEmail = userEmail;
        const isEmailAllowed = sharedEmails.some((se) => se.email.toLowerCase() === userEmail);

        let isOrgMember = false;
        if (session.user.id) {
          const member = await db.organizationMember.findUnique({
            where: {
              organizationId_userId: {
                organizationId: item.organizationId,
                userId: session.user.id,
              },
            },
          });
          if (member) isOrgMember = true;
        }

        if (isEmailAllowed || isOrgMember) {
          isAllowed = true;
        }
      }

      // 5b. If not allowed by session, check 1-day OTP viewer pass cookie
      if (!isAllowed) {
        try {
          const cookieStore = await cookies();
          const otpPassCookie = cookieStore.get(SHARE_OTP_COOKIE_NAME)?.value;
          const verifiedPass = verifySharePassJwt(otpPassCookie);

          if (verifiedPass?.email) {
            authenticatedEmail = verifiedPass.email;
            const isOtpEmailAllowed = sharedEmails.some(
              (se) => se.email.toLowerCase() === verifiedPass.email
            );

            let isOrgMember = false;
            const memberUser = await db.user.findUnique({
              where: { email: verifiedPass.email },
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

            if (isOtpEmailAllowed || isOrgMember) {
              isAllowed = true;
            }
          }
        } catch (cookieErr) {
          console.error("Error reading OTP pass cookie:", cookieErr);
        }
      }

      // If still not allowed:
      if (!isAllowed) {
        if (!session?.user?.id && !authenticatedEmail) {
          return NextResponse.json(
            {
              error: "LOGIN_REQUIRED",
              requireLogin: true,
              accessMode: "RESTRICTED",
              token,
              organization,
              type: targetType,
              itemTitle,
              itemDescription,
              sharePageConfig,
            },
            { status: 401 }
          );
        } else {
          return NextResponse.json(
            {
              error: "ACCESS_DENIED",
              accessMode: "RESTRICTED",
              userEmail: authenticatedEmail || session?.user?.email,
              organization,
              type: targetType,
              itemTitle,
              itemDescription,
              sharePageConfig,
            },
            { status: 403 }
          );
        }
      }
    }

    // 5.5 Check PURCHASABLE Access Mode
    if (accessMode === "PURCHASABLE") {
      let isPurchasedOrAllowed = false;

      if (session?.user?.id) {
        // Check 1: Organization Member has full access
        const member = await db.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: item.organizationId,
              userId: session.user.id,
            },
          },
        });
        if (member) {
          isPurchasedOrAllowed = true;
        }

        // Check 2: Direct purchase of Video or Playlist or Meeting
        if (!isPurchasedOrAllowed) {
          const directPurchase = await db.contentPurchase.findFirst({
            where: {
              userId: session.user.id,
              status: "COMPLETED",
              OR: [
                { videoId: token },
                { playlistId: token },
                { meetingId: token },
              ],
            },
          });
          if (directPurchase) {
            isPurchasedOrAllowed = true;
          }
        }

        // Check 3: Host or Member check for Meeting
        if (!isPurchasedOrAllowed && isMeeting && meeting) {
          if (meeting.createdById === session.user.id) {
            isPurchasedOrAllowed = true;
          }
        }

        // Check 4: Playlist Purchase Cascade (if this is a video in a purchased playlist)
        if (!isPurchasedOrAllowed && isVideo && video) {
          const playlistItems = await db.playlistItem.findMany({
            where: { videoId: video.id },
            select: { playlistId: true },
          });
          const playlistIds = playlistItems.map((pi) => pi.playlistId);

          if (playlistIds.length > 0) {
            const playlistPurchase = await db.contentPurchase.findFirst({
              where: {
                userId: session.user.id,
                playlistId: { in: playlistIds },
                status: "COMPLETED",
              },
            });
            if (playlistPurchase) {
              isPurchasedOrAllowed = true;
            }
          }
        }
      }

      // If not purchased, return Purchasable paywall payload
      if (!isPurchasedOrAllowed) {
        const headerCountry =
          req.headers.get("cf-ipcountry") ||
          req.headers.get("x-vercel-ip-country") ||
          req.headers.get("x-country-code") ||
          null;

        if (isMeeting && meeting) {
          let hostAvatarUrl = meeting.createdBy?.image || null;
          if (hostAvatarUrl && !hostAvatarUrl.startsWith("http")) {
            try {
              hostAvatarUrl = await getPresignedPlaybackUrl(hostAvatarUrl);
            } catch {}
          }

          return NextResponse.json({
            type: "meeting",
            accessMode: "PURCHASABLE",
            isPurchased: false,
            isLoggedIn: Boolean(session?.user?.id),
            token,
            organization,
            sharePageConfig,
            itemTitle: meeting.title,
            price: meeting.price,
            currency: meeting.currency || "USD",
            countryPricing: meeting.countryPricing || [],
            detectedCountryCode: headerCountry ? headerCountry.toUpperCase() : undefined,
            meeting: {
              id: meeting.id,
              title: meeting.title,
              description: meeting.description,
              scheduledStart: meeting.scheduledStart,
              scheduledEnd: meeting.scheduledEnd,
              status: meeting.status,
              isInstant: meeting.isInstant,
              recordOnStart: meeting.recordOnStart,
              allowGuests: meeting.allowGuests,
              createdAt: meeting.createdAt,
              createdBy: {
                name: meeting.createdBy?.name || "Host",
                image: hostAvatarUrl,
              },
            },
          });
        }

        const firstThumbnailKey = isVideo
          ? video?.thumbnailKey
          : playlist?.items[0]?.video?.thumbnailKey;
        const previewThumbnailUrl = firstThumbnailKey
          ? await getPresignedPlaybackUrl(firstThumbnailKey)
          : null;

        return NextResponse.json({
          type: targetType,
          accessMode: "PURCHASABLE",
          isPurchased: false,
          isLoggedIn: Boolean(session?.user?.id),
          token,
          organization,
          sharePageConfig,
          itemTitle,
          price: item.price,
          currency: item.currency || "USD",
          countryPricing: item.countryPricing || [],
          detectedCountryCode: headerCountry ? headerCountry.toUpperCase() : undefined,
          video: isVideo && video ? {
            id: video.id,
            title: video.title,
            description: video.description,
            status: video.status,
            durationSeconds: video.durationSeconds,
            thumbnailUrl: previewThumbnailUrl,
            createdAt: video.createdAt,
          } : undefined,
          playlist: isPlaylist && playlist ? {
            id: playlist.id,
            title: playlist.title,
            description: playlist.description,
            itemCount: playlist.items.length,
            totalDurationSeconds: playlist.items.reduce((acc: number, it: any) => acc + (it.video?.durationSeconds || 0), 0),
            thumbnailUrl: previewThumbnailUrl,
            createdAt: playlist.createdAt,
          } : undefined,
          videos: isPlaylist && playlist ? playlist.items.map((it: any) => ({
            id: it.video.id,
            itemId: it.id,
            order: it.order,
            title: it.video.title,
            description: it.video.description,
            durationSeconds: it.video.durationSeconds,
            status: it.video.status,
          })) : undefined,
        });
      }
    }

    // 6. Return Video Response
    if (isVideo && video) {
      const folderIdParam = url.searchParams.get("folderId") || url.searchParams.get("fromFolder") || url.searchParams.get("fromFolderId");
      const targetFolderId = folderIdParam || video.folderId;
      let parentFolder: { id: string; name: string } | null = null;

      if (targetFolderId) {
        const folderDoc = await db.folder.findUnique({
          where: { id: targetFolderId },
          select: { id: true, name: true },
        });
        if (folderDoc) {
          parentFolder = {
            id: folderDoc.id,
            name: folderDoc.name,
          };
        }
      }

      return NextResponse.json({
        type: "video",
        accessMode,
        organization,
        sharePageConfig,
        parentFolder,
        video: {
          id: video.id,
          title: video.title,
          description: video.description,
          status: video.status,
          durationSeconds: video.durationSeconds,
          thumbnailUrl: video.thumbnailKey ? await getPresignedPlaybackUrl(video.thumbnailKey) : null,
          playbackUrl: await getPlaybackUrl(video),
          createdAt: video.createdAt,
        },
      });
    }

    // 7. Return Playlist Response
    if (isPlaylist && playlist) {
      let totalDurationSeconds = 0;
      const videos = await Promise.all(
        playlist.items.map(async (item: any) => {
          const v = item.video;
          if (v.durationSeconds) {
            totalDurationSeconds += v.durationSeconds;
          }
          return {
            id: v.id,
            itemId: item.id,
            order: item.order,
            title: v.title,
            description: v.description,
            status: v.status,
            durationSeconds: v.durationSeconds,
            thumbnailUrl: v.thumbnailKey ? await getPresignedPlaybackUrl(v.thumbnailKey) : null,
            playbackUrl: await getPlaybackUrl(v),
            createdAt: v.createdAt,
          };
        })
      );

      return NextResponse.json({
        type: "playlist",
        accessMode,
        organization,
        sharePageConfig,
        playlist: {
          id: playlist.id,
          title: playlist.title,
          description: playlist.description,
          itemCount: playlist.items.length,
          totalDurationSeconds,
          createdAt: playlist.createdAt,
        },
        videos,
      });
    }

    // 8. Return Folder Response
    if (isFolder && folder) {
      let activeFolderId = folder.id;

      if (subfolderId) {
        const requestedSubfolder = await db.folder.findFirst({
          where: { id: subfolderId, organizationId: folder.organizationId },
        });
        if (requestedSubfolder) {
          activeFolderId = requestedSubfolder.id;
        }
      }

      const activeFolder = await db.folder.findUnique({
        where: { id: activeFolderId },
      });

      if (!activeFolder) {
        return NextResponse.json({ error: "Folder not found." }, { status: 404 });
      }

      const rawVideos = await db.video.findMany({
        where: { folderId: activeFolderId, organizationId: folder.organizationId },
        include: { renditions: true },
        orderBy: { createdAt: "desc" },
      });

      const videos = await Promise.all(rawVideos.map(async (v) => ({
        id: v.id,
        title: v.title,
        description: v.description,
        status: v.status,
        durationSeconds: v.durationSeconds,
        thumbnailUrl: v.thumbnailKey ? await getPresignedPlaybackUrl(v.thumbnailKey) : null,
        playbackUrl: await getPlaybackUrl(v),
        createdAt: v.createdAt,
      })));

      const subfolders = await db.folder.findMany({
        where: { parentId: activeFolderId, organizationId: folder.organizationId },
        orderBy: { name: "asc" },
      });

      return NextResponse.json({
        type: "folder",
        accessMode,
        organization,
        sharePageConfig,
        rootFolder: {
          id: folder.id,
          name: folder.name,
        },
        currentFolder: {
          id: activeFolder.id,
          name: activeFolder.name,
          parentId: activeFolder.parentId,
        },
        videos,
        subfolders: subfolders.map((sf) => ({ id: sf.id, name: sf.name })),
      });
    }

    // 9. Return Meeting Response (Public, Purchased, Host or Allowed)
    if (isMeeting && meeting) {
      let hostAvatarUrl = meeting.createdBy?.image || null;
      if (hostAvatarUrl && !hostAvatarUrl.startsWith("http")) {
        try {
          hostAvatarUrl = await getPresignedPlaybackUrl(hostAvatarUrl);
        } catch {}
      }

      return NextResponse.json({
        type: "meeting",
        accessMode: meeting.shareAccessMode,
        isPurchased: true,
        isLoggedIn: Boolean(session?.user?.id),
        token,
        organization,
        sharePageConfig,
        itemTitle: meeting.title,
        price: meeting.price,
        currency: meeting.currency || "USD",
        countryPricing: meeting.countryPricing || [],
        joinUrl: `/meet/${meeting.id}`,
        meeting: {
          id: meeting.id,
          title: meeting.title,
          description: meeting.description,
          scheduledStart: meeting.scheduledStart,
          scheduledEnd: meeting.scheduledEnd,
          status: meeting.status,
          isInstant: meeting.isInstant,
          recordOnStart: meeting.recordOnStart,
          allowGuests: meeting.allowGuests,
          createdAt: meeting.createdAt,
          createdBy: {
            name: meeting.createdBy?.name || "Host",
            image: hostAvatarUrl,
          },
        },
      });
    }

    return NextResponse.json({ error: "Invalid shared item." }, { status: 400 });
  } catch (err: any) {
    console.error("[GET Shared Item Error]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
