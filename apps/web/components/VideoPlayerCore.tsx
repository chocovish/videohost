"use client";

import { useMemo } from "react";
import { VideoPlayer as VjsPlayer, VideoSkin, Video } from "@videojs/react/video";
import { HlsJsVideo } from "@videojs/react/media/hlsjs-video";
import { DashVideo } from "@videojs/react/media/dash-video";
import "@videojs/react/video/skin.css";

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  controls?: boolean;
  autoplay?: boolean;
  onReady?: (player: any) => void;
  className?: string;
}

export default function VideoPlayerCore({
  src,
  poster,
  controls = false,
  autoplay = false,
  className = "",
}: VideoPlayerProps) {
  const isBunnyEmbed = src ? src.includes("iframe.mediadelivery.net") : false;
  const isDash = src ? !isBunnyEmbed && src.includes(".mpd") : false;
  const isHls = src ? !isBunnyEmbed && !isDash && src.includes(".m3u8") : false;

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

  const mediaProps = {
    src: resolvedSrc,
    autoPlay: autoplay,
    controls,
    playsInline: true,
    className: "w-full h-full object-contain",
  };

  // Bunny Stream embed – render secure iframe
  if (isBunnyEmbed) {
    return (
      <div
        className={`relative h-full w-full overflow-hidden group select-none bg-black ${className}`}
        onContextMenu={(e) => e.preventDefault()}
      >
        <iframe
          src={src}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          title="Bunny Stream Video Player"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative h-full w-full overflow-hidden group select-none ${className}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <VjsPlayer poster={poster}>
        <VideoSkin className="w-full h-full">
          {isDash ? (
            <DashVideo {...mediaProps} />
          ) : isHls ? (
            <HlsJsVideo {...mediaProps} />
          ) : (
            <Video {...mediaProps} />
          )}
        </VideoSkin>
      </VjsPlayer>
    </div>
  );
}
