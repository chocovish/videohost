import type { Metadata } from "next";
import { db } from "@videohost/db";
import SharedContentClient from "./shared-content-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;

  try {
    const sharedLink = await db.sharedLink.findUnique({
      where: { token },
      include: {
        organization: true,
        video: true,
        folder: true,
      },
    });

    if (!sharedLink) {
      return {
        title: "Shared Content | VideoHost",
        description: "This shared link is invalid or has expired.",
      };
    }

    if (sharedLink.videoId && sharedLink.video) {
      const video = sharedLink.video;
      const title = `${video.title} — ${sharedLink.organization.name}`;
      const description =
        video.description ||
        `Watch "${video.title}" shared by ${sharedLink.organization.name} on VideoHost.`;
      const imageUrl = video.thumbnailUrl || "/og-image.png";

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url: `/share/${token}`,
          siteName: sharedLink.organization.name,
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

    if (sharedLink.folderId && sharedLink.folder) {
      const folder = sharedLink.folder;
      const title = `${folder.name} (Folder) — ${sharedLink.organization.name}`;
      const description = `Browse shared video collection "${folder.name}" from ${sharedLink.organization.name} on VideoHost.`;

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url: `/share/${token}`,
          siteName: sharedLink.organization.name,
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
  } catch (err) {
    console.error("[generateMetadata Share Error]:", err);
  }

  return {
    title: "Shared Content | VideoHost",
    description: "View shared videos and collections on VideoHost.",
  };
}

export default function SharedPage() {
  return <SharedContentClient />;
}
