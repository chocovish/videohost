import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import {
  parseBase64Image,
  deleteOldImage,
  uploadBase64Image,
  resolveImageUrl,
} from "@/lib/branding-image";
import { normalizeBannerLink } from "@/lib/image-webp";

const DEFAULT_CONFIG = {
  themePreset: "obsidian",
  accentColor: "#84cc16",
  backgroundStyle: "mesh-gradient",
  cardRoundness: "3xl",
  customTitle: "",
  welcomeTagline: "",
  welcomeTaglineFontSize: "xl",
  showLogo: true,
  customLogoKey: null,
  customLogoUrl: null,
  welcomeBannerKey: null,
  welcomeBannerUrl: null,
  welcomeBannerLink: "",
  showCta: false,
  ctaText: "Schedule a Call",
  ctaUrl: "https://example.com",
  ctaStyle: "gradient",
  showShareButton: false,
  showSocialBar: false,
  showDuration: true,
  autoPlayMuted: false,
  footerText: "",
};



export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !(session as any).organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = (session as any).organizationId;

    const config = await db.sharePageConfig.findUnique({
      where: { organizationId },
    });

    if (!config) {
      return NextResponse.json({
        config: {
          ...DEFAULT_CONFIG,
          organizationId,
        },
      });
    }

    const customLogoUrl = await resolveImageUrl(config.customLogoKey);
    const welcomeBannerUrl = await resolveImageUrl(config.welcomeBannerKey);

    return NextResponse.json({
      config: {
        ...config,
        customLogoUrl,
        welcomeBannerUrl,
      },
    });
  } catch (err: any) {
    console.error("[GET Share Config Error]:", err);
    return NextResponse.json({ error: "Failed to fetch share page customization." }, { status: 500 });
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

    const existingConfig = await db.sharePageConfig.findUnique({
      where: { organizationId },
    });

    // Reset Defaults via PUT request if requested
    if (body.resetDefaults) {
      await deleteOldImage(existingConfig?.customLogoKey);
      await deleteOldImage(existingConfig?.welcomeBannerKey);

      await db.sharePageConfig.delete({
        where: { organizationId },
      });

      return NextResponse.json({
        success: true,
        config: {
          ...DEFAULT_CONFIG,
          organizationId,
        },
      });
    }

    let newCustomLogoKey = existingConfig?.customLogoKey || null;
    let newWelcomeBannerKey = existingConfig?.welcomeBannerKey || null;

    // Handle Custom Logo Upload / Removal (old file always deleted first)
    if (body.removeCustomLogo || body.newCustomLogoData) {
      await deleteOldImage(existingConfig?.customLogoKey);
      newCustomLogoKey = null;
    }

    if (body.newCustomLogoData) {
      if (parseBase64Image(body.newCustomLogoData)) {
        newCustomLogoKey = await uploadBase64Image({
          organizationId,
          base64Data: body.newCustomLogoData,
          folder: "share-page-customisation",
          filenamePrefix: "logo",
          preset: "logo",
        });
      }
    }

    // Handle Welcome Banner Upload / Removal (old file always deleted first)
    if (body.removeWelcomeBanner || body.newWelcomeBannerData) {
      await deleteOldImage(existingConfig?.welcomeBannerKey);
      newWelcomeBannerKey = null;
    }

    if (body.newWelcomeBannerData) {
      if (parseBase64Image(body.newWelcomeBannerData)) {
        newWelcomeBannerKey = await uploadBase64Image({
          organizationId,
          base64Data: body.newWelcomeBannerData,
          folder: "share-page-customisation",
          filenamePrefix: "welcome-banner",
          preset: "banner-header",
        });
      }
    }

    // Optional click-through link (sanitized via the shared validator).
    const newWelcomeBannerLink = normalizeBannerLink(body.welcomeBannerLink);

    const updatedConfig = await db.sharePageConfig.upsert({
      where: { organizationId },
      create: {
        organizationId,
        themePreset: body.themePreset ?? "obsidian",
        accentColor: body.accentColor ?? "#84cc16",
        backgroundStyle: body.backgroundStyle ?? "mesh-gradient",
        cardRoundness: body.cardRoundness ?? "3xl",
        customTitle: body.customTitle || null,
        welcomeTagline: body.welcomeTagline || null,
        welcomeTaglineFontSize: body.welcomeTaglineFontSize ?? "xl",
        showLogo: body.showLogo ?? true,
        customLogoKey: newCustomLogoKey,
        welcomeBannerKey: newWelcomeBannerKey,
        welcomeBannerLink: newWelcomeBannerLink,
        showCta: body.showCta ?? false,
        ctaText: body.ctaText || null,
        ctaUrl: body.ctaUrl || null,
        ctaStyle: body.ctaStyle ?? "gradient",
        showShareButton: body.showShareButton ?? true,
        showSocialBar: body.showSocialBar ?? true,
        showDuration: body.showDuration ?? true,
        autoPlayMuted: body.autoPlayMuted ?? false,
        footerText: body.footerText || null,
      },
      update: {
        themePreset: body.themePreset ?? "obsidian",
        accentColor: body.accentColor ?? "#84cc16",
        backgroundStyle: body.backgroundStyle ?? "mesh-gradient",
        cardRoundness: body.cardRoundness ?? "3xl",
        customTitle: body.customTitle || null,
        welcomeTagline: body.welcomeTagline || null,
        welcomeTaglineFontSize: body.welcomeTaglineFontSize ?? "xl",
        showLogo: body.showLogo ?? true,
        customLogoKey: newCustomLogoKey,
        welcomeBannerKey: newWelcomeBannerKey,
        welcomeBannerLink: newWelcomeBannerLink,
        showCta: body.showCta ?? false,
        ctaText: body.ctaText || null,
        ctaUrl: body.ctaUrl || null,
        ctaStyle: body.ctaStyle ?? "gradient",
        showShareButton: body.showShareButton ?? true,
        showSocialBar: body.showSocialBar ?? true,
        showDuration: body.showDuration ?? true,
        autoPlayMuted: body.autoPlayMuted ?? false,
        footerText: body.footerText || null,
      },
    });

    const customLogoUrl = await resolveImageUrl(updatedConfig.customLogoKey);
    const welcomeBannerUrl = await resolveImageUrl(updatedConfig.welcomeBannerKey);

    return NextResponse.json({
      success: true,
      config: {
        ...updatedConfig,
        customLogoUrl,
        welcomeBannerUrl,
      },
    });
  } catch (err: any) {
    console.error("[PUT Share Config Error]:", err);
    return NextResponse.json({ error: "Failed to update share page customization." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session || !session.user || !(session as any).organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = (session as any).organizationId;

    const existingConfig = await db.sharePageConfig.findUnique({
      where: { organizationId },
    });

    if (existingConfig) {
      await deleteOldImage(existingConfig.customLogoKey);
      await deleteOldImage(existingConfig.welcomeBannerKey);

      await db.sharePageConfig.delete({
        where: { organizationId },
      });
    }

    return NextResponse.json({
      success: true,
      config: {
        ...DEFAULT_CONFIG,
        organizationId,
      },
    });
  } catch (err: any) {
    console.error("[DELETE Share Config Error]:", err);
    return NextResponse.json({ error: "Failed to reset share page customization." }, { status: 500 });
  }
}
