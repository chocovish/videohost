"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Disc,
  Loader2,
  Sparkles,
  AlertCircle,
  Pencil,
  Lock,
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
import { Alert } from "@/components/ui/alert";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShareAccessMode,
  CountryPriceItem,
  ShareAccessModeSelector,
} from "@/components/share";
import RecordingUpgradeModal from "@/components/meetings/RecordingUpgradeModal";

export type { ShareAccessMode };

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (meeting: any) => void;
  meeting?: any | null;
  isFreePlan?: boolean;
}

export default function ScheduleMeetingModal({
  isOpen,
  onClose,
  onSuccess,
  meeting,
  isFreePlan: propIsFreePlan,
}: ScheduleMeetingModalProps) {
  const isEditing = Boolean(meeting?.id);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isFreePlan, setIsFreePlan] = useState(propIsFreePlan ?? false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

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
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);

  // Share & Access Mode State
  const [shareAccessMode, setShareAccessMode] = useState<ShareAccessMode>("PUBLIC");

  // Purchasable Entry Pass State
  const [price, setPrice] = useState("19.99");
  const [currency, setCurrency] = useState("USD");
  const [countryPricing, setCountryPricing] = useState<CountryPriceItem[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when modal opens or meeting changes
  useEffect(() => {
    if (isOpen) {
      if (meeting) {
        setTitle(meeting.title || "");
        setDescription(meeting.description || "");
        if (meeting.scheduledStart) {
          const d = new Date(meeting.scheduledStart);
          const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
          setScheduledStart(local.toISOString().slice(0, 16));
        } else {
          setScheduledStart(getDefaultDateTime());
        }
        if (meeting.scheduledStart && meeting.scheduledEnd) {
          const diffMs =
            new Date(meeting.scheduledEnd).getTime() - new Date(meeting.scheduledStart).getTime();
          const mins = Math.max(15, Math.round(diffMs / (60 * 1000)));
          setDurationMinutes(mins);
        } else {
          setDurationMinutes(30);
        }
        setRecordOnStart(Boolean(meeting.recordOnStart));
        setShareAccessMode(
          meeting.shareAccessMode || (meeting.price !== null && meeting.price !== undefined ? "PURCHASABLE" : "PUBLIC")
        );
        setPrice(meeting.price !== null && meeting.price !== undefined ? String(meeting.price) : "19.99");
        setCurrency(meeting.currency || "USD");
        setCountryPricing(
          Array.isArray(meeting.countryPricing) ? meeting.countryPricing : []
        );
        setInviteEmails(meeting.invites?.map((i: any) => i.email) || []);
      } else {
        setTitle("");
        setDescription("");
        setScheduledStart(getDefaultDateTime());
        setDurationMinutes(30);
        setRecordOnStart(false);
        setShareAccessMode("PUBLIC");
        setPrice("19.99");
        setCurrency("USD");
        setCountryPricing([]);
        setInviteEmails([]);
      }
      setError(null);
    }
  }, [isOpen, meeting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Meeting title is required");
      return;
    }

    const isPurchasable = shareAccessMode === "PURCHASABLE";
    if (isPurchasable) {
      const parsed = parseFloat(price);
      if (isNaN(parsed) || parsed < 0) {
        setError("Please enter a valid entry pass price greater than or equal to 0");
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const startDate = new Date(scheduledStart);
      const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        scheduledStart: startDate.toISOString(),
        scheduledEnd: endDate.toISOString(),
        recordOnStart,
        allowGuests: shareAccessMode === "PUBLIC",
        shareAccessMode,
        price: isPurchasable && price !== "" && !isNaN(Number(price)) ? parseFloat(price) : null,
        currency: isPurchasable ? currency : "USD",
        countryPricing: isPurchasable ? countryPricing : [],
        inviteEmails: shareAccessMode === "RESTRICTED" ? inviteEmails : [],
      };

      if (isEditing && meeting?.id) {
        const res = await fetch(`/api/meetings/${meeting.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to update meeting");
        }

        onSuccess(data.meeting);
      } else {
        const res = await fetch("/api/meetings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            isInstant: false,
            inviteEmails,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to schedule meeting");
        }

        onSuccess(data.meeting);
      }

      onClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong while saving.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              {isEditing ? <Pencil className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle>{isEditing ? "Edit Meeting Details" : "Schedule Video Meeting"}</DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Update conference schedule, access permissions, and pass pricing"
                  : "Set up a LiveKit room, configure share access, and invite attendees"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="shrink-0 text-xs">
            <AlertCircle />
            <span className="text-xs">{error}</span>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 py-1 pr-1 min-h-0">
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
                <span className="text-xs text-muted-foreground">Optional</span>
              </div>
              <RichTextEditor
                id="schedule-agenda"
                placeholder="Brief details or agenda items for attendees..."
                value={description}
                onChange={setDescription}
                disabled={isLoading}
                minHeight="110px"
                maxHeight="220px"
                showWordCount={false}
                showCharacterCount={false}
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
                      ? "bg-muted text-muted-foreground"
                      : recordOnStart
                      ? "bg-destructive/15 text-destructive"
                      : "bg-secondary/60 text-secondary-foreground"
                  }`}
                >
                  {isFreePlan ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Disc className={`w-4 h-4 ${recordOnStart ? "animate-pulse" : ""}`} />
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label
                      htmlFor="schedule-auto-record"
                      className={`text-xs font-semibold ${isFreePlan ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer"}`}
                    >
                      Record meeting automatically
                    </Label>
                    {isFreePlan ? (
                      <Badge
                        variant="secondary"
                        onClick={() => setIsUpgradeModalOpen(true)}
                        className="uppercase cursor-pointer hover:bg-secondary/80 transition-colors"
                      >
                        <Lock className="w-2.5 h-2.5 mr-1 inline" /> Paid Plan Only
                      </Badge>
                    ) : recordOnStart ? (
                      <Badge variant="destructive" className="uppercase">
                        Auto-Record
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isFreePlan ? (
                      <span>
                        Meeting recording is not available on the Free plan.{" "}
                        <Button
                          type="button"
                          variant="link"
                          onClick={() => setIsUpgradeModalOpen(true)}
                          className="inline h-auto p-0 px-0 text-xs font-semibold cursor-pointer"
                        >
                          Upgrade to unlock
                        </Button>
                      </span>
                    ) : (
                      "Record conference and automatically save to your video library when the session starts."
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
                  id="schedule-auto-record"
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

            {/* REUSABLE SHARE & ACCESS MODE SECTION */}
            <div className="pt-2 border-t border-border">
              <ShareAccessModeSelector
                targetType="meeting"
                modeContext={isEditing ? "edit" : "create"}
                accessMode={shareAccessMode}
                onChangeAccessMode={setShareAccessMode}
                price={price}
                onChangePrice={setPrice}
                currency={currency}
                onChangeCurrency={setCurrency}
                countryPricing={countryPricing}
                onChangeCountryPricing={setCountryPricing}
                inviteEmails={inviteEmails}
                onChangeInviteEmails={setInviteEmails}
                disabled={isLoading}
              />
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
              className="gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> {isEditing ? "Saving..." : "Scheduling..."}
                </>
              ) : isEditing ? (
                <>
                  <Pencil className="w-4 h-4" /> Save Changes
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Schedule Meeting
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
