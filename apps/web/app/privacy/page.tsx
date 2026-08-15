import type { Metadata } from "next";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { ShieldCheck, Lock, Eye, Server, Cookie, UserX, Phone, Mail, MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — Taped",
  description:
    "Learn how Taped protects your privacy, secures uploaded video files with zero-egress cloud storage, enforces email access restrictions, and handles personal data.",
};

export default function PrivacyPage() {
  const lastUpdated = "August 12, 2026";

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] relative overflow-hidden flex flex-col justify-between selection:bg-[hsl(var(--primary))]/30">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] sm:w-[50rem] h-[36rem] sm:h-[50rem] bg-[hsl(var(--primary))] opacity-10 blur-3xl rounded-full pointer-events-none" />

      <PublicHeader currentPage="privacy" />

      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-16 relative z-10 flex-1 space-y-8 sm:space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/30 text-[hsl(var(--primary))] text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> Data Protection & Privacy
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">
            Last Updated: <span className="font-semibold text-[hsl(var(--foreground))]">{lastUpdated}</span>
          </p>
        </div>

        {/* Content Box */}
        <div className="glass-card p-6 sm:p-10 rounded-3xl border border-[hsl(var(--border))] shadow-xl space-y-8 text-sm leading-relaxed">
          {/* Commitment Highlight */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20 flex items-start gap-3 text-xs sm:text-sm">
            <Lock className="w-5 h-5 text-[hsl(var(--primary))] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[hsl(var(--foreground))]">Your Privacy Matters to Us</p>
              <p className="text-[hsl(var(--muted-foreground))]">
                Taped is designed from the ground up to empower creators and organizations with total privacy and access control over their video content. We never sell your personal information or video content to third parties.
              </p>
            </div>
          </div>

          {/* Section 1: Information Collected */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <Eye className="w-4 h-4 text-[hsl(var(--primary))]" /> Information We Collect
              </h2>
            </div>
            <div className="pl-10 space-y-2 text-[hsl(var(--muted-foreground))]">
              <p>We collect only essential information required to operate and secure our video hosting service:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong className="text-[hsl(var(--foreground))]">Account Information:</strong> Your email address, name, and hashed authentication credentials.</li>
                <li><strong className="text-[hsl(var(--foreground))]">Video & Media Data:</strong> Videos, thumbnails, titles, and metadata uploaded to your account.</li>
                <li><strong className="text-[hsl(var(--foreground))]">Access Control Settings:</strong> Restricted email lists and passcode settings configured for video playback.</li>
                <li><strong className="text-[hsl(var(--foreground))]">Technical Logs:</strong> IP address, browser type, and playback telemetry for queue processing and analytics.</li>
              </ul>
            </div>
          </section>

          {/* Section 2: How Data is Used */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h2 className="text-lg font-bold tracking-tight">How We Use Your Data</h2>
            </div>
            <p className="text-[hsl(var(--muted-foreground))] pl-10">
              We use your information exclusively to provide, maintain, and optimize Taped services:
              transcoding uploaded videos into multi-bitrate HLS streams, verifying viewer access permissions (such as OTP email verifications for private videos), processing billing transactions via Razorpay, and delivering customer support.
            </p>
          </section>

          {/* Section 3: Data Security & Storage */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <Server className="w-4 h-4 text-[hsl(var(--primary))]" /> Data Storage & Security
              </h2>
            </div>
            <p className="text-[hsl(var(--muted-foreground))] pl-10">
              All video assets and thumbnails are stored securely on zero-egress Cloudflare R2 object storage with end-to-end encryption in transit (TLS 1.3) and at rest (AES-256). We utilize automated queue processing for video transcoding and enforce strict access permission checks before issuing signed streaming URLs.
            </p>
          </section>

          {/* Section 4: Email Access Permissions */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center font-bold text-sm">
                4
              </div>
              <h2 className="text-lg font-bold tracking-tight">Email Restricted Access & Confidentiality</h2>
            </div>
            <p className="text-[hsl(var(--muted-foreground))] pl-10">
              When you configure private video access restricted to specific email addresses, those email lists are encrypted and stored solely for authentication purposes. We do not send marketing emails or promotional messages to designated video viewers.
            </p>
          </section>

          {/* Section 5: Cookies */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center font-bold text-sm">
                5
              </div>
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <Cookie className="w-4 h-4 text-[hsl(var(--primary))]" /> Cookies & Local Storage
              </h2>
            </div>
            <p className="text-[hsl(var(--muted-foreground))] pl-10">
              We use functional cookies and browser local storage to maintain session states, store user interface preferences (such as theme choice), and handle secure authentication tokens. We do not utilize intrusive cross-site tracking cookies.
            </p>
          </section>

          {/* Section 6: Data Rights */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center font-bold text-sm">
                6
              </div>
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <UserX className="w-4 h-4 text-[hsl(var(--primary))]" /> Your Rights & Account Deletion
              </h2>
            </div>
            <p className="text-[hsl(var(--muted-foreground))] pl-10">
              You have the right to inspect, export, or permanently delete your account and all associated video files at any time. When you delete a video or delete your account from the settings dashboard, all associated storage objects and metadata are permanently removed from our storage systems.
            </p>
          </section>

          {/* Contact Section */}
          <div className="pt-6 border-t border-[hsl(var(--border))] space-y-3">
            <h3 className="text-base font-bold">Privacy Contact & Data Inquiries</h3>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">
              For privacy-related questions, data export requests, or security inquiries, reach out to our privacy officer directly:
            </p>
            <div className="flex flex-wrap gap-3 text-xs font-semibold pt-2">
              <a
                href="mailto:support@tool4.in"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-[hsl(var(--border))]"
              >
                <Mail className="w-4 h-4 text-[hsl(var(--primary))]" />
                <span>support@tool4.in</span>
              </a>
              <a
                href="tel:+917278765456"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-[hsl(var(--border))]"
              >
                <Phone className="w-4 h-4 text-[hsl(var(--primary))]" />
                <span>+91 7278765456</span>
              </a>
              <a
                href="https://wa.me/917278765456"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp: +91 7278765456</span>
              </a>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
