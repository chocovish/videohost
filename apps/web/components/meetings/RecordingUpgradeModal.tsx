"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Disc,
  Sparkles,
  Zap,
  Lock,
  ArrowRight,
  CheckCircle2,
  Video,
  Layers,
  HardDrive,
  Clock,
} from "lucide-react";

interface RecordingUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName?: string;
}

export default function RecordingUpgradeModal({
  isOpen,
  onClose,
  planName = "free",
}: RecordingUpgradeModalProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    onClose();
    // Open in current tab or new tab
    router.push("/dashboard/pricing");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="border-slate-800 bg-slate-950 text-slate-100 p-0 overflow-hidden shadow-2xl backdrop-blur-2xl max-w-lg z-70 max-h-[90vh] flex flex-col"
      >
        {/* Header with decorative glowing background */}
        <div className="relative p-6 pb-5 border-b border-slate-800/80 bg-gradient-to-b from-rose-500/10 via-slate-900/40 to-slate-950/80 overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/10">
              <Disc className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5"
                >
                  <Lock className="w-2.5 h-2.5 mr-1 inline" /> Paid Plan Feature
                </Badge>
                <Badge
                  variant="secondary"
                  className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800"
                >
                  Current: {planName.toUpperCase()}
                </Badge>
              </div>
              <DialogTitle className="text-lg font-bold text-white tracking-tight pt-0.5">
                Meeting Recording Not Available on Free Plan
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 leading-relaxed">
                Cloud meeting recording and live stream capturing are available on Basic, Pro, and Enterprise plans.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Modal Body: Feature highlights */}
        <div className="p-6 space-y-4 flex-1 min-h-0 overflow-y-auto">
          <p className="text-xs text-slate-300 font-medium leading-relaxed">
            Upgrade your organization plan to unlock meeting recording capabilities:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                <Video className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-semibold text-white block">Full Grid & PiP Layouts</span>
                <span className="text-[11px] text-slate-400">Record room or Screen + Camera PiP</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 shrink-0 mt-0.5">
                <HardDrive className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-semibold text-white block">Auto Cloud Storage</span>
                <span className="text-[11px] text-slate-400">Saved directly to your video library</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-semibold text-white block">Instant Video Playback</span>
                <span className="text-[11px] text-slate-400">Shareable links & video player</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 shrink-0 mt-0.5">
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-semibold text-white block">Higher Limits & Seats</span>
                <span className="text-[11px] text-slate-400">Up to 4K quality & team collaboration</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Plans start from just ₹399 / month. Upgrade anytime with instant activation.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 sm:p-6 pt-3 border-t border-slate-800/80 bg-slate-950/90 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-full sm:w-auto text-slate-400 hover:text-white"
          >
            Dismiss
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleUpgrade}
            className="w-full sm:w-auto gap-2 font-bold cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Upgrade to Paid Plan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
