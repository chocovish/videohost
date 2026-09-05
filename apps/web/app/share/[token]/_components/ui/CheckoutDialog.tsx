"use client";

import {
  AlertCircle,
  Calendar,
  Check,
  CreditCard,
  Shield,
  ShoppingBag,
  Sparkles,
  Ticket,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PriceInfo, SharedData } from "../types";
import type { ShareTheme } from "../share-theme";
import { formatMeetingTime } from "../utils";

interface CheckoutDialogProps {
  data: SharedData | null;
  theme: ShareTheme;
  priceInfo: PriceInfo;
  open: boolean;
  onClose: () => void;
  isCheckingOut: boolean;
  error: string;
  success: string;
  onConfirm: () => void;
}

/** Visitor content checkout modal: order summary + gateway confirm. */
export function CheckoutDialog({
  data,
  theme,
  priceInfo,
  open,
  onClose,
  isCheckingOut,
  error,
  success,
  onConfirm,
}: CheckoutDialogProps) {
  const {
    dividerBorder,
    accentHex,
    onAccentHex,
    headingHex,
    mutedHex,
    surfaceHex,
    surfaceBorderHex,
    surfaceTextHex,
    surfaceMutedHex,
  } = theme;
  const isLight = theme.isLight;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className={`max-w-md p-6 rounded-2xl max-h-[90vh] flex flex-col overflow-hidden ${isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[#101013] border-white/10 text-zinc-100"}`}
      >
        <DialogHeader className={`shrink-0 pb-3 border-b ${dividerBorder}`}>
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${accentHex}20`, color: accentHex }}
            >
              {data?.type === "meeting" ? (
                <Ticket className="w-5 h-5" />
              ) : (
                <ShoppingBag className="w-5 h-5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold" style={{ color: headingHex }}>
                {data?.type === "meeting"
                  ? "Purchase Meeting Entry Pass"
                  : data?.type === "playlist"
                    ? "Unlock Playlist"
                    : "Unlock Video"}
              </DialogTitle>
              <DialogDescription className="text-xs" style={{ color: mutedHex }}>
                {data?.type === "meeting"
                  ? "Confirmed digital entry ticket to join the live session"
                  : "Instant permanent access with lifetime streaming"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-3 pr-1 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Order Summary Box */}
          <div
            className="p-4 rounded-xl border space-y-3"
            style={{ backgroundColor: surfaceHex, borderColor: surfaceBorderHex }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span
                  className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: isLight ? "#f1f5f9" : "#1e293b",
                    color: surfaceMutedHex,
                  }}
                >
                  {data?.type === "meeting"
                    ? "Live Meeting Pass"
                    : data?.type === "playlist"
                      ? "Playlist Collection"
                      : "Single Video"}
                </span>
                <p className="font-bold text-sm mt-1" style={{ color: surfaceTextHex }}>
                  {data?.type === "meeting"
                    ? data?.meeting?.title
                    : data?.type === "playlist"
                      ? data?.playlist?.title
                      : data?.video?.title}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: surfaceMutedHex }}>
                  Provided by {data?.organization?.name}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-semibold" style={{ color: surfaceMutedHex }}>
                  Total
                </span>
                <p className="text-lg font-semibold" style={{ color: accentHex }}>
                  {priceInfo.formatted}
                </p>
              </div>
            </div>

            {data?.type === "meeting" && data?.meeting?.scheduledStart && (
              <div
                className="pt-2 border-t text-[11px] flex items-center gap-1.5"
                style={{ borderColor: surfaceBorderHex, color: surfaceMutedHex }}
              >
                <Calendar className="w-3.5 h-3.5" style={{ color: accentHex }} />
                <span>Scheduled: {formatMeetingTime(data.meeting.scheduledStart)}</span>
              </div>
            )}

            {data?.type === "playlist" && (
              <div
                className="pt-2 border-t text-[11px] flex items-center gap-1.5"
                style={{ borderColor: surfaceBorderHex, color: surfaceMutedHex }}
              >
                <Check className="w-3.5 h-3.5" style={{ color: accentHex }} />
                <span>Unlocks all {data.videos?.length || 0} videos in this playlist</span>
              </div>
            )}
          </div>

          {/* Payment Method Notice */}
          <div
            className="p-3 rounded-xl border flex items-center justify-between text-xs"
            style={{ backgroundColor: surfaceHex, borderColor: surfaceBorderHex }}
          >
            <div className="flex items-center gap-2">
              {priceInfo.isFree ? (
                <>
                  <Sparkles className="w-4 h-4" style={{ color: accentHex }} />
                  <span className="font-semibold" style={{ color: surfaceTextHex }}>
                    Instant Free Access &bull; No Card Required
                  </span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" style={{ color: accentHex }} />
                  <span className="font-semibold" style={{ color: surfaceTextHex }}>
                    Encrypted Payment Gateway
                  </span>
                </>
              )}
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                priceInfo.isFree
                  ? "text-lime-400 bg-lime-950/60 border-lime-800/40"
                  : "text-emerald-400 bg-emerald-950/60 border-emerald-800/40"
              }`}
            >
              {priceInfo.isFree ? "Free Claim" : "Verified"}
            </span>
          </div>
        </div>

        <DialogFooter
          className="pt-3 border-t shrink-0 mt-auto flex flex-col sm:flex-row gap-2"
          style={{ borderColor: surfaceBorderHex }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isCheckingOut}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold rounded-xl cursor-pointer hover:opacity-80"
            style={{ color: mutedHex }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isCheckingOut}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs   flex items-center justify-center gap-2 shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: accentHex, color: onAccentHex }}
          >
            {isCheckingOut ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />{" "}
                {priceInfo.isFree ? "Claiming Access..." : "Processing Payment..."}
              </>
            ) : priceInfo.isFree ? (
              <>
                <Sparkles className="w-4 h-4" /> Buy for Free
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" /> Pay & Unlock {priceInfo.formatted}
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
