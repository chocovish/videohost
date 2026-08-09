"use client";

import { useState, useEffect } from "react";
import {
  X,
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
} from "lucide-react";

interface SharedEmailItem {
  id: string;
  email: string;
  createdAt: string;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "video" | "folder";
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

  // Fetch share details on open
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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto glass-card bg-white rounded-3xl p-5 sm:p-7 shadow-2xl relative border border-[hsl(var(--border))] space-y-5 my-auto">

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-3 rounded-2xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-lg text-[hsl(var(--foreground))]">
                Share {targetType === "video" ? "Video" : "Folder"}
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] truncate max-w-xs sm:max-w-sm">
                {targetName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. CONSTANT SHARE LINK SECTION */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-[hsl(var(--primary))]" /> Share Link
            </label>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              readOnly
              value={loading ? "Loading link..." : shareUrl}
              className="w-full px-4 py-2.5 text-xs font-mono bg-slate-50 border border-[hsl(var(--input))] rounded-xl text-[hsl(var(--foreground))] select-all focus:outline-none min-h-[44px]"
            />
            <button
              onClick={handleCopyLink}
              disabled={loading || !shareUrl}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold bg-[hsl(var(--primary))] text-white hover:opacity-90 rounded-xl shadow-xs transition-all shrink-0 disabled:opacity-50 min-h-[44px]"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>

        {/* 2. ACCESS MODE CONTROLS */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))] block">
            Access Settings
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              {
                id: "PUBLIC",
                title: "Public",
                icon: Globe,
                desc: "Anyone with link can view",
                badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
              },
              {
                id: "RESTRICTED",
                title: "Specific Emails",
                icon: Lock,
                desc: "Requires login & invited email",
                badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
              },
              {
                id: "PRIVATE",
                title: "Private",
                icon: ShieldAlert,
                desc: "Disabled for everyone",
                badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
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
                  className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between space-y-2 cursor-pointer ${isSelected
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 shadow-xs ring-2 ring-[hsl(var(--primary))]/20"
                    : "bg-slate-50 border-[hsl(var(--input))] hover:bg-slate-100 hover:border-slate-300"
                    }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <Icon className={`w-4 h-4 ${isSelected ? "text-[hsl(var(--primary))]" : "text-slate-400"}`} />
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-[hsl(var(--primary))]" />
                    )}
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
            <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-indigo-600" /> Share with Emails
            </label>
            {allowedEmails.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {allowedEmails.length} invited
              </span>
            )}
          </div>

          <form onSubmit={handleAddAndInvite} className="space-y-3">
            <div>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  disabled={addingEmail}
                  placeholder="colleague@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[hsl(var(--input))] bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[hsl(var(--primary))] text-sm outline-none text-[hsl(var(--foreground))] transition-all"
                />
              </div>
            </div>

            <div>
              <textarea
                rows={2}
                disabled={addingEmail}
                placeholder="Add an optional note in the email invitation..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[hsl(var(--input))] bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[hsl(var(--primary))] text-xs outline-none text-[hsl(var(--foreground))] resize-none transition-all"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={addingEmail || !emailInput.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {addingEmail ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Add & Invite
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* 4. ALLOWED EMAILS LIST */}
        {allowedEmails.length > 0 && (
          <div className="pt-2 border-t border-[hsl(var(--border))] space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> People with Access ({allowedEmails.length})
            </h4>

            <div className="max-h-40 overflow-y-auto divide-y divide-[hsl(var(--border))] rounded-xl border border-[hsl(var(--border))] bg-slate-50/50">
              {allowedEmails.map((item) => (
                <div
                  key={item.id}
                  className="px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-slate-100/60 transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-[hsl(var(--foreground))] truncate">{item.email}</p>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                      Added {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={deletingEmailId === item.id}
                    onClick={() => handleRemoveEmail(item.id, item.email)}
                    title="Remove access"
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0 disabled:opacity-50"
                  >
                    {deletingEmailId === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-[hsl(var(--border))]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
