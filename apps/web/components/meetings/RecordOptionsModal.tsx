"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Disc,
  LayoutGrid,
  GalleryVerticalEnd,
  SquareUser,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";

export type RecordingLayout = "grid" | "speaker" | "single-speaker";

const LAYOUT_OPTIONS: {
  id: RecordingLayout;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "grid",
    label: "Grid",
    description:
      "All participants in equal tiles. Best for round-table discussions where everyone contributes equally.",
    icon: <LayoutGrid className="w-5 h-5" />,
  },
  {
    id: "speaker",
    label: "Speaker",
    description:
      "Active speaker shown large with other participants in a strip. Best for presentations with a group.",
    icon: <GalleryVerticalEnd className="w-5 h-5" />,
  },
  {
    id: "single-speaker",
    label: "Single Speaker",
    description:
      "Only the active speaker fills the frame. Best for one-on-one or lecture-style sessions.",
    icon: <SquareUser className="w-5 h-5" />,
  },
];

export interface RecordOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRecording: (options: { layout: RecordingLayout }) => Promise<void>;
  meetingTitle: string;
  isStarting?: boolean;
  initialLayout?: RecordingLayout;
  error?: string | null;
  onClearError?: () => void;
}

export default function RecordOptionsModal({
  isOpen,
  onClose,
  onStartRecording,
  meetingTitle,
  isStarting = false,
  initialLayout = "grid",
  error = null,
  onClearError,
}: RecordOptionsModalProps) {
  const [selectedLayout, setSelectedLayout] = useState<RecordingLayout>(initialLayout);

  useEffect(() => {
    if (isOpen) {
      setSelectedLayout(initialLayout);
    }
  }, [isOpen, initialLayout]);

  const handleSubmit = async () => {
    await onStartRecording({ layout: selectedLayout });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isStarting && onClose()}>
      <DialogContent
        variant="glass"
        size="lg"
        className="border-slate-800/80 bg-slate-900/95 text-slate-100 p-0 overflow-hidden shadow-2xl backdrop-blur-2xl max-w-xl"
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <Disc className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <DialogTitle>Meeting Recording Options</DialogTitle>
              <DialogDescription>
                Choose the recording layout for {meetingTitle}. Recording stops automatically
                when the meeting ends.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white">Recording Error</p>
                <p className="mt-0.5 text-rose-300">{error}</p>
              </div>
              {onClearError && (
                <button
                  onClick={onClearError}
                  className="text-rose-400 hover:text-white text-xs font-semibold underline shrink-0"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}

          {/* Layout Selection Cards */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Select Recording Layout
            </label>

            {LAYOUT_OPTIONS.map((layout) => (
              <div
                key={layout.id}
                onClick={() => {
                  setSelectedLayout(layout.id);
                  if (onClearError) onClearError();
                }}
                className={`group relative p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  selectedLayout === layout.id
                    ? "bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/30"
                    : "bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    selectedLayout === layout.id
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-slate-800/80 text-slate-400 group-hover:text-slate-200"
                  }`}
                >
                  {layout.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-white">{layout.label}</span>
                    {selectedLayout === layout.id && (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{layout.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 sm:p-6 border-t border-slate-800/80 bg-slate-950/60 shrink-0 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isStarting}>
            Cancel
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleSubmit}
            disabled={isStarting}
            className="gap-2 bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Starting Egress...</span>
              </>
            ) : (
              <>
                <Disc className="w-4 h-4 animate-pulse" />
                <span>Start Recording</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
