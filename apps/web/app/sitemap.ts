import type { MetadataRoute } from "next";
import { db } from "@videohost/db";
import { getBaseUrl } from "@/lib/utils";
import { getFeatureSlugs } from "@/lib/features";

// Force on-demand / dynamic generation on every request
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Next.js 16 Dynamic Sitemap Generator
 * Generates sitemap for all public pages, explicitly excluding any /dashboard
 * and /share routes (shared videos, playlists, folders, meetings are private
 * by design and must never be discoverable via sitemap.xml).
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
      url: `${baseUrl}/features`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...getFeatureSlugs().map((slug) => ({
      url: `${baseUrl}/features/${slug}`,
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
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

  // NOTE: /share/[token] routes (videos, playlists, folders, meetings) are
  // intentionally excluded from the sitemap to keep shared content private
  // and non-discoverable by search engines.

  return [...staticRoutes, ...offeringsRoutes];
}
