"use client";

import dynamic from "next/dynamic";
import type { VideoPlayerProps } from "./VideoPlayerCore";

const VideoPlayerCore = dynamic(() => import("./VideoPlayerCore"), {
  ssr: false,
  loading: () => (
    <div className="relative h-full w-full bg-black/90 flex items-center justify-center animate-pulse" />
  ),
});

export default function VideoPlayer(props: VideoPlayerProps) {
  return <VideoPlayerCore {...props} />;
}

export type { VideoPlayerProps };
