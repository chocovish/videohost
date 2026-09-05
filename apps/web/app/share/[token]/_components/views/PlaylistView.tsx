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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
 * Playlist overview — details + episode list.
 *
 * Clicking an episode routes to its dedicated page
 * (`/share/:videoId?playlistId=:playlistId`) so reloads and shared links
 * land back on the same video with the queue available in the bottom drawer.
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

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3 sm:space-y-6">
      {/* Playlist header */}
      <Card size="sm">
        <CardHeader className="flex flex-row items-start gap-2.5 sm:gap-4">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg sm:size-12 sm:rounded-xl"
            style={{ backgroundColor: `${accentHex}15`, color: accentHex }}
          >
            <ListVideo className="size-4 sm:size-6" />
          </span>
          <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
            <Badge variant="secondary">Playlist</Badge>
            <CardTitle className="text-lg leading-tight sm:text-2xl">
              {playlist.title}
            </CardTitle>
            {playlist.description ? (
              <ExpandableRichText
                content={playlist.description}
                clampLines={5}
                textClassName="text-[13px] text-muted-foreground sm:text-sm"
              />
            ) : null}
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              <Badge variant="outline">
                {videos.length} {videos.length === 1 ? "video" : "videos"}
              </Badge>
              {playlist.totalDurationSeconds > 0 ? (
                <Badge variant="outline" className="tabular-nums">
                  <Clock className="size-3" />
                  {formatDuration(playlist.totalDurationSeconds)} total
                </Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-1.5 sm:flex-row sm:gap-2">
          <Button
            size="sm"
            className="w-full sm:w-auto"
            disabled={videos.length === 0}
            style={{ backgroundColor: accentHex, color: onAccentHex }}
            onClick={() => firstVideo && onVideoClick(firstVideo.id)}
          >
            <Play className="fill-current" />
            {locked ? "View playlist" : "Play first video"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={onCopyLink}
          >
            {copied ? <Check /> : <Share2 />}
            {copied ? "Link copied" : "Share playlist"}
          </Button>
        </CardContent>
      </Card>

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

      {/* Episode list */}
      <Card size="sm">
        <CardHeader className="gap-2 sm:gap-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm sm:text-base">Episodes</CardTitle>
            <span className="text-[11px] tabular-nums text-muted-foreground sm:text-xs">
              {filtered.length}/{videos.length}
            </span>
          </div>
          {videos.length > 3 ? (
            <div className="relative">
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
        </CardHeader>

        <CardContent className="space-y-1.5">
          {videos.length === 0 ? (
            <div className="py-8 text-center">
              <ListVideo className="mx-auto mb-2 size-8 text-muted-foreground" />
              <p className="text-sm font-semibold">This playlist is empty</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Check back later for new videos.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center">
              <Search className="mx-auto mb-2 size-7 text-muted-foreground" />
              <p className="text-sm font-semibold">No episodes match “{query}”</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setQuery("")}>
                Clear search
              </Button>
            </div>
          ) : (
            filtered.map((video) => {
              const index = videos.findIndex((v) => v.id === video.id);
              return (
                <PlaylistEpisodeItem
                  key={video.id}
                  video={video}
                  index={index >= 0 ? index : 0}
                  locked={locked}
                  onSelect={() => onVideoClick(video.id)}
                  showChevron
                  showDescription
                />
              );
            })
          )}

          <CtaCard theme={theme} variant="compact" />
        </CardContent>
      </Card>
    </div>
  );
}
