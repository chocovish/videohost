import type { Metadata } from "next";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { RefreshCcw, CheckCircle2, Clock, HelpCircle, Phone, Mail, MessageCircle, AlertTriangle, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — VideoHost",
  description:
    "Review VideoHost's 7-day money-back guarantee, refund eligibility rules, subscription cancellation process, and contact instructions for payment refunds.",
};

export default function RefundPage() {
  const lastUpdated = "August 12, 2026";

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] relative overflow-hidden flex flex-col justify-between selection:bg-[hsl(var(--primary))]/30">
      {/* Ambient Background Effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] sm:w-[50rem] h-[36rem] sm:h-[50rem] bg-[hsl(var(--primary))] opacity-10 blur-3xl rounded-full pointer-events-none" />

      <PublicHeader currentPage="refund" />

      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-16 relative z-10 flex-1 space-y-8 sm:space-y-12">
        {/* Page Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/30 text-[hsl(var(--primary))] text-xs font-bold uppercase tracking-wider">
            <RefreshCcw className="w-4 h-4" /> Subscription Terms
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Cancellation & Refund Policy
          </h1>
          <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">
            Last Updated: <span className="font-semibold text-[hsl(var(--foreground))]">{lastUpdated}</span>
          </p>
        </div>

        {/* Content Box */}
        <div className="glass-card p-6 sm:p-10 rounded-3xl border border-[hsl(var(--border))] shadow-xl space-y-8 text-sm leading-relaxed">
          {/* Highlight Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20 flex items-start gap-3 text-xs sm:text-sm">
            <ShieldCheck className="w-5 h-5 text-[hsl(var(--primary))] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[hsl(var(--foreground))]">7-Day Money-Back Guarantee</p>
              <p className="text-[hsl(var(--muted-foreground))]">
                We stand behind VideoHost's performance. If you upgrade to a paid plan and are not completely satisfied with our service, you can request a full refund within 7 days of your initial purchase.
              </p>
            </div>
          </div>

          {/* Section 1: Free Plan Always Available */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h2 className="text-lg font-bold tracking-tight">2GB Free Plan (No Credit Card Required)</h2>
            </div>
            <p className="text-[hsl(var(--muted-foreground))] pl-10">
              VideoHost offers a perpetual Free Plan featuring 2GB of cloud video storage, email access controls, and access to our free browser screen recorder studio. You are encouraged to test our platform thoroughly using the free tier prior to upgrading to a paid subscription plan.
            </p>
          </section>

          {/* Section 2: Refund Eligibility */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[hsl(var(--primary))]" /> Refund Eligibility Criteria
              </h2>
            </div>
            <div className="pl-10 space-y-2 text-[hsl(var(--muted-foreground))]">
              <p>Refunds are eligible under the following conditions:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong className="text-[hsl(var(--foreground))]">First-Time Subscription Upgrade:</strong> Refund requests submitted within 7 calendar days of your initial paid plan activation.</li>
                <li><strong className="text-[hsl(var(--foreground))]">Billing Errors or Duplicate Charges:</strong> Erroneous double charges or inadvertent overbilling will be refunded 100% upon verification.</li>
                <li><strong className="text-[hsl(var(--foreground))]">Unresolved Technical Faults:</strong> Extended unexpected platform downtime preventing video streaming or processing.</li>
              </ul>
            </div>
          </section>

          {/* Section 3: Subscription Cancellation */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h2 className="text-lg font-bold tracking-tight">Easy 1-Click Subscription Cancellation</h2>
            </div>
            <p className="text-[hsl(var(--muted-foreground))] pl-10">
              You can cancel your paid subscription at any time directly from your dashboard settings. Upon cancellation, your account will remain active with full paid features until the end of your current billing period. No further recurring payments will be charged after cancellation.
            </p>
          </section>

          {/* Section 4: Non-Refundable Items */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center font-bold text-sm">
                4
              </div>
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Non-Refundable Scenarios
              </h2>
            </div>
            <div className="pl-10 space-y-2 text-[hsl(var(--muted-foreground))]">
              <p>Refunds will not be issued in the following instances:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Refund requests made after the 7-day window following initial subscription purchase.</li>
                <li>Partial billing periods after active utilization of storage and bandwidth.</li>
                <li>Accounts terminated due to severe violations of our Acceptable Use Policy (e.g. copyright infringement, malware, illegal content).</li>
              </ul>
            </div>
          </section>

          {/* Section 5: Processing Time */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center font-bold text-sm">
                5
              </div>
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <Clock className="w-4 h-4 text-[hsl(var(--primary))]" /> Processing Timeline
              </h2>
            </div>
            <p className="text-[hsl(var(--muted-foreground))] pl-10">
              Once your refund request is approved, the refund will be initiated immediately. Credits will automatically be processed back to your original payment method (via Razorpay / Debit Card / Credit Card / Netbanking / UPI) within <strong className="text-[hsl(var(--foreground))]">5 to 7 business days</strong>.
            </p>
          </section>

          {/* Section 6: How to Request */}
          <div className="pt-6 border-t border-[hsl(var(--border))] space-y-3">
            <h3 className="text-base font-bold flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[hsl(var(--primary))]" /> How to Request a Refund
            </h3>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">
              To request a refund or raise a billing question, please contact us with your account email and transaction receipt:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <a
                href="mailto:support@tool4.in"
                className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] transition-all flex flex-col items-start gap-1"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-[hsl(var(--primary))]">
                  <Mail className="w-4 h-4" /> Email Support
                </div>
                <span className="text-xs font-semibold">support@tool4.in</span>
                <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Fast response within 24h</span>
              </a>

              <a
                href="tel:+917278765456"
                className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] transition-all flex flex-col items-start gap-1"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-[hsl(var(--primary))]">
                  <Phone className="w-4 h-4" /> Phone Support
                </div>
                <span className="text-xs font-semibold">+91 7278765456</span>
                <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Mon-Sat, 9 AM - 7 PM IST</span>
              </a>

              <a
                href="https://wa.me/917278765456"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all flex flex-col items-start gap-1"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <MessageCircle className="w-4 h-4" /> WhatsApp Chat
                </div>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">+91 7278765456</span>
                <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">Direct messaging</span>
              </a>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
