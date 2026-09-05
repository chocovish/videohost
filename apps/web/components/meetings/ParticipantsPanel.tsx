"use client";

import React, { useState, useMemo } from "react";
import {
  useParticipants,
  useRoomContext,
  useLocalParticipant,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  Users,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  ScreenShare,
  MonitorOff,
  UserX,
  Shield,
  Crown,
  Search,
  MoreVertical,
  VolumeX,
  X,
  Loader2,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface ParticipantsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  canModerate: boolean;
  isHost: boolean;
  isOrgMember?: boolean;
  onOpenInvite?: () => void;
  onToast?: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}

export default function ParticipantsPanel({
  isOpen,
  onClose,
  meetingId,
  canModerate,
  isHost,
  isOrgMember,
  onOpenInvite,
  onToast,
}: ParticipantsPanelProps) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();

  const [searchQuery, setSearchQuery] = useState("");
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
  const [kickTarget, setKickTarget] = useState<{
    identity: string;
    name: string;
  } | null>(null);
  const [isMuteAllModalOpen, setIsMuteAllModalOpen] = useState(false);
  const [isMutingAll, setIsMutingAll] = useState(false);

  // Parse participant metadata and sort
  const enrichedParticipants = useMemo(() => {
    return participants.map((p) => {
      let meta: any = {};
      try {
        if (p.metadata) {
          meta = JSON.parse(p.metadata);
        }
      } catch (e) {
        meta = {};
      }

      const isParticipantHost = Boolean(meta.isHost || meta.role === "host");
      const isParticipantOrgMember = Boolean(meta.isOrgMember || meta.role === "org_member");
      const displayName = p.name || meta.name || p.identity;

      const micTrack = p.getTrackPublication(Track.Source.Microphone);
      const camTrack = p.getTrackPublication(Track.Source.Camera);
      const screenTrack = p.getTrackPublication(Track.Source.ScreenShare);

      return {
        participant: p,
        identity: p.identity,
        displayName,
        isLocal: p.isLocal,
        isHost: isParticipantHost,
        isOrgMember: isParticipantOrgMember,
        isSpeaking: p.isSpeaking,
        isMicrophoneEnabled: p.isMicrophoneEnabled,
        isCameraEnabled: p.isCameraEnabled,
        isScreenShareEnabled: p.isScreenShareEnabled,
        micTrackSid: micTrack?.trackSid,
        camTrackSid: camTrack?.trackSid,
        screenTrackSid: screenTrack?.trackSid,
      };
    });
  }, [participants]);

  // Filter and sort participants: local participant -> host -> org member -> speaking -> alphabetical
  const filteredParticipants = useMemo(() => {
    let list = enrichedParticipants;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.displayName.toLowerCase().includes(q) ||
          p.identity.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => {
      if (a.isLocal) return -1;
      if (b.isLocal) return 1;
      if (a.isHost && !b.isHost) return -1;
      if (!a.isHost && b.isHost) return 1;
      if (a.isOrgMember && !b.isOrgMember) return -1;
      if (!a.isOrgMember && b.isOrgMember) return 1;
      if (a.isSpeaking && !b.isSpeaking) return -1;
      if (!a.isSpeaking && b.isSpeaking) return 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [enrichedParticipants, searchQuery]);

  // Execute Remote Moderation Action
  const handleModerateAction = async (
    targetIdentity: string,
    action: "mute_mic" | "stop_video" | "stop_screenshare" | "kick",
    targetName: string,
    trackSid?: string
  ) => {
    const actionKey = `${targetIdentity}_${action}`;
    if (loadingActions[actionKey]) return;

    setLoadingActions((prev) => ({ ...prev, [actionKey]: true }));

    try {
      // 1. Direct real-time WebRTC DataChannel packet for ultra-fast peer signaling
      if (room?.localParticipant) {
        try {
          const payload = JSON.stringify({
            type: "MODERATION_EVENT",
            action:
              action === "mute_mic"
                ? "MUTE_MIC"
                : action === "stop_video"
                ? "STOP_VIDEO"
                : action === "stop_screenshare"
                ? "STOP_SCREENSHARE"
                : "KICK",
            targetIdentity,
            targetName,
            moderatorName: localParticipant?.name || "Organization Moderator",
            timestamp: Date.now(),
          });
          const encoder = new TextEncoder();
          await room.localParticipant.publishData(encoder.encode(payload), {
            reliable: true,
            destinationIdentities: [targetIdentity],
          });
        } catch (peerErr) {
          console.warn("Direct peer data message publish warning:", peerErr);
        }
      }

      // 2. Server API request to enforce track muting or participant removal via LiveKit SFU
      const res = await fetch(`/api/meetings/${meetingId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetIdentity,
          action,
          trackSid,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Moderation request failed.");
      }

      if (action === "mute_mic") {
        onToast?.(`Muted ${targetName}'s microphone`, "info");
      } else if (action === "stop_video") {
        onToast?.(`Turned off ${targetName}'s camera`, "info");
      } else if (action === "stop_screenshare") {
        onToast?.(`Stopped ${targetName}'s screen share`, "info");
      } else if (action === "kick") {
        onToast?.(`Removed ${targetName} from the meeting`, "warning");
      }
    } catch (err: any) {
      console.error(`Failed to execute ${action} on ${targetIdentity}:`, err);
      onToast?.(err.message || `Failed to perform ${action}.`, "error");
    } finally {
      setLoadingActions((prev) => ({ ...prev, [actionKey]: false }));
      if (action === "kick") {
        setKickTarget(null);
      }
    }
  };

  // Mute All Participants Handler
  const handleMuteAll = async () => {
    if (isMutingAll) return;
    setIsMutingAll(true);

    try {
      // 1. Send data channel broadcast
      if (room?.localParticipant) {
        try {
          const payload = JSON.stringify({
            type: "MODERATION_EVENT",
            action: "MUTE_ALL",
            moderatorName: localParticipant?.name || "Organization Moderator",
            timestamp: Date.now(),
          });
          const encoder = new TextEncoder();
          await room.localParticipant.publishData(encoder.encode(payload), {
            reliable: true,
          });
        } catch (dataErr) {
          console.warn("Data broadcast warning:", dataErr);
        }
      }

      // 2. Call server endpoint
      const res = await fetch(`/api/meetings/${meetingId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mute_all" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to mute all participants.");
      }

      onToast?.("Muted all participant microphones", "info");
      setIsMuteAllModalOpen(false);
    } catch (err: any) {
      console.error("Mute all error:", err);
      onToast?.(err.message || "Failed to mute all participants", "error");
    } finally {
      setIsMutingAll(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <aside className="w-84 sm:w-96 border-l border-slate-800 bg-slate-900/95 flex flex-col h-full z-30 backdrop-blur-2xl shadow-2xl animate-in slide-in-from-right duration-200 select-none">
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Participants</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-mono">
                    {participants.length}
                  </span>
                </h3>
                {canModerate && (
                  <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                    <Shield className="w-3 h-3" />
                    <span>Organization Moderator</span>
                  </p>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onClose}
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Quick Actions Row for Moderator & Invite */}
          <div className="flex items-center gap-2">
            {canModerate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMuteAllModalOpen(true)}
                className="flex-1 gap-1.5 text-slate-200 hover:text-white font-medium"
                title="Mute all participant microphones"
              >
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                <span>Mute All</span>
              </Button>
            )}

            {onOpenInvite && (isHost || isOrgMember) && (
              <Button
                variant="default"
                size="sm"
                onClick={onOpenInvite}
                className="flex-1 gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Invite</span>
              </Button>
            )}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search participants..."
              className="w-full h-8 pl-8 pr-3 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Participants List */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2">
          {filteredParticipants.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No participants found matching &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            filteredParticipants.map((item) => {
              const {
                identity,
                displayName,
                isLocal,
                isHost: isParticipantHost,
                isOrgMember: isParticipantOrgMember,
                isSpeaking,
                isMicrophoneEnabled,
                isCameraEnabled,
                isScreenShareEnabled,
                micTrackSid,
                camTrackSid,
              } = item;

              // Check if the current user is allowed to moderate this specific participant
              // Host can moderate everyone except self.
              // Org Member can moderate anyone except primary Host and self.
              const isTargetHost = isParticipantHost;
              const allowModeration =
                canModerate &&
                !isLocal &&
                (!isTargetHost || isHost);

              const isMuteLoading = loadingActions[`${identity}_mute_mic`];
              const isVideoLoading = loadingActions[`${identity}_stop_video`];
              const isScreenLoading = loadingActions[`${identity}_stop_screenshare`];
              const isKickLoading = loadingActions[`${identity}_kick`];

              return (
                <div
                  key={identity}
                  className={`group relative p-2.5 rounded-xl border transition-all duration-150 ${
                    isSpeaking
                      ? "bg-slate-900/90 border-primary/40 shadow-xs shadow-primary/5"
                      : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700/80"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2.5">
                    {/* Left: Avatar, Name, Badges */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase border transition-all ${
                            isSpeaking
                              ? "bg-primary/25 text-primary border-primary ring-2 ring-primary/30 animate-pulse"
                              : isParticipantHost
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                              : isParticipantOrgMember
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                              : "bg-slate-800 text-slate-200 border-slate-700"
                          }`}
                        >
                          {displayName.charAt(0)}
                        </div>
                        {/* Live Online Indicator */}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                            isSpeaking
                              ? "bg-primary"
                              : "bg-emerald-500"
                          }`}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-white truncate max-w-[130px] sm:max-w-[160px]">
                            {displayName}
                          </span>
                          {isLocal && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              (You)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isParticipantHost ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[9px] font-semibold rounded">
                              <Crown className="w-2.5 h-2.5" />
                              <span>Host</span>
                            </span>
                          ) : isParticipantOrgMember ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[9px] font-semibold rounded">
                              <Shield className="w-2.5 h-2.5" />
                              <span>Org Member</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-medium">
                              Attendee
                            </span>
                          )}

                          {isScreenShareEnabled && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[9px] font-semibold rounded animate-pulse">
                              <ScreenShare className="w-2.5 h-2.5" />
                              <span>Sharing Screen</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Media Status Indicators & Moderation Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Live Indicators */}
                      <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800/80 text-slate-400">
                        {isMicrophoneEnabled ? (
                          <Mic className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <MicOff className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        {isCameraEnabled ? (
                          <VideoIcon className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <VideoOff className="w-3.5 h-3.5 text-rose-400" />
                        )}
                      </div>

                      {/* Moderation Controls for Org Users / Hosts */}
                      {allowModeration && (
                        <div className="flex items-center gap-1">
                          {/* Quick Mute Mic button */}
                          {isMicrophoneEnabled && (
                            <Button
                              variant="outline"
                              size="icon-xs"
                              onClick={() =>
                                handleModerateAction(
                                  identity,
                                  "mute_mic",
                                  displayName,
                                  micTrackSid
                                )
                              }
                              disabled={isMuteLoading}
                              className="text-slate-300 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10"
                              title={`Mute ${displayName}'s microphone`}
                            >
                              {isMuteLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                              ) : (
                                <MicOff className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          )}

                          {/* Quick Stop Video button */}
                          {isCameraEnabled && (
                            <Button
                              variant="outline"
                              size="icon-xs"
                              onClick={() =>
                                handleModerateAction(
                                  identity,
                                  "stop_video",
                                  displayName,
                                  camTrackSid
                                )
                              }
                              disabled={isVideoLoading}
                              className="text-slate-300 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10"
                              title={`Turn off ${displayName}'s camera`}
                            >
                              {isVideoLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                              ) : (
                                <VideoOff className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          )}

                          {/* Quick Stop Screen Share button */}
                          {isScreenShareEnabled && (
                            <Button
                              variant="outline"
                              size="icon-xs"
                              onClick={() =>
                                handleModerateAction(
                                  identity,
                                  "stop_screenshare",
                                  displayName
                                )
                              }
                              disabled={isScreenLoading}
                              className="bg-indigo-950/60 border-indigo-500/40 text-indigo-300 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/50"
                              title={`Stop ${displayName}'s screen share`}
                            >
                              {isScreenLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                              ) : (
                                <MonitorOff className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          )}

                          {/* More Options Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="outline"
                                  size="icon-xs"
                                  className="text-slate-400 hover:text-white"
                                  title="More participant options"
                                />
                              }
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 bg-slate-900 border border-slate-800 text-slate-200"
                            >
                              <DropdownMenuLabel className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                                Moderate {displayName}
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-slate-800" />

                              {/* Mute Mic Option */}
                              <DropdownMenuItem
                                onClick={() =>
                                  handleModerateAction(
                                    identity,
                                    "mute_mic",
                                    displayName,
                                    micTrackSid
                                  )
                                }
                                disabled={!isMicrophoneEnabled || isMuteLoading}
                                className="gap-2 text-xs cursor-pointer focus:bg-slate-800 focus:text-white"
                              >
                                <MicOff className="w-3.5 h-3.5 text-rose-400" />
                                <span>
                                  {isMicrophoneEnabled
                                    ? "Mute Microphone"
                                    : "Mic Already Muted"}
                                </span>
                              </DropdownMenuItem>

                              {/* Stop Video Option */}
                              <DropdownMenuItem
                                onClick={() =>
                                  handleModerateAction(
                                    identity,
                                    "stop_video",
                                    displayName,
                                    camTrackSid
                                  )
                                }
                                disabled={!isCameraEnabled || isVideoLoading}
                                className="gap-2 text-xs cursor-pointer focus:bg-slate-800 focus:text-white"
                              >
                                <VideoOff className="w-3.5 h-3.5 text-rose-400" />
                                <span>
                                  {isCameraEnabled
                                    ? "Turn Off Camera"
                                    : "Camera Already Off"}
                                </span>
                              </DropdownMenuItem>

                              {/* Stop Screen Share Option */}
                              {isScreenShareEnabled && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleModerateAction(
                                      identity,
                                      "stop_screenshare",
                                      displayName
                                    )
                                  }
                                  disabled={isScreenLoading}
                                  className="gap-2 text-xs cursor-pointer focus:bg-slate-800 focus:text-white"
                                >
                                  <MonitorOff className="w-3.5 h-3.5 text-indigo-400" />
                                  <span>Stop Screen Share</span>
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator className="bg-slate-800" />

                              {/* Kick Participant Option */}
                              <DropdownMenuItem
                                onClick={() =>
                                  setKickTarget({
                                    identity,
                                    name: displayName,
                                  })
                                }
                                disabled={isKickLoading}
                                className="gap-2 text-xs text-rose-400 hover:text-rose-300 focus:bg-rose-950/60 focus:text-rose-200 cursor-pointer"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                <span>Remove from Meeting</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info banner */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400 flex items-center justify-between">
          <span>{participants.length} connected</span>
          {canModerate && (
            <span className="text-[10px] text-emerald-400/90 font-medium">
              Moderator permissions active
            </span>
          )}
        </div>
      </aside>

      {/* Confirmation Dialog: Kick Participant */}
      <ConfirmDialog
        open={Boolean(kickTarget)}
        onOpenChange={(open) => {
          if (!open) setKickTarget(null);
        }}
        title="Remove Participant from Meeting?"
        description={
          <>
            Are you sure you want to kick{" "}
            <span className="font-bold text-white">{kickTarget?.name}</span>{" "}
            out of this meeting? They will be immediately disconnected from the call.
          </>
        }
        icon={UserX}
        variant="danger"
        theme="dark"
        confirmText="Remove Participant"
        cancelText="Cancel"
        isLoading={Boolean(kickTarget && loadingActions[`${kickTarget.identity}_kick`])}
        onConfirm={() => {
          if (kickTarget) {
            handleModerateAction(
              kickTarget.identity,
              "kick",
              kickTarget.name
            );
          }
        }}
        onCancel={() => setKickTarget(null)}
      />

      {/* Confirmation Dialog: Mute All Participants */}
      <ConfirmDialog
        open={isMuteAllModalOpen}
        onOpenChange={setIsMuteAllModalOpen}
        title="Mute All Participants?"
        description="This will mute the microphones for all current participants in the meeting room. Participants will still be able to unmute themselves if they wish to speak."
        icon={AlertTriangle}
        variant="warning"
        theme="dark"
        confirmText="Mute Everyone"
        cancelText="Cancel"
        isLoading={isMutingAll}
        onConfirm={handleMuteAll}
        onCancel={() => setIsMuteAllModalOpen(false)}
      />
    </>
  );
}
