"use client";

import { Check, Copy } from "lucide-react";
import type { ShareTheme } from "../share-theme";
import type { SharedData } from "../types";

interface ShareHeaderProps {
  data: SharedData;
  theme: ShareTheme;
  copied: boolean;
  onCopyLink: () => void;
}

/** Slim sticky header: logo + title + optional folder/playlist crumb + copy-link. */
export function ShareHeader({ data, theme, copied, onCopyLink }: ShareHeaderProps) {
  const { config, headerBgClass, dividerBorder, displayTitle, logoUrlToDisplay, headingHex, mutedHex } =
    theme;
  const isLight = theme.isLight;
  const isFolder = data.type === "folder";
  const isPlaylist = data.type === "playlist";

  return (
    <header className={`sticky top-0 z-50 backdrop-blur-xl border-b ${headerBgClass}`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {config.showLogo !== false &&
            (logoUrlToDisplay ? (
              <img
                src={logoUrlToDisplay}
                alt={displayTitle}
                className={`w-8 h-8 rounded-lg object-cover border shrink-0 ${dividerBorder}`}
              />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-semibold shrink-0"
                style={{ backgroundColor: theme.accentHex, color: theme.onAccentHex }}
              >
                {displayTitle.substring(0, 1).toUpperCase()}
              </div>
            ))}

          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-sm font-semibold tracking-tight truncate"
              style={{ color: headingHex }}
            >
              {displayTitle}
            </span>
            {isFolder && data.currentFolder && (
              <span
                className="hidden sm:inline-block text-xs truncate"
                style={{ color: mutedHex }}
              >
                / {data.currentFolder.name}
              </span>
            )}
            {isPlaylist && data.playlist && (
              <span
                className="hidden sm:inline-block text-xs truncate"
                style={{ color: mutedHex }}
              >
                / {data.playlist.title}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {config.showShareButton && (
            <button
              onClick={onCopyLink}
              className={`h-8 px-3 rounded-lg text-[13px] font-medium transition-all flex items-center gap-1.5 cursor-pointer border border-transparent ${isLight ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-200" : "text-zinc-400 hover:text-white hover:bg-white/5 hover:border-white/10"}`}
              title="Copy link to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Copy link</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
