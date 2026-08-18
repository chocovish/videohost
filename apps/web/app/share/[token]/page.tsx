import type { Metadata } from "next";
import { db } from "@videohost/db";
import { getPresignedPlaybackUrl } from "@/lib/s3";
import SharedContentClient from "./shared-content-client";

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
      const imageUrl = video.thumbnailKey ? await getPresignedPlaybackUrl(video.thumbnailKey) : "/og-image.png";

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
      const firstThumb = playlist.items[0]?.video?.thumbnailKey;
      const imageUrl = firstThumb ? await getPresignedPlaybackUrl(firstThumb) : "/og-image.png";

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
  } catch (err) {
    console.error("[generateMetadata Share Error]:", err);
  }

  return {
    title: "Shared Content | Taped",
    description: "View shared videos and collections on Taped.",
  };
}

export default function SharedPage() {
  return <SharedContentClient />;
}
