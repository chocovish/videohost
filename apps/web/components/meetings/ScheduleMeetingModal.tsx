"use client";

import React, { useState } from "react";
import {
  Calendar,
  Clock,
  Disc,
  Users,
  Plus,
  Loader2,
  Sparkles,
  Mail,
  AlertCircle,
  X,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (meeting: any) => void;
}

export default function ScheduleMeetingModal({
  isOpen,
  onClose,
  onSuccess,
}: ScheduleMeetingModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Default scheduled time: next nearest 30 mins
  const getDefaultDateTime = () => {
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30, 0, 0);
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const [scheduledStart, setScheduledStart] = useState(getDefaultDateTime());
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [recordOnStart, setRecordOnStart] = useState(false);
  const [allowGuests, setAllowGuests] = useState(true);
  const [emailInput, setEmailInput] = useState("");
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      setError("Please enter a valid email address");
      return;
    }
    if (inviteEmails.includes(trimmed)) {
      setEmailInput("");
      return;
    }
    setInviteEmails([...inviteEmails, trimmed]);
    setEmailInput("");
    setError(null);
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setInviteEmails(inviteEmails.filter((e) => e !== emailToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Meeting title is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const startDate = new Date(scheduledStart);
      const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          scheduledStart: startDate.toISOString(),
          scheduledEnd: endDate.toISOString(),
          isInstant: false,
          recordOnStart,
          allowGuests,
          inviteEmails,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to schedule meeting");
      }

      onSuccess(data.meeting);
      onClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong while scheduling.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="max-w-xl max-h-[88vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle>Schedule Video Meeting</DialogTitle>
              <DialogDescription>Set up a LiveKit room and invite attendees</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 py-1 pr-0.5 min-h-0 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="schedule-meeting-title" className="text-xs font-medium">
                Meeting Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="schedule-meeting-title"
                type="text"
                required
                placeholder="e.g. Q3 Product Sync & Roadmap Review"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Date & Time and Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="schedule-start-time" className="text-xs font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Start Date & Time
                </Label>
                <Input
                  id="schedule-start-time"
                  type="datetime-local"
                  required
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Duration
                </Label>
                <Select
                  value={String(durationMinutes)}
                  onValueChange={(val) => setDurationMinutes(Number(val))}
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 Minutes</SelectItem>
                    <SelectItem value="30">30 Minutes</SelectItem>
                    <SelectItem value="45">45 Minutes</SelectItem>
                    <SelectItem value="60">1 Hour</SelectItem>
                    <SelectItem value="90">1.5 Hours</SelectItem>
                    <SelectItem value="120">2 Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="schedule-agenda" className="text-xs font-medium">
                  Agenda / Description
                </Label>
                <span className="text-[11px] text-muted-foreground">Optional</span>
              </div>
              <textarea
                id="schedule-agenda"
                rows={2}
                placeholder="Brief details or agenda items for attendees..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none min-h-[60px]"
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
                    <Label htmlFor="schedule-auto-record" className="text-xs font-semibold cursor-pointer">
                      Record meeting automatically
                    </Label>
                    {recordOnStart && (
                      <Badge variant="destructive" className="uppercase">
                        Auto-Record
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Record conference and automatically save to your video library when the session starts.
                  </p>
                </div>
              </div>
              <Switch
                id="schedule-auto-record"
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
                    <Label htmlFor="schedule-guest-access" className="text-xs font-semibold cursor-pointer">
                      Guest access (join without account)
                    </Label>
                    {allowGuests && (
                      <Badge variant="outline" className="uppercase text-emerald-600 border-emerald-500/30">
                        Open Access
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Allows candidates, clients, or team members to join with just a name.
                  </p>
                </div>
              </div>
              <Switch
                id="schedule-guest-access"
                checked={allowGuests}
                onCheckedChange={setAllowGuests}
                disabled={isLoading}
              />
            </div>

            {/* Invite Attendees via Email */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="schedule-invite-email" className="text-xs font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Invite Attendees by Email
                </Label>
                <span className="text-[11px] text-muted-foreground">Press Enter or click Add</span>
              </div>
              <div className="flex gap-2">
                <Input
                  id="schedule-invite-email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddEmail}
                  disabled={isLoading || !emailInput.trim()}
                  className="shrink-0"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  <span>Add</span>
                </Button>
              </div>

              {inviteEmails.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {inviteEmails.map((email) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="gap-1.5 py-1 px-2.5 text-xs font-normal"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(email)}
                        className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                        aria-label={`Remove ${email}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border shrink-0 mt-4">
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
                  <Loader2 className="w-4 h-4 animate-spin" /> Scheduling...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Schedule Meeting
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
