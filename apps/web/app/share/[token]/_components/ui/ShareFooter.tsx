"use client";

import type { ShareTheme } from "../share-theme";

interface ShareFooterProps {
  theme: ShareTheme;
}

/** Global page footer: custom text or `© {year} {org}`. */
export function ShareFooter({ theme }: ShareFooterProps) {
  const { config, dividerBorder, displayTitle, faintHex } = theme;

  return (
    <footer
      className={`py-6 border-t text-center text-xs relative z-10 ${dividerBorder}`}
      style={{ color: faintHex }}
    >
      <p>{config.footerText || `© ${new Date().getFullYear()} ${displayTitle}`}</p>
    </footer>
  );
}
