"use client";

import { normalizeBannerLink } from "@/lib/image-webp";
import type { ShareTheme } from "../share-theme";

interface BannerHeaderProps {
  theme: ShareTheme;
}

/** Optional banner image (5:1) + welcome tagline, driven by share-page config. */
export function BannerHeader({ theme }: BannerHeaderProps) {
  const { config, cardBgClass, roundnessClass, headingHex } = theme;

  if (!config.welcomeBannerUrl && !config.welcomeTagline) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-5 text-center">
      {config.welcomeBannerUrl &&
        (() => {
          const bannerImg = (
            <img
              src={config.welcomeBannerUrl}
              alt="Banner header"
              className="w-full h-full object-cover"
            />
          );
          const bannerBoxClass = `w-full overflow-hidden border aspect-[5/1] ${cardBgClass} ${roundnessClass}`;
          // Optional click-through link opens in a new tab.
          const bannerLink = normalizeBannerLink(config.welcomeBannerLink);
          if (bannerLink) {
            return (
              <a
                href={bannerLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`${bannerBoxClass} block cursor-pointer transition-opacity hover:opacity-95`}
                title="Open banner link in a new tab"
              >
                {bannerImg}
              </a>
            );
          }
          return <div className={bannerBoxClass}>{bannerImg}</div>;
        })()}
      {config.welcomeTagline && (
        <div>
          {(() => {
            const val = config.welcomeTaglineFontSize || "24";
            let fontSizePx = "22px";
            let weightClass = "font-semibold";

            if (val === "sm") {
              fontSizePx = "14px";
              weightClass = "font-medium";
            } else if (val === "md") {
              fontSizePx = "16px";
              weightClass = "font-medium";
            } else if (val === "lg") {
              fontSizePx = "18px";
              weightClass = "font-semibold";
            } else if (val === "xl") {
              fontSizePx = "22px";
              weightClass = "font-semibold";
            } else if (val === "2xl") {
              fontSizePx = "30px";
              weightClass = "font-semibold";
            } else {
              const parsed = parseInt(val, 10);
              if (!isNaN(parsed) && parsed > 0) {
                const clamped = Math.min(40, Math.max(13, parsed));
                fontSizePx = `${clamped}px`;
                weightClass = clamped >= 24 ? "font-semibold" : "font-medium";
              }
            }

            return (
              <h2
                className={`tracking-tight text-balance ${weightClass}`}
                style={{ fontSize: fontSizePx, color: headingHex }}
              >
                {config.welcomeTagline}
              </h2>
            );
          })()}
        </div>
      )}
    </div>
  );
}
