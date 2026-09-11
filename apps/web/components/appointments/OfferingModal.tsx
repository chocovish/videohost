"use client";

import React, { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, DollarSign, Clock } from "lucide-react";
import {
  GLOBAL_CURRENCY_OPTIONS,
  GLOBAL_CURRENCY_MAP,
  normalizeCurrency,
} from "@/lib/utils";
import { CountryPriceItem, CountryPricingEditor } from "@/components/share";

export interface AppointmentOfferingItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  duration: number;
  price: number;
  currency: string;
  countryPricing?: CountryPriceItem[] | null;
  color: string;
  locationType: string;
  isPublished: boolean;
  bookingNoticeHours: number;
  bufferMinutes: number;
  createdAt: string;
  _count?: {
    appointments?: number;
  };
}

interface OfferingModalProps {
  isOpen: boolean;
  onClose: () => void;
  offering?: AppointmentOfferingItem | null;
  onSuccess: (offering: AppointmentOfferingItem) => void;
}

export const CURRENCY_OPTIONS = GLOBAL_CURRENCY_OPTIONS.map((c) => ({
  value: c.code,
  label: c.label,
}));

export const CURRENCY_MAP: Record<string, string> = {
  INR: GLOBAL_CURRENCY_MAP.INR.label,
  USD: GLOBAL_CURRENCY_MAP.USD.label,
};

export const BOOKING_NOTICE_OPTIONS = [
  { value: 0, label: "No notice (book anytime)" },
  { value: 1, label: "1 hour in advance" },
  { value: 2, label: "2 hours in advance" },
  { value: 4, label: "4 hours in advance" },
  { value: 12, label: "12 hours in advance" },
  { value: 24, label: "24 hours in advance" },
  { value: 48, label: "48 hours in advance" },
] as const;

export const BOOKING_NOTICE_MAP: Record<number, string> = {
  0: "No notice (book anytime)",
  1: "1 hour in advance",
  2: "2 hours in advance",
  4: "4 hours in advance",
  12: "12 hours in advance",
  24: "24 hours in advance",
  48: "48 hours in advance",
};

export const BUFFER_TIME_OPTIONS = [
  { value: 0, label: "0 minutes" },
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
] as const;

export const BUFFER_TIME_MAP: Record<number, string> = {
  0: "0 minutes",
  5: "5 minutes",
  10: "10 minutes",
  15: "15 minutes",
  30: "30 minutes",
};

const DURATION_PRESETS = [15, 30, 45, 60, 90];

