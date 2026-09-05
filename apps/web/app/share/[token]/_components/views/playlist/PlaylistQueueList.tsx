"use client";

import type { SharedVideoItem } from "../../types";
import { PlaylistEpisodeItem } from "./PlaylistEpisodeItem";

interface PlaylistQueueListProps {
  videos: SharedVideoItem[];
  currentVideoId: string;
  locked: boolean;
  accentHex: string;
  onSelect: (videoId: string) => void;
}

/**
 * Episode queue — rendered inside the desktop sidebar and inside the
 * mobile bottom drawer from a single source.
 *
 * Reuses `PlaylistEpisodeItem` (the same card as the playlist overview
 * list) in compact queue mode, so the 2-line ellipsis title stays
 * identical everywhere.
 */
export function PlaylistQueueList({
  videos,
  currentVideoId,
  locked,
  accentHex,
  onSelect,
}: PlaylistQueueListProps) {
  return (
    <ul className="space-y-0.5">
      {videos.map((video, i) => (
        <li key={video.id}>
          <PlaylistEpisodeItem
            video={video}
            index={i}
            locked={locked}
            onSelect={() => onSelect(video.id)}
            isActive={video.id === currentVideoId}
            accentHex={accentHex}
            compact
            showLeadingStatus
          />
        </li>
      ))}
    </ul>
  );
}
