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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
 * The URL is the source of truth, so reloads and shared links land back
 * on the same video. The playlist queue lives in the bottom drawer
 * (mobile) and the sidebar (desktop) with prev/next in both places.
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
    <div className="mx-auto w-full max-w-6xl space-y-4 pb-24 sm:space-y-6 lg:pb-0">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onBackToPlaylist}>
          <ArrowLeft />
          <span className="max-w-40 truncate sm:max-w-64">
            {playlist?.title ?? "Playlist"}
          </span>
        </Button>
        {queue.length > 0 ? (
          <Badge variant="secondary" className="shrink-0 tabular-nums">
            Episode {index + 1} of {queue.length}
          </Badge>
        ) : null}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main column */}
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <Card className="gap-0 overflow-hidden py-0">
            <div className="aspect-video w-full bg-black">
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

            {/* Inline transport */}
            <div className="flex items-center gap-2 border-t border-border p-2 sm:p-3">
              <Button
                variant="outline"
                size="sm"
                onClick={goPrevious}
                disabled={!prev}
                className="flex-1 sm:flex-none"
              >
                <SkipBack /> <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </Button>
              <div className="hidden min-w-0 flex-1 items-center gap-2 px-1 sm:flex">
                <Progress value={progress} className="w-full" />
              </div>
              <Button
                size="sm"
                onClick={goNext}
                disabled={!next}
                className="flex-1 sm:flex-none"
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
                <ListVideo /> Queue
              </Button>
            </div>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary">
                  <ListVideo className="size-3" />
                  {playlist?.title ?? "Playlist"} · {index + 1}/{queue.length || 1}
                </Badge>
                {theme.config.showDuration && video.durationSeconds ? (
                  <Badge variant="outline" className="tabular-nums">
                    <Clock className="size-3" />
                    {formatDuration(video.durationSeconds)}
                  </Badge>
                ) : null}
              </div>
              <CardTitle className="text-xl leading-snug sm:text-2xl">
                {video.title}
              </CardTitle>
              {upNext ? (
                <CardDescription>
                  Up next: <span className="font-medium text-foreground">{upNext.title}</span>
                </CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                {theme.config.showShareButton ? (
                  <Button variant="outline" size="sm" onClick={onCopyLink}>
                    {copied ? <Check /> : <Share2 />}
                    {copied ? "Copied" : "Share this video"}
                  </Button>
                ) : null}
                <Button variant="ghost" size="sm" onClick={onBackToPlaylist}>
                  <ArrowLeft /> All episodes
                </Button>
              </div>

              {data.accessMode === "PURCHASABLE" && !data.isPurchased ? (
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
              ) : null}

              {playlistLocked && playlistData ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm">
                      This episode is part of a paid playlist — unlock it to keep watching
                      the full series.
                    </p>
                    <Button size="sm" variant="outline" onClick={onBackToPlaylist}>
                      View playlist offer
                    </Button>
                  </CardContent>
                </Card>
              ) : null}

              {video.description ? (
                <div className="space-y-1">
                  <h3 className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    About this video
                  </h3>
                  <ExpandableRichText
                    content={video.description}
                    clampLines={5}
                    textClassName="text-sm"
                  />
                </div>
              ) : null}

              <CtaCard theme={theme} variant="compact" />
              <SocialShareBar theme={theme} />
              <SecureLinkBadge
                displayTitle={theme.displayTitle}
                dividerBorder={theme.dividerBorder}
                faintText={theme.faintText}
              />
            </CardContent>
          </Card>
        </div>

        {/* Desktop sidebar queue */}
        <Card className="hidden lg:flex lg:max-h-[calc(100vh-8rem)] lg:flex-col lg:overflow-hidden">
          <CardHeader className="gap-3 pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ListVideo className="size-4" style={{ color: accentHex }} />
                Playlist queue
              </CardTitle>
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
          </CardHeader>
          <Separator />
          <CardContent className="min-h-0 flex-1 overflow-y-auto pt-3">
            {playlistLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-12 w-20 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sidebarVideos.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
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
          </CardContent>
        </Card>
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
