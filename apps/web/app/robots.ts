import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/utils";

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

