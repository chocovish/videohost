"use client";

import { Check, ChevronRight, Clock, Lock, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import VideoThumbnail from "@/components/VideoThumbnail";
import { formatDuration } from "@/lib/video-utils";
import { cn } from "@/lib/utils";
import type { SharedVideoItem } from "../../types";

interface PlaylistEpisodeItemProps {
  video: SharedVideoItem;
  /** 0-based position — rendered as `Ep {index + 1}`. */
  index: number;
  locked: boolean;
  onSelect: () => void;
  /** Queue mode: highlight the currently playing episode. */
  isActive?: boolean;
  accentHex?: string;
  /** Queue mode (sidebar/drawer) uses a smaller thumb to fit 320px rails. */
  compact?: boolean;
  /** Queue mode: leading position / now-playing badge. */
  showLeadingStatus?: boolean;
  /** Overview mode: trailing chevron. */
  showChevron?: boolean;
  /** Overview mode: one-line description on md+ screens. */
  showDescription?: boolean;
}

/**
 * Single shared episode row — extracted from the playlist overview card
 * so the overview list (`PlaylistView`) and the episode-page queue
 * (`PlaylistQueueList` → sidebar + bottom drawer) render identical
 * thumbnail / title / meta UI from one source.
 *
 * Title is always clamped to 2 lines with an ellipsis
 * (`line-clamp-2 overflow-hidden text-ellipsis break-words`) so long
 * titles — including unbroken strings — never push the layout.
 */
export function PlaylistEpisodeItem({
  video,
  index,
  locked,
  onSelect,
  isActive = false,
  accentHex,
  compact = false,
  showLeadingStatus = false,
  showChevron = false,
  showDescription = false,
}: PlaylistEpisodeItemProps) {
  return (
    <Card
      size="sm"
      variant="interactive"
      className={cn("cursor-pointer gap-0 p-2", isActive && "hover:-translate-y-0")}
      style={
        isActive && accentHex
          ? { backgroundColor: `${accentHex}14`, borderColor: `${accentHex}45` }
          : undefined
      }
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Play ${video.title}`}
      aria-current={isActive ? "true" : undefined}
    >
      <div className="flex items-center gap-2.5">
        {showLeadingStatus ? (
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums"
            style={
              isActive && accentHex
                ? { backgroundColor: `${accentHex}20`, color: accentHex }
                : undefined
            }
          >
            {isActive ? (
              <Play className="size-3 fill-current" style={accentHex ? { color: accentHex } : undefined} />
            ) : (
              <span className="text-muted-foreground">{index + 1}</span>
            )}
          </span>
        ) : null}

        <div
          className={cn(
            "relative shrink-0 overflow-hidden rounded-md bg-muted",
            compact ? "w-20 sm:w-24" : "w-24 sm:w-40"
          )}
        >
          <div className="aspect-video w-full">
            <VideoThumbnail
              src={video.thumbnailUrl}
              alt={video.title}
              status={(video as unknown as { status: string }).status}
              storageType={(video as unknown as { storageType: string }).storageType}
              compact
              className="h-full w-full object-cover"
            />
          </div>
          {video.durationSeconds ? (
            <span className="absolute right-1 bottom-1 rounded bg-black/80 px-1 py-px text-[9px] font-semibold text-white tabular-nums">
              {formatDuration(video.durationSeconds)}
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="line-clamp-2 overflow-hidden text-[13px] leading-snug font-medium text-ellipsis break-words sm:text-sm sm:font-semibold"
            style={isActive && accentHex ? { color: accentHex } : undefined}
          >
            {video.title}
          </p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] tabular-nums text-muted-foreground sm:text-xs">
            {isActive ? (
              <span
                className="inline-flex shrink-0 items-center gap-1 font-semibold"
                style={accentHex ? { color: accentHex } : undefined}
              >
                <Check className="size-3" /> Now playing
              </span>
            ) : (
              <>
                <span className="shrink-0">Ep {index + 1}</span>
                {video.durationSeconds ? (
                  <span className="inline-flex shrink-0 items-center gap-1">
                    ·
                    <Clock className="size-2.5" />
                    {formatDuration(video.durationSeconds)}
                  </span>
                ) : null}
              </>
            )}
            {locked && !isActive ? (
              showLeadingStatus ? (
                <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[10px]">
                  <Lock className="size-2.5" /> Locked
                </Badge>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-0.5">
                  · <Lock className="size-2.5" /> Locked
                </span>
              )
            ) : null}
          </p>
          {showDescription && video.description ? (
            <RichTextViewer
              content={video.description}
              clamp={1}
              className="mt-0.5 hidden text-xs leading-snug text-muted-foreground line-clamp-1 md:block"
            />
          ) : null}
        </div>

        {showChevron ? (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        ) : null}
      </div>
    </Card>
  );
}
