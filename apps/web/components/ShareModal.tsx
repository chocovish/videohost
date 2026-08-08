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
} from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "video" | "folder";
  targetId: string;
  targetName: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
}: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && targetId) {
      setShareUrl("");
      setEmail("");
      setMessage("");
      setEmailSuccess(null);
      setError(null);
      setCopied(false);

      const generateLink = async () => {
        setGenerating(true);
        try {
          const res = await fetch("/api/share", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetType, targetId }),
          });
          const data = await res.json();
          if (res.ok && data.shareUrl) {
            setShareUrl(data.shareUrl);
          } else {
            setError(data.error || "Failed to generate link");
          }
        } catch (err: any) {
          setError(err.message || "Failed to generate link");
        } finally {
          setGenerating(false);
        }
      };

      generateLink();
    }
  }, [isOpen, targetId, targetType]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid recipient email address.");
      return;
    }

    setSendingEmail(true);
    setError(null);
    setEmailSuccess(null);

    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          recipientEmail: email,
          message,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      setEmailSuccess(`Share link sent to ${email} successfully!`);
      if (data.shareUrl) {
        setShareUrl(data.shareUrl);
      }
    } catch (err: any) {
      setError(err.message || "Failed to send email invite.");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg glass-card bg-white rounded-2xl p-6 shadow-2xl relative border border-[hsl(var(--border))] space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2.5 rounded-xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-lg text-[hsl(var(--foreground))]">
                Share {targetType === "video" ? "Video" : "Folder"}
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] truncate max-w-xs">
                {targetName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item Info Banner */}
        <div className="p-3 rounded-xl bg-slate-50 border border-[hsl(var(--border))] flex items-center gap-3">
          {targetType === "video" ? (
            <div className="p-2 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] rounded-lg shrink-0">
              <Film className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg shrink-0">
              <Folder className="w-5 h-5 fill-amber-500/20" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              {targetType}
            </p>
            <p className="text-sm font-bold text-[hsl(var(--foreground))] truncate">{targetName}</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. DIRECT SHARE LINK AT THE TOP */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5 text-[hsl(var(--primary))]" /> Direct Share Link
          </label>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={generating ? "Generating link..." : shareUrl}
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-[hsl(var(--input))] rounded-xl text-[hsl(var(--foreground))] select-all focus:outline-none"
            />
            <button
              onClick={handleCopy}
              disabled={generating || !shareUrl}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-[hsl(var(--primary))] text-white hover:opacity-90 rounded-xl shadow-xs transition-all shrink-0 disabled:opacity-50"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>

        {/* DIVIDER */}
        <div className="relative flex items-center justify-center my-2">
          <div className="w-full border-t border-[hsl(var(--border))]" />
          <span className="absolute bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Or Share via Email
          </span>
        </div>

        {/* 2. EMAIL INVITE SECTION */}
        <form onSubmit={handleSendEmail} className="space-y-3.5">
          {emailSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{emailSuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
              Recipient Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="email"
                disabled={sendingEmail}
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-[hsl(var(--input))] bg-white focus:ring-2 focus:ring-[hsl(var(--primary))] text-sm outline-none text-[hsl(var(--foreground))]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
              Personal Message <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              disabled={sendingEmail}
              placeholder="Add a note for the recipient..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[hsl(var(--input))] bg-white focus:ring-2 focus:ring-[hsl(var(--primary))] text-sm outline-none text-[hsl(var(--foreground))] resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[hsl(var(--border))]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
            >
              Done
            </button>
            <button
              type="submit"
              disabled={sendingEmail || !email.trim()}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {sendingEmail ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Send Email
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
