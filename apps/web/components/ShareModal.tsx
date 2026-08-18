"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Send,
  Check,
  Copy,
  Share2,
  Film,
  Folder,
  Loader2,
  AlertCircle,
  Link as LinkIcon,
  Globe,
  Lock,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
  ListVideo,
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
import { Badge } from "@/components/ui/badge";

interface SharedEmailItem {
  id: string;
  email: string;
  createdAt: string;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "video" | "folder" | "playlist";
  targetId: string;
  targetName: string;
  onAccessModeChange?: (newMode: "PUBLIC" | "RESTRICTED" | "PRIVATE") => void;
}

export default function ShareModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
  onAccessModeChange,
}: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState<string>("");
  const [accessMode, setAccessMode] = useState<"PUBLIC" | "RESTRICTED" | "PRIVATE">("PUBLIC");
  const [allowedEmails, setAllowedEmails] = useState<SharedEmailItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [savingMode, setSavingMode] = useState(false);
  const [copied, setCopied] = useState(false);

  const [emailInput, setEmailInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [addingEmail, setAddingEmail] = useState(false);
  const [deletingEmailId, setDeletingEmailId] = useState<string | null>(null);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchShareDetails = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/share?targetType=${targetType}&targetId=${targetId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setShareUrl(data.shareUrl);
        setAccessMode(data.accessMode || "PUBLIC");
        setAllowedEmails(data.allowedEmails || []);
      } else {
        setErrorMsg(data.error || "Failed to load share settings");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load share settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && targetId) {
      setShareUrl("");
      setEmailInput("");
      setMessageInput("");
      setSuccessMsg(null);
      setErrorMsg(null);
      setCopied(false);
      fetchShareDetails();
    }
  }, [isOpen, targetId, targetType]);

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleModeChange = async (newMode: "PUBLIC" | "RESTRICTED" | "PRIVATE") => {
    if (newMode === accessMode || savingMode) return;
    setSavingMode(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_MODE",
          targetType,
          targetId,
          accessMode: newMode,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAccessMode(data.accessMode);
        setAllowedEmails(data.allowedEmails || []);
        if (onAccessModeChange) onAccessModeChange(data.accessMode);
        setSuccessMsg(`Access mode updated to ${newMode}`);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(data.error || "Failed to update access mode");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update access mode");
    } finally {
      setSavingMode(false);
    }
  };

  const handleAddAndInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setAddingEmail(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_EMAIL",
          targetType,
          targetId,
          email: cleanEmail,
          message: messageInput,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAccessMode(data.accessMode);
        setAllowedEmails(data.allowedEmails || []);
        setEmailInput("");
        setMessageInput("");
        if (onAccessModeChange) onAccessModeChange(data.accessMode);
        setSuccessMsg(`Added and sent invitation to ${cleanEmail}`);
      } else {
        setErrorMsg(data.error || "Failed to add email");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to add email invitation");
    } finally {
      setAddingEmail(false);
    }
  };

  const handleRemoveEmail = async (emailId: string, emailStr: string) => {
    setDeletingEmailId(emailId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REMOVE_EMAIL",
          targetType,
          targetId,
          emailId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAllowedEmails(data.allowedEmails || []);
        setSuccessMsg(`Removed access for ${emailStr}`);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(data.error || "Failed to remove email");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to remove email");
    } finally {
      setDeletingEmailId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] shrink-0">
              {targetType === "video" ? (
                <Film className="w-5 h-5" />
              ) : targetType === "playlist" ? (
                <ListVideo className="w-5 h-5" />
              ) : (
                <Folder className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle>
                Share {targetType === "video" ? "Video" : targetType === "playlist" ? "Playlist" : "Folder"}
              </DialogTitle>
              <DialogDescription className="truncate max-w-xs sm:max-w-sm">{targetName}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Notifications */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. CONSTANT SHARE LINK SECTION */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5 text-[hsl(var(--primary))]" /> Share Link
          </Label>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Input
              type="text"
              readOnly
              value={loading ? "Loading link..." : shareUrl}
              className="font-mono bg-slate-50 dark:bg-slate-900 select-all"
            />
            <Button
              type="button"
              onClick={handleCopyLink}
              disabled={loading || !shareUrl}
              className="shrink-0 min-w-[110px]"
            >
              {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>
        </div>

        {/* 2. ACCESS MODE CONTROLS */}
        <div className="space-y-2.5">
          <Label>Access Settings</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              {
                id: "PUBLIC",
                title: "Public",
                icon: Globe,
                desc: "Anyone with link can view",
              },
              {
                id: "RESTRICTED",
                title: "Specific Emails",
                icon: Lock,
                desc: "Requires login & invited email",
              },
              {
                id: "PRIVATE",
                title: "Private",
                icon: ShieldAlert,
                desc: "Disabled for everyone",
              },
            ].map((option) => {
              const Icon = option.icon;
              const isSelected = accessMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={savingMode}
                  onClick={() => handleModeChange(option.id as any)}
                  className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between space-y-2 cursor-pointer ${
                    isSelected
                      ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 shadow-xs ring-2 ring-[hsl(var(--primary))]/20"
                      : "bg-slate-50 dark:bg-slate-900 border-[hsl(var(--input))] hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <Icon className={`w-4 h-4 ${isSelected ? "text-[hsl(var(--primary))]" : "text-slate-400"}`} />
                    {isSelected && <span className="w-2 h-2 rounded-full bg-[hsl(var(--primary))]" />}
                  </div>
                  <div>
                    <p className="font-extrabold text-xs text-[hsl(var(--foreground))]">{option.title}</p>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] leading-tight mt-0.5">
                      {option.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. ADD AND INVITE EMAIL SECTION */}
        <div className="pt-2 border-t border-[hsl(var(--border))] space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-indigo-600" /> Share with Emails
            </Label>
            {allowedEmails.length > 0 && (
              <Badge variant="outline" className="text-indigo-600 border-indigo-200">
                {allowedEmails.length} invited
              </Badge>
            )}
          </div>

          <form onSubmit={handleAddAndInvite} className="space-y-3">
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <Input
                type="email"
                disabled={addingEmail}
                placeholder="colleague@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="pl-10"
              />
            </div>

            <div>
              <textarea
                rows={2}
                disabled={addingEmail}
                placeholder="Add an optional note in the email invitation..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="flex w-full rounded-xl border border-[hsl(var(--input))] bg-background px-3.5 py-2 text-xs ring-offset-background placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none"
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={addingEmail || !emailInput.trim()}
                className="min-w-[130px]"
              >
                {addingEmail ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Adding...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1.5" /> Add & Invite
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* 4. ALLOWED EMAILS LIST */}
        {allowedEmails.length > 0 && (
          <div className="pt-2 border-t border-[hsl(var(--border))] space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> People with Access ({allowedEmails.length})
            </h4>

            <div className="max-h-40 overflow-y-auto divide-y divide-[hsl(var(--border))] rounded-xl border border-[hsl(var(--border))] bg-slate-50/50 dark:bg-slate-900/50">
              {allowedEmails.map((item) => (
                <div
                  key={item.id}
                  className="px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-[hsl(var(--foreground))] truncate">{item.email}</p>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                      Added {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={deletingEmailId === item.id}
                    onClick={() => handleRemoveEmail(item.id, item.email)}
                    title="Remove access"
                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    {deletingEmailId === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} className="w-full sm:w-auto">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