export default function OfferingModal({
  isOpen,
  onClose,
  offering,
  onSuccess,
}: OfferingModalProps) {
  const isEditing = Boolean(offering);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState<number>(30);
  const [price, setPrice] = useState<number>(0);
  const [currency, setCurrency] = useState("INR");
  const [countryPricing, setCountryPricing] = useState<CountryPriceItem[]>([]);
  const [color, setColor] = useState("#84cc16");
  const [isPublished, setIsPublished] = useState(true);
  const [bookingNoticeHours, setBookingNoticeHours] = useState(1);
  const [bufferMinutes, setBufferMinutes] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (offering) {
      setTitle(offering.title || "");
      setSlug(offering.slug || "");
      setDescription(offering.description || "");
      setDuration(offering.duration || 30);
      setPrice(offering.price || 0);
      setCurrency(normalizeCurrency(offering.currency, "INR"));
      setCountryPricing(Array.isArray(offering.countryPricing) ? offering.countryPricing : []);
      setColor(offering.color || "#84cc16");
      setIsPublished(offering.isPublished !== false);
      setBookingNoticeHours(offering.bookingNoticeHours ?? 1);
      setBufferMinutes(offering.bufferMinutes ?? 0);
    } else {
      setTitle("");
      setSlug("");
      setDescription("");
      setDuration(30);
      setPrice(0);
      setCurrency("INR");
      setCountryPricing([]);
      setColor("#84cc16");
      setIsPublished(true);
      setBookingNoticeHours(1);
      setBufferMinutes(0);
    }
    setError(null);
  }, [offering, isOpen]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (!isEditing) {
      setSlug(
        newTitle
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/[\s_-]+/g, "-")
          .replace(/^-+|-+$/g, "")
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const parsedPrice = Math.max(0, Number(price) || 0);

      const payload = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || null,
        duration: Number(duration),
        price: parsedPrice,
        currency: currency.toUpperCase(),
        countryPricing,
        color,
        isPublished,
        locationType: "LIVEKIT",
        bookingNoticeHours: Number(bookingNoticeHours),
        bufferMinutes: Number(bufferMinutes),
      };

      const url = isEditing
        ? `/api/appointments/offerings/${offering!.id}`
        : `/api/appointments/offerings`;
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to save appointment offering");
      }

      onSuccess(data.offering);
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            {isEditing ? "Edit Appointment Offering" : "New Appointment Offering"}
          </DialogTitle>
          <DialogDescription>
            Configure session details, duration, pricing, and scheduling rules for your clients.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs font-semibold rounded-lg bg-destructive/15 text-destructive border border-destructive/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="offering-title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Offering Title *
            </Label>
            <Input
              id="offering-title"
              placeholder="e.g. 1-on-1 Consultation, Mentorship Session"
              value={title}
              onChange={handleTitleChange}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="offering-desc" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Description (Optional)
            </Label>
            <Textarea
              id="offering-desc"
              placeholder="Explain what the client will get, prerequisites, or topics covered..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Duration Presets + Custom */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Duration (Minutes) *
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              {DURATION_PRESETS.map((d) => (
                <Button
                  key={d}
                  type="button"
                  size="sm"
                  variant={duration === d ? "default" : "outline"}
                  onClick={() => setDuration(d)}
                  className="text-xs h-8 cursor-pointer font-semibold"
                >
                  {d} min
                </Button>
              ))}
              <div className="flex items-center gap-1 w-24">
                <Input
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value, 10) || 15)}
                  className="h-8 text-xs text-center"
                />
              </div>
            </div>
          </div>

          {/* Price & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="offering-price" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" /> Price (0 for Free)
              </Label>
              <div className="relative">
                <Input
                  id="offering-price"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {price <= 0 ? "Free session — client books with instant confirmation." : "Paid appointment."}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Currency
              </Label>
              <Select value={currency} onValueChange={(val) => val && setCurrency(val)}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Select currency">
                    {CURRENCY_MAP[currency] || currency}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {CURRENCY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Country-Specific Pricing Overrides (same CountryPricingEditor
              pattern used by videos / playlists / meetings via
              ShareAccessModeSelector — always visible so overrides can be
              configured alongside the base price) */}
          <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2 animate-in fade-in duration-200">
            <CountryPricingEditor
              countryPricing={countryPricing}
              onChangeCountryPricing={setCountryPricing}
              disabled={isLoading}
              defaultCurrency={currency || "USD"}
            />
            <p className="text-[11px] text-muted-foreground">
              {price > 0
                ? "Visitors worldwide without country-specific overrides will see the base price above in their checkout."
                : "Set a base price above 0 to charge for this session — any country overrides above will then apply at checkout."}
            </p>
          </div>

          {/* Booking Notice & Buffer Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Minimum Notice
              </Label>
              <Select
                value={String(bookingNoticeHours)}
                onValueChange={(val) => val !== null && setBookingNoticeHours(parseInt(val, 10))}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Minimum notice">
                    {BOOKING_NOTICE_MAP[bookingNoticeHours] ?? `${bookingNoticeHours} hours in advance`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {BOOKING_NOTICE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Buffer Between Slots
              </Label>
              <Select
                value={String(bufferMinutes)}
                onValueChange={(val) => val !== null && setBufferMinutes(parseInt(val, 10))}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Buffer time">
                    {BUFFER_TIME_MAP[bufferMinutes] ?? `${bufferMinutes} minutes`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {BUFFER_TIME_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Published Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
            <div>
              <Label htmlFor="publish-toggle" className="text-sm font-semibold cursor-pointer">
                Accept Appointments
              </Label>
              <p className="text-xs text-muted-foreground">
                When enabled, clients can book this offering via your public link.
              </p>
            </div>
            <Switch
              id="publish-toggle"
              checked={isPublished}
              onCheckedChange={setIsPublished}
            />
          </div>

          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="cursor-pointer font-bold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Create Offering"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
