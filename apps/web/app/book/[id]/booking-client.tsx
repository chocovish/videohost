"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Calendar,
  Clock,
  Video,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Globe,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  User,
  Mail,
  FileText,
  CalendarPlus,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BookingClientProps {
  initialOffering: any;
  offeringId: string;
}

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function BookingClient({ initialOffering, offeringId }: BookingClientProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const isLoggedIn = Boolean(session?.user?.id);
  const userEmail = session?.user?.email || "";
  const initialName = session?.user?.name || "";
  const userImage = session?.user?.image;

  const [offering, setOffering] = useState(initialOffering);
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Array<{ start: string; end: string; timeLabel: string }>>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string; timeLabel: string } | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [timezone, setTimezone] = useState("UTC");

  // Form State
  const [clientName, setClientName] = useState(initialName);
  const [clientNotes, setClientNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Sync client name if session loads after initial mount
  useEffect(() => {
    if (!clientName && initialName) {
      setClientName(initialName);
    }
  }, [initialName]);

  const handleSignIn = () => {
    const callback =
      typeof window !== "undefined" ? window.location.href : `/share/${offeringId}`;
    router.push(`/auth/login?callbackUrl=${encodeURIComponent(callback)}`);
  };

  // Success State
  const [bookedAppointment, setBookedAppointment] = useState<any>(null);

  // Auto-detect timezone on mount
  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setTimezone(detected);
    } catch {}
  }, []);

  // Fetch slots whenever selectedDate or timezone changes
  useEffect(() => {
    if (!selectedDate) return;

    async function fetchSlots() {
      try {
        setLoadingSlots(true);
        setSelectedSlot(null);
        setBookingError(null);

        const year = selectedDate!.getFullYear();
        const month = String(selectedDate!.getMonth() + 1).padStart(2, "0");
        const day = String(selectedDate!.getDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;

        const res = await fetch(
          `/api/public/book/${offeringId}?date=${dateStr}&timezone=${encodeURIComponent(timezone)}`
        );
        if (res.ok) {
          const data = await res.json();
          setAvailableSlots(data.availableSlots || []);
          if (data.offering) setOffering(data.offering);
        } else {
          setAvailableSlots([]);
        }
      } catch (err) {
        console.error("Failed to load slots:", err);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }

    fetchSlots();
  }, [selectedDate, timezone, offeringId]);

  // Calendar Helpers
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    const prev = new Date(year, month - 1, 1);
    const now = new Date();
    // Don't go to past months
    if (prev.getFullYear() < now.getFullYear() || (prev.getFullYear() === now.getFullYear() && prev.getMonth() < now.getMonth())) {
      return;
    }
    setCurrentMonthDate(prev);
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (dayNumber: number) => {
    const clicked = new Date(year, month, dayNumber);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (clicked < today) return; // Cannot select past dates
    setSelectedDate(clicked);
  };

  const isToday = (dayNumber: number) => {
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === dayNumber;
  };

  const isSelected = (dayNumber: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth() === month &&
      selectedDate.getDate() === dayNumber
    );
  };

  const isPast = (dayNumber: number) => {
    const d = new Date(year, month, dayNumber);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  };

  const monthYearLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(currentMonthDate);

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      handleSignIn();
      return;
    }
    if (!selectedSlot) {
      setBookingError("Please select a time slot");
      return;
    }

    const finalClientName = clientName.trim() || initialName || "Client";

    try {
      setIsSubmitting(true);
      setBookingError(null);

      const payload = {
        scheduledStart: selectedSlot.start,
        scheduledEnd: selectedSlot.end,
        clientName: finalClientName,
        clientNotes: clientNotes.trim() || null,
        timezone,
      };

      const res = await fetch(`/api/public/book/${offeringId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "LOGIN_REQUIRED") {
          handleSignIn();
          return;
        }
        throw new Error(data.error || "Failed to book appointment slot");
      }

      setBookedAppointment(data.appointment);
    } catch (err: any) {
      setBookingError(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const orgName = offering?.organization?.name || "Host Organization";
  const hostName = offering?.createdBy?.name || "Host";
  const isFree = !offering?.price || offering.price <= 0;
  const priceDisplay = isFree ? "Free" : `${offering?.currency || "USD"} ${offering?.price}`;

  // Render Confirmation Screen
  if (bookedAppointment) {
    const startDate = new Date(bookedAppointment.scheduledStart);
    const endDate = new Date(bookedAppointment.scheduledEnd);
    const formattedDate = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: timezone,
    }).format(startDate);

    const formattedTime = `${new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }).format(startDate)} – ${new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone: timezone,
    }).format(endDate)}`;

    const joinLink = bookedAppointment.joinUrl || `/meet/${bookedAppointment.meetingId}`;

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-primary/15 text-primary border border-primary/30 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1.5">
            <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary uppercase font-bold text-[11px]">
              Confirmed
            </Badge>
            <h1 className="text-2xl font-black text-foreground tracking-tight">
              You're Scheduled!
            </h1>
            <p className="text-xs text-muted-foreground">
              A calendar invitation & confirmation email has been sent to <strong>{bookedAppointment.clientEmail}</strong>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 text-left space-y-2.5 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Session</span>
              <p className="font-bold text-sm text-foreground">{offering.title}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">When</span>
              <p className="font-semibold text-foreground">{formattedDate}</p>
              <p className="text-muted-foreground">{formattedTime}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Host</span>
              <p className="font-semibold text-foreground">{hostName} ({orgName})</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-3">
            <Link href={joinLink} className="block w-full">
              <Button size="lg" className="w-full gap-2 font-bold cursor-pointer shadow-xs">
                <Video className="w-4 h-4" />
                <span>Join Video Room</span>
              </Button>
            </Link>

            <Button
              variant="outline"
              size="default"
              onClick={() => {
                setBookedAppointment(null);
                setSelectedSlot(null);
              }}
              className="w-full text-xs cursor-pointer"
            >
              Book Another Time
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-3 sm:p-6 md:p-8">
      <div className="max-w-4xl w-full bg-card border border-border rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
        {/* Left Side: Host & Offering Information */}
        <div className="md:col-span-5 p-6 md:p-8 border-b md:border-b-0 md:border-r border-border bg-card/70 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            {/* Header & Avatar */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: offering.color || "#84cc16" }}
                />
                <span>{orgName}</span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
                {offering.title}
              </h1>
            </div>

            {/* Badges strip */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1 text-xs font-semibold">
                <Clock className="w-3 h-3 text-primary" />
                {offering.duration} mins
              </Badge>
              <Badge
                variant="outline"
                className={`gap-1 text-xs font-bold ${
                  isFree
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-primary/10 border-primary/25 text-primary"
                }`}
              >
                <DollarSign className="w-3 h-3" />
                {priceDisplay}
              </Badge>
            </div>

            {/* Meeting type info */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Video className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>LiveKit HD Video Conference Room</span>
            </div>

            {/* Description */}
            {offering.description && (
              <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border/60">
                {offering.description}
              </p>
            )}
          </div>

          {/* Timezone picker on bottom left */}
          <div className="pt-4 border-t border-border/60 space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-primary" /> Timezone
            </Label>
            <Select value={timezone} onValueChange={(val) => val && setTimezone(val)}>
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue placeholder="Select timezone">
                  {timezone}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {!COMMON_TIMEZONES.includes(timezone) && (
                    <SelectItem value={timezone} className="text-xs">
                      {timezone}
                    </SelectItem>
                  )}
                  {COMMON_TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz} className="text-xs">
                      {tz}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right Side: Interactive Calendar & Slot Picker */}
        <div className="md:col-span-7 p-6 md:p-8 flex flex-col justify-between">
          {!selectedSlot ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-foreground">Select a Date & Time</h2>
                <p className="text-xs text-muted-foreground">
                  Choose a date on the calendar to see real-time open slots.
                </p>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center justify-between pb-1">
                <span className="text-sm font-bold text-foreground">{monthYearLabel}</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrevMonth}
                    className="h-7 w-7 rounded-lg cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNextMonth}
                    className="h-7 w-7 rounded-lg cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {DAYS_OF_WEEK.map((d) => (
                  <div key={d} className="font-bold text-muted-foreground py-1 text-[11px]">
                    {d}
                  </div>
                ))}

                {/* Empty cells before month start */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-8" />
                ))}

                {/* Days of current month */}
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
                      {today && !selected && (
                        <span className="w-1 h-1 rounded-full bg-primary absolute bottom-1" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Time Slots Area for Selected Date */}
              {selectedDate && (
                <div className="pt-4 border-t border-border space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      Available Slots for{" "}
                      {new Intl.DateTimeFormat("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      }).format(selectedDate)}
                    </span>
                    {loadingSlots && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                  </div>

                  {loadingSlots ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      Calculating real-time availability...
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-3 bg-muted/30 rounded-xl text-center">
                      No available time slots on this date. Please pick another day.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                      {availableSlots.map((slot, idx) => (
                        <Button
                          key={idx}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSlot(slot)}
                          className="h-9 text-xs font-semibold border-border hover:border-primary hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                        >
                          {slot.timeLabel}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : !isLoggedIn ? (
            /* Step 2: Sign-in Required */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSlot(null)}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer -ml-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Change Time
                </Button>
                <Badge variant="outline" className="text-xs font-mono text-primary border-primary/30">
                  {selectedSlot.timeLabel}
                </Badge>
              </div>

              <div className="p-5 rounded-2xl border border-border text-center space-y-4 bg-muted/30">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto bg-primary/10 text-primary">
                  <LogIn className="w-6 h-6" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-foreground">Sign In Required</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Please sign in to schedule this session. Your account email will be used for your booking and calendar invite.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleSignIn}
                  className="w-full font-bold cursor-pointer h-10 flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Continue</span>
                </Button>
              </div>
            </div>
          ) : (
            /* Step 2: Confirmation & Details Form */
            <form onSubmit={handleSubmitBooking} className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSlot(null)}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer -ml-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Change Time
                </Button>
                <Badge variant="outline" className="text-xs font-mono text-primary border-primary/30">
                  {selectedSlot.timeLabel}
                </Badge>
              </div>

              <div>
                <h2 className="text-base font-bold text-foreground">Your Information</h2>
                <p className="text-xs text-muted-foreground">
                  Review your account details to finalize the reservation.
                </p>
              </div>

              {bookingError && (
                <div className="p-3 text-xs font-semibold rounded-xl bg-destructive/15 text-destructive border border-destructive/20">
                  {bookingError}
                </div>
              )}

              {/* Verified Account Information - email taken from account */}
              <div className="p-3 rounded-xl border border-border flex items-center gap-3 bg-muted/30">
                {userImage ? (
                  <img
                    src={userImage}
                    alt={clientName || "User"}
                    className="w-9 h-9 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 bg-primary/10 text-primary">
                    {(clientName || userEmail || "U").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold truncate text-foreground">
                      {clientName || "Your Account"}
                    </p>
                    <Badge variant="outline" className="text-[9px] uppercase font-bold px-1.5 py-0 h-4 border-primary/40 text-primary">
                      Signed In
                    </Badge>
                  </div>
                  <p className="text-[11px] truncate flex items-center gap-1 mt-0.5 text-muted-foreground">
                    <Mail className="w-3 h-3 shrink-0" />
                    <span className="truncate">{userEmail}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="client-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Your Name *
                  </Label>
                  <Input
                    id="client-name"
                    placeholder="e.g. Alex Johnson"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="client-notes" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Notes / Questions (Optional)
                  </Label>
                  <Textarea
                    id="client-notes"
                    placeholder="Please share anything that will help prepare for our meeting..."
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <div className="pt-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full font-bold cursor-pointer h-10 shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Confirming Appointment...
                    </>
                  ) : (
                    `Confirm Appointment • ${priceDisplay}`
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
