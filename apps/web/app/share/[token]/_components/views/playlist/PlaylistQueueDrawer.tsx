"use client";

import { useMemo, useState } from "react";
import { ListVideo, Search, SkipBack, SkipForward } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { SharedVideoItem } from "../../types";
import { filterPlaylistQueue } from "../../playlist-helpers";
import { PlaylistQueueList } from "./PlaylistQueueList";

interface PlaylistQueueDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videos: SharedVideoItem[];
  currentVideoId: string;
  currentIndex: number;
  locked: boolean;
  accentHex: string;
  onSelect: (videoId: string) => void;
  onPrevious: () => void;
  onNext: () => void;
}

/**
 * Bottom-sheet queue — the single place to switch episodes.
 * Selecting an episode navigates (URL-driven) so reloads persist.
 */
export function PlaylistQueueDrawer({
  open,
  onOpenChange,
  videos,
  currentVideoId,
  currentIndex,
  locked,
  accentHex,
  onSelect,
  onPrevious,
  onNext,
}: PlaylistQueueDrawerProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => filterPlaylistQueue(videos, query), [videos, query]);

  const handleSelect = (videoId: string) => {
    onOpenChange(false);
    onSelect(videoId);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerHeader className="text-left">
          <div className="flex items-center justify-between gap-3">
            <DrawerTitle className="flex items-center gap-2">
              <ListVideo className="size-4" style={{ color: accentHex }} />
              Up next
            </DrawerTitle>
            <Badge variant="secondary" className="tabular-nums">
              {currentIndex + 1}/{videos.length}
            </Badge>
          </div>
          
          {videos.length > 3 ? (
            <div className="relative pt-2">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search episodes..."
                className="mt-2 pl-9"
                aria-label="Search episodes in playlist"
              />
            </div>
          ) : null}
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center">
              <Search className="mx-auto mb-2 size-7 text-muted-foreground" />
              <p className="text-sm font-medium">No episodes match “{query}”</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setQuery("")}>
                Clear search
              </Button>
            </div>
          ) : (
            <PlaylistQueueList
              videos={filtered}
              currentVideoId={currentVideoId}
              locked={locked}
              accentHex={accentHex}
              onSelect={handleSelect}
            />
          )}
        </div>

        <Separator />
        <DrawerFooter className="flex-row items-center gap-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={currentIndex <= 0}
            onClick={onPrevious}
          >
            <SkipBack /> Previous
          </Button>
          <Button
            className="flex-1"
            disabled={currentIndex >= videos.length - 1}
            style={
              currentIndex >= videos.length - 1
                ? undefined
                : { backgroundColor: accentHex }
            }
            onClick={onNext}
          >
            Next <SkipForward />
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
