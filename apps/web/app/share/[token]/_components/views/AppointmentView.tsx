"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Calendar,
  Clock,
  Video,
  ChevronLeft,
  ChevronRight,
  Globe,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  User,
  Mail,
  CalendarPlus,
  Sparkles,
  Lock,
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
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import type { PriceInfo, SharedData } from "../types";
import type { ShareTheme } from "../share-theme";
import { loadRazorpayScript, loadCashfreeScript } from "../utils";
import { CountrySelector } from "../ui/CountrySelector";

interface AppointmentViewProps {
  data: SharedData;
  theme: ShareTheme;
  priceInfo: PriceInfo;
  selectedCountry?: string;
  onCountryChange?: (countryCode: string) => void;
  copied: boolean;
  onCopyLink: () => void;
  onSignIn?: () => void;
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

export function AppointmentView({
  data,
  theme,
  priceInfo,
  selectedCountry,
  onCountryChange,
  copied,
  onCopyLink,
  onSignIn,
}: AppointmentViewProps) {
  const offering = data.appointmentOffering;
  if (!offering) return null;

  const router = useRouter();
  const { data: session } = useSession();

  const isLoggedIn = Boolean(data.isLoggedIn || session?.user?.id);
  const userEmail = session?.user?.email || data.currentUser?.email || "";
  const initialName = session?.user?.name || data.currentUser?.name || "";
  const userImage = session?.user?.image || data.currentUser?.image;

  const {
    cardBgClass,
    roundnessClass,
    dividerBorder,
    softSurface,
    accentHex,
    onAccentHex,
    headingHex,
    bodyHex,
    mutedHex,
    surfaceHex,
    surfaceBorderHex,
    surfaceTextHex,
    isLight,
  } = theme;
  const organization = data.organization;

  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<
    Array<{ start: string; end: string; timeLabel: string }>
  >([]);
  const [selectedSlot, setSelectedSlot] = useState<{
    start: string;
    end: string;
    timeLabel: string;
  } | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [timezone, setTimezone] = useState("UTC");

  // Form State - prefilled from session
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
    if (onSignIn) {
      onSignIn();
      return;
    }
    const callback =
      typeof window !== "undefined" ? window.location.href : `/share/${offering.id}`;
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
          `/api/public/book/${offering!.id}?date=${dateStr}&timezone=${encodeURIComponent(timezone)}`
        );
        if (res.ok) {
          const resData = await res.json();
          setAvailableSlots(resData.availableSlots || []);
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
  }, [selectedDate, timezone, offering?.id]);

  // Calendar Helpers
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    const prev = new Date(year, month - 1, 1);
    const now = new Date();
    if (
      prev.getFullYear() < now.getFullYear() ||
      (prev.getFullYear() === now.getFullYear() && prev.getMonth() < now.getMonth())
    ) {
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

    if (clicked < today) return;
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

  const isFree = priceInfo ? priceInfo.isFree : (!offering.price || offering.price <= 0);
  const priceDisplay = isFree
    ? "Free Session"
    : (priceInfo?.formatted || `${offering.currency} ${offering.price}`);

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

      // CASE A: FREE APPOINTMENT
      if (isFree) {
        const payload = {
          scheduledStart: selectedSlot.start,
          scheduledEnd: selectedSlot.end,
          clientName: finalClientName,
          clientNotes: clientNotes.trim() || null,
          timezone,
          countryCode: selectedCountry || undefined,
        };

        const res = await fetch(`/api/public/book/${offering.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const resData = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (resData.error === "LOGIN_REQUIRED") {
            handleSignIn();
            return;
          }
          throw new Error(resData.error || "Failed to book appointment slot");
        }

        setBookedAppointment(resData.appointment);
        return;
      }

      // CASE B: PAID APPOINTMENT - MANDATORY PAYMENT GATEWAY CHECKOUT
      // 1. Initialize payment order on backend
      const orderRes = await fetch(`/api/public/book/${offering.id}/payment-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledStart: selectedSlot.start,
          scheduledEnd: selectedSlot.end,
          clientName: finalClientName,
          clientNotes: clientNotes.trim() || null,
          timezone,
          countryCode: selectedCountry || undefined,
        }),
      });

      const orderData = await orderRes.json().catch(() => ({}));
      if (!orderRes.ok) {
        if (orderData.error === "LOGIN_REQUIRED") {
          handleSignIn();
          return;
        }
        throw new Error(orderData.error || "Failed to initialize payment gateway order.");
      }

      // 2A. CASHFREE GATEWAY
      if (orderData.gateway === "cashfree") {
        const scriptLoaded = await loadCashfreeScript();
        if (!scriptLoaded || !(window as any).Cashfree) {
          throw new Error("Cashfree payment gateway SDK failed to load. Please check your network connection.");
        }

        const cashfree = (window as any).Cashfree({
          mode: orderData.cfEnv === "production" ? "production" : "sandbox",
        });

        cashfree
          .checkout({
            paymentSessionId: orderData.paymentSessionId,
            redirectTarget: "_modal",
          })
          .then(async (result: { error?: { message?: string } }) => {
            if (result.error) {
              console.warn("[Cashfree Modal Result]:", result.error);
              if (result.error.message && result.error.message !== "User closed the popup") {
                setBookingError(result.error.message || "Payment was cancelled or failed.");
              }
              setIsSubmitting(false);
              return;
            }

            try {
              const confirmRes = await fetch(`/api/public/book/${offering.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  scheduledStart: selectedSlot.start,
                  scheduledEnd: selectedSlot.end,
                  clientName: finalClientName,
                  clientNotes: clientNotes.trim() || null,
                  timezone,
                  gateway: "cashfree",
                  order_id: orderData.orderId,
                  countryCode: selectedCountry || undefined,
                }),
              });

              const confirmData = await confirmRes.json().catch(() => ({}));
              if (!confirmRes.ok) {
                throw new Error(confirmData.error || "Failed to confirm appointment booking after payment.");
              }

              setBookedAppointment(confirmData.appointment);
            } catch (verifyErr: any) {
              setBookingError(verifyErr.message || "Payment verification failed. Please contact support.");
            } finally {
              setIsSubmitting(false);
            }
          });

        return;
      }

      // 2B. RAZORPAY GATEWAY (Default)
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !(window as any).Razorpay) {
        throw new Error("Razorpay payment gateway SDK failed to load. Please check your network connection.");
      }

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: organization.name || "Taped",
        description: `Booking: ${offering.title}`,
        order_id: orderData.orderId,
        prefill: {
          name: finalClientName,
          email: userEmail,
        },
        theme: {
          color: accentHex || "#84cc16",
        },
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          try {
            const confirmRes = await fetch(`/api/public/book/${offering.id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                scheduledStart: selectedSlot.start,
                scheduledEnd: selectedSlot.end,
                clientName: finalClientName,
                clientNotes: clientNotes.trim() || null,
                timezone,
                gateway: "razorpay",
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                countryCode: selectedCountry || undefined,
              }),
            });

            const confirmData = await confirmRes.json().catch(() => ({}));
            if (!confirmRes.ok) {
              throw new Error(confirmData.error || "Failed to confirm appointment booking after payment.");
            }

            setBookedAppointment(confirmData.appointment);
          } catch (verifyErr: any) {
            setBookingError(verifyErr.message || "Payment verification failed. Please contact support.");
          } finally {
            setIsSubmitting(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (resp: any) {
        setBookingError(resp.error?.description || "Payment failed. Please try again with another card/method.");
        setIsSubmitting(false);
      });
      rzp.open();
    } catch (err: any) {
      setBookingError(err.message || "An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

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
      <div className="max-w-xl mx-auto py-8">
        <div
          className={`border ${cardBgClass} ${roundnessClass} p-8 text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200`}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-xs"
            style={{
              backgroundColor: `${accentHex}20`,
              color: accentHex,
              border: `1px solid ${accentHex}40`,
            }}
          >
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1.5">
            <Badge
              variant="outline"
              className="uppercase font-bold text-[11px] tracking-wider px-3 py-0.5"
              style={{
                backgroundColor: `${accentHex}15`,
                color: accentHex,
                borderColor: `${accentHex}40`,
              }}
            >
              Confirmed Booking
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: headingHex }}>
              You&apos;re Scheduled!
            </h1>
            <p className="text-sm max-w-sm mx-auto" style={{ color: mutedHex }}>
              A calendar invite and confirmation details have been sent to{" "}
              <span className="font-semibold" style={{ color: bodyHex }}>
                {bookedAppointment.clientEmail}
              </span>
              .
            </p>
          </div>

          <div
            className="rounded-2xl p-5 text-left space-y-3.5 border"
            style={{ backgroundColor: surfaceHex, borderColor: surfaceBorderHex }}
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 shrink-0" style={{ color: accentHex }} />
              <div>
                <p className="text-xs uppercase font-bold tracking-wider" style={{ color: mutedHex }}>
                  Date
                </p>
                <p className="text-sm font-semibold" style={{ color: surfaceTextHex }}>
                  {formattedDate}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 shrink-0" style={{ color: accentHex }} />
              <div>
                <p className="text-xs uppercase font-bold tracking-wider" style={{ color: mutedHex }}>
                  Time
                </p>
                <p className="text-sm font-semibold" style={{ color: surfaceTextHex }}>
                  {formattedTime}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Video className="w-5 h-5 shrink-0 text-emerald-400" />
              <div>
                <p className="text-xs uppercase font-bold tracking-wider" style={{ color: mutedHex }}>
                  Meeting Location
                </p>
                <p className="text-sm font-semibold" style={{ color: surfaceTextHex }}>
                  Taped Live Video Room
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons with proper vertical gap */}
          <div className="flex flex-col gap-3 pt-2">
            {bookedAppointment.meetingId && (
              <Link href={joinLink} className="block w-full">
                <Button
                  size="lg"
                  className="w-full font-bold shadow-md cursor-pointer transition-transform active:scale-[0.98]"
                  style={{ backgroundColor: accentHex, color: onAccentHex }}
                >
                  <Video className="w-4 h-4 mr-2" />
                  Join Video Room
                </Button>
              </Link>
            )}

            <Button
              variant="outline"
              size="lg"
              className="w-full font-medium"
              onClick={() => {
                setBookedAppointment(null);
                setSelectedSlot(null);
                setSelectedDate(null);
              }}
            >
              <CalendarPlus className="w-4 h-4 mr-2" />
              Book Another Time
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Offering Overview Card */}
      <div className={`overflow-hidden border ${cardBgClass} ${roundnessClass}`}>
        {/* Status Strip */}
        <div
          className={`px-5 sm:px-6 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 ${dividerBorder}`}
        >
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: offering.color || accentHex }}
            />
            <span className="text-[13px] font-medium" style={{ color: bodyHex }}>
              Live 1:1 Appointment
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs font-bold gap-1 px-3 py-1"
              style={{
                backgroundColor: `${accentHex}15`,
                borderColor: `${accentHex}40`,
                color: isLight ? bodyHex : accentHex,
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{priceDisplay}</span>
            </Badge>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Title & Description */}
          <div className="space-y-3">
            <h1
              className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight"
              style={{ color: headingHex }}
            >
              {offering.title}
            </h1>

            {offering.description && (
              <div className="text-[15px] leading-relaxed max-w-3xl" style={{ color: bodyHex }}>
                <RichTextViewer
                  content={offering.description}
                  className="[&_a]:underline"
                  style={{ color: bodyHex }}
                  accentColor={accentHex}
                  mutedColor={mutedHex}
                />
              </div>
            )}
          </div>

          {/* Host & Event Info Badges */}
          <div
            className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border ${softSurface}`}
          >
            <div className="flex items-center gap-3.5">
              {offering.createdBy?.image ? (
                <img
                  src={offering.createdBy.image}
                  alt={offering.createdBy.name}
                  className="w-12 h-12 rounded-full object-cover border-2 shadow-md"
                  style={{ borderColor: surfaceBorderHex }}
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shadow-md"
                  style={{ backgroundColor: accentHex, color: onAccentHex }}
                >
                  {(offering.createdBy?.name || "H").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold" style={{ color: headingHex }}>
                    {offering.createdBy?.name || "Host"}
                  </p>
                  <span
                    className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: `${accentHex}18`,
                      color: isLight ? bodyHex : accentHex,
                      borderColor: `${accentHex}40`,
                    }}
                  >
                    Host
                  </span>
                </div>
                <p className="text-xs" style={{ color: mutedHex }}>
                  Organized by {organization.name}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border"
                style={{ backgroundColor: surfaceHex, borderColor: surfaceBorderHex }}
              >
                <Clock className="w-4 h-4" style={{ color: accentHex }} />
                <span className="text-xs font-semibold" style={{ color: surfaceTextHex }}>
                  {offering.duration} minutes
                </span>
              </div>

              <div
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border"
                style={{ backgroundColor: surfaceHex, borderColor: surfaceBorderHex }}
              >
                <Video className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold" style={{ color: surfaceTextHex }}>
                  Video Call
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Billing Country Selector */}
          {Boolean(data.countryPricing && data.countryPricing.length > 0) && (
            <CountrySelector
              theme={theme}
              variant="themed"
              value={selectedCountry || ""}
              onChange={onCountryChange || (() => {})}
              countryPricing={data.countryPricing}
              defaultCurrency={offering.currency || "USD"}
            />
          )}
        </div>
      </div>

      {/* Main Booking Interactive Card */}
      <div className={`border ${cardBgClass} ${roundnessClass} overflow-hidden`}>
        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Step 1: Calendar View (lg:col-span-7) */}
            <div className="lg:col-span-7 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold" style={{ color: headingHex }}>
                    Select a Date
                  </h2>
                  <p className="text-xs" style={{ color: mutedHex }}>
                    Showing availability in {timezone}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handlePrevMonth}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-semibold min-w-[120px] text-center" style={{ color: headingHex }}>
                    {monthYearLabel}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleNextMonth}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Monthly Grid */}
              <div className="border rounded-2xl p-4 sm:p-5" style={{ borderColor: surfaceBorderHex, backgroundColor: surfaceHex }}>
                {/* Days of Week Header */}
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div
                      key={day}
                      className="text-xs font-semibold uppercase tracking-wider py-1.5"
                      style={{ color: mutedHex }}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days Cells */}
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {/* Empty cells before 1st of month */}
                  {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-10 sm:h-11" />
                  ))}

                  {/* Days */}
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
                        className={`h-10 sm:h-11 rounded-xl text-sm font-semibold flex items-center justify-center relative transition-all duration-150 ${
                          past
                            ? "opacity-25 cursor-not-allowed text-muted-foreground"
                            : selected
                            ? "shadow-md scale-105"
                            : "hover:bg-accent/15 hover:scale-102 active:scale-98"
                        } ${today && !selected ? "border-2" : ""}`}
                        style={{
                          backgroundColor: selected ? accentHex : undefined,
                          color: selected ? onAccentHex : past ? undefined : surfaceTextHex,
                          borderColor: today && !selected ? accentHex : undefined,
                        }}
                      >
                        {dayNum}
                        {today && !selected && (
                          <span
                            className="absolute bottom-1 w-1 h-1 rounded-full"
                            style={{ backgroundColor: accentHex }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Timezone Selector */}
              <div className="flex items-center gap-2 pt-1">
                <Globe className="w-4 h-4 shrink-0" style={{ color: mutedHex }} />
                <div className="flex-1 max-w-xs">
                  <Select value={timezone} onValueChange={(val) => val && setTimezone(val)}>
                    <SelectTrigger className="h-8 text-xs font-medium">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      <SelectGroup>
                        {COMMON_TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz} className="text-xs">
                            {tz.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Step 2: Time Slots & Booking Details (lg:col-span-5) */}
            <div className="lg:col-span-5 flex flex-col justify-between border-t lg:border-t-0 lg:border-l pt-6 lg:pt-0 lg:pl-8" style={{ borderColor: dividerBorder }}>
              {!selectedDate ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 min-h-[300px]">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: `${accentHex}15`, color: accentHex }}
                  >
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: headingHex }}>
                      Select a Date
                    </h3>
                    <p className="text-xs max-w-[240px] mt-1" style={{ color: mutedHex }}>
                      Choose an available day on the calendar to view bookable meeting slots.
                    </p>
                  </div>
                </div>
              ) : selectedSlot ? (
                /* Step 2B: Confirmation Form */
                !isLoggedIn ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setSelectedSlot(null)}
                        className="text-xs flex items-center gap-1 hover:underline font-medium cursor-pointer"
                        style={{ color: accentHex }}
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Back to times
                      </button>
                      <Badge variant="outline" className="text-[11px] font-bold">
                        {selectedSlot.timeLabel}
                      </Badge>
                    </div>

                    <div
                      className="p-5 rounded-2xl border text-center space-y-4 shadow-sm"
                      style={{ backgroundColor: surfaceHex, borderColor: surfaceBorderHex }}
                    >
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
                        style={{ backgroundColor: `${accentHex}15`, color: accentHex }}
                      >
                        <LogIn className="w-6 h-6" />
                      </div>

                      <div className="space-y-1.5">
                        <h3 className="text-base font-semibold" style={{ color: headingHex }}>
                          Sign In Required
                        </h3>
                        <p className="text-xs max-w-xs mx-auto leading-relaxed" style={{ color: mutedHex }}>
                          {isFree
                            ? "Please sign in to your account to schedule this session. Your account email will be used for calendar invites and confirmation."
                            : `Please sign in to purchase and book this session (${priceDisplay}). Your account email will be used for your booking receipt and meeting access.`}
                        </p>
                      </div>

                      <Button
                        type="button"
                        onClick={handleSignIn}
                        className="w-full font-bold shadow-md cursor-pointer h-10 transition-transform active:scale-[0.99] flex items-center justify-center gap-2"
                        style={{ backgroundColor: accentHex, color: onAccentHex }}
                      >
                        <LogIn className="w-4 h-4" />
                        <span>
                          {isFree
                            ? "Sign In to Schedule Session"
                            : `Sign In to Purchase • ${priceDisplay}`}
                        </span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitBooking} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setSelectedSlot(null)}
                        className="text-xs flex items-center gap-1 hover:underline font-medium cursor-pointer"
                        style={{ color: accentHex }}
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Back to times
                      </button>
                      <Badge variant="outline" className="text-[11px] font-bold">
                        {selectedSlot.timeLabel}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold" style={{ color: headingHex }}>
                        Your Information
                      </h3>
                      <p className="text-xs" style={{ color: mutedHex }}>
                        Review your account details to lock in your session.
                      </p>
                    </div>

                    {bookingError && (
                      <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs leading-relaxed">
                        {bookingError}
                      </div>
                    )}

                    {/* Verified User Account Box - Email comes from user account */}
                    <div
                      className="p-3 rounded-xl border flex items-center gap-3"
                      style={{ backgroundColor: surfaceHex, borderColor: surfaceBorderHex }}
                    >
                      {userImage ? (
                        <img
                          src={userImage}
                          alt={clientName || "User"}
                          className="w-9 h-9 rounded-full object-cover border"
                          style={{ borderColor: surfaceBorderHex }}
                        />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                          style={{ backgroundColor: `${accentHex}20`, color: accentHex }}
                        >
                          {(clientName || userEmail || "U").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold truncate" style={{ color: surfaceTextHex }}>
                            {clientName || "Your Account"}
                          </p>
                          <Badge
                            variant="outline"
                            className="text-[9px] uppercase font-bold px-1.5 py-0 h-4"
                            style={{ borderColor: `${accentHex}40`, color: accentHex }}
                          >
                            Signed In
                          </Badge>
                        </div>
                        <p className="text-[11px] truncate flex items-center gap-1 mt-0.5" style={{ color: mutedHex }}>
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{userEmail}</span>
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="clientName" className="text-xs font-medium">
                          Your Full Name *
                        </Label>
                        <div className="relative">
                          <User className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                          <Input
                            id="clientName"
                            placeholder="e.g. Alex Morgan"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            className="pl-9 text-xs h-9"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="clientNotes" className="text-xs font-medium">
                          What would you like to discuss? (Optional)
                        </Label>
                        <Textarea
                          id="clientNotes"
                          placeholder="Topics, agenda, questions, or context..."
                          value={clientNotes}
                          onChange={(e) => setClientNotes(e.target.value)}
                          className="text-xs min-h-[80px]"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full font-bold shadow-md cursor-pointer h-10 transition-transform active:scale-[0.99]"
                      style={{ backgroundColor: accentHex, color: onAccentHex }}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {isFree ? "Confirming Slot..." : "Processing Payment..."}
                        </>
                      ) : isFree ? (
                        "Schedule Free Session"
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Pay & Book • {priceDisplay}
                        </>
                      )}
                    </Button>
                  </form>
                )
              ) : (
                /* Step 2A: Select Available Slot */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: headingHex }}>
                        Select a Time
                      </h3>
                      <p className="text-xs" style={{ color: mutedHex }}>
                        {new Intl.DateTimeFormat("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        }).format(selectedDate)}
                      </p>
                    </div>

                    <Badge variant="outline" className="text-[11px] font-bold">
                      {availableSlots.length} available
                    </Badge>
                  </div>

                  {loadingSlots ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      <p className="text-xs" style={{ color: mutedHex }}>
                        Calculating available slots...
                      </p>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div
                      className="p-6 rounded-2xl border text-center space-y-2 my-4"
                      style={{ backgroundColor: surfaceHex, borderColor: surfaceBorderHex }}
                    >
                      <Clock className="w-6 h-6 mx-auto text-muted-foreground" />
                      <p className="text-xs font-medium" style={{ color: surfaceTextHex }}>
                        No available slots on this day.
                      </p>
                      <p className="text-[11px]" style={{ color: mutedHex }}>
                        Please pick another date on the calendar.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                      {availableSlots.map((slot, idx) => (
                        <Button
                          key={idx}
                          type="button"
                          variant="outline"
                          onClick={() => setSelectedSlot(slot)}
                          className="w-full justify-between text-xs h-10 border transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] font-medium cursor-pointer"
                          style={{
                            borderColor: surfaceBorderHex,
                            backgroundColor: surfaceHex,
                            color: surfaceTextHex,
                          }}
                        >
                          <span className="font-semibold">{slot.timeLabel}</span>
                          <span
                            className="text-[11px] font-bold uppercase tracking-wider"
                            style={{ color: accentHex }}
                          >
                            Select →
                          </span>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
