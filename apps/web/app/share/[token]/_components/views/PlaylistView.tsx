"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Clock,
  ListVideo,
  Play,
  Search,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VideoThumbnail from "@/components/VideoThumbnail";
import { formatDuration } from "@/lib/video-utils";
import type { PriceInfo, SharedData } from "../types";
import type { ShareTheme } from "../share-theme";
import { CtaCard } from "../ui/CtaCard";
import { ExpandableRichText } from "@/components/ui/expandable-rich-text";
import { PurchaseBanner } from "../ui/PurchaseBanner";
import { filterPlaylistQueue, isPlaylistLocked } from "../playlist-helpers";
import { PlaylistEpisodeItem } from "./playlist/PlaylistEpisodeItem";

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
  /** Navigate to the dedicated episode page (`/share/:videoId?playlistId=`). */
  onVideoClick: (videoId: string) => void;
}

/**
 * Playlist overview — full-width editorial hero + single ghost episode list.
 *
 * No card-in-card: the page owns ONE bordered shell (the episode list);
 * every row inside is a borderless ghost button. The hero itself is plain
 * type + actions, with the first-video thumbnail as a wide preview tile
 * so large screens stop collapsing into a narrow `max-w-3xl` column.
 */
export function PlaylistView({
  data,
  theme,
  priceInfo,
  copied,
  onCopyLink,
  isCheckingOut,
  onSignIn,
  onFreeClaim,
  onOpenCheckout,
  onVideoClick,
}: PlaylistViewProps) {
  const [query, setQuery] = useState("");

  const playlist = data.playlist;
  const videos = useMemo(() => data.videos ?? [], [data.videos]);
  const filtered = useMemo(() => filterPlaylistQueue(videos, query), [videos, query]);

  const { accentHex, onAccentHex } = theme;
  const locked = isPlaylistLocked(data);

  if (!playlist) return null;

  const firstVideo = videos[0];
  const divideClass = theme.isLight ? "divide-slate-200" : "divide-white/10";

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* ── Hero: info + preview tile share the row on desktop ───────── */}
      <section className="grid items-start gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:gap-8">
        <div className="min-w-0 space-y-3 sm:space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ backgroundColor: `${accentHex}18`, color: accentHex }}
            >
              <ListVideo className="size-3.5" />
              Playlist
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums ${theme.dividerBorder} ${theme.mutedText}`}
            >
              {videos.length} {videos.length === 1 ? "video" : "videos"}
            </span>
            {playlist.totalDurationSeconds > 0 ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums ${theme.dividerBorder} ${theme.mutedText}`}
              >
                <Clock className="size-3" />
                {formatDuration(playlist.totalDurationSeconds)} total
              </span>
            ) : null}
          </div>

          <h1
            className="text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl xl:text-4xl"
            style={{ color: theme.headingHex }}
          >
            {playlist.title}
          </h1>

          {playlist.description ? (
            <ExpandableRichText
              content={playlist.description}
              clampLines={4}
              textClassName="text-sm leading-relaxed sm:text-[15px]"
              textStyle={{ color: theme.bodyHex }}
              accentColor={theme.accentHex}
              mutedColor={theme.mutedHex}
            />
          ) : null}

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
            <Button
              size="default"
              className="w-full font-semibold sm:w-auto"
              disabled={videos.length === 0}
              style={{ backgroundColor: accentHex, color: onAccentHex }}
              onClick={() => firstVideo && onVideoClick(firstVideo.id)}
            >
              <Play className="fill-current" />
              {locked ? "View playlist" : "Play first video"}
            </Button>
            <Button
              variant="outline"
              size="default"
              className="w-full sm:w-auto"
              onClick={onCopyLink}
            >
              {copied ? <Check /> : <Share2 />}
              {copied ? "Link copied" : "Share playlist"}
            </Button>
          </div>
        </div>

        {/* Preview tile — first episode, tap to start */}
        <button
          type="button"
          disabled={!firstVideo}
          onClick={() => firstVideo && onVideoClick(firstVideo.id)}
          className={`group relative block w-full overflow-hidden border text-left ${theme.dividerBorder} ${theme.roundnessClass} ${theme.cardBgClass} focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-default`}
          aria-label={firstVideo ? `Play ${firstVideo.title}` : "Playlist preview"}
        >
          <div className="aspect-video w-full bg-black">
            {firstVideo?.thumbnailUrl ? (
              <VideoThumbnail
                src={firstVideo.thumbnailUrl}
                alt={firstVideo.title}
                status={(firstVideo as unknown as { status: string }).status}
                storageType={(firstVideo as unknown as { storageType: string }).storageType}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ListVideo className="size-10 text-muted-foreground" />
              </div>
            )}
          </div>
          {/* Hover veil */}
          {firstVideo ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100">
              <span
                className="flex size-14 items-center justify-center rounded-full shadow-xl"
                style={{ backgroundColor: accentHex, color: onAccentHex }}
              >
                <Play className="size-5 fill-current" />
              </span>
            </span>
          ) : null}
          {/* Bottom strip: up-next inside the tile, not a second card */}
          <span
            className={`flex items-center justify-between gap-3 border-t px-3.5 py-2.5 ${theme.dividerBorder}`}
          >
            <span className="min-w-0">
              <span className={`block text-[11px] font-semibold tracking-wider uppercase ${theme.mutedText}`}>
                {firstVideo ? "Start watching" : "No episodes yet"}
              </span>
              {firstVideo ? (
                <span
                  className="block truncate text-sm font-medium"
                  style={{ color: theme.headingHex }}
                >
                  Ep 1 · {firstVideo.title}
                </span>
              ) : null}
            </span>
            {firstVideo?.durationSeconds ? (
              <span
                className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${theme.mutedText}`}
                style={{ backgroundColor: `${accentHex}14` }}
              >
                {formatDuration(firstVideo.durationSeconds)}
              </span>
            ) : null}
          </span>
        </button>
      </section>

      {data.accessMode === "PURCHASABLE" && !data.isPurchased ? (
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
      ) : null}

      {/* ── Episode list: ONE shell, ghost rows inside ───────────────── */}
      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-baseline gap-2">
            <h2
              className="text-base font-semibold tracking-tight sm:text-lg"
              style={{ color: theme.headingHex }}
            >
              Episodes
            </h2>
            <span className={`text-xs tabular-nums sm:text-[13px] ${theme.mutedText}`}>
              {filtered.length}/{videos.length}
            </span>
          </div>
          {videos.length > 3 ? (
            <div className="relative w-full sm:w-72 sm:shrink-0">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search episodes..."
                className="pl-9"
                aria-label="Search episodes"
              />
            </div>
          ) : null}
        </div>

        <div
          className={`overflow-hidden border ${theme.dividerBorder} ${theme.cardBgClass} ${theme.roundnessClass}`}
        >
          {videos.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <ListVideo className="mx-auto mb-2 size-8 text-muted-foreground" />
              <p className="text-sm font-semibold" style={{ color: theme.headingHex }}>
                This playlist is empty
              </p>
              <p className={`mt-1 text-xs sm:text-[13px] ${theme.mutedText}`}>
                Check back later for new videos.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Search className="mx-auto mb-2 size-7 text-muted-foreground" />
              <p className="text-sm font-semibold" style={{ color: theme.headingHex }}>
                No episodes match “{query}”
              </p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setQuery("")}>
                Clear search
              </Button>
            </div>
          ) : (
            <ol className={`divide-y ${divideClass} p-1.5 sm:p-2`}>
              {filtered.map((video) => {
                const index = videos.findIndex((v) => v.id === video.id);
                return (
                  <li key={video.id}>
                    <PlaylistEpisodeItem
                      video={video}
                      index={index >= 0 ? index : 0}
                      locked={locked}
                      onSelect={() => onVideoClick(video.id)}
                      showChevron
                      showDescription
                      accentHex={theme.accentHex}
                      mutedHex={theme.mutedHex}
                    />
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <CtaCard theme={theme} variant="compact" />
      </section>
    </div>
  );
}
