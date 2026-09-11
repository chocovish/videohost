"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Video,
  Copy,
  Check,
  ArrowRight,
  Search,
  Users,
  DollarSign,
  AlertCircle,
  XCircle,
  CheckCircle2,
  RefreshCw,
  Loader2,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatMoney } from "@/lib/utils";
import RescheduleDialog from "@/components/appointments/RescheduleDialog";
import RescheduleStatusCard, { PendingReschedule } from "@/components/appointments/RescheduleStatusCard";

export interface ScheduledAppointmentItem {
  id: string;
  clientName: string;
  clientEmail: string;
  clientNotes: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  durationMinutes: number;
  timezone: string;
  status: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "RESCHEDULED";
  meetingId: string | null;
  joinUrl: string | null;
  cancelledReason: string | null;
  createdAt: string;
  rescheduleCount?: number;
  rescheduleRequests?: PendingReschedule[];
  purchases?: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    paymentMethod?: string | null;
    paymentId?: string | null;
  }>;
  offering: {
    id: string;
    title: string;
    duration: number;
    price: number;
    currency: string;
    color: string;
    locationType: string;
  };
  meeting?: {
    id: string;
    status: string;
    isRecording: boolean;
  } | null;
  host: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

export default function ScheduledAppointmentsTab({ onStatsChange }: { onStatsChange?: (stats: { upcoming: number; total: number }) => void } = {}) {
  const [appointments, setAppointments] = useState<ScheduledAppointmentItem[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    upcoming: number;
    past: number;
    cancelled: number;
    pendingReschedules?: number;
    totalRevenue: number;
    currency?: string;
  }>({
    total: 0,
    upcoming: 0,
    past: 0,
    cancelled: 0,
    pendingReschedules: 0,
    totalRevenue: 0,
    currency: "INR",
  });
  const [filter, setFilter] = useState<"upcoming" | "past" | "cancelled" | "all" | "needs-action">("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Cancellation modal state
  const [cancellingTarget, setCancellingTarget] = useState<ScheduledAppointmentItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Reschedule dialog state
  const [reschedulingTarget, setReschedulingTarget] = useState<ScheduledAppointmentItem | null>(null);

  const refreshNotifications = () => {
    try {
      window.dispatchEvent(new Event("notifications-refresh"));
    } catch {}
  };

  const fetchAppointments = async (currentFilter = filter) => {
    try {
      setIsLoading(true);
      const apiFilter = currentFilter === "needs-action" ? "all" : currentFilter;
      const res = await fetch(`/api/appointments?filter=${apiFilter}`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
        if (data.stats) {
          setStats(data.stats);
          onStatsChange?.({ upcoming: data.stats.upcoming ?? 0, total: data.stats.total ?? 0 });
        }
      }
    } catch (err) {
      console.error("Failed to load appointments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const apiFilter = filter === "needs-action" ? "all" : filter;
      const res = await fetch(`/api/appointments?filter=${apiFilter}`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
        if (data.stats) {
          setStats(data.stats);
          onStatsChange?.({ upcoming: data.stats.upcoming ?? 0, total: data.stats.total ?? 0 });
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAppointments(filter);
  }, [filter]);

  const handleCopyLink = (joinUrl: string, id: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const fullUrl = joinUrl.startsWith("http") ? joinUrl : `${origin}${joinUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExecuteCancel = async () => {
    if (!cancellingTarget) return;
    try {
      setIsCancelling(true);
      const res = await fetch(`/api/appointments/${cancellingTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CANCELLED",
          cancelledReason: cancelReason || "Cancelled by host",
        }),
      });

      if (res.ok) {
        setCancellingTarget(null);
        setCancelReason("");
        fetchAppointments(filter);
        refreshNotifications();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to cancel appointment");
      }
    } catch (err: any) {
      alert(err.message || "Failed to cancel appointment");
    } finally {
      setIsCancelling(false);
    }
  };

  const filteredAppointments = appointments.filter((appt) => {
    // "Needs action" = pending request proposed by the CLIENT (host must approve/decline)
    if (filter === "needs-action") {
      const pending = appt.rescheduleRequests?.[0];
      if (!pending || pending.proposedByRole !== "CLIENT") return false;
    }
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      appt.clientName.toLowerCase().includes(query) ||
      appt.clientEmail.toLowerCase().includes(query) ||
      appt.offering?.title?.toLowerCase().includes(query)
    );
  });

  const needsActionCount = appointments.filter(
    (a) => a.rescheduleRequests?.[0]?.proposedByRole === "CLIENT"
  ).length;

  const formatScheduleDateTime = (startIso: string, endIso: string) => {
    const start = new Date(startIso);
    const end = new Date(endIso);

    try {
      const datePart = new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(start);

      const timePart = `${new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }).format(start)} – ${new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }).format(end)}`;

      return `${datePart} • ${timePart}`;
    } catch {
      return `${start.toLocaleDateString()} ${start.toLocaleTimeString()}`;
    }
  };

  const getRelativeTimeLabel = (startIso: string, status: string) => {
    if (status === "CANCELLED") return "Cancelled";
    const now = Date.now();
    const startMs = new Date(startIso).getTime();
    const diffMs = startMs - now;

    if (diffMs < 0) {
      return "Ended";
    }

    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      return `In ${diffMins} min${diffMins === 1 ? "" : "s"}`;
    }
    if (diffHours < 24) {
      return `In ${diffHours} hr${diffHours === 1 ? "" : "s"}`;
    }
    if (diffDays === 1) {
      return "Tomorrow";
    }
    return `In ${diffDays} days`;
  };

  return (
    <div className="space-y-6">
      {/* Action-needed banner */}
      {(stats.pendingReschedules || 0) > 0 && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-sky-500/30 bg-sky-500/[0.07]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
              <CalendarClock className="w-4.5 h-4.5 text-sky-600 dark:text-sky-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">
                {stats.pendingReschedules} reschedule request{(stats.pendingReschedules || 0) === 1 ? "" : "s"} pending
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {needsActionCount > 0
                  ? `${needsActionCount} need${needsActionCount === 1 ? "s" : ""} your approval — original slots stay booked until you respond.`
                  : "Awaiting the other party — original slots stay booked."}
              </p>
            </div>
          </div>
          {needsActionCount > 0 && (
            <Button size="sm" onClick={() => setFilter("needs-action")} className="cursor-pointer text-xs font-bold shrink-0">
              Review now
            </Button>
          )}
        </div>
      )}

      {/* Top Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Upcoming
          </p>
          <p className="text-2xl font-extrabold text-foreground">{stats.upcoming}</p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Needs action
          </p>
          <p className="text-2xl font-extrabold text-sky-600 dark:text-sky-300">{stats.pendingReschedules || 0}</p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Completed / Past
          </p>
          <p className="text-2xl font-extrabold text-muted-foreground">{stats.past}</p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Cancelled
          </p>
          <p className="text-2xl font-extrabold text-rose-400">{stats.cancelled}</p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Revenue
          </p>
          <p className="text-2xl font-extrabold text-primary">{formatMoney(stats.totalRevenue, stats.currency || "INR")}</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            variant={filter === "upcoming" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("upcoming")}
            className="cursor-pointer text-xs font-bold"
          >
            Upcoming ({stats.upcoming})
          </Button>
          <Button
            variant={filter === "needs-action" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("needs-action")}
            className={`cursor-pointer text-xs font-semibold ${needsActionCount > 0 ? "border-sky-500/50" : ""}`}
          >
            Needs action ({needsActionCount})
          </Button>
          <Button
            variant={filter === "past" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("past")}
            className="cursor-pointer text-xs font-semibold"
          >
            Past ({stats.past})
          </Button>
          <Button
            variant={filter === "cancelled" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("cancelled")}
            className="cursor-pointer text-xs font-semibold"
          >
            Cancelled ({stats.cancelled})
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            className="cursor-pointer text-xs font-semibold"
          >
            All ({stats.total})
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by client or offering..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 cursor-pointer shrink-0"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading scheduled appointments...</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="text-center py-16 px-4 bg-card/30 rounded-2xl border border-dashed border-border">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No appointments found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            {searchQuery
              ? "No appointments match your search query."
              : filter === "upcoming"
              ? "You have no upcoming appointments scheduled."
              : "No appointments recorded in this category."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((appt) => {
            const isConfirmed = appt.status === "CONFIRMED";
            const isCancelled = appt.status === "CANCELLED";
            const relativeTime = getRelativeTimeLabel(appt.scheduledStart, appt.status);
            const joinLink = appt.joinUrl || (appt.meetingId ? `/meet/${appt.meetingId}` : `/meet/${appt.id}`);
            const pending = appt.rescheduleRequests?.[0] || null;
            const needsHostAction = Boolean(pending && pending.proposedByRole === "CLIENT" && isConfirmed);

            return (
              <div
                key={appt.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-4 ${
                  needsHostAction
                    ? "bg-card border-sky-500/50 shadow-[0_0_0_1px_rgba(56,189,248,0.25)]"
                    : isConfirmed
                    ? "bg-card border-border hover:border-primary/50 shadow-2xs"
                    : "bg-muted/30 border-border/60 opacity-80"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left info column */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: appt.offering?.color || "#84cc16" }}
                    />
                    <h4 className="font-bold text-foreground text-sm sm:text-base truncate">
                      {appt.offering?.title || "Scheduled Appointment"}
                    </h4>

                    {/* Relative status badge */}
                    <Badge
                      variant={isCancelled ? "destructive" : isConfirmed ? "default" : "secondary"}
                      className="text-[11px] font-bold py-0.5"
                    >
                      {relativeTime}
                    </Badge>

                    {needsHostAction && (
                      <Badge variant="outline" className="text-[11px] font-bold border-sky-500/50 text-sky-600 dark:text-sky-300 animate-pulse">
                        Needs your approval
                      </Badge>
                    )}
                    {pending && !needsHostAction && isConfirmed && (
                      <Badge variant="outline" className="text-[11px] font-semibold text-muted-foreground">
                        Reschedule pending
                      </Badge>
                    )}
                    {(appt.rescheduleCount || 0) > 0 && (
                      <Badge variant="secondary" className="text-[10px] font-semibold">
                        Rescheduled ×{appt.rescheduleCount}
                      </Badge>
                    )}

                    {/* Price / Payment Badge */}
                    <Badge variant="outline" className="text-[11px] font-mono">
                      {(appt.offering?.price ?? 0) > 0
                        ? `${appt.offering?.currency || "USD"} ${appt.offering.price}`
                        : "Free"}
                    </Badge>
                  </div>

                  {/* Scheduled Time */}
                  <div className="flex items-center gap-2 text-xs text-foreground/90 font-medium">
                    <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{formatScheduleDateTime(appt.scheduledStart, appt.scheduledEnd)}</span>
                  </div>

                  {/* Attendee / Client Details */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-0.5">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-primary" />
                      <strong className="text-foreground">{appt.clientName}</strong> ({appt.clientEmail})
                    </span>
                    {appt.clientNotes && (
                      <span className="truncate max-w-md italic text-muted-foreground/80">
                        "{appt.clientNotes}"
                      </span>
                    )}
                  </div>

                  {isCancelled && appt.cancelledReason && (
                    <p className="text-xs text-rose-400 font-medium pt-1">
                      Cancellation reason: {appt.cancelledReason}
                    </p>
                  )}
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap">
                  {isConfirmed && (
                    <>
                      <Link href={joinLink}>
                        <Button
                          size="sm"
                          className="gap-1.5 text-xs font-bold cursor-pointer"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join Call</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyLink(joinLink, appt.id)}
                        className={`text-xs gap-1 cursor-pointer ${
                          copiedId === appt.id ? "text-primary font-bold" : "text-muted-foreground"
                        }`}
                        title="Copy meeting join link"
                      >
                        {copiedId === appt.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-primary" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </Button>

                      {!pending && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReschedulingTarget(appt)}
                          className="text-xs gap-1 cursor-pointer"
                          title="Propose a new time — client must approve"
                        >
                          <CalendarClock className="w-3.5 h-3.5" />
                          <span>Reschedule</span>
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCancellingTarget(appt)}
                        className="text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        Cancel
                      </Button>
                    </>
                  )}

                  {isCancelled && (
                    <span className="text-xs font-semibold text-muted-foreground px-2 py-1 bg-muted rounded-lg">
                      Cancelled
                    </span>
                  )}
                </div>
                </div>

                {pending && isConfirmed && (
                  <RescheduleStatusCard
                    appointmentId={appt.id}
                    pending={pending}
                    viewerRole="HOST"
                    onChanged={() => {
                      fetchAppointments(filter);
                      refreshNotifications();
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Appointment Dialog */}
      <ConfirmDialog
        open={Boolean(cancellingTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setCancellingTarget(null);
            setCancelReason("");
          }
        }}
        title={`Cancel Appointment with ${cancellingTarget?.clientName}?`}
        description="Are you sure you want to cancel this appointment? The client and video room will be notified."
        variant="danger"
        confirmText="Yes, Cancel Appointment"
        cancelText="Keep Appointment"
        isLoading={isCancelling}
        onConfirm={handleExecuteCancel}
        onCancel={() => {
          setCancellingTarget(null);
          setCancelReason("");
        }}
      />

      {reschedulingTarget && (
        <RescheduleDialog
          open={Boolean(reschedulingTarget)}
          onOpenChange={(open) => {
            if (!open) setReschedulingTarget(null);
          }}
          appointmentId={reschedulingTarget.id}
          offeringId={reschedulingTarget.offering.id}
          currentStart={reschedulingTarget.scheduledStart}
          currentEnd={reschedulingTarget.scheduledEnd}
          defaultTimezone={reschedulingTarget.timezone}
          onSuccess={() => {
            setReschedulingTarget(null);
            fetchAppointments(filter);
            refreshNotifications();
          }}
        />
      )}
    </div>
  );
}

