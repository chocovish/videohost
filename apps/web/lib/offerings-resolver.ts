import { db } from "@videohost/db";
import { getPresignedPlaybackUrl } from "@/lib/s3";
import { formatDuration } from "@/lib/video-utils";
import { formatCurrencyPrice } from "@/lib/utils";

export interface ResolvedOfferingItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  price?: string | null;
  pricePeriod?: string | null;
  badge?: string | null;
  coverImageUrl?: string | null;
  ctaText?: string | null;
  ctaAction?: string | null;
  ctaUrl?: string | null;
  shareUrl?: string | null;
  shareAccessMode?: "PUBLIC" | "RESTRICTED" | "PURCHASABLE" | "PRIVATE";
  userAccessState?: "PUBLIC" | "RESTRICTED" | "GRANTED" | "UNPURCHASED" | "PURCHASED";
  highlights?: string[];
  meetingDuration?: string | null;
  deliveryFormat?: string | null;
  order?: number;
  isFeatured?: boolean;
  isPublished?: boolean;
}

export async function resolveOfferingItem(
  item: any,
  options?: {
    visitorUserId?: string | null;
    visitorEmail?: string | null;
    isOrgMember?: boolean;
  }
): Promise<ResolvedOfferingItem> {
  const visitorUserId = options?.visitorUserId;
  const visitorEmail = options?.visitorEmail?.toLowerCase();
  const isOrgMember = Boolean(options?.isOrgMember);

  // Default custom item values
  let title = item.title;
  let subtitle = item.subtitle || null;
  let description = item.description || null;
  let price = item.price || "Free";
  let pricePeriod = item.pricePeriod || "";
  let coverImageUrl: string | null = null;
  let shareUrl = item.ctaUrl || "";
  let deliveryFormat = item.deliveryFormat || null;
  let shareAccessMode: "PUBLIC" | "RESTRICTED" | "PURCHASABLE" | "PRIVATE" = "PUBLIC";
  let userAccessState: "PUBLIC" | "RESTRICTED" | "GRANTED" | "UNPURCHASED" | "PURCHASED" = "PUBLIC";

  // 1. PLAYLIST / COURSE RESOLUTION (Dynamically pull from Playlist source)
  if (item.type === "PLAYLIST" || item.type === "COURSE") {
    let playlistId = "";
    if (item.ctaUrl) {
      const m = item.ctaUrl.match(/\/(?:share|playlists)\/([a-zA-Z0-9_-]+)/);
      if (m && m[1]) playlistId = m[1];
    }

    let playlist = playlistId
      ? await db.playlist.findUnique({
          where: { id: playlistId },
          include: {
            sharedEmails: true,
            items: {
              orderBy: { order: "asc" },
              include: { video: true },
            },
          },
        })
      : null;

    if (!playlist && item.organizationId) {
      playlist = await db.playlist.findFirst({
        where: { organizationId: item.organizationId, title: item.title },
        include: {
          sharedEmails: true,
          items: {
            orderBy: { order: "asc" },
            include: { video: true },
          },
        },
      });
    }

    if (playlist) {
      title = playlist.title;
      description = playlist.description || "";
      subtitle = null;
      shareUrl = `/share/${playlist.id}`;
      shareAccessMode = (playlist.shareAccessMode as any) || "PUBLIC";

      // Calculate total duration & module count
      const totalDuration = playlist.items.reduce((acc, it) => acc + (it.video?.durationSeconds || 0), 0);
      const itemCount = playlist.items.length;
      deliveryFormat = `${itemCount} Video Modules • ${totalDuration > 0 ? formatDuration(totalDuration) : "Self-paced Series"}`;

      // Resolve cover photo from playlist videos
      for (const it of playlist.items) {
        if (it.video?.thumbnailKey) {
          try {
            coverImageUrl = await getPresignedPlaybackUrl(it.video.thumbnailKey);
            if (coverImageUrl) break;
          } catch (e) {}
        }
      }

      // Resolve Access & Price with accurate Currency formatting
      if (playlist.shareAccessMode === "PURCHASABLE") {
        price = formatCurrencyPrice(playlist.price, playlist.currency || "USD");
        pricePeriod = "one-time";

        if (isOrgMember) {
          userAccessState = "PURCHASED";
        } else if (visitorUserId) {
          const purchase = await db.contentPurchase.findFirst({
            where: {
              userId: visitorUserId,
              playlistId: playlist.id,
              status: "COMPLETED",
            },
          });
          userAccessState = purchase ? "PURCHASED" : "UNPURCHASED";
        } else {
          userAccessState = "UNPURCHASED";
        }
      } else if (playlist.shareAccessMode === "RESTRICTED") {
        price = "Restricted";
        pricePeriod = "";

        if (isOrgMember) {
          userAccessState = "GRANTED";
        } else if (visitorEmail && playlist.sharedEmails.some((se) => se.email.toLowerCase() === visitorEmail)) {
          userAccessState = "GRANTED";
        } else {
          userAccessState = "RESTRICTED";
        }
      } else {
        price = "Free";
        pricePeriod = "";
        userAccessState = "PUBLIC";
      }
    }
  }

  // 2. VIDEO RESOLUTION (Dynamically pull from Video source)
  else if (item.type === "VIDEO" && !item.ctaUrl?.startsWith("http")) {
    let videoId = "";
    if (item.ctaUrl) {
      const m = item.ctaUrl.match(/\/(?:share|embed|videos)\/([a-zA-Z0-9_-]+)/);
      if (m && m[1]) videoId = m[1];
    }

    let video = videoId
      ? await db.video.findUnique({
          where: { id: videoId },
          include: { sharedEmails: true },
        })
      : null;

    if (!video && item.organizationId) {
      video = await db.video.findFirst({
        where: { organizationId: item.organizationId, title: item.title },
        include: { sharedEmails: true },
      });
    }

    if (video) {
      title = video.title;
      description = video.description || "";
      subtitle = null;
      shareUrl = `/share/${video.id}`;
      deliveryFormat = "Self-paced HD Video";
      shareAccessMode = (video.shareAccessMode as any) || "PUBLIC";

      if (video.thumbnailKey) {
        try {
          coverImageUrl = await getPresignedPlaybackUrl(video.thumbnailKey);
        } catch (e) {}
      }

      // Resolve Access & Price with accurate Currency formatting
      if (video.shareAccessMode === "PURCHASABLE") {
        price = formatCurrencyPrice(video.price, video.currency || "USD");
        pricePeriod = "one-time";

        if (isOrgMember) {
          userAccessState = "PURCHASED";
        } else if (visitorUserId) {
          const purchase = await db.contentPurchase.findFirst({
            where: {
              userId: visitorUserId,
              videoId: video.id,
              status: "COMPLETED",
            },
          });
          userAccessState = purchase ? "PURCHASED" : "UNPURCHASED";
        } else {
          userAccessState = "UNPURCHASED";
        }
      } else if (video.shareAccessMode === "RESTRICTED") {
        price = "Restricted";
        pricePeriod = "";

        if (isOrgMember) {
          userAccessState = "GRANTED";
        } else if (visitorEmail && video.sharedEmails.some((se) => se.email.toLowerCase() === visitorEmail)) {
          userAccessState = "GRANTED";
        } else {
          userAccessState = "RESTRICTED";
        }
      } else {
        price = "Free";
        pricePeriod = "";
        userAccessState = "PUBLIC";
      }
    }
  }

  // 3. CUSTOM ITEMS (MEETING, PRODUCT, SERVICE, EXTERNAL URLS)
  else {
    if (item.coverImageKey) {
      try {
        coverImageUrl = await getPresignedPlaybackUrl(item.coverImageKey);
      } catch (e) {}
    }
  }

  return {
    ...item,
    title,
    subtitle,
    description,
    price,
    pricePeriod,
    coverImageUrl,
    shareUrl,
    deliveryFormat,
    shareAccessMode,
    userAccessState,
  };
}
