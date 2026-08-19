"use client";

import { AlertTriangle, FileVideo, XCircle, Info, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UnsupportedTrackInfo } from "@/lib/mediabunny-remux";

interface UnsupportedVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName?: string;
  unsupportedTracks: UnsupportedTrackInfo[];
  onSelectAnotherFile?: () => void;
}

export default function UnsupportedVideoModal({
  isOpen,
  onClose,
  fileName,
  unsupportedTracks,
  onSelectAnotherFile,
}: UnsupportedVideoModalProps) {
  const getTrackBadgeVariant = (type: string) => {
    const t = type.toLowerCase();
    if (t === "video") return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30";
    if (t === "audio") return "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30";
    if (t === "subtitle") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    return "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30";
  };

  const getReasonBadgeLabel = (reason: string) => {
    switch (reason) {
      case "browser_unplayable":
        return "Browser Unplayable";
      case "undecodable_source_codec":
        return "Undecodable Codec";
      case "unknown_source_codec":
        return "Unknown Codec";
      case "no_encodable_target_codec":
        return "MKV Incompatible";
      case "unsupported_container":
        return "Unsupported Container";
      case "no_media_tracks":
        return "No Media Streams";
      default:
        return reason.replace(/_/g, " ");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg z-70">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-red-500/15 border border-red-500/25 text-red-600 dark:text-red-400 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2">
                Video Tracks Not Supported
              </DialogTitle>
              <DialogDescription>
                Pre-upload MKV containerization halted: some tracks cannot be played in web browsers
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3.5 py-1">
          {/* File info banner */}
          {fileName && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border text-xs text-foreground font-medium">
              <FileVideo className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="truncate font-semibold">{fileName}</span>
            </div>
          )}

          {/* Explanation Alert */}
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-destructive shrink-0" />
              Unplayable Tracks Detected in Video File
            </p>
            <p className="text-[11.5px] leading-relaxed">
              Videos are containerized to MKV before upload using strict stream copy. The following streams in this file cannot be decoded or played by your web browser:
            </p>
          </div>

          {/* List of unsupported tracks and reasons */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {unsupportedTracks.length > 0 ? (
              unsupportedTracks.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-muted/40 border border-border space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${getTrackBadgeVariant(
                          item.type
                        )}`}
                      >
                        {item.type}
                      </span>
                      <Badge variant="outline" className="font-mono lowercase">
                        {item.codec}
                      </Badge>
                    </div>
                    <span className="text-[10px] font-semibold text-destructive capitalize px-2 py-0.5 rounded-md bg-destructive/10 border border-destructive/20">
                      {getReasonBadgeLabel(item.reason)}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-normal pl-0.5">
                    {item.friendlyReason}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
                Container or stream format is not supported for browser playback.
              </div>
            )}
          </div>

          {/* Help tip */}
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 text-[11px] leading-relaxed">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <span>
              <strong>How to fix:</strong> Re-encode the video using standard web codecs (e.g. <strong>H.264 / AAC</strong> in MP4 or <strong>VP9 / Opus</strong> in WebM), or choose a standard web-compatible video file before uploading.
            </span>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {onSelectAnotherFile && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onClose();
                onSelectAnotherFile();
              }}
              className="w-full sm:w-auto gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Choose Another File
            </Button>
          )}
          <Button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
