"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Globe,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  Calendar,
  Sparkles,
  Info,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface TimeSlot {
  start: string;
  end: string;
}

export interface DaySchedule {
  day: string;
  isEnabled: boolean;
  slots: TimeSlot[];
}

const DAYS_ORDER = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

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
  "Europe/Amsterdam",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { day: "monday", isEnabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  { day: "tuesday", isEnabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  { day: "wednesday", isEnabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  { day: "thursday", isEnabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  { day: "friday", isEnabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  { day: "saturday", isEnabled: false, slots: [{ start: "10:00", end: "16:00" }] },
  { day: "sunday", isEnabled: false, slots: [{ start: "10:00", end: "16:00" }] },
];

export default function AvailabilityTab() {
  const [weeklyHours, setWeeklyHours] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [timezone, setTimezone] = useState("UTC");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial schedule
  useEffect(() => {
    async function loadAvailability() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/appointments/availability");
        if (res.ok) {
          const data = await res.json();
          if (data.availability) {
            if (Array.isArray(data.availability.weeklyHours) && data.availability.weeklyHours.length > 0) {
              setWeeklyHours(data.availability.weeklyHours);
            }
            if (data.availability.timezone) {
              setTimezone(data.availability.timezone);
            } else {
              try {
                setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
              } catch {}
            }
          }
        }
      } catch (err: any) {
        console.error("Failed to load availability:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAvailability();
  }, []);

  const handleToggleDay = (dayKey: string, isEnabled: boolean) => {
    setWeeklyHours((prev) =>
      prev.map((d) => {
        if (d.day === dayKey) {
          return {
            ...d,
            isEnabled,
            slots: isEnabled && (!d.slots || d.slots.length === 0) ? [{ start: "09:00", end: "17:00" }] : d.slots,
          };
        }
        return d;
      })
    );
  };

  const handleSlotChange = (dayKey: string, slotIndex: number, field: "start" | "end", val: string) => {
    setWeeklyHours((prev) =>
      prev.map((d) => {
        if (d.day === dayKey) {
          const newSlots = [...d.slots];
          newSlots[slotIndex] = { ...newSlots[slotIndex], [field]: val };
          return { ...d, slots: newSlots };
        }
        return d;
      })
    );
  };

  const handleAddSlot = (dayKey: string) => {
    setWeeklyHours((prev) =>
      prev.map((d) => {
        if (d.day === dayKey) {
          const lastSlot = d.slots[d.slots.length - 1];
          let newStart = "14:00";
          let newEnd = "17:00";
          if (lastSlot && lastSlot.end) {
            const [h, m] = lastSlot.end.split(":").map(Number);
            const nextH = Math.min(23, h + 1);
            newStart = `${nextH.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
            newEnd = `${Math.min(23, nextH + 3).toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
          }
          return {
            ...d,
            slots: [...d.slots, { start: newStart, end: newEnd }],
          };
        }
        return d;
      })
    );
  };

  const handleRemoveSlot = (dayKey: string, slotIndex: number) => {
    setWeeklyHours((prev) =>
      prev.map((d) => {
        if (d.day === dayKey) {
          const newSlots = d.slots.filter((_, idx) => idx !== slotIndex);
          return {
            ...d,
            slots: newSlots.length > 0 ? newSlots : [{ start: "09:00", end: "17:00" }],
            isEnabled: newSlots.length > 0 ? d.isEnabled : false,
          };
        }
        return d;
      })
    );
  };

  const handleCopyToAll = (sourceDayKey: string) => {
    const sourceDay = weeklyHours.find((d) => d.day === sourceDayKey);
    if (!sourceDay) return;

    setWeeklyHours((prev) =>
      prev.map((d) => {
        if (d.day === sourceDayKey) return d;
        return {
          ...d,
          isEnabled: sourceDay.isEnabled,
          slots: sourceDay.slots.map((s) => ({ ...s })),
        };
      })
    );
  };

  const handleCopyWeekdays = () => {
    const mon = weeklyHours.find((d) => d.day === "monday");
    if (!mon) return;

    setWeeklyHours((prev) =>
      prev.map((d) => {
        if (["monday", "tuesday", "wednesday", "thursday", "friday"].includes(d.day)) {
          return {
            ...d,
            isEnabled: mon.isEnabled,
            slots: mon.slots.map((s) => ({ ...s })),
          };
        }
        return d;
      })
    );
  };

  const handleAutoDetectTimezone = () => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setTimezone(detected);
    } catch {}
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSaveSuccess(false);

      const res = await fetch("/api/appointments/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timezone,
          weeklyHours,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to save availability schedule");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading availability schedule...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Info & Timezone Card */}
      <div className="bg-card/60 border border-border rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Weekly Recurring Availability
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Specify your working days and active time windows. Clients can only schedule slots during these hours.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyWeekdays}
              title="Apply Monday hours to all weekdays (Mon–Fri)"
              className="text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-primary" />
              <span>Copy Mon to Weekdays</span>
            </Button>
          </div>
        </div>

        {/* Timezone Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 border-t border-border/60">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">
            <Globe className="w-4 h-4 text-primary" />
            <span>Timezone:</span>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <Select value={timezone} onValueChange={(val) => val && setTimezone(val)}>
              <SelectTrigger className="w-full sm:max-w-xs h-9 text-xs">
                <SelectValue placeholder="Select timezone">
                  {timezone}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {!COMMON_TIMEZONES.includes(timezone) && (
                    <SelectItem value={timezone} className="text-xs">
                      {timezone} (Current)
                    </SelectItem>
                  )}
                  {COMMON_TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz} className="text-xs">
                      {tz}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAutoDetectTimezone}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
            >
              Auto-detect
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs font-semibold rounded-xl bg-destructive/15 text-destructive border border-destructive/20">
          {error}
        </div>
      )}

      {/* Days Schedule Card List */}
      <div className="space-y-3">
        {DAYS_ORDER.map(({ key, label }) => {
          const dayConfig = weeklyHours.find((d) => d.day === key) || {
            day: key,
            isEnabled: false,
            slots: [{ start: "09:00", end: "17:00" }],
          };

          return (
            <div
              key={key}
              className={`rounded-2xl border p-4 transition-all duration-200 ${
                dayConfig.isEnabled
                  ? "bg-card border-border shadow-2xs"
                  : "bg-muted/20 border-border/50 opacity-75"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                {/* Day toggle & title */}
                <div className="flex items-center gap-3 w-36 shrink-0 pt-1">
                  <Switch
                    checked={dayConfig.isEnabled}
                    onCheckedChange={(checked) => handleToggleDay(key, checked)}
                    className="scale-90 cursor-pointer"
                  />
                  <span className={`text-sm font-bold ${dayConfig.isEnabled ? "text-foreground" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </div>

                {/* Slot editor if enabled */}
                {dayConfig.isEnabled ? (
                  <div className="flex-1 space-y-2">
                    {dayConfig.slots.map((slot, sIdx) => (
                      <div key={sIdx} className="flex items-center gap-2 flex-wrap">
                        <Input
                          type="time"
                          value={slot.start}
                          onChange={(e) => handleSlotChange(key, sIdx, "start", e.target.value)}
                          className="w-28 h-8 text-xs font-mono"
                        />
                        <span className="text-muted-foreground text-xs font-bold">–</span>
                        <Input
                          type="time"
                          value={slot.end}
                          onChange={(e) => handleSlotChange(key, sIdx, "end", e.target.value)}
                          className="w-28 h-8 text-xs font-mono"
                        />

                        {dayConfig.slots.length > 1 && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveSlot(key, sIdx)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer rounded-lg"
                            title="Remove this slot interval"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {sIdx === dayConfig.slots.length - 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAddSlot(key)}
                            className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1 cursor-pointer font-semibold ml-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Interval</span>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 pt-1 text-xs text-muted-foreground italic">
                    Unavailable
                  </div>
                )}

                {/* Copy day to all button */}
                {dayConfig.isEnabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopyToAll(key)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg shrink-0"
                    title={`Copy ${label} hours to all other days`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save Button Bar */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        {saveSuccess && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-primary animate-in fade-in duration-200">
            <Check className="w-4 h-4" />
            Availability saved successfully!
          </span>
        )}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="cursor-pointer font-bold px-6 shadow-xs"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Availability"
          )}
        </Button>
      </div>
    </div>
  );
}
