"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Video,
  Calendar,
  Clock,
  Plus,
  Radio,
  Users,
  Copy,
  Check,
  Disc,
  ArrowRight,
  Sparkles,
  Trash2,
  Share2,
  ExternalLink,
  Play,
  Loader2,
  CalendarPlus,
  ShieldAlert,
  RefreshCw,
  Ticket,
  DollarSign,
  Pencil,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import ScheduleMeetingModal from "@/components/meetings/ScheduleMeetingModal";
import InstantMeetingModal from "@/components/meetings/InstantMeetingModal";
import MeetingPurchasesModal from "@/components/meetings/MeetingPurchasesModal";
import ShareModal from "@/components/ShareModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface MeetingItem {
  id: string;
  code: string;
  title: string;
  description: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  status: "SCHEDULED" | "ACTIVE" | "ENDED" | "CANCELLED";
  isInstant: boolean;
  recordOnStart: boolean;
  isRecording: boolean;
  recordedVideoId: string | null;
  shareAccessMode?: "PUBLIC" | "RESTRICTED" | "PRIVATE" | "PURCHASABLE";
  price?: number | null;
  currency?: string | null;
  _count?: {
    purchases?: number;
  };
  createdAt: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  invites: Array<{
    id: string;
    email: string;
    role: string;
    status: string;
  }>;
  recordedVideo: {
    id: string;
    title: string;
    status: string;
    durationSeconds: number | null;
    thumbnailKey: string | null;
  } | null;
}

