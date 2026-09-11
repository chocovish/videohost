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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
} from "lucide-react";

export interface RescheduleSlot {
  start: string;
  end: string;
  timeLabel: string;
}

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  offeringId: string;
  currentStart: string;
  currentEnd: string;
  defaultTimezone?: string;
  onSuccess?: () => void;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatCurrentRange(startIso: string, endIso: string) {
  try {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const datePart = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(start);
    const timePart = `${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(start)} – ${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(end)}`;
    return `${datePart} • ${timePart}`;
  } catch {
    return `${new Date(startIso).toLocaleString()}`;
  }
}

export default function RescheduleDialog({
  open,
  onOpenChange,
  appointmentId,
  offeringId,
  currentStart,
  currentEnd,
  defaultTimezone,
  onSuccess,
}: RescheduleDialogProps) {
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<RescheduleSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<RescheduleSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [timezone, setTimezone] = useState(defaultTimezone || "UTC");
  useEffect(() => {
    if (open) {
      try {
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (detected) setTimezone(detected);
      } catch {}
      setSelectedDate(null);
      setSelectedSlot(null);
      setAvailableSlots([]);
      setReason("");
      setError(null);
      setCurrentMonthDate(new Date());
    }
  }, [open]);

  useEffect(() => {
    if (!open || !selectedDate) return;
    async function fetchSlots() {
      try {
        setLoadingSlots(true);
        setSelectedSlot(null);
        setError(null);
        const year = selectedDate!.getFullYear();
        const month = String(selectedDate!.getMonth() + 1).padStart(2, "0");
        const day = String(selectedDate!.getDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;
        const res = await fetch(
          `/api/public/book/${offeringId}?date=${dateStr}&timezone=${encodeURIComponent(timezone)}&excludeAppointmentId=${encodeURIComponent(appointmentId)}`
        );
        if (res.ok) {
          const data = await res.json();
          setAvailableSlots(data.availableSlots || []);
        } else {
          setAvailableSlots([]);
        }
      } catch {
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }
    fetchSlots();
  }, [selectedDate, timezone, offeringId, appointmentId, open]);

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    const prev = new Date(year, month - 1, 1);
    const now = new Date();
    if (prev.getFullYear() < now.getFullYear() || (prev.getFullYear() === now.getFullYear() && prev.getMonth() < now.getMonth())) return;
    setCurrentMonthDate(prev);
  };
  const handleNextMonth = () => setCurrentMonthDate(new Date(year, month + 1, 1));

  const handleDateClick = (dayNumber: number) => {
    const clicked = new Date(year, month, dayNumber);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (clicked < today) return;
    setSelectedDate(clicked);
  };

  const isToday = (dayNumber: number) => {
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === dayNumber;
  };
  const isSelected = (dayNumber: number) => {
    if (!selectedDate) return false;
    return selectedDate.getFullYear() === year && selectedDate.getMonth() === month && selectedDate.getDate() === dayNumber;
  };
  const isPast = (dayNumber: number) => {
    const d = new Date(year, month, dayNumber);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  };

  const monthYearLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(currentMonthDate);

  const handleSubmit = async () => {
    if (!selectedSlot) {
      setError("Please select a new time slot");
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await fetch(`/api/appointments/${appointmentId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposedStart: selectedSlot.start,
          proposedEnd: selectedSlot.end,
          timezone,
          reason: reason.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to request reschedule");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Failed to request reschedule");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            Request reschedule
          </DialogTitle>
          <DialogDescription>
            Pick a new time. The other party must approve before the appointment moves — the original slot stays booked until then.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="p-3 rounded-xl bg-muted/40 border border-border/70 text-xs space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Current booking</p>
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              {formatCurrentRange(currentStart, currentEnd)}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-sm font-bold text-foreground">{monthYearLabel}</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-7 w-7 cursor-pointer">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-7 w-7 cursor-pointer">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {DAYS_OF_WEEK.map((d) => (
                <div key={d} className="font-bold text-muted-foreground py-1 text-[11px]">{d}</div>
              ))}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="h-8" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const past = isPast(dayNum);
                const selected = isSelected(dayNum);
                const today = isToday(dayNum);
                return (
                  <button
                    key={dayNum}
                    type="button"
                    disabled={past}
                    onClick={() => handleDateClick(dayNum)}
                    className={`h-9 rounded-xl text-xs font-semibold transition-all flex items-center justify-center relative ${
                      past
                        ? "text-muted-foreground/30 cursor-not-allowed"
                        : selected
                        ? "bg-primary text-primary-foreground font-black shadow-xs"
                        : today
                        ? "border border-primary text-primary hover:bg-muted font-bold cursor-pointer"
                        : "text-foreground hover:bg-muted cursor-pointer"
                    }`}
                  >
                    {dayNum}
                    {today && !selected && <span className="w-1 h-1 rounded-full bg-primary absolute bottom-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDate && (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                New time — {new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(selectedDate)}
              </Label>
              {loadingSlots ? (
                <div className="py-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" /> Checking availability…
                </div>
              ) : availableSlots.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-3 bg-muted/30 rounded-xl text-center">
                  No open slots on this date. Try another day.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                  {availableSlots.map((slot, idx) => {
                    const active = selectedSlot?.start === slot.start;
                    return (
                      <Button
                        key={idx}
                        type="button"
                        variant={active ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedSlot(slot)}
                        className="h-9 text-xs font-semibold cursor-pointer"
                      >
                        {slot.timeLabel}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="reschedule-reason" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Reason / note (optional)
            </Label>
            <Textarea
              id="reschedule-reason"
              placeholder="e.g. Running late that day — would morning work instead?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={1000}
            />
            <p className="text-[11px] text-muted-foreground">
              This note is shared with the other party and included in the email notification.
            </p>
          </div>

          {error && (
            <div className="p-3 text-xs font-semibold rounded-xl bg-destructive/15 text-destructive border border-destructive/20">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="cursor-pointer">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedSlot} className="cursor-pointer">
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Send reschedule request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
