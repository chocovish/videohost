"use client";

import {
  ArrowLeft,
  Check,
  Clock,
  Film,
  Folder,
  Share2,
} from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import { formatDuration } from "@/lib/video-utils";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import type { PriceInfo, SharedData } from "../types";
import type { ShareTheme } from "../share-theme";
import { CtaCard } from "../ui/CtaCard";
import { SocialShareBar } from "../ui/SocialShareBar";
import { PaywallHero } from "../ui/PaywallHero";
import { PurchaseBanner } from "../ui/PurchaseBanner";
import { SecureLinkBadge } from "./SecureLinkBadge";

interface VideoViewProps {
  data: SharedData;
  theme: ShareTheme;
  priceInfo: PriceInfo;
  copied: boolean;
  onCopyLink: () => void;
  selectedCountry: string;
  onCountryChange: (countryCode: string) => void;
  isCheckingOut: boolean;
  onSignIn: () => void;
  onFreeClaim: () => void;
  onOpenCheckout: () => void;
  onBackToFolder: () => void;
}

/** Single-video share view: player (or paywall), details, CTA, social. */
export function VideoView({
  data,
  theme,
  priceInfo,
  copied,
  onCopyLink,
  selectedCountry,
  onCountryChange,
  isCheckingOut,
  onSignIn,
  onFreeClaim,
  onOpenCheckout,
  onBackToFolder,
}: VideoViewProps) {
  const video = data.video;
  if (!video) return null;

  const {
    config,
    cardBgClass,
    roundnessClass,
    dividerBorder,
    strongText,
    mutedText,
    faintText,
    accentHex,
    onAccentHex,
    headingHex,
    bodyHex,
    mutedHex,
  } = theme;
  const isLight = theme.isLight;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Back to Folder Navigation */}
      {data.parentFolder && (
        <div
          className={`flex items-center justify-between gap-3 text-[13px] px-4 py-2.5 border ${cardBgClass} ${roundnessClass}`}
        >
          <button
            onClick={onBackToFolder}
            className={`font-medium flex items-center gap-2 transition-colors cursor-pointer ${isLight ? "text-slate-600 hover:text-slate-900" : "text-zinc-400 hover:text-white"}`}
          >
            <span
              className={`w-6 h-6 rounded-md border flex items-center justify-center ${dividerBorder} ${isLight ? "bg-slate-100" : "bg-white/5"}`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </span>
            <span className="flex items-center gap-1.5">
              <span>Back to</span>
              <span className={`font-semibold ${strongText}`}>{data.parentFolder.name}</span>
            </span>
          </button>

          <div className={`hidden sm:flex items-center gap-1.5 text-xs ${mutedText}`}>
            <Folder className="w-3.5 h-3.5" />
            <span>Folder</span>
          </div>
        </div>
      )}

      {/* Video Player or Purchasable Paywall */}
      <div
        className={
          video.playbackUrl
            ? `aspect-video w-full overflow-hidden border ${dividerBorder} ${roundnessClass}`
            : `w-full min-h-[320px] sm:aspect-video overflow-hidden border relative ${dividerBorder} ${roundnessClass}`
        }
      >
        {video.playbackUrl ? (
          <VideoPlayer
            src={video.playbackUrl}
            poster={video.thumbnailUrl}
            subtitles={video.subtitles || []}
            className="w-full h-full rounded-lg"
          />
        ) : data.accessMode === "PURCHASABLE" ? (
          <PaywallHero
            theme={theme}
            kind="video"
            title={video.title}
            backdropThumbnailUrl={video.thumbnailUrl}
            priceInfo={priceInfo}
            countryPricing={data.countryPricing}
            defaultCurrency={data.currency || "USD"}
            selectedCountry={selectedCountry}
            onCountryChange={onCountryChange}
            isLoggedIn={data.isLoggedIn}
            isCheckingOut={isCheckingOut}
            onSignIn={onSignIn}
            onFreeClaim={onFreeClaim}
            onOpenCheckout={onOpenCheckout}
          />
        ) : (
          <div className="w-full h-full min-h-[300px] bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-6 border border-slate-800">
            <Film className="w-12 h-12 mb-2 text-slate-600 animate-pulse" />
            <p className="text-sm font-semibold">Video is processing or unplayable.</p>
          </div>
        )}
      </div>

      {/* Video Detail & Controls Card */}
      <div className={`p-6 sm:p-7 space-y-6 ${cardBgClass} ${roundnessClass}`}>
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 ${dividerBorder}`}
        >
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1.5 border"
                style={{
                  backgroundColor: `${accentHex}12`,
                  borderColor: `${accentHex}30`,
                  color: accentHex,
                }}
              >
                <Film className="w-3.5 h-3.5" /> Video
              </span>
              {config.showDuration && video.durationSeconds && (
                <span
                  className={`px-2.5 py-1 border text-xs font-medium rounded-full flex items-center gap-1.5 ${isLight ? "bg-slate-100 border-slate-200 text-slate-600" : "bg-white/5 border-white/10 text-zinc-400"}`}
                >
                  <Clock className="w-3.5 h-3.5" style={{ color: accentHex }} />
                  {formatDuration(video.durationSeconds)}
                </span>
              )}
            </div>
            <h1
              className="text-xl sm:text-2xl font-semibold tracking-tight leading-snug"
              style={{ color: headingHex }}
            >
              {video.title}
            </h1>
          </div>

          {config.showShareButton && (
            <button
              onClick={onCopyLink}
              className={`self-start sm:self-auto h-9 px-3.5 text-[13px] font-medium rounded-lg border transition-all flex items-center gap-2 shrink-0 cursor-pointer ${isLight ? "bg-slate-900 text-white hover:opacity-90 border-slate-900" : "bg-white text-slate-900 hover:opacity-90 border-white"}`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Purchasable Video Quick Action Banner */}
        {data.accessMode === "PURCHASABLE" && !data.isPurchased && (
          <PurchaseBanner
            theme={theme}
            kind="video"
            priceInfo={priceInfo}
            isLoggedIn={data.isLoggedIn}
            isCheckingOut={isCheckingOut}
            onSignIn={onSignIn}
            onFreeClaim={onFreeClaim}
            onOpenCheckout={onOpenCheckout}
          />
        )}

        {video.description && (
          <div className="space-y-1.5">
            <h3
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: mutedHex }}
            >
              Description
            </h3>
            <RichTextViewer
              content={video.description}
              className="text-sm leading-relaxed [&_a]:underline"
              style={{ color: bodyHex }}
              accentColor={accentHex}
              mutedColor={mutedHex}
            />
          </div>
        )}

        {/* Call-to-Action (CTA) Card (if enabled) — respects customize-share-page */}
        <CtaCard theme={theme} variant="compact" />

        {/* Social Sharing Bar */}
        <SocialShareBar theme={theme} />

        {/* Portal Security Badge */}
        <SecureLinkBadge
          displayTitle={theme.displayTitle}
          dividerBorder={dividerBorder}
          faintText={faintText}
        />
      </div>
    </div>
  );
}
