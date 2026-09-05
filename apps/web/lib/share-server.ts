import { cookies, headers } from "next/headers";
import { db } from "@videohost/db";
import { getPlaybackUrl, getPresignedPlaybackUrl } from "@/lib/s3";
import { getVideoSubtitleTracksSafe } from "@/lib/subtitles";
import { resolveImageUrl } from "@/lib/branding-image";
import { resolveThumbnailUrl } from "@/lib/storage";
import { auth } from "@/lib/auth";
import { verifySharePassJwt, SHARE_OTP_COOKIE_NAME } from "@/lib/share-otp";

export interface ShareQuery {
  subfolderId?: string | null;
  folderId?: string | null;
  rootFolderId?: string | null;
  /** `?playlistId=` — episode opened from a playlist share page. */
  playlistId?: string | null;
}

export interface ShareResult {
  status: number;
  body: any;
}

/**
 * Single source of truth for `/share/[token]` data.
 *
 * Previously this logic lived only in `GET /api/share/[token]`, which forced
 * the share page to be a client component that fetched after mount — so every
 * visit rendered `<ShareLoadingState />` first and never SSR'd content.
 *
 * Now both the API route and the server component (`app/share/[token]/page.tsx`)
 * call this helper, so the page can render content on the server on first paint
 * while the client keeps using the API for subsequent navigations (subfolders,
 * post-login retries, post-purchase refreshes).
 */
