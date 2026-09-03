import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import {
  parseBase64Image,
  deleteOldImage,
  uploadBase64Image,
  resolveImageUrl,
} from "@/lib/branding-image";
import { DEFAULT_OFFERINGS_CONFIG } from "@/lib/offerings-defaults";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !(session as any).organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = (session as any).organizationId;

    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
      },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const config = await db.offeringsPageConfig.findUnique({
      where: { organizationId },
    });

    const signedOrgLogoUrl = await resolveImageUrl(org.logoUrl);

    if (!config) {
      return NextResponse.json({
        config: {
          ...DEFAULT_OFFERINGS_CONFIG,
          organizationId,
          orgName: org.name,
          orgSlug: org.slug,
          orgLogoUrl: signedOrgLogoUrl,
        },
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          logoUrl: signedOrgLogoUrl,
        },
      });
    }

    const avatarUrl = await resolveImageUrl(config.avatarKey);
    const bannerUrl = await resolveImageUrl(config.bannerKey);

    return NextResponse.json({
      config: {
        ...DEFAULT_OFFERINGS_CONFIG,
        ...config,
        sectionsConfig: {
          ...DEFAULT_OFFERINGS_CONFIG.sectionsConfig,
          ...((config.sectionsConfig as any) || {}),
        },
        socialLinks: (config.socialLinks as any) || DEFAULT_OFFERINGS_CONFIG.socialLinks,
        stats: (config.stats as any) || DEFAULT_OFFERINGS_CONFIG.stats,
        testimonials: (config.testimonials as any) || DEFAULT_OFFERINGS_CONFIG.testimonials,
        faqs: (config.faqs as any) || DEFAULT_OFFERINGS_CONFIG.faqs,
        avatarUrl,
        bannerUrl,
        orgName: org.name,
        orgSlug: org.slug,
        orgLogoUrl: signedOrgLogoUrl,
      },
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logoUrl: signedOrgLogoUrl,
      },
    });
  } catch (err: any) {
    console.error("[GET Offerings Config Error]:", err);
    return NextResponse.json({ error: "Failed to fetch offerings customization." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !(session as any).organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = (session as any).organizationId;
    const body = await req.json();

    const existingConfig = await db.offeringsPageConfig.findUnique({
      where: { organizationId },
    });

    // Reset Defaults if requested
    if (body.resetDefaults) {
      await deleteOldImage(existingConfig?.avatarKey);
      await deleteOldImage(existingConfig?.bannerKey);

      await db.offeringsPageConfig.deleteMany({
        where: { organizationId },
      });

      return NextResponse.json({
        success: true,
        config: {
          ...DEFAULT_OFFERINGS_CONFIG,
          organizationId,
        },
      });
    }

    let newAvatarKey = existingConfig?.avatarKey || null;
    let newBannerKey = existingConfig?.bannerKey || null;

    // Handle Avatar Upload / Removal (old file always deleted first)
    if (body.removeAvatar || body.newAvatarData) {
      await deleteOldImage(existingConfig?.avatarKey);
      newAvatarKey = null;
    }

    if (body.newAvatarData) {
      if (parseBase64Image(body.newAvatarData)) {
        newAvatarKey = await uploadBase64Image({
          organizationId,
          base64Data: body.newAvatarData,
          folder: "offerings-customisation",
          filenamePrefix: "avatar",
          preset: "avatar",
        });
      }
    }

    // Handle Banner Upload / Removal (old file always deleted first)
    if (body.removeBanner || body.newBannerData) {
      await deleteOldImage(existingConfig?.bannerKey);
      newBannerKey = null;
    }

    if (body.newBannerData) {
      if (parseBase64Image(body.newBannerData)) {
        newBannerKey = await uploadBase64Image({
          organizationId,
          base64Data: body.newBannerData,
          folder: "offerings-customisation",
          filenamePrefix: "banner",
          preset: "offerings-banner",
        });
      }
    }

    const updatedConfig = await db.offeringsPageConfig.upsert({
      where: { organizationId },
      create: {
        organizationId,
        themePreset: body.themePreset ?? "obsidian",
        accentColor: body.accentColor ?? "#84cc16",
        backgroundStyle: body.backgroundStyle ?? "mesh-gradient",
        cardRoundness: body.cardRoundness ?? "2xl",
        headline: body.headline ?? DEFAULT_OFFERINGS_CONFIG.headline,
        subheadline: body.subheadline ?? DEFAULT_OFFERINGS_CONFIG.subheadline,
        bio: body.bio ?? DEFAULT_OFFERINGS_CONFIG.bio,
        showAvatar: body.showAvatar ?? true,
        avatarKey: newAvatarKey,
        bannerKey: newBannerKey,
        ctaText: body.ctaText ?? DEFAULT_OFFERINGS_CONFIG.ctaText,
        ctaAction: body.ctaAction ?? DEFAULT_OFFERINGS_CONFIG.ctaAction ?? "SCROLL_OFFERINGS",
        ctaUrl: body.ctaUrl ?? DEFAULT_OFFERINGS_CONFIG.ctaUrl,
        secondaryCtaText: body.secondaryCtaText ?? DEFAULT_OFFERINGS_CONFIG.secondaryCtaText,
        secondaryCtaAction: body.secondaryCtaAction ?? DEFAULT_OFFERINGS_CONFIG.secondaryCtaAction ?? "INQUIRY_MODAL",
        secondaryCtaUrl: body.secondaryCtaUrl ?? DEFAULT_OFFERINGS_CONFIG.secondaryCtaUrl,
        socialLinks: body.socialLinks ?? DEFAULT_OFFERINGS_CONFIG.socialLinks,
        stats: body.stats ?? DEFAULT_OFFERINGS_CONFIG.stats,
        sectionsConfig: body.sectionsConfig ?? DEFAULT_OFFERINGS_CONFIG.sectionsConfig,
        testimonials: body.testimonials ?? DEFAULT_OFFERINGS_CONFIG.testimonials,
        faqs: body.faqs ?? DEFAULT_OFFERINGS_CONFIG.faqs,
        featuredVideoUrl: body.featuredVideoUrl ?? "",
        isPublished: body.isPublished ?? true,
      },
      update: {
        themePreset: body.themePreset ?? "obsidian",
        accentColor: body.accentColor ?? "#84cc16",
        backgroundStyle: body.backgroundStyle ?? "mesh-gradient",
        cardRoundness: body.cardRoundness ?? "2xl",
        headline: body.headline !== undefined ? body.headline : undefined,
        subheadline: body.subheadline !== undefined ? body.subheadline : undefined,
        bio: body.bio !== undefined ? body.bio : undefined,
        showAvatar: body.showAvatar !== undefined ? body.showAvatar : undefined,
        avatarKey: newAvatarKey,
        bannerKey: newBannerKey,
        ctaText: body.ctaText !== undefined ? body.ctaText : undefined,
        ctaAction: body.ctaAction !== undefined ? body.ctaAction : undefined,
        ctaUrl: body.ctaUrl !== undefined ? body.ctaUrl : undefined,
        secondaryCtaText: body.secondaryCtaText !== undefined ? body.secondaryCtaText : undefined,
        secondaryCtaAction: body.secondaryCtaAction !== undefined ? body.secondaryCtaAction : undefined,
        secondaryCtaUrl: body.secondaryCtaUrl !== undefined ? body.secondaryCtaUrl : undefined,
        socialLinks: body.socialLinks !== undefined ? body.socialLinks : undefined,
        stats: body.stats !== undefined ? body.stats : undefined,
        sectionsConfig: body.sectionsConfig !== undefined ? body.sectionsConfig : undefined,
        testimonials: body.testimonials !== undefined ? body.testimonials : undefined,
        faqs: body.faqs !== undefined ? body.faqs : undefined,
        featuredVideoUrl: body.featuredVideoUrl !== undefined ? body.featuredVideoUrl : undefined,
        isPublished: body.isPublished !== undefined ? body.isPublished : undefined,
      },
    });

    const avatarUrl = await resolveImageUrl(updatedConfig.avatarKey);
    const bannerUrl = await resolveImageUrl(updatedConfig.bannerKey);

    return NextResponse.json({
      success: true,
      config: {
        ...updatedConfig,
        avatarUrl,
        bannerUrl,
      },
    });
  } catch (err: any) {
    console.error("[PUT Offerings Config Error]:", err);
    return NextResponse.json({ error: "Failed to update offerings customization." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session || !session.user || !(session as any).organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = (session as any).organizationId;

    const existingConfig = await db.offeringsPageConfig.findUnique({
      where: { organizationId },
    });

    if (existingConfig) {
      await deleteOldImage(existingConfig.avatarKey);
      await deleteOldImage(existingConfig.bannerKey);

      await db.offeringsPageConfig.delete({
        where: { organizationId },
      });
    }

    return NextResponse.json({
      success: true,
      config: {
        ...DEFAULT_OFFERINGS_CONFIG,
        organizationId,
      },
    });
  } catch (err: any) {
    console.error("[DELETE Offerings Config Error]:", err);
    return NextResponse.json({ error: "Failed to reset offerings customization." }, { status: 500 });
  }
}
