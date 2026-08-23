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
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSending && onClose()}>
      <DialogContent className="max-w-lg p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle>Invite People to Call</DialogTitle>
              <DialogDescription className="truncate">{meetingTitle}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Quick Copy Link Box */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Direct Meeting Link</Label>
            <div className="flex items-center gap-2 p-1.5 pl-3 bg-muted/50 border border-border rounded-xl">
              <span className="text-xs text-foreground truncate flex-1 font-mono">{joinUrl}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                className="h-8 px-3 text-xs shrink-0 rounded-lg gap-1.5 font-medium"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Quick Copy Code */}
          <div className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
            <div>
              <span className="text-xs text-muted-foreground">Meeting Room ID:</span>
              <p className="text-sm font-mono font-bold text-primary tracking-wider mt-0.5">
                {meetingId}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyCode}
              className="h-8 px-3 text-xs rounded-lg gap-1.5 font-medium"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </Button>
          </div>

          {/* Send Instant Email Invite Form */}
          <form onSubmit={handleSendInvites} className="p-3.5 sm:p-4 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-500" />
                <Label htmlFor="in-meeting-invite-email" className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Invite Attendees via Email
                </Label>
              </div>
              {inviteEmails.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {inviteEmails.length} added
                </Badge>
              )}
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="in-meeting-invite-email"
                  type="email"
                  placeholder="colleague@domain.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSending}
                  className="pl-8 text-xs bg-background h-9 rounded-xl"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddEmail}
                disabled={isSending || !emailInput.trim()}
                className="shrink-0 bg-background h-9 rounded-xl gap-1 text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </Button>
            </div>

            {/* Email tags */}
            {inviteEmails.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1 max-h-32 overflow-y-auto">
                {inviteEmails.map((email) => (
                  <Badge
                    key={email}
                    variant="secondary"
                    className="gap-1.5 py-1 px-2.5 text-xs font-normal bg-background border border-border"
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

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                disabled={isSending || (inviteEmails.length === 0 && !emailInput.trim())}
                className="gap-1.5 text-xs font-bold rounded-xl h-9"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Invites</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
