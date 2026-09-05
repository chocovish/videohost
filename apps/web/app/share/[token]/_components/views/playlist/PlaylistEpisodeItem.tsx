"use client";

import { Check, ChevronRight, Clock, Lock, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  /** Queue mode (sidebar/drawer) uses a smaller thumb to fit 360–400px rails. */
  compact?: boolean;
  /** Queue mode: leading position / now-playing badge. */
  showLeadingStatus?: boolean;
  /** Overview mode: trailing chevron. */
  showChevron?: boolean;
  /** Overview mode: one-line description on md+ screens. */
  showDescription?: boolean;
}

/**
 * Ghost episode row — deliberately NOT a Card so lists never nest
 * card-in-card. The parent owns the single bordered shell; rows are
 * borderless hover states with tight spacing, which reclaims the
 * horizontal space the old nested cards wasted.
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
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Play ${video.title}`}
      aria-current={isActive ? "true" : undefined}
      style={
        isActive && accentHex
          ? { backgroundColor: `${accentHex}14` }
          : undefined
      }
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors",
        "hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        compact ? "sm:gap-2.5" : "sm:gap-4 sm:px-3 sm:py-2.5",
        isActive && "hover:bg-transparent"
      )}
    >
      {showLeadingStatus ? (
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tabular-nums"
          style={
            isActive && accentHex
              ? { backgroundColor: `${accentHex}22`, color: accentHex }
              : undefined
          }
          aria-hidden
        >
          {isActive ? (
            <Play
              className="size-3 fill-current"
              style={accentHex ? { color: accentHex } : undefined}
            />
          ) : (
            <span className="text-muted-foreground">{index + 1}</span>
          )}
        </span>
      ) : (
        !compact && (
          <span
            className="hidden w-7 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground sm:block"
            aria-hidden
          >
            {String(index + 1).padStart(2, "0")}
          </span>
        )
      )}

      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-lg bg-muted",
          compact ? "w-24 sm:w-28" : "w-32 sm:w-52 lg:w-60"
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
        {isActive && accentHex ? (
          <span
            className="pointer-events-none absolute inset-0 rounded-lg border-2"
            style={{ borderColor: `${accentHex}55` }}
            aria-hidden
          />
        ) : null}
        {video.durationSeconds ? (
          <span className="absolute right-1 bottom-1 rounded bg-black/80 px-1 py-px text-[10px] font-semibold text-white tabular-nums">
            {formatDuration(video.durationSeconds)}
          </span>
        ) : null}
        {/* Hover play veil — desktop only, keeps mobile rows clean */}
        <span
          className="absolute inset-0 hidden items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100 sm:flex"
          aria-hidden
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-white/90 text-black">
            <Play className="size-3.5 fill-current" />
          </span>
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="line-clamp-2 overflow-hidden text-sm leading-snug font-medium text-ellipsis break-words sm:text-[15px] sm:font-semibold"
          style={isActive && accentHex ? { color: accentHex } : undefined}
        >
          {video.title}
        </p>
        <p className="mt-1 flex items-center gap-1.5 truncate text-xs tabular-nums text-muted-foreground">
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
                  · <Clock className="size-3" />
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
              <span className="inline-flex shrink-0 items-center gap-1">
                · <Lock className="size-3" /> Locked
              </span>
            )
          ) : null}
        </p>
        {showDescription && video.description ? (
          <RichTextViewer
            content={video.description}
            clamp={1}
            className="mt-1 hidden text-[13px] leading-snug text-muted-foreground line-clamp-1 md:block"
          />
        ) : null}
      </div>

      {showChevron ? (
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      ) : null}
    </button>
  );
}