export async function getShareContent(
  token: string,
  query: ShareQuery = {},
  countryCodeOverride?: string | null
): Promise<ShareResult> {
  const subfolderId = query.subfolderId ?? null;
  const folderIdParam = query.folderId ?? null;

  let headerCountry: string | null = countryCodeOverride ?? null;
  if (!headerCountry) {
    try {
      const h = await headers();
      headerCountry =
        h.get("cf-ipcountry") ||
        h.get("x-vercel-ip-country") ||
        h.get("x-country-code") ||
        null;
    } catch {
      headerCountry = null;
    }
  }

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
    return {
      status: 404,
      body: { error: "NOT_FOUND", message: "Shared item not found or has expired." },
    };
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
    // Backfill palette-driven font/icon colours for configs saved before the
    // new columns existed, so share pages never use clashing hard-coded text.
    try {
      const { SHARE_THEME_PRESETS } = await import("@/lib/share-theme");
      const preset =
        SHARE_THEME_PRESETS[sharePageConfig.themePreset || ""] ||
        SHARE_THEME_PRESETS.obsidian;
      if (!sharePageConfig.headingColor) sharePageConfig.headingColor = preset.heading;
      if (!sharePageConfig.bodyColor) sharePageConfig.bodyColor = preset.body;
      if (!sharePageConfig.mutedColor) sharePageConfig.mutedColor = preset.muted;
      if (!sharePageConfig.iconColor) sharePageConfig.iconColor = preset.icon;
      if (!sharePageConfig.onAccentColor) sharePageConfig.onAccentColor = preset.onAccent;
    } catch {}
    if (sharePageConfig.customLogoKey) {
      sharePageConfig.customLogoUrl = await resolveImageUrl(
        sharePageConfig.customLogoKey
      );
    }
    if (sharePageConfig.welcomeBannerKey) {
      sharePageConfig.welcomeBannerUrl = await resolveImageUrl(
        sharePageConfig.welcomeBannerKey
      );
    }
  }

  const itemDescription = isVideo
    ? video!.description
    : isPlaylist
    ? playlist!.description
    : isMeeting
    ? meeting!.description
    : undefined;

  // 3.5 Playlist-context gate: a video opened from a playlist share page
  // (`?playlistId=`) is governed by that playlist — provided the video is
  // actually in it (membership is verified, otherwise any public playlist id
  // could unlock any video). Locked playlist → PLAYLIST_LOCKED; accessible
  // playlist → the episode plays with no further video-level checks, since
  // playlist access implies access to its videos. Direct opens (no context)
  // still follow the video's own rules.
  const playlistIdParam = query.playlistId ?? null;
  let playlistContextGranted = false;
  if (isVideo && video && playlistIdParam && playlistIdParam !== token) {
    const membership = await db.playlistItem.findFirst({
      where: { playlistId: playlistIdParam, videoId: video.id },
      select: { id: true },
    });
    if (membership) {
      const gate = await checkPlaylistContextAccess(session, playlistIdParam);
      if (!gate.allowed) {
        return {
          status: 403,
          body: {
            error: "PLAYLIST_LOCKED",
            playlistGateReason: gate.reason,
            accessMode,
            token,
            playlistId: gate.playlist?.id ?? playlistIdParam,
            playlistTitle: gate.playlist?.title ?? null,
            organization,
            type: "video",
            itemTitle: video.title,
            itemDescription: video.description,
            thumbnailUrl: await resolveThumbnailUrl(video as any),
            isLoggedIn: Boolean(session?.user?.id),
            sharePageConfig,
          },
        };
      }
      playlistContextGranted = true;
    }
  }

  // 4. Check PRIVATE Access Mode (playlist members bypass via 3.5)
  if (accessMode === "PRIVATE" && !playlistContextGranted) {
    return {
      status: 403,
      body: {
        error: "PRIVATE_CONTENT",
        accessMode: "PRIVATE",
        token,
        organization,
        type: targetType,
        itemTitle,
        itemDescription,
        sharePageConfig,
      },
    };
  }

  // 5. Check RESTRICTED Access Mode (Specific Emails; skipped when the
  // playlist context already granted access in 3.5)
  if (accessMode === "RESTRICTED" && !playlistContextGranted) {
    const { allowed: isAllowed, authenticatedEmail } = await resolveRestrictedViewer(
      session,
      item.organizationId,
      sharedEmails
    );

    // If still not allowed:
    if (!isAllowed) {
      if (!session?.user?.id && !authenticatedEmail) {
        return {
          status: 401,
          body: {
            error: "LOGIN_REQUIRED",
            requireLogin: true,
            accessMode: "RESTRICTED",
            token,
            organization,
            type: targetType,
            itemTitle,
            itemDescription,
            thumbnailUrl: await resolveGateThumbnail({ video, folder, playlist }),
            sharePageConfig,
          },
        };
      } else {
        return {
          status: 403,
          body: {
            error: "ACCESS_DENIED",
            accessMode: "RESTRICTED",
            userEmail: authenticatedEmail || session?.user?.email,
            organization,
            type: targetType,
            itemTitle,
            itemDescription,
            thumbnailUrl: await resolveGateThumbnail({ video, folder, playlist }),
            sharePageConfig,
          },
        };
      }
    }
  }

  // 5.5 Check PURCHASABLE Access Mode (skipped when the playlist context
  // already granted access in 3.5)
  if (accessMode === "PURCHASABLE" && !playlistContextGranted) {
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
      const detectedCountryCode = headerCountry ? headerCountry.toUpperCase() : undefined;

      if (isMeeting && meeting) {
        let hostAvatarUrl = meeting.createdBy?.image || null;
        if (hostAvatarUrl && !hostAvatarUrl.startsWith("http")) {
          try {
            hostAvatarUrl = await getPresignedPlaybackUrl(hostAvatarUrl);
          } catch {}
        }

        return {
          status: 200,
          body: {
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
            detectedCountryCode,
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
          },
        };
      }

      const previewThumbnailUrl = isVideo && video
        ? await resolveThumbnailUrl(video as any)
        : playlist?.items[0]?.video
        ? await resolveThumbnailUrl(playlist.items[0].video as any)
        : null;

      // Thumbnails are public poster images, not the content itself — resolve
      // them per episode so locked playlists still show artwork. Playback URLs
      // and subtitles stay excluded until purchase (they'd leak the content).
      const previewVideos = isPlaylist && playlist
        ? await Promise.all(
            playlist.items.map(async (it: any) => ({
              id: it.video.id,
              itemId: it.id,
              order: it.order,
              title: it.video.title,
              description: it.video.description,
              durationSeconds: it.video.durationSeconds,
              status: it.video.status,
              thumbnailUrl: await resolveThumbnailUrl(it.video as any),
            }))
          )
        : undefined;

      return {
        status: 200,
        body: {
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
          detectedCountryCode,
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
          videos: previewVideos,
        },
      };
    }
  }

  // 6. Return Video Response
  if (isVideo && video) {
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

    return {
      status: 200,
      body: {
        type: "video",
        accessMode,
        // When accessMode is PURCHASABLE we only reach here if the viewer is
        // allowed (org member / completed purchase / cascade). The client gates
        // the "Full access required" banner on `!data.isPurchased`, so we must
        // explicitly send `isPurchased: true` — otherwise it is `undefined`
        // and the banner never hides.
        isPurchased: accessMode === "PURCHASABLE" ? true : undefined,
        isLoggedIn: Boolean(session?.user?.id),
        token,
        organization,
        sharePageConfig,
        itemTitle: video.title,
        price: (video as any).price ?? null,
        currency: (video as any).currency || "USD",
        countryPricing: (video as any).countryPricing || [],
        detectedCountryCode: headerCountry ? headerCountry.toUpperCase() : undefined,
        parentFolder,
        video: {
          id: video.id,
          title: video.title,
          description: video.description,
          status: video.status,
          durationSeconds: video.durationSeconds,
          thumbnailUrl: await resolveThumbnailUrl(video as any),
          playbackUrl: await getPlaybackUrl(video),
          subtitles: await getVideoSubtitleTracksSafe(video.id),
          createdAt: video.createdAt,
        },
      },
    };
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
          thumbnailUrl: await resolveThumbnailUrl(v as any),
          playbackUrl: await getPlaybackUrl(v),
          subtitles: await getVideoSubtitleTracksSafe(v.id),
          createdAt: v.createdAt,
        };
      })
    );

    return {
      status: 200,
      body: {
        type: "playlist",
        accessMode,
        // When accessMode is PURCHASABLE we only reach here if the viewer is
        // allowed (org member / completed purchase). The client gates the
        // "Full Playlist Access Required" banner on `!data.isPurchased`, so we
        // must explicitly send `isPurchased: true` — otherwise it is
        // `undefined` and the banner never hides.
        isPurchased: accessMode === "PURCHASABLE" ? true : undefined,
        isLoggedIn: Boolean(session?.user?.id),
        token,
        organization,
        sharePageConfig,
        itemTitle: playlist.title,
        price: (playlist as any).price ?? null,
        currency: (playlist as any).currency || "USD",
        countryPricing: (playlist as any).countryPricing || [],
        detectedCountryCode: headerCountry ? headerCountry.toUpperCase() : undefined,
        playlist: {
          id: playlist.id,
          title: playlist.title,
          description: playlist.description,
          itemCount: playlist.items.length,
          totalDurationSeconds,
          createdAt: playlist.createdAt,
        },
        videos,
      },
    };
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
      return { status: 404, body: { error: "NOT_FOUND", message: "Folder not found." } };
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
      thumbnailUrl: await resolveThumbnailUrl(v as any),
      playbackUrl: await getPlaybackUrl(v),
      subtitles: await getVideoSubtitleTracksSafe(v.id),
      createdAt: v.createdAt,
    })));

    const subfolders = await db.folder.findMany({
      where: { parentId: activeFolderId, organizationId: folder.organizationId },
      orderBy: { name: "asc" },
    });

    return {
      status: 200,
      body: {
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
      },
    };
  }

  // 9. Return Meeting Response (Public, Purchased, Host or Allowed)
  if (isMeeting && meeting) {
    let hostAvatarUrl = meeting.createdBy?.image || null;
    if (hostAvatarUrl && !hostAvatarUrl.startsWith("http")) {
      try {
        hostAvatarUrl = await getPresignedPlaybackUrl(hostAvatarUrl);
      } catch {}
    }

    return {
      status: 200,
      body: {
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
      },
    };
  }

  return { status: 400, body: { error: "INVALID_ITEM", message: "Invalid shared item." } };
}

