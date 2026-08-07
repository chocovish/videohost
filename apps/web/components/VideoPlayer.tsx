"use client";

import { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import Player from "video.js/dist/types/player";
import { Settings, Check, Sparkles } from "lucide-react";

interface QualityOption {
  label: string;
  height: number;
  bitrate: number;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  controls?: boolean;
  autoplay?: boolean;
  onReady?: (player: Player) => void;
  className?: string;
}

export default function VideoPlayer({
  src,
  poster,
  controls = true,
  autoplay = false,
  onReady,
  className = "",
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any | null>(null);

  const [qualities, setQualities] = useState<QualityOption[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string>("auto");
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!playerRef.current && videoRef.current) {
      const videoElement = document.createElement("video-js");
      videoElement.classList.add("vjs-big-play-centered", "vjs-fluid", "rounded-xl", "overflow-hidden");
      videoRef.current.appendChild(videoElement);

      const player = (playerRef.current = videojs(
        videoElement,
        {
          controls,
          autoplay,
          preload: "auto",
          poster,
          html5: {
            vhs: {
              overrideNative: true,
            },
            nativeAudioTracks: false,
            nativeVideoTracks: false,
          },
          sources: [
            {
              src,
              type: "application/x-mpegURL",
            },
          ],
        },
        () => {
          videojs.log("player is ready");

          // Initialize Video.js Quality Levels API if present
          const playerAny = player as any;
          if (typeof playerAny.qualityLevels === "function") {
            const qualityLevels = playerAny.qualityLevels();

            const updateQualities = () => {
              const list: QualityOption[] = [];
              for (let i = 0; i < qualityLevels.length; i++) {
                const level = qualityLevels[i];
                const height = level.height || 0;
                const bitrate = level.bitrate ? Math.round(level.bitrate / 1000) : 0;
                const label = height ? `${height}p` : `Rendition ${i + 1}`;

                if (height && !list.some((q) => q.height === height)) {
                  list.push({ label, height, bitrate });
                }
              }
              list.sort((a, b) => b.height - a.height);
              setQualities(list);
            };

            qualityLevels.on("addqualitylevel", updateQualities);
            qualityLevels.on("change", updateQualities);
          }

          if (onReady) {
            onReady(player);
          }
        }
      ));
    } else if (playerRef.current) {
      const player = playerRef.current;
      player.autoplay(autoplay);
      player.src([{ src, type: "application/x-mpegURL" }]);
      if (poster) player.poster(poster);
    }
  }, [src, poster, controls, autoplay, onReady]);

  useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  const handleQualityChange = (heightStr: string) => {
    setSelectedQuality(heightStr);
    setShowMenu(false);

    if (!playerRef.current || typeof playerRef.current.qualityLevels !== "function") return;

    const qualityLevels = playerRef.current.qualityLevels();

    if (heightStr === "auto") {
      for (let i = 0; i < qualityLevels.length; i++) {
        qualityLevels[i].enabled = true;
      }
    } else {
      const targetHeight = parseInt(heightStr, 10);
      for (let i = 0; i < qualityLevels.length; i++) {
        qualityLevels[i].enabled = qualityLevels[i].height === targetHeight;
      }
    }
  };

  return (
    <div data-vjs-player className={`relative w-full shadow-2xl rounded-xl overflow-hidden group ${className}`}>
      <div ref={videoRef} className="w-full" />

      {/* Quality Switcher Floating Overlay Menu */}
      {qualities.length > 0 && (
        <div className="absolute top-3 right-3 z-30">
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black/70 hover:bg-black/90 backdrop-blur-md text-white text-xs font-semibold rounded-lg border border-white/20 transition-all shadow-lg hover:scale-105 active:scale-95"
              title="Select Video Quality"
            >
              <Settings className="w-3.5 h-3.5 text-sky-400" />
              <span>{selectedQuality === "auto" ? "Auto" : `${selectedQuality}p`}</span>
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-44 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1 z-40 text-xs">
                <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase border-b border-white/10 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Video Quality
                </div>

                <button
                  onClick={() => handleQualityChange("auto")}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                    selectedQuality === "auto"
                      ? "bg-sky-500/20 text-sky-400 font-bold"
                      : "text-slate-200 hover:bg-white/10"
                  }`}
                >
                  <div className="flex flex-col">
                    <span>Auto (ABR)</span>
                    <span className="text-[10px] text-slate-400">Adaptive Bitrate</span>
                  </div>
                  {selectedQuality === "auto" && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </button>

                {qualities.map((q) => {
                  const isSelected = selectedQuality === String(q.height);
                  return (
                    <button
                      key={q.height}
                      onClick={() => handleQualityChange(String(q.height))}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                        isSelected ? "bg-sky-500/20 text-sky-400 font-bold" : "text-slate-200 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span>{q.label}</span>
                        {q.bitrate > 0 && <span className="text-[10px] text-slate-400">{q.bitrate} kbps</span>}
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

