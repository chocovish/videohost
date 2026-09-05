"use client";

import { useState } from "react";
import {
  Check,
  Clock,
  Film,
  ListVideo,
  Play,
  Search,
  Share2,
  SkipBack,
  SkipForward,
} from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import VideoThumbnail from "@/components/VideoThumbnail";
import { formatDuration } from "@/lib/video-utils";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import type { PriceInfo, SharedData, SharedVideoItem } from "../types";
import type { ShareTheme } from "../share-theme";
import { CtaCard } from "../ui/CtaCard";
import { PaywallHero } from "../ui/PaywallHero";
import { PurchaseBanner } from "../ui/PurchaseBanner";

interface PlaylistViewProps {
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
}

interface PlayerControlsProps {
  theme: ShareTheme;
  activeIndex: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}

/** Previous / track-position / next bar under the playlist player. */
function PlaylistPlayerControls({ theme, activeIndex, total, onPrevious, onNext }: PlayerControlsProps) {
  const { accentHex, onAccentHex } = theme;
  const isFirst = activeIndex === 0;
  const isLast = activeIndex >= total - 1;

  return (
    <div className="p-3 bg-slate-950/95 border-t border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-300">
      <button
        onClick={onPrevious}
        disabled={isFirst}
        className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800/80 font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
      >
        <SkipBack className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Previous</span>
      </button>

      <div className="flex items-center gap-2 font-bold text-xs">
        <span className="text-slate-400 font-mono">
          Track {activeIndex + 1} of {total}
        </span>
      </div>

      <button
        onClick={onNext}
        disabled={isLast}
        className="px-3 py-1.5 font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
        style={{
          backgroundColor: !isLast ? accentHex : "rgba(30,41,59,0.8)",
          color: !isLast ? onAccentHex : "#94a3b8",
          opacity: isLast ? 0.3 : 1,
        }}
      >
        <span className="hidden sm:inline">Next Video</span>
        <SkipForward className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

interface PlaylistQueueProps {
  theme: ShareTheme;
  videos: SharedVideoItem[];
  activeIndex: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelect: (index: number) => void;
}

/** Searchable, scrollable tracklist queue (right column). */
function PlaylistQueue({
  theme,
  videos,
  activeIndex,
  searchQuery,
  onSearchChange,
  onSelect,
}: PlaylistQueueProps) {
  const { cardBgClass, roundnessClass, dividerBorder, accentHex, headingHex, mutedHex, iconHex } =
    theme;
  const isLight = theme.isLight;
  const { surfaceBorderHex } = theme;

  const filteredQueue = videos.filter((v) =>
    v.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`p-4 space-y-3 backdrop-blur sticky top-24 ${cardBgClass} ${roundnessClass}`}>
      <div className={`flex items-center justify-between border-b pb-3 ${dividerBorder}`}>
        <div className="flex items-center gap-2">
          <ListVideo className="w-4 h-4" style={{ color: accentHex }} />
          <h3 className="font-bold text-sm" style={{ color: headingHex }}>
            Playlist Queue
          </h3>
        </div>
        <span className="text-xs font-mono font-bold" style={{ color: mutedHex }}>
          {activeIndex + 1}/{videos.length}
        </span>
      </div>

      {/* Search Filter for Playlist Tracks */}
      {videos.length > 3 && (
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5" style={{ color: iconHex }} />
          <input
            type="text"
            placeholder="Filter queue..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border rounded-xl outline-hidden focus:ring-1"
            style={{
              backgroundColor: isLight ? "#f8fafc" : "rgba(2,6,23,0.6)",
              borderColor: surfaceBorderHex,
              color: headingHex,
            }}
          />
        </div>
      )}

      {/* Scrollable Track Queue */}
      <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
        {filteredQueue.map((video) => {
          const originalIdx = videos.findIndex((v) => v.id === video.id);
          const isActive = originalIdx === activeIndex;

          return (
            <div
              key={video.id}
              onClick={() => onSelect(originalIdx)}
              className={`p-2 rounded-xl border flex items-center gap-3 transition-all cursor-pointer group ${
                isActive ? "border-2 shadow-lg" : ""
              }`}
              style={{
                borderColor: isActive ? accentHex : surfaceBorderHex,
                backgroundColor: isActive
                  ? `${accentHex}15`
                  : isLight
                    ? "#f8fafc"
                    : "rgba(2,6,23,0.4)",
              }}
            >
              {/* Track Number / Play Indicator */}
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0">
                {isActive ? (
                  <Play className="w-3.5 h-3.5 fill-current" style={{ color: accentHex }} />
                ) : (
                  <span className="font-mono text-[11px]" style={{ color: mutedHex }}>
                    {originalIdx + 1}
                  </span>
                )}
              </div>

              {/* Thumbnail */}
              <div className="relative w-16 aspect-video rounded-lg overflow-hidden bg-black shrink-0">
                <VideoThumbnail
                  src={video.thumbnailUrl}
                  alt={video.title}
                  status={(video as unknown as { status: string }).status}
                  storageType={(video as unknown as { storageType: string }).storageType}
                  compact={true}
                  className="w-full h-full object-cover"
                />
                {video.durationSeconds && (
                  <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 bg-black/80 text-[8px] font-bold text-white rounded">
                    {formatDuration(video.durationSeconds)}
                  </span>
                )}
              </div>

              {/* Title & Info */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-bold truncate transition-colors"
                  style={{ color: isActive ? accentHex : headingHex }}
                >
                  {video.title}
                </p>
                {video.durationSeconds && (
                  <span
                    className="text-[10px] flex items-center gap-1 mt-0.5"
                    style={{ color: mutedHex }}
                  >
                    <Clock className="w-2.5 h-2.5" />
                    {formatDuration(video.durationSeconds)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Playlist share view: header banner, 2-column player + queue.
 * Owns the active-track index + queue filter (previously in the monolith).
 */
export function PlaylistView({
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
}: PlaylistViewProps) {
  const [activePlaylistIndex, setActivePlaylistIndex] = useState(0);
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState("");

  const playlist = data.playlist;
  if (!playlist) return null;

  const {
    config,
    cardBgClass,
    roundnessClass,
    dividerBorder,
    accentHex,
    headingHex,
    bodyHex,
    mutedHex,
    iconHex,
    surfaceBorderHex,
  } = theme;
  const isLight = theme.isLight;
  const videos = data.videos ?? [];
  const currentVideo = videos[activePlaylistIndex] || videos[0];

  return (
    <div className="space-y-6">
      {/* Top Playlist Header Banner */}
      <div
        className={`p-5 backdrop-blur-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${cardBgClass} ${roundnessClass}`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className="p-3 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
            style={{
              backgroundColor: `${accentHex}20`,
              color: accentHex,
            }}
          >
            <ListVideo className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: mutedHex }}
              >
                Shared Playlist
              </span>
              {playlist.totalDurationSeconds > 0 && (
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1"
                  style={{
                    backgroundColor: isLight ? "#f1f5f9" : "rgba(30,41,59,0.8)",
                    color: isLight ? bodyHex : "#cbd5e1",
                    borderColor: surfaceBorderHex,
                  }}
                >
                  <Clock className="w-3 h-3" style={{ color: accentHex }} />
                  {formatDuration(playlist.totalDurationSeconds)}
                </span>
              )}
            </div>
            <h1
              className="text-xl sm:text-2xl font-semibold tracking-tight"
              style={{ color: headingHex }}
            >
              {playlist.title}
            </h1>
            {playlist.description && (
              <div className="mt-1.5 max-w-2xl">
                <RichTextViewer
                  content={playlist.description}
                  className="text-xs sm:text-sm leading-relaxed [&_a]:underline"
                  style={{ color: bodyHex }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className="px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5"
            style={{
              backgroundColor: `${accentHex}15`,
              borderColor: `${accentHex}30`,
              color: accentHex,
            }}
          >
            <Film className="w-3.5 h-3.5" />
            {videos.length} {videos.length === 1 ? "Video" : "Videos"}
          </span>

          {config.showShareButton && (
            <button
              onClick={onCopyLink}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer border hover:opacity-90"
              style={{
                backgroundColor: isLight ? headingHex : "#1e293b",
                color: isLight ? "#ffffff" : "#e2e8f0",
                borderColor: isLight ? headingHex : surfaceBorderHex,
              }}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span>{copied ? "Link Copied" : "Share"}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2-Column Main View: Video Player + Playlist Tracklist Queue */}
      {videos.length === 0 ? (
        <div className={`py-16 text-center border backdrop-blur-md ${cardBgClass} ${roundnessClass}`}>
          <ListVideo className="w-12 h-12 mx-auto mb-3 animate-pulse" style={{ color: iconHex }} />
          <p className="text-sm font-bold" style={{ color: headingHex }}>
            This playlist is currently empty
          </p>
          <p className="text-xs mt-1" style={{ color: mutedHex }}>
            Check back later for new videos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column (2 cols): Video Player & Info */}
          <div className="lg:col-span-2 space-y-5">
            {/* Video Player Box or Purchasable Paywall */}
            <div className="relative group/player rounded-lg overflow-hidden shadow-sm bg-black border border-slate-800">
              <div
                className={
                  currentVideo?.playbackUrl
                    ? "aspect-video w-full"
                    : "w-full min-h-[440px] sm:min-h-[480px] sm:aspect-video"
                }
              >
                {currentVideo?.playbackUrl ? (
                  <VideoPlayer
                    key={currentVideo.id}
                    src={currentVideo.playbackUrl}
                    poster={currentVideo.thumbnailUrl}
                    subtitles={currentVideo.subtitles || []}
                    autoplay={activePlaylistIndex > 0 || config.autoPlayMuted}
                    className="w-full h-full"
                  />
                ) : data.accessMode === "PURCHASABLE" ? (
                  <PaywallHero
                    theme={theme}
                    kind="playlist"
                    title={playlist.title}
                    backdropThumbnailUrl={playlist.thumbnailUrl}
                    itemCount={videos.length}
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
                  <div className="w-full h-full min-h-[300px] bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-6">
                    <Film className="w-12 h-12 mb-2 text-slate-600 animate-pulse" />
                    <p className="text-sm font-semibold">Video is processing or unplayable.</p>
                  </div>
                )}
              </div>

              {/* Player Controls Bar */}
              <PlaylistPlayerControls
                theme={theme}
                activeIndex={activePlaylistIndex}
                total={videos.length}
                onPrevious={() => setActivePlaylistIndex((prev) => Math.max(0, prev - 1))}
                onNext={() =>
                  setActivePlaylistIndex((prev) => Math.min(videos.length - 1, prev + 1))
                }
              />
            </div>

            {/* Video Details Card */}
            <div className={`p-6 space-y-4 backdrop-blur ${cardBgClass} ${roundnessClass}`}>
              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${dividerBorder}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2.5 py-0.5 text-[10px] font-semibold rounded-md uppercase tracking-wider"
                      style={{
                        backgroundColor: `${accentHex}20`,
                        color: accentHex,
                      }}
                    >
                      Now Playing #{activePlaylistIndex + 1}
                    </span>
                    {config.showDuration && currentVideo?.durationSeconds && (
                      <span
                        className="px-2.5 py-0.5 border text-[11px] font-semibold rounded-md flex items-center gap-1"
                        style={{
                          backgroundColor: isLight ? "#f1f5f9" : "rgba(30,41,59,0.8)",
                          borderColor: surfaceBorderHex,
                          color: isLight ? bodyHex : "#cbd5e1",
                        }}
                      >
                        <Clock className="w-3 h-3" style={{ color: accentHex }} />
                        {formatDuration(currentVideo.durationSeconds)}
                      </span>
                    )}
                  </div>
                  <h2
                    className="text-xl sm:text-2xl font-semibold tracking-tight leading-snug"
                    style={{ color: headingHex }}
                  >
                    {currentVideo?.title}
                  </h2>
                </div>
              </div>

              {/* Purchasable Playlist Quick Action Banner */}
              {data.accessMode === "PURCHASABLE" && !data.isPurchased && (
                <PurchaseBanner
                  theme={theme}
                  kind="playlist"
                  itemCount={videos.length}
                  priceInfo={priceInfo}
                  isLoggedIn={data.isLoggedIn}
                  isCheckingOut={isCheckingOut}
                  onSignIn={onSignIn}
                  onFreeClaim={onFreeClaim}
                  onOpenCheckout={onOpenCheckout}
                />
              )}

              {currentVideo?.description && (
                <div className="space-y-1">
                  <h3
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: mutedHex }}
                  >
                    About this video
                  </h3>
                  <RichTextViewer
                    content={currentVideo.description}
                    className="text-sm leading-relaxed [&_a]:underline"
                    style={{ color: bodyHex }}
                  />
                </div>
              )}

              {/* Call-to-Action (CTA) Card (if enabled) */}
              <CtaCard theme={theme} variant="large" />
            </div>
          </div>

          {/* Right Column (1 col): Playlist Tracklist Queue */}
          <PlaylistQueue
            theme={theme}
            videos={videos}
            activeIndex={activePlaylistIndex}
            searchQuery={playlistSearchQuery}
            onSearchChange={setPlaylistSearchQuery}
            onSelect={setActivePlaylistIndex}
          />
        </div>
      )}
    </div>
  );
}
