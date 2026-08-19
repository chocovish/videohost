"use client";

import { useState } from "react";
import { Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    category: "General Inquiry",
    subject: "",
    message: "",
  });

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      setErrorMessage("Please fill in all required fields.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    // Simulate swift network dispatch with success response
    setTimeout(() => {
      setStatus("success");
      setFormData({
        name: "",
        email: "",
        category: "General Inquiry",
        subject: "",
        message: "",
      });
    }, 800);
  };

  return (
    <div className="glass-card p-6 sm:p-8 rounded-3xl border border-border shadow-xl space-y-6">
      <div className="space-y-1">
        <h3 className="text-xl font-black tracking-tight">Send Us a Direct Message</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Fill out the form below and our team will get back to you at support@taped.in within 24 hours.
        </p>
      </div>

      {status === "success" ? (
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3 animate-in fade-in zoom-in-95">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h4 className="text-lg font-bold text-emerald-700 dark:text-emerald-300">Message Received!</h4>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            Thank you for reaching out. We have received your inquiry and our support team will respond shortly to your email address.
          </p>
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:opacity-90 transition-all mt-2"
          >
            Send Another Message
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {status === "error" && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-2 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-foreground text-xs">
                Your Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border focus:outline-hidden focus:ring-2 focus:ring-primary text-xs sm:text-sm transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-foreground text-xs">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border focus:outline-hidden focus:ring-2 focus:ring-primary text-xs sm:text-sm transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-foreground text-xs">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-slate-900 border border-border focus:outline-hidden focus:ring-2 focus:ring-primary text-xs sm:text-sm transition-all"
              >
                <option value="General Inquiry">General Support</option>
                <option value="Billing & Refund">Billing & Refund Request</option>
                <option value="Technical Issue">Technical / Video Player Issue</option>
                <option value="API & Webhooks">Developer APIs & Webhooks</option>
                <option value="Enterprise & Custom">Business & Enterprise Sales</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-foreground text-xs">
                Subject
              </label>
              <input
                type="text"
                placeholder="Brief summary of your request"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border focus:outline-hidden focus:ring-2 focus:ring-primary text-xs sm:text-sm transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-foreground text-xs">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={5}
              placeholder="How can we help you? Provide details about your question..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border focus:outline-hidden focus:ring-2 focus:ring-primary text-xs sm:text-sm transition-all resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full sm:w-auto px-8 py-3.5 bg-primary text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-primary/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {status === "submitting" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending Message...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Inquiry</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