export default function MeetingsDashboardPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [shareModalData, setShareModalData] = useState<{ id: string; title: string } | null>(null);
  const [purchasesMeeting, setPurchasesMeeting] = useState<MeetingItem | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<MeetingItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isInstantOpen, setIsInstantOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reopeningId, setReopeningId] = useState<string | null>(null);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/meetings");
      if (!res.ok) throw new Error("Failed to fetch meetings");
      const data = await res.json();
      setMeetings(data.meetings || []);
    } catch (err: any) {
      setError(err.message || "Failed to load meetings");
    } finally {
      setLoading(false);
    }
  };

  const refreshMeetings = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/meetings");
      if (res.ok) {
        const data = await res.json();
        setMeetings(data.meetings || []);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/meet/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleReopenMeeting = async (meetingId: string) => {
    try {
      setReopeningId(meetingId);
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to reopen meeting");
      }
      router.push(`/meet/${meetingId}`);
    } catch (err: any) {
      alert(err.message || "Failed to reopen meeting room");
      setReopeningId(null);
    }
  };

  const [deleteMeetingTarget, setDeleteMeetingTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingMeeting, setIsDeletingMeeting] = useState(false);

  const handleDeleteMeeting = (meeting: { id: string; title: string }) => {
    setDeleteMeetingTarget(meeting);
  };

  const handleExecuteDeleteMeeting = async () => {
    if (!deleteMeetingTarget) return;
    setIsDeletingMeeting(true);
    try {
      const res = await fetch(`/api/meetings/${deleteMeetingTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setMeetings(meetings.filter((m) => m.id !== deleteMeetingTarget.id));
        setDeleteMeetingTarget(null);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete meeting");
      }
    } catch (err) {
      console.error("Failed to delete meeting:", err);
    } finally {
      setIsDeletingMeeting(false);
    }
  };

  const upcomingMeetings = meetings.filter(
    (m) => m.status === "SCHEDULED" || m.status === "ACTIVE"
  );
  const pastMeetings = meetings.filter(
    (m) => m.status === "ENDED" || m.status === "CANCELLED"
  );

  const formatMeetingDate = (dateStr: string | null) => {
    if (!dateStr) return "Flexible / Instant";
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Meetings & Video Calls
          </h1>
          <p className="text-sm text-muted-foreground">
            Host live video conferences, schedule team meetings, and automatically save recordings to your library
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <Button
            variant="outline"
            onClick={refreshMeetings}
            disabled={isRefreshing}
            title="Refresh meetings list"
            className="flex-1 sm:flex-none cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsScheduleOpen(true)}
            className="flex-1 sm:flex-none cursor-pointer"
          >
            <CalendarPlus className="w-4 h-4 text-primary" />
            <span>Schedule Meeting</span>
          </Button>
          <Button
            onClick={() => setIsInstantOpen(true)}
            className="flex-1 sm:flex-none cursor-pointer"
          >
            <Video className="w-4 h-4" />
            <span>Start Instant Meet</span>
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Button
          variant={activeTab === "upcoming" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("upcoming")}
          className="gap-2 cursor-pointer"
        >
          <Calendar className="w-4 h-4" />
          Upcoming & Live ({upcomingMeetings.length})
        </Button>
        <Button
          variant={activeTab === "past" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("past")}
          className="gap-2 cursor-pointer"
        >
          <Clock className="w-4 h-4" />
          Past & Recorded ({pastMeetings.length})
        </Button>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading meetings...</p>
        </div>
      ) : activeTab === "upcoming" ? (
        upcomingMeetings.length === 0 ? (
          <div className="text-center py-16 px-4 bg-card/40 rounded-2xl border border-dashed border-border">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <CalendarPlus className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground">No upcoming meetings</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-6">
              You don't have any meetings scheduled. Start an instant meeting or schedule one for your team.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => setIsScheduleOpen(true)}
              >
                Schedule Meeting
              </Button>
              <Button
                onClick={() => setIsInstantOpen(true)}
              >
                Start Instant Meet
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingMeetings.map((meeting) => {
              const isLive = meeting.status === "ACTIVE";
              return (
                <div
                  key={meeting.id}
                  className={`group glass-card rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden hover:shadow-xl ${isLive
                      ? "border-emerald-500/50 shadow-emerald-500/5 ring-2 ring-emerald-500/20"
                      : "border-border hover:border-primary/50"
                    }`}
                >
                  {/* Card Body */}
                  <div className="p-5 pb-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      {isLive ? (
                        <Badge variant="outline" className="gap-1.5 text-emerald-600 border-emerald-500/30 bg-emerald-500/10 uppercase">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          Live Now
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1.5">
                          <Calendar className="w-3 h-3 text-primary" />
                          {formatMeetingDate(meeting.scheduledStart)}
                        </Badge>
                      )}

                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {meeting.shareAccessMode === "PURCHASABLE" && (
                          <Badge variant="outline" className="gap-1 bg-amber-500/10 border-amber-500/30 text-amber-500 text-[10px] font-bold">
                            <Ticket className="w-3 h-3" />
                            <span>Pass: {meeting.currency || "USD"} {meeting.price || 0}</span>
                            {Boolean(meeting._count?.purchases) && (
                              <span className="ml-1 text-[9px] bg-amber-500/20 px-1 py-0.2 rounded font-mono">
                                {meeting._count?.purchases} sold
                              </span>
                            )}
                          </Badge>
                        )}
                        {meeting.recordOnStart && (
                          <Badge
                            variant="destructive"
                            className="gap-1 uppercase"
                            title="This meeting will be recorded automatically"
                          >
                            <Disc className="w-3 h-3" /> Auto-Record
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {meeting.title}
                      </h3>
                      {meeting.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {meeting.description}
                        </p>
                      )}
                    </div>

                    {/* Room ID pill */}
                    <div className="flex items-center justify-between py-2 px-3 bg-slate-100/70 dark:bg-slate-900/60 rounded-xl border border-border text-xs">
                      <span className="text-muted-foreground font-mono font-medium truncate max-w-[180px]">ID: {meeting.id}</span>
                      <button
                        onClick={() => handleCopyLink(meeting.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-[11px] cursor-pointer shrink-0"
                      >
                        {copiedCode === meeting.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy link</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Attendees count */}
                    {meeting.invites.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                        <Users className="w-3.5 h-3.5 text-primary" />
                        <span>{meeting.invites.length} invitee(s)</span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-4 pt-2 border-t border-border/50 flex items-center justify-between gap-2 mt-2">
                    <Link href={`/meet/${meeting.id}`}>
                      <Button
                        size="sm"
                        className={`gap-1.5 cursor-pointer ${
                          isLive
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                            : ""
                        }`}
                      >
                        <span>Join Room</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>

                    {/* 3-Dot Options Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                          title="More options"
                        >
                          <MoreVertical className="w-4 h-4" />
                          <span className="sr-only">More options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => setEditingMeeting(meeting)}
                          className="cursor-pointer gap-2 text-xs"
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Edit Details</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setPurchasesMeeting(meeting)}
                          className="cursor-pointer gap-2 text-xs"
                        >
                          <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Purchases</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setShareModalData({ id: meeting.id, title: meeting.title })}
                          className="cursor-pointer gap-2 text-xs"
                        >
                          <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Share & Pass Pricing</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteMeeting({ id: meeting.id, title: meeting.title })}
                          className="cursor-pointer gap-2 text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Meeting</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Past & Recorded Meetings */
        pastMeetings.length === 0 ? (
          <div className="text-center py-16 px-4 bg-card/40 rounded-2xl border border-dashed border-border">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground">No past meetings</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-6">
              Your completed meetings and video recordings will show up right here.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                onClick={() => setIsInstantOpen(true)}
                className="gap-2 cursor-pointer"
              >
                <Video className="w-4 h-4" />
                <span>Start Instant Meet</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {pastMeetings.map((meeting) => (
              <div
                key={meeting.id}
                className="p-4 sm:p-5 rounded-2xl glass-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary/50 transition-all shadow-2xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="font-bold text-foreground text-base">{meeting.title}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-muted-foreground border border-border">
                      {meeting.id}
                    </span>
                    {meeting.shareAccessMode === "PURCHASABLE" && (
                      <Badge variant="outline" className="gap-1 bg-amber-500/10 border-amber-500/30 text-amber-500 text-[10px] font-bold">
                        <Ticket className="w-3 h-3" />
                        <span>Pass: {meeting.currency || "USD"} {meeting.price || 0}</span>
                      </Badge>
                    )}
                    {meeting.recordedVideoId && (
                      <Badge variant="destructive" className="gap-1">
                        <Disc className="w-3 h-3" /> Recorded
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span>Ended: {new Date(meeting.createdAt).toLocaleDateString()}</span>
                    <span>{meeting.invites.length} invitee(s)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                  {meeting.recordedVideoId && (
                    <Link href={`/videos/${meeting.recordedVideoId}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Watch Recording</span>
                      </Button>
                    </Link>
                  )}
                  {meeting.status === "ENDED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={reopeningId === meeting.id}
                      onClick={() => handleReopenMeeting(meeting.id)}
                      className="gap-1.5 text-xs cursor-pointer"
                    >
                      {reopeningId === meeting.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Video className="w-3.5 h-3.5" />
                      )}
                      <span>{reopeningId === meeting.id ? "Reopening..." : "Re-open Room"}</span>
                    </Button>
                  )}

                  {/* 3-Dot Options Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                        title="More options"
                      >
                        <MoreVertical className="w-4 h-4" />
                        <span className="sr-only">More options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => setEditingMeeting(meeting)}
                        className="cursor-pointer gap-2 text-xs"
                      >
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Edit Details</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setPurchasesMeeting(meeting)}
                        className="cursor-pointer gap-2 text-xs"
                      >
                        <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Purchases</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShareModalData({ id: meeting.id, title: meeting.title })}
                        className="cursor-pointer gap-2 text-xs"
                      >
                        <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Share Link</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteMeeting({ id: meeting.id, title: meeting.title })}
                        className="cursor-pointer gap-2 text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Record</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Modals */}
      <ScheduleMeetingModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        onSuccess={(newMeeting) => {
          setMeetings([newMeeting, ...meetings]);
        }}
      />

      {/* Edit Meeting Modal */}
      {editingMeeting && (
        <ScheduleMeetingModal
          isOpen={Boolean(editingMeeting)}
          onClose={() => setEditingMeeting(null)}
          meeting={editingMeeting}
          onSuccess={(updated) => {
            setMeetings((prev) =>
              prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
            );
            setEditingMeeting(null);
          }}
        />
      )}

      <InstantMeetingModal
        isOpen={isInstantOpen}
        onClose={() => setIsInstantOpen(false)}
      />

      {/* Meeting Purchases Modal */}
      {purchasesMeeting && (
        <MeetingPurchasesModal
          isOpen={Boolean(purchasesMeeting)}
          onClose={() => setPurchasesMeeting(null)}
          meeting={purchasesMeeting}
        />
      )}

      {shareModalData && (
        <ShareModal
          isOpen={Boolean(shareModalData)}
          onClose={() => setShareModalData(null)}
          targetType="meeting"
          targetId={shareModalData.id}
          targetName={shareModalData.title}
          onAccessModeChange={() => refreshMeetings()}
        />
      )}

      {/* Delete Meeting Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteMeetingTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteMeetingTarget(null);
        }}
        title={`Delete Meeting "${deleteMeetingTarget?.title}"?`}
        description="Are you sure you want to delete this meeting? All attendees will lose access and any active session will be ended."
        variant="danger"
        confirmText="Delete Meeting"
        cancelText="Cancel"
        isLoading={isDeletingMeeting}
        onConfirm={handleExecuteDeleteMeeting}
        onCancel={() => setDeleteMeetingTarget(null)}
      />
    </div>
  );
}
