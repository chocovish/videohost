"use client";

import type { ShareTheme } from "../share-theme";

interface PageBackgroundProps {
  theme: ShareTheme;
}

/** Subtle static background washes — no animation, no pulsing. */
export function PageBackground({ theme }: PageBackgroundProps) {
  const { config, accentHex } = theme;

  return (
    <>
      {(config.backgroundStyle === "mesh-gradient" ||
        config.backgroundStyle === "obsidian-aura" ||
        config.backgroundStyle === "glassmorphism") && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[320px] z-0"
          aria-hidden="true"
        >
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, ${accentHex}14, transparent 70%)`,
            }}
          />
        </div>
      )}

      {config.backgroundStyle === "neon-grid" && (
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.05]"
          aria-hidden="true"
          style={{
            backgroundImage: `radial-gradient(${accentHex} 1px, transparent 1px)`,
            backgroundSize: "22px 22px",
          }}
        />
      )}
    </>
  );
}
