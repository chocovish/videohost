import { NextResponse } from "next/server";
import { db } from "@videohost/db";
import { getPresignedPlaybackUrl } from "@/lib/s3";
import { DEFAULT_OFFERINGS_CONFIG } from "@/lib/offerings-defaults";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json({ error: "Organization slug is required." }, { status: 400 });
    }

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
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
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

    let config = configDb || {
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

    // Fetch published offerings
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
            console.error("Error signing cover image:", e);
          }
        }
        return {
          ...item,
          coverImageUrl,
        };
      })
    );

    return NextResponse.json({
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
    });
  } catch (err: any) {
    console.error("[GET Public Offerings Error]:", err);
    return NextResponse.json({ error: "Failed to fetch public offerings." }, { status: 500 });
  }
}
