import { NextResponse } from "next/server";
import { db } from "@videohost/db";
import { auth } from "@/lib/auth";
import { getPresignedPlaybackUrl } from "@/lib/s3";
import { DEFAULT_OFFERINGS_CONFIG } from "@/lib/offerings-defaults";
import { resolveOfferingItem } from "@/lib/offerings-resolver";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();
    const visitorUserId = session?.user?.id;
    const visitorEmail = session?.user?.email?.toLowerCase();

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
        coverUrl: true,
        themeId: true,
      },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    let isOrgMember = false;
    if (visitorUserId) {
      const member = await db.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: org.id,
            userId: visitorUserId,
          },
        },
      });
      if (member) isOrgMember = true;
    }

    let signedOrgLogoUrl: string | null = null;
    if (org.logoUrl) {
      try {
        signedOrgLogoUrl = await getPresignedPlaybackUrl(org.logoUrl);
      } catch (e) {
        console.error("Error signing org logo:", e);
      }
    }

    let signedOrgCoverUrl: string | null = null;
    if (org.coverUrl) {
      try {
        signedOrgCoverUrl = await getPresignedPlaybackUrl(org.coverUrl);
      } catch (e) {
        console.error("Error signing org cover:", e);
      }
    }

    const configDb = await db.offeringsPageConfig.findUnique({
      where: { organizationId: org.id },
    });

    let config = configDb || {
      ...DEFAULT_OFFERINGS_CONFIG,
      organizationId: org.id,
    };

    let avatarUrl: string | null = signedOrgLogoUrl;
    if (config.avatarKey) {
      try {
        avatarUrl = await getPresignedPlaybackUrl(config.avatarKey);
      } catch (e) {
        console.error("Error signing avatar:", e);
      }
    }

    let bannerUrl: string | null = signedOrgCoverUrl;
    if (config.bannerKey) {
      try {
        bannerUrl = await getPresignedPlaybackUrl(config.bannerKey);
      } catch (e) {
        console.error("Error signing banner:", e);
      }
    }

    // Fetch published offerings dynamically resolved from source
    const itemsDb = await db.offeringItem.findMany({
      where: {
        organizationId: org.id,
        isPublished: true,
      },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    const items = await Promise.all(
      itemsDb.map((item) =>
        resolveOfferingItem(item, {
          visitorUserId,
          visitorEmail,
          isOrgMember,
        })
      )
    );

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logoUrl: signedOrgLogoUrl,
        coverUrl: signedOrgCoverUrl,
      },
      config: {
        ...config,
        avatarUrl,
        bannerUrl,
      },
      items,
      isLoggedIn: Boolean(visitorUserId),
    });
  } catch (err: any) {
    console.error("[GET Public Offerings Error]:", err);
    return NextResponse.json({ error: "Failed to fetch public offerings." }, { status: 500 });
  }
}
