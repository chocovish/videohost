import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@videohost/db";
import { getPresignedPlaybackUrl } from "@/lib/s3";
import { DEFAULT_OFFERINGS_CONFIG } from "@/lib/offerings-defaults";
import OfferingsLandingClient from "./offerings-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const org = await db.organization.findUnique({
      where: { slug },
      select: {
        name: true,
        logoUrl: true,
      },
    });

    if (!org) {
      return {
        title: "Organization Not Found | Taped",
        description: "The requested organization offerings page could not be found.",
      };
    }

    const config = await db.offeringsPageConfig.findFirst({
      where: { organization: { slug } },
    });

    const title = config?.headline
      ? `${org.name} — ${config.headline}`
      : `${org.name} | Playlists, Mentorship & Offerings`;

    const description =
      config?.subheadline ||
      config?.bio ||
      `Explore playlists, 1:1 mentorship sessions, video showcases, and digital resources from ${org.name} on Taped.`;

    let imageUrl = "/taped-in-logo.webp";
    if (config?.avatarKey) {
      try {
        imageUrl = await getPresignedPlaybackUrl(config.avatarKey);
      } catch (e) {
        console.error("Error signing avatar for metadata:", e);
      }
    } else if (org.logoUrl) {
      try {
        imageUrl = await getPresignedPlaybackUrl(org.logoUrl);
      } catch (e) {
        console.error("Error signing org logo for metadata:", e);
      }
    }

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `/offerings/${slug}`,
        siteName: org.name,
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: org.name,
          },
        ],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      },
    };
  } catch (err) {
    console.error("[generateMetadata Offerings Error]:", err);
    return {
      title: "Offerings & Portfolio | Taped",
      description: "Explore creator offerings, playlists, and 1:1 sessions on Taped.",
    };
  }
}

export default async function OfferingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const org = await db.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      themeId: true,
    },
  });

  if (!org) {
    notFound();
  }

  let signedOrgLogoUrl: string | null = null;
  if (org.logoUrl) {
    try {
      signedOrgLogoUrl = await getPresignedPlaybackUrl(org.logoUrl);
    } catch (e) {
      console.error("Error signing org logo:", e);
    }
  }

  const configDb = await db.offeringsPageConfig.findUnique({
    where: { organizationId: org.id },
  });

  const config = configDb
    ? {
        ...DEFAULT_OFFERINGS_CONFIG,
        ...configDb,
        socialLinks: (configDb.socialLinks as any) || DEFAULT_OFFERINGS_CONFIG.socialLinks,
        stats: (configDb.stats as any) || DEFAULT_OFFERINGS_CONFIG.stats,
        sectionsConfig: (configDb.sectionsConfig as any) || DEFAULT_OFFERINGS_CONFIG.sectionsConfig,
        testimonials: (configDb.testimonials as any) || DEFAULT_OFFERINGS_CONFIG.testimonials,
        faqs: (configDb.faqs as any) || DEFAULT_OFFERINGS_CONFIG.faqs,
      }
    : {
        ...DEFAULT_OFFERINGS_CONFIG,
        organizationId: org.id,
      };

  let avatarUrl: string | null = null;
  if (config.avatarKey) {
    try {
      avatarUrl = await getPresignedPlaybackUrl(config.avatarKey);
    } catch (e) {
      console.error("Error signing avatar:", e);
    }
  }

  let bannerUrl: string | null = null;
  if (config.bannerKey) {
    try {
      bannerUrl = await getPresignedPlaybackUrl(config.bannerKey);
    } catch (e) {
      console.error("Error signing banner:", e);
    }
  }

  const itemsDb = await db.offeringItem.findMany({
    where: {
      organizationId: org.id,
      isPublished: true,
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  const items = await Promise.all(
    itemsDb.map(async (item) => {
      let coverImageUrl: string | null = null;
      if (item.coverImageKey) {
        try {
          coverImageUrl = await getPresignedPlaybackUrl(item.coverImageKey);
        } catch (e) {
          console.error("Error signing item cover image:", e);
        }
      }
      return {
        ...item,
        coverImageUrl,
      };
    })
  );

  return (
    <OfferingsLandingClient
      initialData={{
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          logoUrl: signedOrgLogoUrl,
        },
        config: {
          ...config,
          avatarUrl,
          bannerUrl,
        },
        items,
      }}
    />
  );
}
