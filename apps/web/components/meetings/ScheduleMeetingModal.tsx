"use client";

import React, { useState, useEffect } from "react";
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
  Ticket,
  DollarSign,
  Globe,
  Tag,
  Trash2,
  Lock,
  Shield,
  Check,
  Share2,
  Pencil,
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
import { POPULAR_COUNTRIES, SUPPORTED_CURRENCIES, CountryPriceItem } from "@/components/ShareModal";

export type ShareAccessMode = "PUBLIC" | "RESTRICTED" | "PRIVATE" | "PURCHASABLE";

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (meeting: any) => void;
  meeting?: any | null;
}

export default function ScheduleMeetingModal({
  isOpen,
  onClose,
  onSuccess,
  meeting,
}: ScheduleMeetingModalProps) {
  const isEditing = Boolean(meeting?.id);

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
  const [emailInput, setEmailInput] = useState("");
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);

  // Share & Access Mode State
  const [shareAccessMode, setShareAccessMode] = useState<ShareAccessMode>("PUBLIC");

  // Purchasable Entry Pass State
  const [price, setPrice] = useState("19.99");
  const [currency, setCurrency] = useState("USD");
  const [countryPricing, setCountryPricing] = useState<CountryPriceItem[]>([]);
  const [showAddCountry, setShowAddCountry] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState("IN");
  const [countryAmount, setCountryAmount] = useState("");
  const [countryCurrency, setCountryCurrency] = useState("INR");

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
          meeting.shareAccessMode || (meeting.price ? "PURCHASABLE" : "PUBLIC")
        );
        setPrice(meeting.price ? String(meeting.price) : "19.99");
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
      setEmailInput("");
      setShowAddCountry(false);
      setError(null);
    }
  }, [isOpen, meeting]);

  const handleAddCountryPrice = () => {
    const num = parseFloat(countryAmount);
    if (!countryAmount || isNaN(num) || num <= 0) {
      setError("Please enter a valid country price greater than 0");
      return;
    }
    const countryObj = POPULAR_COUNTRIES.find((c) => c.code === selectedCountryCode);
    const countryName = countryObj ? countryObj.name : selectedCountryCode;

    const existingIdx = countryPricing.findIndex((c) => c.countryCode === selectedCountryCode);
    let updated = [...countryPricing];
    if (existingIdx >= 0) {
      updated[existingIdx] = {
        countryCode: selectedCountryCode,
        countryName,
        amount: num,
        currency: countryCurrency,
      };
    } else {
      updated.push({
        countryCode: selectedCountryCode,
        countryName,
        amount: num,
        currency: countryCurrency,
      });
    }

    setCountryPricing(updated);
    setCountryAmount("");
    setShowAddCountry(false);
    setError(null);
  };

  const handleRemoveCountryPrice = (code: string) => {
    setCountryPricing(countryPricing.filter((c) => c.countryCode !== code));
  };

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

    const isPurchasable = shareAccessMode === "PURCHASABLE";
    if (isPurchasable) {
      const parsed = parseFloat(price);
      if (isNaN(parsed) || parsed <= 0) {
        setError("Please enter a valid entry pass price greater than 0");
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
        price: isPurchasable ? parseFloat(price) : null,
        currency: isPurchasable ? currency : "USD",
        countryPricing: isPurchasable ? countryPricing : [],
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

  const ACCESS_MODES = [
    {
      mode: "PUBLIC" as const,
      title: "Public Event",
      desc: "Anyone with the link can access lobby and join",
      icon: Globe,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
    },
    {
      mode: "RESTRICTED" as const,
      title: "Restricted",
      desc: "Only invited attendees & org members can join",
      icon: Users,
      color: "text-blue-500 bg-blue-500/10 border-blue-500/30",
    },
    {
      mode: "PRIVATE" as const,
      title: "Host Only",
      desc: "Private — only the creator and host can join",
      icon: Lock,
      color: "text-purple-500 bg-purple-500/10 border-purple-500/30",
    },
    {
      mode: "PURCHASABLE" as const,
      title: "Purchasable Pass",
      desc: "Paid entry ticket required to join the session",
      icon: Ticket,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
    },
  ];

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

            {/* Record Meeting Option (Moved before Share Mode) */}
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

            {/* SHARE & ACCESS MODE SECTION */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-primary" /> Share & Access Mode
                </Label>
                <span className="text-[11px] text-muted-foreground">Controls who can enter the meeting</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ACCESS_MODES.map((item) => {
                  const Icon = item.icon;
                  const isSelected = shareAccessMode === item.mode;
                  return (
                    <button
                      key={item.mode}
                      type="button"
                      onClick={() => setShareAccessMode(item.mode)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/20"
                          : "bg-card border-border hover:border-border/80 hover:bg-muted/30"
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${item.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-xs font-bold ${isSelected ? "text-foreground" : "text-foreground/90"}`}>
                            {item.title}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* RESTRICTED MODE ATTENDEE INVITES (ONLY WHEN RESTRICTED MODE IS SELECTED) */}
              {shareAccessMode === "RESTRICTED" && !isEditing && (
                <div className="p-4 rounded-xl border-2 border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10 space-y-3 animate-in fade-in-50 duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-500" />
                      <Label htmlFor="schedule-invite-email" className="text-xs font-bold uppercase tracking-wider text-blue-500">
                        Invite Restricted Attendees
                      </Label>
                    </div>
                    <span className="text-[11px] text-muted-foreground">Press Enter or Add</span>
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
                      className="flex-1 bg-background"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddEmail}
                      disabled={isLoading || !emailInput.trim()}
                      className="shrink-0 cursor-pointer bg-background"
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
                          className="gap-1.5 py-1 px-2.5 text-xs font-normal bg-background"
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
              )}

              {/* PURCHASABLE PASS PRICING CONTROLS (EXPANDS WHEN PURCHASABLE IS SELECTED) */}
              {shareAccessMode === "PURCHASABLE" && (
                <div className="p-4 rounded-xl border-2 border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 space-y-3.5 animate-in fade-in-50 duration-200">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
                      Entry Pass Pricing Settings
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="pass-price" className="text-xs font-medium flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-muted-foreground" /> Base Pass Price
                      </Label>
                      <Input
                        id="pass-price"
                        type="number"
                        step="0.01"
                        min="0.5"
                        placeholder="19.99"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        disabled={isLoading}
                        className="font-medium bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-muted-foreground" /> Currency
                      </Label>
                      <Select
                        value={currency}
                        onValueChange={(val) => setCurrency(val || "USD")}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-full bg-background">
                          <SelectValue placeholder="Select Currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_CURRENCIES.map((curr) => (
                            <SelectItem key={curr} value={curr}>
                              {curr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Country-Specific Pricing Section */}
                  <div className="pt-2 border-t border-amber-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                        Country-Specific Pricing Overrides
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAddCountry(!showAddCountry)}
                        className="h-6 px-2 text-[11px] text-amber-500 hover:text-amber-600 gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{showAddCountry ? "Cancel" : "Add Country Price"}</span>
                      </Button>
                    </div>

                    {showAddCountry && (
                      <div className="p-3 bg-background border border-border rounded-lg space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Country</Label>
                            <Select
                              value={selectedCountryCode}
                              onValueChange={(val) => {
                                if (!val) return;
                                setSelectedCountryCode(val);
                                const found = POPULAR_COUNTRIES.find((c) => c.code === val);
                                if (found?.defaultCurrency) setCountryCurrency(found.defaultCurrency);
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {POPULAR_COUNTRIES.map((c) => (
                                  <SelectItem key={c.code} value={c.code} className="text-xs">
                                    {c.name} ({c.code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-[10px] text-muted-foreground">Amount</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="e.g. 1999"
                              value={countryAmount}
                              onChange={(e) => setCountryAmount(e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>

                          <div>
                            <Label className="text-[10px] text-muted-foreground">Currency</Label>
                            <Select
                              value={countryCurrency}
                              onValueChange={(val) => setCountryCurrency(val || "USD")}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SUPPORTED_CURRENCIES.map((curr) => (
                                  <SelectItem key={curr} value={curr} className="text-xs">
                                    {curr}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleAddCountryPrice}
                            disabled={!countryAmount}
                            className="h-7 text-xs px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer"
                          >
                            Add Override
                          </Button>
                        </div>
                      </div>
                    )}

                    {countryPricing.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {countryPricing.map((item) => (
                          <div
                            key={item.countryCode}
                            className="flex items-center justify-between p-2 bg-background/80 border border-border/80 rounded-md text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{item.countryName}</span>
                              <span className="text-muted-foreground font-mono">({item.countryCode})</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <span className="font-bold text-amber-500">
                                {item.currency} {item.amount}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveCountryPrice(item.countryCode)}
                                className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                aria-label={`Remove ${item.countryCode}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
      </DialogContent>
    </Dialog>
  );
}
