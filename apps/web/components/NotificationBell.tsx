"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Bell, CalendarClock, CheckCheck, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

function timeAgo(iso: string) {
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  } catch {
    return "";
  }
}

function iconForType(type: string) {
  if (type.startsWith("APPOINTMENT_RESCHEDULE")) {
    return <CalendarClock className="w-4 h-4 text-sky-500 shrink-0" />;
  }
  if (type.startsWith("APPOINTMENT")) {
    return <CalendarClock className="w-4 h-4 text-primary shrink-0" />;
  }
  return <Info className="w-4 h-4 text-muted-foreground shrink-0" />;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingActionCount, setPendingActionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=20");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setPendingActionCount(data.pendingActionCount || 0);
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30000);
    const onFocus = () => fetchNotifications();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchNotifications]);

  // Refresh when a reschedule happens elsewhere in the app
  useEffect(() => {
    const handler = () => fetchNotifications();
    window.addEventListener("notifications-refresh", handler);
    window.addEventListener("appointment-updated", handler);
    return () => {
      window.removeEventListener("notifications-refresh", handler);
      window.removeEventListener("appointment-updated", handler);
    };
  }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      setIsLoading(true);
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const markOneRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const needsAction = notifications.filter(
    (n) => !n.isRead && n.type === "APPOINTMENT_RESCHEDULE_REQUEST"
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            title="Notifications"
            aria-label="Notifications"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 border-border h-9 w-9 rounded-xl relative shrink-0 cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-black flex items-center justify-center border-2 border-background">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        }
      />
      <PopoverContent align="end" className="w-[380px] max-w-[92vw] p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="space-y-0.5">
            <p className="text-sm font-bold text-foreground">Notifications</p>
            {pendingActionCount > 0 ? (
              <p className="text-[11px] font-semibold text-sky-600 dark:text-sky-300">
                {pendingActionCount} reschedule request{pendingActionCount === 1 ? "" : "s"} need{pendingActionCount === 1 ? "s" : ""} your approval
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">You&apos;re all caught up</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllRead}
            disabled={isLoading || unreadCount === 0}
            className="h-7 text-[11px] gap-1 cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />}
            Mark all read
          </Button>
        </div>

        {needsAction.length > 0 && (
          <div className="px-3 pt-3">
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" />
                Action needed
              </span>
              <Badge variant="outline" className="text-[10px] font-bold border-sky-500/40 text-sky-700 dark:text-sky-300">
                {needsAction.length} pending
              </Badge>
            </div>
          </div>
        )}

        <div className="max-h-[380px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-10 px-6 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                <Bell className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-bold text-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground">
                Booking confirmations, cancellations and reschedule requests will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {notifications.map((n) => {
                const isRescheduleRequest = n.type === "APPOINTMENT_RESCHEDULE_REQUEST";
                const inner = (
                  <div
                    className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${
                      !n.isRead ? "bg-primary/[0.04]" : ""
                    }`}
                  >
                    <div className="mt-0.5">{iconForType(n.type)}</div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-foreground truncate flex-1">{n.title}</p>
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                        {isRescheduleRequest && !n.isRead && (
                          <Badge variant="outline" className="text-[10px] font-bold border-sky-500/40 text-sky-600 dark:text-sky-300 h-4.5 py-0">
                            Needs approval
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
                return n.link ? (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => {
                      markOneRead(n.id);
                      setOpen(false);
                    }}
                  >
                    {inner}
                  </Link>
                ) : (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => markOneRead(n.id)}
                    className="w-full text-left cursor-pointer"
                  >
                    {inner}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
