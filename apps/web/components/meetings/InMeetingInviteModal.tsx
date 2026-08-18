"use client";

import React, { useState } from "react";
import {
  Users,
  Copy,
  Check,
  Mail,
  Plus,
  X,
  Loader2,
  Send,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface InMeetingInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  meetingTitle: string;
}

export default function InMeetingInviteModal({
  isOpen,
  onClose,
  meetingId,
  meetingTitle,
}: InMeetingInviteModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/meet/${meetingId}` : `/meet/${meetingId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(meetingId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      setErrorMsg("Please enter a valid email address");
      return;
    }
    if (inviteEmails.includes(trimmed)) {
      setEmailInput("");
      return;
    }
    setInviteEmails([...inviteEmails, trimmed]);
    setEmailInput("");
    setErrorMsg(null);
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

  const handleSendInvites = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteEmails.length === 0 && !emailInput.trim()) {
      setErrorMsg("Add at least one email address to send invites");
      return;
    }

    let allEmails = [...inviteEmails];
    if (emailInput.trim() && emailInput.includes("@")) {
      allEmails.push(emailInput.trim().toLowerCase());
    }

    setIsSending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/meetings/${meetingId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: allEmails }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send email invites");
      }

      setSuccessMsg(`Invitations successfully sent to ${allEmails.length} recipient(s)!`);
      setInviteEmails([]);
      setEmailInput("");
      setTimeout(() => {
        setSuccessMsg(null);
      }, 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send invitation emails");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/30 flex items-center justify-center text-[hsl(var(--primary))]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Invite People to Call</h2>
              <p className="text-xs text-slate-400 truncate max-w-xs">{meetingTitle}</p>
            </div>
          </div>
          <Button
            variant="darkGhost"
            size="icon-xs"
            onClick={onClose}
            title="Close invite modal"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Quick Copy Link Box */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Direct Meeting Link
            </label>
            <div className="flex items-center gap-2 p-2 pl-3 bg-slate-950/80 border border-slate-800 rounded-xl">
              <span className="text-xs text-slate-300 truncate flex-1 font-mono">{joinUrl}</span>
              <Button
                size="sm"
                variant="dark"
                onClick={handleCopyLink}
                className="h-8 px-3 text-xs shrink-0 rounded-lg gap-1.5 font-medium"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-200">Copy Link</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Quick Copy Code */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/40 border border-slate-800/80 rounded-xl">
            <div>
              <span className="text-xs text-slate-400">Meeting Room ID:</span>
              <p className="text-sm font-mono font-bold text-[hsl(var(--primary))] tracking-wider mt-0.5">
                {meetingId}
              </p>
            </div>
            <Button
              size="sm"
              variant="darkOutline"
              onClick={handleCopyCode}
              className="h-8 px-3 text-xs text-slate-200 hover:text-white rounded-lg gap-1.5 font-medium"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Code</span>
                </>
              )}
            </Button>
          </div>

          {/* Send Instant Email Invite Form */}
          <form onSubmit={handleSendInvites} className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> Send Instant Email Invitation
              </label>
              <span className="text-[11px] text-slate-500">press enter to add</span>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="email"
                placeholder="colleague@domain.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 px-4 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))] transition-all"
              />
              <Button
                type="button"
                variant="darkOutline"
                onClick={handleAddEmail}
                className="px-3"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Email tags */}
            {inviteEmails.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {inviteEmails.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/30 text-[hsl(var(--primary))] text-xs font-medium"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="lime"
                disabled={isSending || (inviteEmails.length === 0 && !emailInput.trim())}
                className="font-bold px-5 gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Invites
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
