"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Clock,
  Film,
  ListVideo,
  Search,
  Share2,
  SkipBack,
  SkipForward,
} from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/video-utils";
import type { PriceInfo, SharedData } from "../types";
import type { ShareTheme } from "../share-theme";
import { CtaCard } from "../ui/CtaCard";
import { ExpandableRichText } from "@/components/ui/expandable-rich-text";
import { PaywallHero } from "../ui/PaywallHero";
import { PurchaseBanner } from "../ui/PurchaseBanner";
import { SocialShareBar } from "../ui/SocialShareBar";
import { SecureLinkBadge } from "./SecureLinkBadge";
import {
  filterPlaylistQueue,
  getPlaylistNeighbors,
  isPlaylistLocked,
} from "../playlist-helpers";
import { PlaylistQueueList } from "./playlist/PlaylistQueueList";
import { PlaylistQueueDrawer } from "./playlist/PlaylistQueueDrawer";
import { PlaylistBottomBar } from "./playlist/PlaylistBottomBar";

interface PlaylistEpisodeViewProps {
  data: SharedData;
  playlistData: SharedData | null;
  playlistLoading: boolean;
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
  /** URL-driven navigation — pushes `/share/:videoId?playlistId=`. */
  onOpenVideo: (videoId: string) => void;
  onBackToPlaylist: () => void;
}

/**
 * Dedicated episode page (`/share/:videoId?playlistId=:playlistId`).
 *
 * Watch-style layout: the player + details are plain full-bleed content
 * (no Card chrome), and the queue owns the page's single bordered shell.
 * Queue rows are ghost buttons, so there is never card-in-card nesting
 * and the 360–400px rail + fluid main column use the full `max-w-7xl`
 * width on desktop while stacking cleanly on mobile.
 */
