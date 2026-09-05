"use client";

import { ListVideo, SkipBack, SkipForward } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface PlaylistBottomBarProps {
  title: string;
  currentIndex: number;
  total: number;
  accentHex: string;
  onAccentHex: string;
  onPrevious: () => void;
  onNext: () => void;
  onOpenQueue: () => void;
}

/**
 * Sticky mobile transport bar — prev / position / next + queue trigger.
 * Desktop uses the inline sidebar instead, so this renders below `lg`.
 */
export function PlaylistBottomBar({
  title,
  currentIndex,
  total,
  accentHex,
  onAccentHex,
  onPrevious,
  onNext,
  onOpenQueue,
}: PlaylistBottomBarProps) {
  const progress = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <Progress value={progress} className="w-full gap-0 [&_[data-slot=progress-track]]:h-1 [&_[data-slot=progress-track]]:rounded-none" />
      <div className="flex items-center gap-1 px-2 py-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevious}
          disabled={currentIndex <= 0}
          aria-label="Previous video"
        >
          <SkipBack />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNext}
          disabled={currentIndex >= total - 1}
          aria-label="Next video"
        >
          <SkipForward />
        </Button>

        <button
          type="button"
          onClick={onOpenQueue}
          className="min-w-0 flex-1 rounded-lg px-2 py-1 text-left transition-colors hover:bg-muted"
          aria-label="Open playlist queue"
        >
          <span className="block truncate text-[13px] leading-tight font-medium">{title}</span>
          <span className="mt-0.5 flex items-center gap-1.5">
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] tabular-nums">
              {currentIndex + 1}/{total}
            </Badge>
            <span className="text-[11px] font-medium" style={{ color: accentHex }}>
              Tap for queue
            </span>
          </span>
        </button>

        <Button
          size="sm"
          onClick={onOpenQueue}
          style={{ backgroundColor: accentHex, color: onAccentHex }}
          aria-label="Show playlist episodes"
        >
          <ListVideo /> Queue
        </Button>
      </div>
    </div>
  );
}
