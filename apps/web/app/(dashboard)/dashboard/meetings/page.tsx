"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ScheduleMeetingModal from "@/components/meetings/ScheduleMeetingModal";
import InstantMeetingModal from "@/components/meetings/InstantMeetingModal";
import InMeetingInviteModal from "@/components/meetings/InMeetingInviteModal";

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
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isInstantOpen, setIsInstantOpen] = useState(false);
  const [inviteModalData, setInviteModalData] = useState<{ id: string; title: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const handleDeleteMeeting = async (id: string) => {
    if (!confirm("Are you sure you want to delete this meeting?")) return;
    try {
      const res = await fetch(`/api/meetings/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMeetings(meetings.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete meeting:", err);
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
            className="flex-1 sm:flex-none"
          >
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsScheduleOpen(true)}
            className="flex-1 sm:flex-none"
          >
            <CalendarPlus className="w-4 h-4 text-primary" />
            <span>Schedule Meeting</span>
          </Button>
          <Button
            onClick={() => setIsInstantOpen(true)}
            className="flex-1 sm:flex-none"
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
          className="gap-2"
        >
          <Calendar className="w-4 h-4" />
          Upcoming & Live ({upcomingMeetings.length})
        </Button>
        <Button
          variant={activeTab === "past" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("past")}
          className="gap-2"
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
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setInviteModalData({ id: meeting.id, title: meeting.title })}
                        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg gap-1 cursor-pointer"
                        title="Invite participants"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Invite</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteMeeting(meeting.id)}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                        title="Delete meeting"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <Link href={`/meet/${meeting.id}`}>
                      <Button
                        size="sm"
                        className={`gap-1.5 cursor-pointer ${isLive
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                            : ""
                          }`}
                      >
                        <span>Join Room</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
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
                className="gap-2"
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
                    {meeting.recordedVideoId && (
                      <Badge variant="destructive" className="gap-1">
                        <Disc className="w-3 h-3" /> Recorded
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span>Ended: {new Date(meeting.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Host: {meeting.createdBy?.name || "Host"}</span>
                    {meeting.invites.length > 0 && (
                      <>
                        <span>•</span>
                        <span>{meeting.invites.length} attendee(s)</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {meeting.recordedVideoId ? (
                    <Link href={`/dashboard/uploaded-videos`}>
                      <Button
                        size="sm"
                        className="bg-primary text-white hover:opacity-90 font-bold text-xs gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Watch Video
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/meet/${meeting.id}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground text-xs gap-1.5 cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5" /> Re-open Room
                      </Button>
                    </Link>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteMeeting(meeting.id)}
                    className="text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 h-8 w-8 p-0 cursor-pointer"
                    title="Delete record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
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

      <InstantMeetingModal
        isOpen={isInstantOpen}
        onClose={() => setIsInstantOpen(false)}
      />

      {inviteModalData && (
        <InMeetingInviteModal
          isOpen={Boolean(inviteModalData)}
          onClose={() => setInviteModalData(null)}
          meetingId={inviteModalData.id}
          meetingTitle={inviteModalData.title}
        />
      )}
    </div>
  );
}

