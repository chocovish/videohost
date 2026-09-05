"use client";

import { DollarSign, Loader2, Lock, LogIn, ShieldCheck, Sparkles } from "lucide-react";
import type { CountryPrice, PriceInfo } from "../types";
import type { ShareTheme } from "../share-theme";
import { CountrySelector } from "./CountrySelector";

interface PaywallHeroProps {
  theme: ShareTheme;
  /** Controls the exact historical copy + frame for each content type. */
  kind: "video" | "playlist";
  title: string;
  backdropThumbnailUrl?: string | null;
  itemCount?: number;
  priceInfo: PriceInfo;
  countryPricing?: CountryPrice[];
  defaultCurrency?: string;
  selectedCountry: string;
  onCountryChange: (countryCode: string) => void;
  isLoggedIn?: boolean;
  isCheckingOut: boolean;
  onSignIn: () => void;
  onFreeClaim: () => void;
  onOpenCheckout: () => void;
}

/**
 * Always-dark purchasable paywall hero (video + playlist share the layout;
 * only the copy and backdrop source differ — preserved via `kind`).
 */
export function PaywallHero({
  theme,
  kind,
  title,
  backdropThumbnailUrl,
  itemCount = 0,
  priceInfo,
  countryPricing,
  defaultCurrency = "USD",
  selectedCountry,
  onCountryChange,
  isLoggedIn,
  isCheckingOut,
  onSignIn,
  onFreeClaim,
  onOpenCheckout,
}: PaywallHeroProps) {
  const { accentHex, onAccentHex } = theme;
  const isVideo = kind === "video";

  return (
    <div
      className={
        isVideo
          ? "relative w-full h-full min-h-[440px] sm:min-h-0 bg-slate-950 flex flex-col items-center justify-center text-center p-5 sm:p-8 overflow-hidden border border-slate-800"
          : "relative w-full h-full min-h-[440px] sm:min-h-0 bg-slate-950 flex flex-col items-center justify-center text-center p-5 sm:p-8 overflow-hidden"
      }
    >
      {/* Poster Backdrop with Blur */}
      {backdropThumbnailUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-lg opacity-25 scale-105"
          style={{ backgroundImage: `url(${backdropThumbnailUrl})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />

      <div className="relative z-10 max-w-md w-full mx-auto space-y-3.5 sm:space-y-4 flex flex-col items-center">
        <div
          className="p-3 sm:p-3.5 rounded-2xl flex items-center justify-center shadow-lg border"
          style={{
            backgroundColor: `${accentHex}20`,
            borderColor: `${accentHex}40`,
            color: accentHex,
          }}
        >
          <Lock className="w-6 h-6 sm:w-7 sm:h-7" />
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {isVideo ? "Purchasable Video" : `Purchasable Playlist • ${itemCount} Videos Included`}
          </span>
          <h3 className="text-lg sm:text-2xl font-semibold text-white leading-snug">{title}</h3>
        </div>

        {/* Listed price based on current country */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md text-center min-w-[180px] sm:min-w-[200px] shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {isVideo ? "Price" : "Playlist Price"}
          </p>
          <p
            className="text-2xl sm:text-3xl font-semibold tracking-tight mt-0.5"
            style={{ color: accentHex }}
          >
            {priceInfo.formatted}
          </p>
        </div>

        {/* Country Selector for Dynamic Pricing */}
        <CountrySelector
          theme={theme}
          variant="dark"
          value={selectedCountry}
          onChange={onCountryChange}
          countryPricing={countryPricing}
          defaultCurrency={defaultCurrency}
        />

        {/* Action Button */}
        {!isLoggedIn ? (
          <button
            onClick={onSignIn}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm   flex items-center justify-center gap-2 transition-all shadow-xl hover:opacity-90 active:scale-95 cursor-pointer"
            style={{ backgroundColor: accentHex, color: onAccentHex }}
          >
            <LogIn className="w-4 h-4" />
            <span>
              {isVideo
                ? priceInfo.isFree
                  ? "Sign in to Claim for Free"
                  : `Sign in to Purchase • ${priceInfo.formatted}`
                : priceInfo.isFree
                  ? "Sign in to Unlock Playlist for Free"
                  : `Sign in to Unlock Playlist • ${priceInfo.formatted}`}
            </span>
          </button>
        ) : (
          <button
            onClick={priceInfo.isFree ? onFreeClaim : onOpenCheckout}
            disabled={isCheckingOut}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-sm   flex items-center justify-center gap-2 transition-all shadow-xl hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: accentHex, color: onAccentHex }}
          >
            {isCheckingOut ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />{" "}
                {isVideo ? "Claiming Free Access..." : "Unlocking Playlist..."}
              </>
            ) : priceInfo.isFree ? (
              <>
                <Sparkles className="w-4 h-4 stroke-[2.5]" />
                <span>Buy for Free</span>
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4 stroke-[3]" />
                <span>
                  {isVideo
                    ? `Buy Now • ${priceInfo.formatted}`
                    : `Unlock Full Playlist • ${priceInfo.formatted}`}
                </span>
              </>
            )}
          </button>
        )}

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Instant Access &bull; Secure Checkout</span>
        </div>
      </div>
    </div>
  );
}