/** JSON-safe clone for passing server data to client components. */
export function toJsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Shared RESTRICTED-mode viewer resolution (session email → org membership →
 * 24h OTP pass cookie). Used by the main flow and by the playlist-context
 * gate so both enforce identical rules.
 */
async function resolveRestrictedViewer(
  session: any,
  organizationId: string,
  sharedEmails: Array<{ email: string }>
): Promise<{ allowed: boolean; authenticatedEmail: string }> {
  let allowed = false;
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
            organizationId,
            userId: session.user.id,
          },
        },
      });
      if (member) isOrgMember = true;
    }

    if (isEmailAllowed || isOrgMember) {
      allowed = true;
    }
  }

  // 5b. If not allowed by session, check 1-day OTP viewer pass cookie
  if (!allowed) {
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
                organizationId,
                userId: memberUser.id,
              },
            },
          });
          if (member) isOrgMember = true;
        }

        if (isOtpEmailAllowed || isOrgMember) {
          allowed = true;
        }
      }
    } catch (cookieErr) {
      console.error("Error reading OTP pass cookie:", cookieErr);
    }
  }

  return { allowed, authenticatedEmail };
}

export type PlaylistGateReason = "PRIVATE" | "LOGIN_REQUIRED" | "ACCESS_DENIED" | "NOT_PURCHASED";

