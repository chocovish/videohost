import type { MetadataRoute } from "next";

function getBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://taped.app");
  return url.replace(/\/+$/, "");
}

/**
 * Next.js 16 Robots Configuration
 * Permits crawling of public pages while blocking private, dashboard, and administrative areas.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/dashboard/",
          "/admin",
          "/admin/",
          "/api/",
          "/embed/",
          "/invite/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

