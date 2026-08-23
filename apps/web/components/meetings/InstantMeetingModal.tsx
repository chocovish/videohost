"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Video, Disc, Sparkles, Loader2, AlertCircle, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import RecordingUpgradeModal from "@/components/meetings/RecordingUpgradeModal";

interface InstantMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFreePlan?: boolean;
}

export default function InstantMeetingModal({
  isOpen,
  onClose,
  isFreePlan: propIsFreePlan,
}: InstantMeetingModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState(
    `Instant Meeting - ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "numeric" }).format(new Date())}`
  );
  const [recordOnStart, setRecordOnStart] = useState(false);
  const [isFreePlan, setIsFreePlan] = useState(propIsFreePlan ?? false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync / fetch free plan status if prop not explicitly provided
  useEffect(() => {
    if (propIsFreePlan !== undefined) {
      setIsFreePlan(propIsFreePlan);
    } else if (isOpen) {
      fetch("/api/organization")
        .then((res) => res.json())
        .then((data) => {
          if (data?.organization?.planName) {
            setIsFreePlan(data.organization.planName.toLowerCase() === "free");
          }
        })
        .catch(() => {});
    }
  }, [isOpen, propIsFreePlan]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "Instant Meeting",
          isInstant: true,
          recordOnStart: isFreePlan ? false : recordOnStart,
          allowGuests: true,
          shareAccessMode: "PUBLIC",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start instant meeting");
      }

      // Navigate straight to meeting room
      router.push(`/meet/${data.meeting.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create instant meeting");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle>Start Instant Meeting</DialogTitle>
              <DialogDescription>Launch a live room instantly</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleStart} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="instant-meeting-title" className="text-xs font-medium">
              Meeting Name
            </Label>
            <Input
              id="instant-meeting-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Record Meeting Option */}
          <div
            className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-4 ${
              isFreePlan
                ? "border-border/60 bg-muted/30 opacity-90"
                : "border-border bg-card"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg mt-0.5 ${
                  isFreePlan
                    ? "bg-slate-800 text-slate-400"
                    : recordOnStart
                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isFreePlan ? (
                  <Lock className="w-4 h-4 text-amber-500/90" />
                ) : (
                  <Disc className={`w-4 h-4 ${recordOnStart ? "animate-pulse" : ""}`} />
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Label
                    htmlFor="instant-auto-record"
                    className={`text-xs font-semibold ${isFreePlan ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer"}`}
                  >
                    Record Meeting
                  </Label>
                  {isFreePlan ? (
                    <Badge
                      variant="outline"
                      onClick={() => setIsUpgradeModalOpen(true)}
                      className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] uppercase font-bold cursor-pointer hover:bg-amber-500/20 transition-colors"
                    >
                      <Lock className="w-2.5 h-2.5 mr-1 inline" /> Paid Plan Only
                    </Badge>
                  ) : recordOnStart ? (
                    <Badge variant="destructive" className="uppercase text-[10px]">
                      Auto-Record
                    </Badge>
                  ) : null}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {isFreePlan ? (
                    <span>
                      Meeting recording is not available on the Free plan.{" "}
                      <button
                        type="button"
                        onClick={() => setIsUpgradeModalOpen(true)}
                        className="text-primary hover:underline font-semibold cursor-pointer"
                      >
                        Upgrade to unlock
                      </button>
                    </span>
                  ) : (
                    "Save recorded video directly to your library when the meeting ends."
                  )}
                </p>
              </div>
            </div>
            <div
              onClick={() => {
                if (isFreePlan) {
                  setIsUpgradeModalOpen(true);
                }
              }}
              className={isFreePlan ? "cursor-pointer" : ""}
              title={isFreePlan ? "Click to view upgrade options" : undefined}
            >
              <Switch
                id="instant-auto-record"
                checked={isFreePlan ? false : recordOnStart}
                onCheckedChange={(checked) => {
                  if (isFreePlan) {
                    setIsUpgradeModalOpen(true);
                    return;
                  }
                  setRecordOnStart(checked);
                }}
                disabled={isLoading || isFreePlan}
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !title.trim()}
              className="gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Starting...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Launch Room
                </>
              )}
            </Button>
          </DialogFooter>
        </form>

        <RecordingUpgradeModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
