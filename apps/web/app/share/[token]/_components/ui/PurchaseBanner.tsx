"use client";

import { Lock, ShoppingBag } from "lucide-react";
import type { PriceInfo } from "../types";
import type { ShareTheme } from "../share-theme";

interface PurchaseBannerProps {
  theme: ShareTheme;
  kind: "video" | "playlist";
  itemCount?: number;
  priceInfo: PriceInfo;
  isLoggedIn?: boolean;
  isCheckingOut: boolean;
  onSignIn: () => void;
  onFreeClaim: () => void;
  onOpenCheckout: () => void;
}

/**
 * Compact "unlock" banner rendered under the player details when
 * `accessMode === "PURCHASABLE"` and the visitor hasn't purchased.
 * Both historical paddings are preserved via `kind`.
 */
export function PurchaseBanner({
  theme,
  kind,
  itemCount = 0,
  priceInfo,
  isLoggedIn,
  isCheckingOut,
  onSignIn,
  onFreeClaim,
  onOpenCheckout,
}: PurchaseBannerProps) {
  const { accentHex, onAccentHex } = theme;
  const isVideo = kind === "video";

  const handleClick = () => {
    if (!isLoggedIn) {
      onSignIn();
      return;
    }
    if (priceInfo.isFree) onFreeClaim();
    else onOpenCheckout();
  };

  const buttonLabel = priceInfo.isFree
    ? "Claim for Free"
    : isVideo
      ? `Buy Now • ${priceInfo.formatted}`
      : `Unlock Playlist • ${priceInfo.formatted}`;

  if (isVideo) {
    const { softSurface, headingHex, mutedHex } = theme;
    return (
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${softSurface}`}
      >
        <div className="flex items-center gap-3 text-left w-full sm:w-auto">
          <div
            className="p-2.5 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${accentHex}15`, color: accentHex }}
          >
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold" style={{ color: headingHex }}>
              Full access required
            </h4>
            <p className="text-xs" style={{ color: mutedHex }}>
              One-time purchase unlocks permanent playback
            </p>
          </div>
        </div>
        <button
          onClick={handleClick}
          disabled={isCheckingOut}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs   flex items-center justify-center gap-2 shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
          style={{ backgroundColor: accentHex, color: onAccentHex }}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>{buttonLabel}</span>
        </button>
      </div>
    );
  }

  const { surfaceHex, surfaceBorderHex, surfaceTextHex, surfaceMutedHex } = theme;
  return (
    <div
      className="p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg"
      style={{ backgroundColor: surfaceHex, borderColor: surfaceBorderHex }}
    >
      <div className="flex items-center gap-3 text-left w-full sm:w-auto">
        <div
          className="p-2.5 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${accentHex}20`, color: accentHex }}
        >
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold" style={{ color: surfaceTextHex }}>
            Full Playlist Access Required
          </h4>
          <p className="text-xs" style={{ color: surfaceMutedHex }}>
            Unlocks all {itemCount} videos in this collection
          </p>
        </div>
      </div>
      <button
        onClick={handleClick}
        disabled={isCheckingOut}
        className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs   flex items-center justify-center gap-2 shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
        style={{ backgroundColor: accentHex, color: onAccentHex }}
      >
        <ShoppingBag className="w-3.5 h-3.5" />
        <span>{buttonLabel}</span>
      </button>
    </div>
  );
}