export function PlaylistEpisodeView({
  data,
  playlistData,
  playlistLoading,
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
  onOpenVideo,
  onBackToPlaylist,
}: PlaylistEpisodeViewProps) {
  const [queueOpen, setQueueOpen] = useState(false);
  const [sidebarQuery, setSidebarQuery] = useState("");

  const video = data.video;
  const { accentHex, onAccentHex } = theme;

  const queue = useMemo(() => playlistData?.videos ?? [], [playlistData?.videos]);
  const playlist = playlistData?.playlist;
  const { prev, next, index } = useMemo(
    () => getPlaylistNeighbors(queue, video?.id),
    [queue, video?.id]
  );
  const sidebarVideos = useMemo(
    () => filterPlaylistQueue(queue, sidebarQuery),
    [queue, sidebarQuery]
  );
  const upNext = next ?? queue.slice(index + 1, index + 4)[0] ?? null;

  if (!video) return null;

  const playlistLocked = isPlaylistLocked(playlistData);
  const progress = queue.length > 0 ? ((index + 1) / queue.length) * 100 : 0;

  const goPrevious = () => {
    if (prev) onOpenVideo(prev.id);
  };
  const goNext = () => {
    if (next) onOpenVideo(next.id);
  };

  return (
    <div className="w-full pb-24 lg:pb-0">
      {/* Breadcrumb — plain, no card */}
      <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBackToPlaylist}
          className="-ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft />
          <span className="max-w-44 truncate sm:max-w-xs">
            {playlist?.title ?? "Playlist"}
          </span>
        </Button>
        {queue.length > 0 ? (
          <Badge variant="secondary" className="shrink-0 tabular-nums">
            Episode {index + 1} of {queue.length}
          </Badge>
        ) : null}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-7 xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-8">
        {/* ── Main column: player + plain details ─────────────────── */}
        <div className="min-w-0">
          {/* Player — own rounded shell, transport sits below as plain row */}
          <div
            className={`aspect-video w-full overflow-hidden border bg-black ${theme.dividerBorder} ${theme.roundnessClass}`}
          >
            {video.playbackUrl ? (
              <VideoPlayer
                key={video.id}
                src={video.playbackUrl}
                poster={video.thumbnailUrl}
                subtitles={video.subtitles || []}
                className="h-full w-full"
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
              <div className="flex h-full min-h-60 w-full flex-col items-center justify-center p-6 text-slate-400">
                <Film className="mb-2 size-12 animate-pulse text-slate-600" />
                <p className="text-sm font-semibold">Video is processing or unplayable.</p>
              </div>
            )}
          </div>

          {/* Transport — ghost toolbar, not a card footer */}
          <div className="flex items-center gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={goPrevious}
              disabled={!prev}
              className="flex-1 sm:flex-none"
              aria-label="Previous episode"
            >
              <SkipBack /> <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </Button>
            <div className="hidden min-w-0 flex-1 items-center gap-2.5 px-1 sm:flex">
              <Progress value={progress} className="w-full" />
              <span className={`shrink-0 text-xs tabular-nums ${theme.mutedText}`}>
                {queue.length > 0 ? `${index + 1}/${queue.length}` : "—"}
              </span>
            </div>
            <Button
              size="sm"
              onClick={goNext}
              disabled={!next}
              className="flex-1 font-semibold sm:flex-none"
              style={next ? { backgroundColor: accentHex, color: onAccentHex } : undefined}
            >
              Next <SkipForward />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQueueOpen(true)}
              className="lg:hidden"
            >
              <ListVideo /> <span className="hidden min-[400px]:inline">Queue</span>
            </Button>
          </div>
          {/* Mobile progress — thin, under transport (bottom bar also shows it) */}
          <div className="pt-2 sm:hidden">
            <Progress value={progress} className="w-full" />
          </div>

          {/* Title block — plain type, dividers instead of card padding */}
          <div className="space-y-3 pt-4 sm:pt-5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{ backgroundColor: `${accentHex}18`, color: accentHex }}
              >
                <ListVideo className="size-3" />
                {playlist?.title ?? "Playlist"} · {index + 1}/{queue.length || 1}
              </span>
              {theme.config.showDuration && video.durationSeconds ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums ${theme.dividerBorder} ${theme.mutedText}`}
                >
                  <Clock className="size-3" />
                  {formatDuration(video.durationSeconds)}
                </span>
              ) : null}
            </div>

            <h1
              className="text-xl leading-snug font-semibold tracking-tight text-balance sm:text-2xl xl:text-[28px]"
              style={{ color: theme.headingHex }}
            >
              {video.title}
            </h1>
            {upNext ? (
              <p className={`text-sm ${theme.mutedText}`}>
                Up next:{" "}
                <button
                  type="button"
                  onClick={() => onOpenVideo(upNext.id)}
                  className="font-medium underline-offset-2 hover:underline"
                  style={{ color: theme.headingHex }}
                >
                  {upNext.title}
                </button>
              </p>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {theme.config.showShareButton ? (
                <Button variant="outline" size="sm" onClick={onCopyLink} className="w-full sm:w-auto">
                  {copied ? <Check /> : <Share2 />}
                  {copied ? "Copied" : "Share this video"}
                </Button>
              ) : null}
            </div>
          </div>

          {data.accessMode === "PURCHASABLE" && !data.isPurchased ? (
            <div className="pt-4">
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
            </div>
          ) : null}

          {playlistLocked && playlistData ? (
            <div
              className={`mt-4 flex flex-col gap-2 rounded-xl border border-dashed px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${theme.dividerBorder}`}
            >
              <p className="text-sm" style={{ color: theme.bodyHex }}>
                This episode is part of a paid playlist — unlock it to keep watching
                the full series.
              </p>
              <Button size="sm" variant="outline" onClick={onBackToPlaylist} className="shrink-0">
                View playlist offer
              </Button>
            </div>
          ) : null}

          {video.description ? (
            <div className={`mt-5 space-y-1.5 border-t pt-4 ${theme.dividerBorder}`}>
              <h3 className={`text-xs font-semibold tracking-wider uppercase ${theme.mutedText}`}>
                About this video
              </h3>
              <ExpandableRichText
                content={video.description}
                clampLines={5}
                textClassName="text-sm leading-relaxed sm:text-[15px]"
              />
            </div>
          ) : null}

          <div className={`mt-5 space-y-5 border-t pt-5 ${theme.dividerBorder}`}>
            <CtaCard theme={theme} variant="compact" />
            <SocialShareBar theme={theme} />
            <SecureLinkBadge
              displayTitle={theme.displayTitle}
              dividerBorder={theme.dividerBorder}
              faintText={theme.faintText}
            />
          </div>
        </div>

        {/* ── Queue rail: the page's ONE bordered shell ─────────────── */}
        <aside
          className={`hidden lg:flex lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:flex-col lg:overflow-hidden lg:border ${theme.dividerBorder} ${theme.cardBgClass} ${theme.roundnessClass}`}
          aria-label="Playlist queue"
        >
          <div className="space-y-3 px-3.5 pt-3.5 pb-3">
            <div className="flex items-center justify-between gap-2">
              <h2
                className="flex items-center gap-2 text-sm font-semibold"
                style={{ color: theme.headingHex }}
              >
                <ListVideo className="size-4" style={{ color: accentHex }} />
                Playlist queue
              </h2>
              <Badge variant="secondary" className="tabular-nums">
                {queue.length > 0 ? `${index + 1}/${queue.length}` : "—"}
              </Badge>
            </div>
            {queue.length > 3 ? (
              <div className="relative">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={sidebarQuery}
                  onChange={(e) => setSidebarQuery(e.target.value)}
                  placeholder="Search episodes..."
                  className="pl-9"
                  aria-label="Search episodes in playlist"
                />
              </div>
            ) : null}
          </div>
          <div className={`border-t ${theme.dividerBorder}`} />
          <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {playlistLoading ? (
              <div className="space-y-2 p-1.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="aspect-video w-28 shrink-0 rounded-lg" />
                    <div className="flex-1 space-y-1.5 py-1">
                      <Skeleton className="h-3.5 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sidebarVideos.length === 0 ? (
              <p className={`py-8 text-center text-sm ${theme.mutedText}`}>
                {queue.length === 0 ? "No episodes in this playlist yet." : "No matches."}
              </p>
            ) : (
              <PlaylistQueueList
                videos={sidebarVideos}
                currentVideoId={video.id}
                locked={playlistLocked}
                accentHex={accentHex}
                onSelect={onOpenVideo}
              />
            )}
          </div>
        </aside>
      </div>

      {/* Mobile bottom transport + queue drawer */}
      <PlaylistBottomBar
        title={video.title}
        currentIndex={queue.length > 0 ? index : 0}
        total={queue.length || 1}
        accentHex={accentHex}
        onAccentHex={onAccentHex}
        onPrevious={goPrevious}
        onNext={goNext}
        onOpenQueue={() => setQueueOpen(true)}
      />
      <PlaylistQueueDrawer
        open={queueOpen}
        onOpenChange={setQueueOpen}
        videos={queue}
        currentVideoId={video.id}
        currentIndex={queue.length > 0 ? index : 0}
        locked={playlistLocked}
        accentHex={accentHex}
        onSelect={onOpenVideo}
        onPrevious={goPrevious}
        onNext={goNext}
      />
    </div>
  );
}
