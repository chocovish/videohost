"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Video, Disc, Sparkles, Loader2, AlertCircle, Users } from "lucide-react";
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

interface InstantMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InstantMeetingModal({
  isOpen,
  onClose,
}: InstantMeetingModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState(
    `Instant Meeting - ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "numeric" }).format(new Date())}`
  );
  const [recordOnStart, setRecordOnStart] = useState(false);
  const [allowGuests, setAllowGuests] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          recordOnStart,
          allowGuests,
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
          <div className="p-3.5 rounded-xl border border-border bg-card flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg mt-0.5 ${recordOnStart ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" : "bg-muted text-muted-foreground"}`}>
                <Disc className={`w-4 h-4 ${recordOnStart ? "animate-pulse" : ""}`} />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor="instant-auto-record" className="text-xs font-semibold cursor-pointer">
                    Record Meeting
                  </Label>
                  {recordOnStart && (
                    <Badge variant="destructive" className="uppercase">
                      Auto-Record
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Save recorded video directly to your library when the meeting ends.
                </p>
              </div>
            </div>
            <Switch
              id="instant-auto-record"
              checked={recordOnStart}
              onCheckedChange={setRecordOnStart}
              disabled={isLoading}
            />
          </div>

          {/* Guest Access Option */}
          <div className="p-3.5 rounded-xl border border-border bg-card flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg mt-0.5 ${allowGuests ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                <Users className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor="instant-guest-access" className="text-xs font-semibold cursor-pointer">
                    Guest Access
                  </Label>
                  {allowGuests && (
                    <Badge variant="outline" className="uppercase text-emerald-600 border-emerald-500/30">
                      Open
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Attendees can enter their name and join without needing an account.
                </p>
              </div>
            </div>
            <Switch
              id="instant-guest-access"
              checked={allowGuests}
              onCheckedChange={setAllowGuests}
              disabled={isLoading}
            />
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
              className="gap-2"
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
      </DialogContent>
    </Dialog>
  );
}
