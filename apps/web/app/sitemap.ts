import type { MetadataRoute } from "next";
import { db } from "@videohost/db";

// Force on-demand / dynamic generation on every request
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://taped.app");
  return url.replace(/\/+$/, "");
}

/**
 * Next.js 16 Dynamic Sitemap Generator
 * Generates sitemap for all public pages, explicitly excluding any /dashboard routes.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const currentDate = new Date();

  // 1. Core Public Marketing, Tool & Static Pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/record`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/refund`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    // Authentication Entry Pages
    {
      url: `${baseUrl}/auth/login`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/auth/register`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/auth/forgot-password`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  // 2. Dynamic Public Organization Offerings & Portfolio Pages
  let offeringsRoutes: MetadataRoute.Sitemap = [];
  try {
    const publishedOrgs = await db.organization.findMany({
      where: {
        offeringsConfig: {
          isPublished: true,
        },
      },
      select: {
        slug: true,
        updatedAt: true,
        offeringsConfig: {
          select: {
            updatedAt: true,
          },
        },
      },
      take: 2000,
    });

    offeringsRoutes = publishedOrgs.map((org) => ({
      url: `${baseUrl}/offerings/${encodeURIComponent(org.slug)}`,
      lastModified: org.offeringsConfig?.updatedAt || org.updatedAt || currentDate,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch (error) {
    console.error("[Sitemap Generation] Error fetching published offerings:", error);
  }

  // 3. Dynamic Public Shared Content (Videos & Playlists)
  let sharedVideoRoutes: MetadataRoute.Sitemap = [];
  try {
    const publicVideos = await db.video.findMany({
      where: {
        status: "READY",
        shareAccessMode: "PUBLIC",
      },
      select: {
        id: true,
        updatedAt: true,
      },
      take: 2000,
    });

    sharedVideoRoutes = publicVideos.map((video) => ({
      url: `${baseUrl}/share/${encodeURIComponent(video.id)}`,
      lastModified: video.updatedAt || currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch (error) {
    console.error("[Sitemap Generation] Error fetching public videos:", error);
  }

  let sharedPlaylistRoutes: MetadataRoute.Sitemap = [];
  try {
    const publicPlaylists = await db.playlist.findMany({
      where: {
        shareAccessMode: "PUBLIC",
      },
      select: {
        id: true,
        updatedAt: true,
      },
      take: 2000,
    });

    sharedPlaylistRoutes = publicPlaylists.map((playlist) => ({
      url: `${baseUrl}/share/${encodeURIComponent(playlist.id)}`,
      lastModified: playlist.updatedAt || currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch (error) {
    console.error("[Sitemap Generation] Error fetching public playlists:", error);
  }

  return [
    ...staticRoutes,
    ...offeringsRoutes,
    ...sharedVideoRoutes,
    ...sharedPlaylistRoutes,
  ];
}
