import { Suspense } from "react";
import type { Metadata } from "next";
import { db } from "@videohost/db";
import { resolveThumbnailUrl } from "@/lib/storage";
import { getShareContent, toJsonSafe } from "@/lib/share-server";
import type { SharedData, ShareErrorState } from "./_components/types";
import SharedContentClient from "./shared-content-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params; // token is video ID, folder ID, or playlist ID

  try {
    const video = await db.video.findUnique({
      where: { id: token },
      include: { organization: true },
    });

    if (video) {
      const title = `${video.title} — ${video.organization.name}`;
      const description =
        video.description ||
        `Watch "${video.title}" shared by ${video.organization.name} on Taped.`;
      const imageUrl = (await resolveThumbnailUrl(video as any)) || "/og-image.png";

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url: `/share/${token}`,
          siteName: video.organization.name,
          images: [
            {
              url: imageUrl,
              width: 1200,
              height: 630,
              alt: video.title,
            },
          ],
          type: "video.other",
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: [imageUrl],
        },
      };
    }

    const folder = await db.folder.findUnique({
      where: { id: token },
      include: { organization: true },
    });

    if (folder) {
      const title = `${folder.name} (Folder) — ${folder.organization.name}`;
      const description = `Browse shared video collection "${folder.name}" from ${folder.organization.name} on Taped.`;

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url: `/share/${token}`,
          siteName: folder.organization.name,
          images: [
            {
              url: "/og-image.png",
              width: 1200,
              height: 630,
              alt: folder.name,
            },
          ],
          type: "website",
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: ["/og-image.png"],
        },
      };
    }

    const playlist = await db.playlist.findUnique({
      where: { id: token },
      include: {
        organization: true,
        items: {
          orderBy: { order: "asc" },
          take: 1,
          include: { video: true },
        },
      },
    });

    if (playlist) {
      const title = `${playlist.title} (Playlist) — ${playlist.organization.name}`;
      const description =
        playlist.description ||
        `Watch playlist "${playlist.title}" from ${playlist.organization.name} on Taped.`;
      const firstVideo = playlist.items[0]?.video;
      const imageUrl = (firstVideo ? await resolveThumbnailUrl(firstVideo as any) : null) || "/og-image.png";

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url: `/share/${token}`,
          siteName: playlist.organization.name,
          images: [
            {
              url: imageUrl,
              width: 1200,
              height: 630,
              alt: playlist.title,
            },
          ],
          type: "video.other",
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: [imageUrl],
        },
      };
    }

    const meeting = await db.meeting.findUnique({
      where: { id: token },
      include: {
        organization: true,
        createdBy: true,
      },
    });

    if (meeting) {
      const title = `${meeting.title} (Meeting) — ${meeting.organization.name}`;
      const description =
        meeting.description ||
        `Join live meeting "${meeting.title}" hosted by ${meeting.createdBy?.name || meeting.organization.name} on Taped.`;

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url: `/share/${token}`,
          siteName: meeting.organization.name,
          images: [
            {
              url: "/og-image.png",
              width: 1200,
              height: 630,
              alt: meeting.title,
            },
          ],
          type: "website",
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: ["/og-image.png"],
        },
      };
    }

    const appointmentOffering = await db.appointmentOffering.findFirst({
      where: {
        OR: [{ id: token }, { slug: token }],
        isPublished: true,
      },
      include: {
        organization: true,
        createdBy: true,
      },
    });

    if (appointmentOffering) {
      const title = `${appointmentOffering.title} — ${appointmentOffering.organization.name}`;
      const description =
        appointmentOffering.description ||
        `Schedule "${appointmentOffering.title}" with ${appointmentOffering.createdBy?.name || appointmentOffering.organization.name} on Taped.`;

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url: `/share/${token}`,
          siteName: appointmentOffering.organization.name,
          images: [
            {
              url: "/og-image.png",
              width: 1200,
              height: 630,
              alt: appointmentOffering.title,
            },
          ],
          type: "website",
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: ["/og-image.png"],
        },
      };
    }
  } catch (err) {
    console.error("[generateMetadata Share Error]:", err);
  }

  return {
    title: "Shared Content | Taped",
    description: "View shared videos and collections on Taped.",
  };
}

export default async function SharedPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v ?? null;

  const subfolderId = first(sp.subfolderId);
  const folderIdParam =
    first(sp.folderId) || first(sp.fromFolder) || first(sp.fromFolderId);
  const rootFolderIdParam = first(sp.rootFolderId);
  const playlistIdParam = first(sp.playlistId) || first(sp.playlist);

  // Server-render the share payload so first paint already has content
  // instead of just `<ShareLoadingState />` + a client-side fetch.
  // Auth (session cookie), OTP pass cookie, and country headers are read
  // inside `getShareContent` via `auth()` / `cookies()` / `headers()`,
  // exactly like the API route — so SSR sees the same data the client would.
  let initialData: SharedData | null = null;
  let initialError: ShareErrorState | null = null;
  try {
    const { body } = await getShareContent(token, {
      subfolderId,
      folderId: folderIdParam,
      rootFolderId: rootFolderIdParam,
      playlistId: playlistIdParam,
    });
    const safe = toJsonSafe<any>(body);
    if (safe?.error) {
      initialError = {
        code: safe.error,
        message: safe.message,
        userEmail: safe.userEmail,
        organizationName: safe.organization?.name,
        itemTitle: safe.itemTitle,
        itemDescription: safe.itemDescription,
        thumbnailUrl: safe.thumbnailUrl ?? null,
        type: safe.type,
        playlistId: safe.playlistId ?? null,
        playlistTitle: safe.playlistTitle ?? null,
        isLoggedIn: safe.isLoggedIn,
      };
    } else {
      initialData = safe as SharedData;
    }
  } catch (err) {
    console.error("[Share SSR Error]:", err);
    initialError = {
      code: "FETCH_FAILED",
      message: err instanceof Error ? err.message : "Failed to load shared content.",
    };
  }

  // Episode pages (`/share/:videoId?playlistId=`) need the playlist queue too —
  // fetch it on the server so the queue drawer doesn't show its own loader.
  let initialPlaylistData: SharedData | null = null;
  if (playlistIdParam && initialData?.type === "video") {
    try {
      const { body } = await getShareContent(playlistIdParam, {});
      const safe = toJsonSafe<any>(body);
      if (!safe?.error && safe?.type === "playlist") {
        initialPlaylistData = safe as SharedData;
      }
    } catch {
      initialPlaylistData = null;
    }
  }

  const initialQueryKey = `${token}|${subfolderId || ""}|${folderIdParam || ""}|${rootFolderIdParam || ""}|${playlistIdParam || ""}`;

  return (
    <Suspense>
      <SharedContentClient
        initialData={initialData}
        initialError={initialError}
        initialPlaylistData={initialPlaylistData}
        initialQueryKey={initialQueryKey}
      />
    </Suspense>
  );
}
