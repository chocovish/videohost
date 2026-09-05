"use client";

import { ChevronRight, Film, Folder, Play } from "lucide-react";
import VideoThumbnail from "@/components/VideoThumbnail";
import { formatDuration } from "@/lib/video-utils";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import type { SharedData } from "../types";
import type { ShareTheme } from "../share-theme";

interface FolderViewProps {
  data: SharedData;
  theme: ShareTheme;
  subfolderId: string | null;
  onSubfolderClick: (folderId: string) => void;
  onBackToRoot: () => void;
  onVideoClick: (videoId: string) => void;
}

/** Folder share view: breadcrumb, subfolders grid, videos grid. */
export function FolderView({
  data,
  theme,
  subfolderId,
  onSubfolderClick,
  onBackToRoot,
  onVideoClick,
}: FolderViewProps) {
  if (!data.currentFolder) return null;

  const {
    config,
    cardBgClass,
    roundnessClass,
    accentHex,
    onAccentHex,
    headingHex,
    bodyHex,
    mutedHex,
    iconHex,
    surfaceBorderHex,
  } = theme;
  const isLight = theme.isLight;

  return (
    <div className="space-y-6">
      {/* Floating Breadcrumb Bar */}
      <div
        className={`flex items-center gap-2 text-xs sm:text-sm backdrop-blur-xl px-4 py-3 border ${cardBgClass} ${roundnessClass}`}
        style={{ color: mutedHex }}
      >
        <button
          onClick={onBackToRoot}
          className="font-bold flex items-center gap-2 transition-colors group cursor-pointer hover:opacity-80"
          style={{ color: headingHex }}
        >
          <div
            className="p-1.5 rounded-lg group-hover:scale-110 transition-transform"
            style={{
              backgroundColor: `${accentHex}15`,
              color: accentHex,
            }}
          >
            <Folder className="w-4 h-4" />
          </div>
          <span>{data.rootFolder?.name || "Shared Folder"}</span>
        </button>
        {subfolderId && (
          <>
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: iconHex }} />
            <span
              className="font-semibold px-3 py-1 rounded-lg border"
              style={{
                color: headingHex,
                backgroundColor: isLight ? "#f1f5f9" : "rgba(30,41,59,0.6)",
                borderColor: surfaceBorderHex,
              }}
            >
              {data.currentFolder.name}
            </span>
          </>
        )}
      </div>

      {/* Subfolders Section */}
      {data.subfolders && data.subfolders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: mutedHex }}>
            Folders ({data.subfolders.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.subfolders.map((sf) => (
              <button
                key={sf.id}
                onClick={() => onSubfolderClick(sf.id)}
                className={`flex items-center gap-3.5 p-4 border transition-all duration-300 text-left group shadow-lg hover:-translate-y-1 backdrop-blur-md cursor-pointer ${cardBgClass} ${roundnessClass}`}
              >
                <div className="p-3 bg-linear-to-br from-amber-500/20 to-amber-600/10 text-amber-400 rounded-xl border border-amber-500/20 group-hover:scale-110 transition-transform duration-300">
                  <Folder className="w-5 h-5 fill-amber-500/30" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-bold transition-colors truncate"
                    style={{ color: headingHex }}
                  >
                    {sf.name}
                  </p>
                  <p className="text-[11px] font-semibold" style={{ color: mutedHex }}>
                    Folder
                  </p>
                </div>
                <ChevronRight
                  className="w-4 h-4 group-hover:translate-x-0.5 transition-all"
                  style={{ color: iconHex }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Videos Grid Section */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: mutedHex }}>
          Videos ({data.videos?.length || 0})
        </h2>

        {!data.videos || data.videos.length === 0 ? (
          <div
            className={`py-16 text-center border backdrop-blur-md ${cardBgClass} ${roundnessClass}`}
          >
            <Film className="w-12 h-12 mx-auto mb-3 animate-pulse" style={{ color: iconHex }} />
            <p className="text-sm font-bold" style={{ color: headingHex }}>
              No videos in this folder
            </p>
            <p className="text-xs mt-1" style={{ color: mutedHex }}>
              Check back later for new updates.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {data.videos.map((vid) => (
              <div
                key={vid.id}
                onClick={() => onVideoClick(vid.id)}
                className={`group relative border overflow-hidden shadow-xl transition-all duration-300 hover:-translate-y-1.5 backdrop-blur-md cursor-pointer ${cardBgClass} ${roundnessClass}`}
              >
                {/* Thumbnail Box */}
                <div className="aspect-video bg-slate-950 relative overflow-hidden flex items-center justify-center">
                  <VideoThumbnail
                    src={vid.thumbnailUrl}
                    alt={vid.title}
                    status={(vid as unknown as { status: string }).status}
                    storageType={(vid as unknown as { storageType: string }).storageType}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />

                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-[2px]">
                    <div
                      className="p-3.5   rounded-full shadow-xl scale-90 group-hover:scale-100 transition-transform duration-300"
                      style={{ backgroundColor: accentHex, color: onAccentHex }}
                    >
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>

                  {config.showDuration && vid.durationSeconds && (
                    <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-slate-950/80 backdrop-blur-md text-[11px] font-semibold text-slate-200 rounded-md border border-slate-800/80 shadow-md">
                      {formatDuration(vid.durationSeconds)}
                    </span>
                  )}
                </div>

                {/* Content Info */}
                <div className="p-4 space-y-1.5">
                  <h3
                    className="text-sm font-bold group-hover:opacity-90 transition-colors line-clamp-1"
                    style={{ color: headingHex }}
                  >
                    {vid.title}
                  </h3>
                  {vid.description ? (
                    <RichTextViewer
                      content={vid.description}
                      clamp={2}
                      className="text-xs line-clamp-2 leading-relaxed"
                      style={{ color: bodyHex }}
                    />
                  ) : (
                    <p className="text-xs italic" style={{ color: mutedHex }}>
                      No description
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