export interface PlaylistGateResult {
  allowed: boolean;
  reason?: PlaylistGateReason;
  playlist?: {
    id: string;
    title: string;
    price?: number | null;
    currency?: string | null;
    thumbnailUrl?: string | null;
  };
}

/**
 * Lightweight playlist-context check for episode opens (`?playlistId=`).
 * A video opened from a playlist share page requires access to that playlist —
 * otherwise a locked (private / restricted / unpaid) playlist is trivially
 * bypassed by opening its episodes directly. Unknown playlist ids are ignored
 * (backwards compatible single-video view). Minimal queries only: no playback
 * URLs or per-item payloads are built here.
 */
export async function checkPlaylistContextAccess(
  session: any,
  playlistId: string
): Promise<PlaylistGateResult> {
  const playlist = await db.playlist.findUnique({
    where: { id: playlistId },
    include: {
      sharedEmails: true,
      items: {
        orderBy: { order: "asc" },
        take: 1,
        include: { video: { include: { renditions: true } } },
      },
    },
  });

  if (!playlist) return { allowed: true };

  const display = {
    id: playlist.id,
    title: playlist.title,
    price: (playlist as any).price ?? null,
    currency: (playlist as any).currency ?? "USD",
    thumbnailUrl: playlist.items[0]?.video
      ? await resolveGateThumbnail({ playlist } as any)
      : null,
  };

  const accessMode = (playlist as any).shareAccessMode;

  if (accessMode === "PRIVATE") {
    return { allowed: false, reason: "PRIVATE", playlist: display };
  }

  if (accessMode === "RESTRICTED") {
    const { allowed, authenticatedEmail } = await resolveRestrictedViewer(
      session,
      playlist.organizationId,
      playlist.sharedEmails
    );
    if (allowed) return { allowed: true };
    return {
      allowed: false,
      reason: !session?.user?.id && !authenticatedEmail ? "LOGIN_REQUIRED" : "ACCESS_DENIED",
      playlist: display,
    };
  }

  if (accessMode === "PURCHASABLE") {
    if (session?.user?.id) {
      const member = await db.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: playlist.organizationId,
            userId: session.user.id,
          },
        },
      });
      if (member) return { allowed: true };

      const purchase = await db.contentPurchase.findFirst({
        where: {
          userId: session.user.id,
          playlistId: playlist.id,
          status: "COMPLETED",
        },
      });
      if (purchase) return { allowed: true };
    }
    return { allowed: false, reason: "NOT_PURCHASED", playlist: display };
  }

  return { allowed: true };
}

/**
 * Public artwork for gate screens (login-required / access-denied / paywall).
 * Thumbnails are poster images, not the content itself, so every branch except
 * PRIVATE exposes them: video → own thumbnail, playlist → first episode,
 * folder → latest video in that folder, meeting → none (no artwork concept).
 * Playback URLs and subtitles are never included here.
 */
export async function resolveGateThumbnail(item: {
  video?: any;
  folder?: any;
  playlist?: any;
}): Promise<string | null> {
  try {
    if (item.video) return await resolveThumbnailUrl(item.video as any);
    if (item.playlist?.items?.[0]?.video) {
      return await resolveThumbnailUrl(item.playlist.items[0].video as any);
    }
    if (item.folder) {
      const first = await db.video.findFirst({
        where: { folderId: item.folder.id, organizationId: item.folder.organizationId },
        include: { renditions: true },
        orderBy: { createdAt: "desc" },
      });
      if (first) return await resolveThumbnailUrl(first as any);
    }
  } catch {}
  return null;
}
