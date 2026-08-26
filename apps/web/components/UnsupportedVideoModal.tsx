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
    if (t === "video") return "bg-primary/15 text-primary border-primary/30";
    if (t === "audio") return "bg-secondary/60 text-secondary-foreground border-border";
    if (t === "subtitle") return "bg-muted text-foreground border-border";
    return "bg-muted text-muted-foreground border-border";
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
      <DialogContent className="max-w-lg z-70 max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-destructive/15 border border-destructive/25 text-destructive shrink-0">
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

        <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 py-1 pr-1">
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
            <p className="text-xs leading-relaxed">
              Videos are containerized to MKV before upload using strict stream copy. The following streams in this file cannot be decoded or played by your web browser:
            </p>
          </div>

          {/* List of unsupported tracks and reasons */}
          <div className="space-y-2">
            {unsupportedTracks.length > 0 ? (
              unsupportedTracks.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-muted/40 border border-border space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-extrabold uppercase px-2 py-0.5 rounded-md border ${getTrackBadgeVariant(
                          item.type
                        )}`}
                      >
                        {item.type}
                      </span>
                      <Badge variant="outline" className="font-mono lowercase">
                        {item.codec}
                      </Badge>
                    </div>
                    <span className="text-xs font-semibold text-destructive capitalize px-2 py-0.5 rounded-md bg-destructive/10 border border-destructive/20">
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
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-foreground text-xs leading-relaxed">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>
              <strong>How to fix:</strong> Re-encode the video using standard web codecs (e.g. <strong>H.264 / AAC</strong> in MP4 or <strong>VP9 / Opus</strong> in WebM), or choose a standard web-compatible video file before uploading.
            </span>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-3 border-t border-border shrink-0 mt-3">
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
