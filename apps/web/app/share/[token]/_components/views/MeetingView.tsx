"use client";

import {
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  LogIn,
  ShieldCheck,
  Sparkles,
  Ticket,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import type { PriceInfo, SharedData } from "../types";
import type { ShareTheme } from "../share-theme";
import { formatMeetingTime } from "../utils";
import { CountrySelector } from "../ui/CountrySelector";
import { MeetingCountdown } from "./MeetingCountdown";

interface MeetingViewProps {
  data: SharedData;
  theme: ShareTheme;
  priceInfo: PriceInfo;
  selectedCountry: string;
  onCountryChange: (countryCode: string) => void;
  isCheckingOut: boolean;
  onSignIn: () => void;
  /** Ticket purchase — always runs checkout directly (free-claim or gateway). */
  onPurchase: () => void;
  copied: boolean;
  onCopyLink: () => void;
  onJoinMeeting: (meetingId: string) => void;
}

/** Meeting share + entry-pass view: hero card, countdown, ticket stub / join. */
export function MeetingView({
  data,
  theme,
  priceInfo,
  selectedCountry,
  onCountryChange,
  isCheckingOut,
  onSignIn,
  onPurchase,
  copied,
  onCopyLink,
  onJoinMeeting,
}: MeetingViewProps) {
  const meeting = data.meeting;
  if (!meeting) return null;

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
    surfaceMutedHex,
  } = theme;
  const isLight = theme.isLight;
  const organization = data.organization;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Hero Conference Card */}
      <div className={`overflow-hidden border ${cardBgClass} ${roundnessClass}`}>
        {/* Top Banner / Status Strip */}
        <div
          className={`px-5 sm:px-6 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 ${dividerBorder}`}
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[13px] font-medium" style={{ color: bodyHex }}>
              {meeting.status === "ACTIVE"
                ? "Live Meeting In Progress"
                : meeting.status === "COMPLETED"
                  ? "Meeting Concluded"
                  : "Live Scheduled Conference"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {data.accessMode === "PURCHASABLE" && (
              <Badge
                variant="outline"
                className="text-xs font-bold gap-1 px-3 py-1 bg-amber-500/10 border-amber-500/30 text-amber-400"
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>{data.isPurchased ? "Entry Pass Verified" : "Purchasable Entry Pass"}</span>
              </Badge>
            )}
            {meeting.recordOnStart && (
              <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wide">
                Auto-Record
              </Badge>
            )}
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Main Title & Host Section */}
          <div className="space-y-3">
            <h1
              className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight"
              style={{ color: headingHex }}
            >
              {meeting.title}
            </h1>

            {meeting.description && (
              <div className="text-[15px] leading-relaxed max-w-3xl" style={{ color: bodyHex }}>
                <RichTextViewer content={meeting.description} className="[&_a]:underline" />
              </div>
            )}
          </div>

          {/* Host Profile & Organization Card */}
          <div
            className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border ${softSurface}`}
          >
            <div className="flex items-center gap-3.5">
              {meeting.createdBy?.image ? (
                <img
                  src={meeting.createdBy.image}
                  alt={meeting.createdBy.name}
                  className="w-12 h-12 rounded-full object-cover border-2 shadow-md"
                  style={{ borderColor: surfaceBorderHex }}
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shadow-md"
                  style={{ backgroundColor: accentHex, color: onAccentHex }}
                >
                  {(meeting.createdBy?.name || "H").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold" style={{ color: headingHex }}>
                    {meeting.createdBy?.name || "Meeting Host"}
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

            {/* Scheduled Date/Time Badge */}
            {meeting.scheduledStart && (
              <div
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl border"
                style={{ backgroundColor: surfaceHex, borderColor: surfaceBorderHex }}
              >
                <Calendar className="w-5 h-5" style={{ color: accentHex }} />
                <div className="text-left">
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: mutedHex }}
                  >
                    Scheduled For
                  </p>
                  <p className="text-xs font-bold" style={{ color: surfaceTextHex }}>
                    {formatMeetingTime(meeting.scheduledStart)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Live Countdown & Event Room Readiness */}
          {meeting.scheduledStart && (
            <MeetingCountdown
              scheduledStart={meeting.scheduledStart}
              accentHex={accentHex}
              isLight={isLight}
            />
          )}

          {/* TICKET STUB / PASS PURCHASE OR JOIN ACTION SECTION */}
          {data.accessMode === "PURCHASABLE" && !data.isPurchased ? (
            /* UNPURCHASED PASS STATE */
            <div
              className="relative p-6 sm:p-8 rounded-2xl border-2 border-dashed space-y-6"
              style={{ backgroundColor: surfaceHex, borderColor: surfaceBorderHex }}
            >
              <div
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6"
                style={{ borderColor: surfaceBorderHex }}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                      Official Entry Pass Required
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-semibold" style={{ color: surfaceTextHex }}>
                    Buy Entry Ticket for this Meeting
                  </h2>
                  <p className="text-xs" style={{ color: surfaceMutedHex }}>
                    One-time pass grants full attendee access when the meeting starts.
                  </p>
                </div>

                {/* Price & Currency Display */}
                <div
                  className="p-4 rounded-2xl border text-center sm:text-right shrink-0"
                  style={{ backgroundColor: surfaceHex, borderColor: surfaceBorderHex }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: surfaceMutedHex }}
                  >
                    Pass Price
                  </p>
                  <p className="text-3xl font-semibold mt-0.5" style={{ color: accentHex }}>
                    {priceInfo.formatted}
                  </p>
                </div>
              </div>

              {/* Country Selector for Dynamic Pricing */}
              <CountrySelector
                theme={theme}
                variant="themed"
                value={selectedCountry}
                onChange={onCountryChange}
                countryPricing={data.countryPricing}
                defaultCurrency={data.currency || "USD"}
              />

              {/* Primary Action Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
                {!data.isLoggedIn ? (
                  <button
                    onClick={onSignIn}
                    className="w-full py-4 px-8 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 shadow-sm transition-all hover:opacity-90 active:scale-98 cursor-pointer"
                    style={{ backgroundColor: accentHex, color: onAccentHex }}
                  >
                    <LogIn className="w-4 h-4" />
                    <span>
                      {priceInfo.isFree
                        ? "Sign in to Claim Free Pass"
                        : `Sign in to Purchase Pass • ${priceInfo.formatted}`}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={onPurchase}
                    disabled={isCheckingOut}
                    className="w-full py-4 px-8 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 shadow-sm transition-all hover:opacity-90 active:scale-98 disabled:opacity-50 cursor-pointer"
                    style={{ backgroundColor: accentHex, color: onAccentHex }}
                  >
                    {isCheckingOut ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Unlocking Free Pass...
                      </>
                    ) : priceInfo.isFree ? (
                      <>
                        <Sparkles className="w-4 h-4 stroke-[2.5]" />
                        <span>Buy for Free</span>
                      </>
                    ) : (
                      <>
                        <Ticket className="w-4 h-4 stroke-[2.5]" />
                        <span>Purchase Entry Pass &bull; {priceInfo.formatted}</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div
                className="flex items-center justify-center gap-2 text-[11px]"
                style={{ color: surfaceMutedHex }}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Instant Digital Pass • 256-bit Encrypted Checkout • Money-Back Guarantee</span>
              </div>
            </div>
          ) : (
            /* PURCHASED OR OPEN ACCESS STATE */
            <div
              className="p-6 sm:p-8 rounded-2xl border-2 border-emerald-500/40 shadow-xl space-y-6"
              style={{ backgroundColor: surfaceHex, borderColor: "rgba(16,185,129,0.4)" }}
            >
              <div
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6"
                style={{ borderColor: surfaceBorderHex }}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
                      Attendee Pass Confirmed
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-semibold" style={{ color: surfaceTextHex }}>
                    You Have Access to this Meeting
                  </h2>
                  <p className="text-xs" style={{ color: surfaceMutedHex }}>
                    Your seat is reserved. Click below to enter the live conference room when ready.
                  </p>
                </div>

                <div className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center shrink-0">
                  <span>Pass Status: ACTIVE</span>
                </div>
              </div>

              {/* Join Meeting Action */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => onJoinMeeting(meeting.id)}
                  className="w-full sm:flex-1 py-4 px-8 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 shadow-sm transition-all hover:opacity-90 active:scale-98 cursor-pointer"
                  style={{ backgroundColor: accentHex, color: onAccentHex }}
                >
                  <Video className="w-5 h-5" />
                  <span>Join Meeting Room Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onCopyLink}
                  className="w-full sm:w-auto px-5 py-4 font-bold text-xs rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-all hover:opacity-90"
                  style={{
                    backgroundColor: isLight ? "#f1f5f9" : "#1e293b",
                    color: surfaceTextHex,
                    borderColor: surfaceBorderHex,
                  }}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span>{copied ? "Copied Link" : "Copy Invite"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
