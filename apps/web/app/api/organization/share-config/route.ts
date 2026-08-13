import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";
import { getPresignedPlaybackUrl, uploadBufferToS3, deleteFileFromS3 } from "@/lib/s3";

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

function parseBase64Data(dataString: string): { buffer: Buffer; contentType: string; extension: string } | null {
  const matches = dataString.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return null;

  const contentType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, "base64");
  
  let extension = "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) extension = "jpg";
  else if (contentType.includes("svg")) extension = "svg";
  else if (contentType.includes("webp")) extension = "webp";
  else if (contentType.includes("gif")) extension = "gif";

  return { buffer, contentType, extension };
}

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

    let customLogoUrl: string | null = null;
    if (config.customLogoKey) {
      try {
        customLogoUrl = await getPresignedPlaybackUrl(config.customLogoKey);
      } catch (e) {
        console.error("Error signing custom logo URL:", e);
      }
    }

    let welcomeBannerUrl: string | null = null;
    if (config.welcomeBannerKey) {
      try {
        welcomeBannerUrl = await getPresignedPlaybackUrl(config.welcomeBannerKey);
      } catch (e) {
        console.error("Error signing welcome banner URL:", e);
      }
    }

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
      if (existingConfig?.customLogoKey) {
        await deleteFileFromS3(existingConfig.customLogoKey);
      }
      if (existingConfig?.welcomeBannerKey) {
        await deleteFileFromS3(existingConfig.welcomeBannerKey);
      }

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

    // Handle Custom Logo Upload / Removal
    if (body.removeCustomLogo || body.newCustomLogoData) {
      if (existingConfig?.customLogoKey) {
        await deleteFileFromS3(existingConfig.customLogoKey);
        newCustomLogoKey = null;
      }
    }

    if (body.newCustomLogoData) {
      const parsed = parseBase64Data(body.newCustomLogoData);
      if (parsed) {
        const timestamp = Date.now();
        const key = `share-page-customisation/${organizationId}/logo-${timestamp}.${parsed.extension}`;
        await uploadBufferToS3(key, parsed.buffer, parsed.contentType);
        newCustomLogoKey = key;
      }
    }

    // Handle Welcome Banner Upload / Removal
    if (body.removeWelcomeBanner || body.newWelcomeBannerData) {
      if (existingConfig?.welcomeBannerKey) {
        await deleteFileFromS3(existingConfig.welcomeBannerKey);
        newWelcomeBannerKey = null;
      }
    }

    if (body.newWelcomeBannerData) {
      const parsed = parseBase64Data(body.newWelcomeBannerData);
      if (parsed) {
        const timestamp = Date.now();
        const key = `share-page-customisation/${organizationId}/welcome-banner-${timestamp}.${parsed.extension}`;
        await uploadBufferToS3(key, parsed.buffer, parsed.contentType);
        newWelcomeBannerKey = key;
      }
    }

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

    let customLogoUrl: string | null = null;
    if (updatedConfig.customLogoKey) {
      customLogoUrl = await getPresignedPlaybackUrl(updatedConfig.customLogoKey);
    }

    let welcomeBannerUrl: string | null = null;
    if (updatedConfig.welcomeBannerKey) {
      welcomeBannerUrl = await getPresignedPlaybackUrl(updatedConfig.welcomeBannerKey);
    }

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
      if (existingConfig.customLogoKey) {
        await deleteFileFromS3(existingConfig.customLogoKey);
      }
      if (existingConfig.welcomeBannerKey) {
        await deleteFileFromS3(existingConfig.welcomeBannerKey);
      }

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
