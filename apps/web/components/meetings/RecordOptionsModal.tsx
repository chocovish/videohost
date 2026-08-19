"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Disc,
  LayoutGrid,
  User,
  Monitor,
  Video as VideoIcon,
  VideoOff,
  Mic,
  MicOff,
  ScreenShare,
  Check,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Sparkles,
  ChevronDown,
  Sliders,
  Maximize2,
  Layers,
} from "lucide-react";
import { Participant } from "livekit-client";

export type RecordingTargetMode = "room" | "participant";

export interface RecordOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRecording: (options: {
    mode: "room" | "participant";
    participantIdentity?: string;
    showCamera?: boolean;
    showScreen?: boolean;
    screenShare?: boolean;
    participantName?: string;
    pipPosition?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  }) => Promise<void>;
  participants: Participant[];
  meetingTitle: string;
  isStarting?: boolean;
  isLiveAdjusting?: boolean;
  initialMode?: "room" | "participant";
  initialTargetIdentity?: string;
  initialShowCamera?: boolean;
  initialShowScreen?: boolean;
  initialPipPosition?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  error?: string | null;
  onClearError?: () => void;
}

export default function RecordOptionsModal({
  isOpen,
  onClose,
  onStartRecording,
  participants,
  meetingTitle,
  isStarting = false,
  isLiveAdjusting = false,
  initialMode = "room",
  initialTargetIdentity = "",
  initialShowCamera = true,
  initialShowScreen = true,
  initialPipPosition = "bottom-right",
  error = null,
  onClearError,
}: RecordOptionsModalProps) {
  const [selectedMode, setSelectedMode] = useState<RecordingTargetMode>(initialMode);
  const [selectedParticipantIdentity, setSelectedParticipantIdentity] = useState<string>(initialTargetIdentity);
  const [showCamera, setShowCamera] = useState<boolean>(initialShowCamera);
  const [showScreen, setShowScreen] = useState<boolean>(initialShowScreen);
  const [pipPosition, setPipPosition] = useState<"bottom-right" | "bottom-left" | "top-right" | "top-left">(initialPipPosition);

  // Sync initial state when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedMode(initialMode);
      setSelectedParticipantIdentity(initialTargetIdentity);
      setShowCamera(initialShowCamera);
      setShowScreen(initialShowScreen);
      setPipPosition(initialPipPosition);
    }
  }, [isOpen, initialMode, initialTargetIdentity, initialShowCamera, initialShowScreen, initialPipPosition]);

  // Process & enrich participants list
  const enrichedParticipants = useMemo(() => {
    return participants.map((p) => {
      let meta: any = {};
      try {
        if (p.metadata) {
          meta = JSON.parse(p.metadata);
        }
      } catch {
        meta = {};
      }

      const displayName = p.name || meta.name || p.identity;
      const isHost = Boolean(meta.isHost || meta.role === "host");
      const isOrgMember = Boolean(meta.isOrgMember || meta.role === "org_member");
      const isScreenSharing = p.isScreenShareEnabled;
      const isCameraActive = p.isCameraEnabled;
      const isMicActive = p.isMicrophoneEnabled;

      return {
        identity: p.identity,
        displayName,
        isLocal: p.isLocal,
        isHost,
        isOrgMember,
        isScreenSharing,
        isCameraActive,
        isMicActive,
      };
    });
  }, [participants]);

  // Set default selected participant if none selected
  useEffect(() => {
    if (isOpen && enrichedParticipants.length > 0 && !selectedParticipantIdentity) {
      const screenSharer = enrichedParticipants.find((p) => p.isScreenSharing);
      if (screenSharer) {
        setSelectedParticipantIdentity(screenSharer.identity);
      } else {
        setSelectedParticipantIdentity(enrichedParticipants[0].identity);
      }
    }
  }, [isOpen, enrichedParticipants, selectedParticipantIdentity]);

  const selectedParticipant = useMemo(() => {
    return (
      enrichedParticipants.find((p) => p.identity === selectedParticipantIdentity) ||
      enrichedParticipants[0]
    );
  }, [enrichedParticipants, selectedParticipantIdentity]);

  const isBothStreamsSelected = showCamera && showScreen;

  const handleSubmit = async () => {
    if (selectedMode === "room") {
      await onStartRecording({
        mode: "room",
      });
    } else {
      await onStartRecording({
        mode: "participant",
        participantIdentity: selectedParticipant?.identity,
        showCamera,
        showScreen,
        screenShare: showScreen,
        participantName: selectedParticipant?.displayName,
        pipPosition,
      });
    }
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
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isLiveAdjusting
                  ? "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                  : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
              }`}
            >
              {isLiveAdjusting ? <Sliders className="w-5 h-5" /> : <Disc className="w-5 h-5 animate-pulse" />}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                {isLiveAdjusting ? "Live Recording Layout Settings" : "Meeting Recording Options"}
                {isLiveAdjusting && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider animate-pulse">
                    LIVE REC
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                {isLiveAdjusting
                  ? "Adjust active recording layout in real time without stopping or restarting the stream."
                  : `Choose the recording target and Picture-in-Picture layout for ${meetingTitle}`}
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

          {/* Mode Selection Cards */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Select Recording Layout
            </label>

            {/* Option 1: Whole Meeting Room Grid */}
            <div
              onClick={() => {
                setSelectedMode("room");
                if (onClearError) onClearError();
              }}
              className={`group relative p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                selectedMode === "room"
                  ? "bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/30"
                  : "bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  selectedMode === "room"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-slate-800/80 text-slate-400 group-hover:text-slate-200"
                }`}
              >
                <LayoutGrid className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-white">
                    Whole Meeting (Room Composite)
                  </span>
                  {selectedMode === "room" && (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Record the dynamic conference layout featuring all speakers, active camera tiles, and shared presentations in a grid.
                </p>
              </div>
            </div>

            {/* Option 2: Specific Participant (Screen + Camera PiP) */}
            <div
              onClick={() => {
                setSelectedMode("participant");
                if (onClearError) onClearError();
              }}
              className={`group relative p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                selectedMode === "participant"
                  ? "bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/30"
                  : "bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  selectedMode === "participant"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-slate-800/80 text-slate-400 group-hover:text-slate-200"
                }`}
              >
                <Layers className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-white flex items-center gap-2">
                    <span>Specific Participant</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      Screen + Camera PiP
                    </span>
                  </span>
                  {selectedMode === "participant" && (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Focus on a specific participant with dedicated options to record their Screen Share, Camera, or both combined with Picture-in-Picture (PiP).
                </p>
              </div>
            </div>
          </div>

          {/* Participant Configuration Details */}
          {selectedMode === "participant" && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Participant Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Target Participant</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    {enrichedParticipants.length} in meeting
                  </span>
                </label>

                <div className="relative">
                  <select
                    value={selectedParticipantIdentity}
                    onChange={(e) => setSelectedParticipantIdentity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] appearance-none cursor-pointer pr-10"
                  >
                    {enrichedParticipants.map((p) => (
                      <option key={p.identity} value={p.identity}>
                        {p.displayName} {p.isLocal ? "(You)" : ""} {p.isHost ? "[Host]" : ""} {p.isScreenSharing ? "• 🖥️ Presenting" : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Stream Channels Selection Checkboxes */}
              <div className="space-y-2 pt-1 border-t border-slate-800/80">
                <label className="text-xs font-semibold text-slate-300">
                  Streams to Include in Recording
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Screen Share Checkbox */}
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      showScreen
                        ? "bg-slate-900 border-sky-500/50 text-white"
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={showScreen}
                      onChange={(e) => {
                        if (!e.target.checked && !showCamera) return; // Prevent disabling both
                        setShowScreen(e.target.checked);
                      }}
                      className="rounded border-slate-700 text-sky-500 focus:ring-sky-500 w-4 h-4"
                    />
                    <div className="flex items-center gap-2 min-w-0">
                      <Monitor className="w-4 h-4 text-sky-400 shrink-0" />
                      <div className="text-xs">
                        <span className="font-semibold block text-white">Screen Share</span>
                        <span className="text-[10px] text-slate-400">Presentation stream</span>
                      </div>
                    </div>
                  </label>

                  {/* Camera Checkbox */}
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      showCamera
                        ? "bg-slate-900 border-emerald-500/50 text-white"
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={showCamera}
                      onChange={(e) => {
                        if (!e.target.checked && !showScreen) return; // Prevent disabling both
                        setShowCamera(e.target.checked);
                      }}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 w-4 h-4"
                    />
                    <div className="flex items-center gap-2 min-w-0">
                      <VideoIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="text-xs">
                        <span className="font-semibold block text-white">Camera Feed</span>
                        <span className="text-[10px] text-slate-400">Presenter webcam</span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Picture-in-Picture Indicator & Position Selector */}
              {isBothStreamsSelected ? (
                <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/30 space-y-2.5 animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs text-sky-200">
                    <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="font-medium">
                      <strong>Picture-in-Picture active:</strong> Screen Share will take the main screen with Camera floating in the corner.
                    </span>
                  </div>

                  {/* PiP Position Pills */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] uppercase font-bold text-sky-400/80 mr-1">
                      PiP Corner:
                    </span>
                    {(
                      [
                        { id: "bottom-right", label: "Bottom Right" },
                        { id: "bottom-left", label: "Bottom Left" },
                        { id: "top-right", label: "Top Right" },
                        { id: "top-left", label: "Top Left" },
                      ] as const
                    ).map((pos) => (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => setPipPosition(pos.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                          pipPosition === pos.id
                            ? "bg-sky-500 text-black shadow-sm font-bold"
                            : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : showScreen ? (
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Full Screen Share recording only (no webcam overlay).</span>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                  <VideoIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Full Camera recording only (no screen share).</span>
                </div>
              )}

              {/* Status Warning if selected screen but participant is not currently presenting */}
              {showScreen && selectedParticipant && !selectedParticipant.isScreenSharing && (
                <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    <span className="font-semibold text-white">{selectedParticipant.displayName}</span> is not currently presenting. Egress will record their camera until they begin screen sharing.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-3">
          <Button
            variant="darkGhost"
            size="sm"
            onClick={onClose}
            disabled={isStarting}
            className="text-slate-300 hover:text-white"
          >
            Cancel
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleSubmit}
            disabled={isStarting || (selectedMode === "participant" && !selectedParticipant?.identity)}
            className={`gap-2 font-bold shadow-lg ${
              isLiveAdjusting
                ? "bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20"
                : "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20"
            }`}
          >
            {isStarting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isLiveAdjusting ? "Updating Layout..." : "Starting Egress..."}</span>
              </>
            ) : isLiveAdjusting ? (
              <>
                <Check className="w-4 h-4" />
                <span>Apply Layout Changes</span>
              </>
            ) : (
              <>
                <Disc className="w-4 h-4 animate-pulse" />
                <span>Start Recording</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
