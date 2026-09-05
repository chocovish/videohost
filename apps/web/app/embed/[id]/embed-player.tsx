"use client";

import { useRef } from "react";
import VideoPlayer from "@/components/VideoPlayer";
import VideoAnalyticsTracker from "@/components/analytics/video-analytics-tracker";
import type { SubtitleTrack } from "@/components/VideoPlayerCore";

interface EmbedPlayerProps {
  videoId: string;
  src: string;
  poster?: string;
  subtitles: SubtitleTrack[];
}

export default function EmbedPlayer({ videoId, src, poster, subtitles }: EmbedPlayerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={wrapRef} className="w-full h-full">
      <VideoPlayer src={src} poster={poster} subtitles={subtitles} className="w-full h-full" />
      <VideoAnalyticsTracker videoId={videoId} source="embed" containerRef={wrapRef} />
    </div>
  );
}
