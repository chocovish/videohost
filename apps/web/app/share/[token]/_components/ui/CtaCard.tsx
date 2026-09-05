"use client";

import { ExternalLink } from "lucide-react";
import type { ShareTheme } from "../share-theme";

interface CtaCardProps {
  theme: ShareTheme;
  /** `"compact"` matches the single-video card; `"large"` matches the playlist card. */
  variant?: "compact" | "large";
}

/**
 * Call-to-action card (customize-share-page). Renders nothing unless
 * `showCta && ctaUrl`. Both historical paddings are preserved via `variant`.
 */
export function CtaCard({ theme, variant = "compact" }: CtaCardProps) {
  const { config, roundnessClass, accentHex, onAccentHex, headingHex, mutedHex, bodyHex } =
    theme;

  if (!config.showCta || !config.ctaUrl) return null;

  if (variant === "large") {
    return (
      <div
        className="p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all shadow-lg"
        style={{
          backgroundColor: `${accentHex}10`,
          borderColor: `${accentHex}40`,
        }}
      >
        <div className="space-y-1 text-center sm:text-left">
          <h4
            className="font-semibold text-base tracking-tight"
            style={{ color: headingHex }}
          >
            Interested in learning more?
          </h4>
          <p className="text-xs" style={{ color: bodyHex }}>
            Click below to take the next step with {theme.displayTitle}.
          </p>
        </div>
        <a
          href={config.ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 rounded-xl   font-semibold text-sm transition-all flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 shrink-0"
          style={{ backgroundColor: accentHex, color: onAccentHex }}
        >
          <span>{config.ctaText || "Learn More"}</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    );
  }

  return (
    <div
      className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${roundnessClass}`}
      style={{
        backgroundColor: `${accentHex}0d`,
        borderColor: `${accentHex}30`,
      }}
    >
      <div className="space-y-0.5 text-center sm:text-left">
        <h4 className="font-semibold text-[15px] tracking-tight" style={{ color: headingHex }}>
          Interested in learning more?
        </h4>
        <p className="text-[13px]" style={{ color: mutedHex }}>
          Take the next step with {theme.displayTitle}.
        </p>
      </div>
      <a
        href={config.ctaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="h-9 px-5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 shrink-0 hover:opacity-90"
        style={{ backgroundColor: accentHex, color: onAccentHex }}
      >
        <span>{config.ctaText || "Learn More"}</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
