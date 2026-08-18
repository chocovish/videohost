"use client";

import React, { useState } from "react";
import {
  Calendar,
  Clock,
  Video,
  Disc,
  Users,
  X,
  Plus,
  Loader2,
  Sparkles,
  CheckCircle2,
  Copy,
  Mail,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
    // Format to YYYY-MM-DDTHH:mm for datetime-local input
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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/30 flex items-center justify-center text-[hsl(var(--primary))]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Schedule Video Meeting</h2>
              <p className="text-xs text-slate-400">Set up a LiveKit room & invite attendees</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Meeting Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Q3 Product Sync & Roadmap Review"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))] transition-all"
            />
          </div>

          {/* Date & Time and Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Start Date & Time
              </label>
              <input
                type="datetime-local"
                required
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))] transition-all [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Duration
              </label>
              <Select
                value={String(durationMinutes)}
                onValueChange={(val) => setDurationMinutes(Number(val))}
              >
                <SelectTrigger className="w-full h-11 px-3.5 bg-slate-950/80 border-slate-700/80 rounded-xl text-sm text-white font-normal focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))] shadow-sm">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  <SelectItem value="15" className="text-xs">15 Minutes</SelectItem>
                  <SelectItem value="30" className="text-xs">30 Minutes</SelectItem>
                  <SelectItem value="45" className="text-xs">45 Minutes</SelectItem>
                  <SelectItem value="60" className="text-xs">1 Hour</SelectItem>
                  <SelectItem value="90" className="text-xs">1.5 Hours</SelectItem>
                  <SelectItem value="120" className="text-xs">2 Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Agenda / Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Brief details or agenda items for attendees..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))] transition-all resize-none"
            />
          </div>

          {/* Record Meeting Option */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg mt-0.5 ${recordOnStart ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-slate-800 text-slate-400"}`}>
                <Disc className={`w-4 h-4 ${recordOnStart ? "animate-pulse" : ""}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">Record meeting automatically</span>
                  {recordOnStart && (
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      Auto-Record
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Record conference and automatically save to your Taped video library when the session starts.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={recordOnStart}
                onChange={(e) => setRecordOnStart(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[hsl(var(--primary))]"></div>
            </label>
          </div>

          {/* Guest Access Option */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg mt-0.5 ${allowGuests ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-800 text-slate-400"}`}>
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">Join without login (Guest access)</span>
                  {allowGuests && (
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Open Access
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Allows candidates, clients, or team members to join with just a name, without needing a Taped login.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={allowGuests}
                onChange={(e) => setAllowGuests(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Invite Attendees via Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> Invite Attendees by Email
              </span>
              <span className="text-[11px] font-normal text-slate-500 lowercase">press enter to add</span>
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="colleague@company.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 px-4 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))] transition-all"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddEmail}
                className="px-3.5 border-slate-700 hover:bg-slate-800 text-slate-200"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Email tags */}
            {inviteEmails.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {inviteEmails.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/30 text-[hsl(var(--primary))] text-xs font-medium"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      className="text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-[hsl(var(--primary))] text-white hover:opacity-90 font-bold px-5 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Schedule Meeting
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
