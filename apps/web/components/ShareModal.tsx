"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Send,
  Check,
  Copy,
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
  const [showNoteField, setShowNoteField] = useState(false);
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
      setShowNoteField(false);
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
        setSuccessMsg(`Access updated to ${newMode.toLowerCase()}`);
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
        setShowNoteField(false);
        if (onAccessModeChange) onAccessModeChange(data.accessMode);
        setSuccessMsg(`Invited ${cleanEmail}`);
        setTimeout(() => setSuccessMsg(null), 3000);
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
      <DialogContent className="max-w-lg max-h-[88vh] flex flex-col p-6 overflow-hidden">
        {/* Header */}
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              {targetType === "video" ? (
                <Film className="w-5 h-5" />
              ) : targetType === "playlist" ? (
                <ListVideo className="w-5 h-5" />
              ) : (
                <Folder className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate">
                Share {targetType === "video" ? "Video" : targetType === "playlist" ? "Playlist" : "Folder"}
              </DialogTitle>
              <DialogDescription className="truncate mt-0.5">
                {targetName || "Manage access and share with team"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-0.5 min-h-0">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="flex-1">{successMsg}</span>
            </div>
          )}

          {/* 1. Share Link Bar */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-primary" /> Share Link
            </Label>

            <div className="flex items-center gap-2">
              <Input
                type="text"
                readOnly
                value={loading ? "Loading link..." : shareUrl}
                className="font-mono text-xs select-all bg-muted/40 h-9"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                disabled={loading || !shareUrl}
                className="shrink-0 h-9 gap-1.5 px-3"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </Button>
            </div>
          </div>

          {/* 2. Access Settings (Clean Segmented Selector) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">General Access</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  id: "PUBLIC",
                  title: "Public",
                  icon: Globe,
                  desc: "Anyone with link",
                },
                {
                  id: "RESTRICTED",
                  title: "Restricted",
                  icon: Lock,
                  desc: "Invited emails only",
                },
                {
                  id: "PRIVATE",
                  title: "Private",
                  icon: ShieldAlert,
                  desc: "Only owner",
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
                    className={`p-2.5 rounded-lg text-left border transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30"
                        : "border-border bg-card hover:bg-accent text-card-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-foreground leading-tight">{option.title}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-1">
                        {option.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Invite by Email Section */}
          <div className="pt-2 border-t border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-primary" /> Invite People
              </Label>
              {allowedEmails.length > 0 && (
                <Badge variant="secondary">
                  {allowedEmails.length} invited
                </Badge>
              )}
            </div>

            <form onSubmit={handleAddAndInvite} className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    disabled={addingEmail}
                    placeholder="name@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={addingEmail || !emailInput.trim()}
                  className="shrink-0 gap-1.5"
                >
                  {addingEmail ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Invite</span>
                </Button>
              </div>

              {!showNoteField ? (
                <button
                  type="button"
                  onClick={() => setShowNoteField(true)}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  + Add message to invitation
                </button>
              ) : (
                <div className="space-y-1 animate-in fade-in duration-150">
                  <textarea
                    rows={2}
                    disabled={addingEmail}
                    placeholder="Add an optional message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  />
                </div>
              )}
            </form>
          </div>

          {/* 4. People with Access List */}
          {allowedEmails.length > 0 && (
            <div className="pt-2 border-t border-border space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> People with access ({allowedEmails.length})
              </p>

              <div className="max-h-32 overflow-y-auto divide-y divide-border rounded-lg border border-border bg-card">
                {allowedEmails.map((item) => (
                  <div
                    key={item.id}
                    className="px-3 py-2 flex items-center justify-between text-xs hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-medium text-foreground truncate">{item.email}</p>
                      <p className="text-[10px] text-muted-foreground">
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
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      {deletingEmailId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-destructive" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pinned Footer */}
        <DialogFooter className="pt-3 border-t border-border shrink-0">
          <Button type="button" onClick={onClose} className="w-full sm:w-auto">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
