"use client";

import { useMemo } from "react";
import { createPlayer } from "@videojs/react";
import { Video, VideoSkin, videoFeatures } from "@videojs/react/video";
import { HlsJsVideo } from "@videojs/react/media/hlsjs-video";
import "@videojs/react/video/skin.css";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  controls?: boolean;
  autoplay?: boolean;
  onReady?: (player: any) => void;
  className?: string;
}

const Player = createPlayer({ features: videoFeatures });

export default function VideoPlayer({
  src,
  poster,
  controls = false,
  autoplay = false,
  onReady,
  className = "",
}: VideoPlayerProps) {
  const isHls = src ? src.includes(".m3u8") || src.includes("/hls/") : false;

  const resolvedSrc = useMemo(() => {
    if (!src) return "";
    if (
      typeof window !== "undefined" &&
      !src.startsWith("http://") &&
      !src.startsWith("https://") &&
      !src.startsWith("blob:")
    ) {
      try {
        return new URL(src, window.location.origin).href;
      } catch {
        return src;
      }
    }
    return src;
  }, [src]);

  return (
    <div
      className={`relative h-full w-full overflow-hidden group select-none ${className}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Player.Provider>
        <VideoSkin poster={poster} className="w-full h-full">
          {isHls ? (
            <HlsJsVideo
              src={resolvedSrc}
              autoPlay={autoplay}
              controls={controls}
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <Video
              src={resolvedSrc}
              autoPlay={autoplay}
              controls={controls}
              playsInline
              className="w-full h-full object-cover"
            />
          )}
        </VideoSkin>
      </Player.Provider>
    </div>
  );
}







