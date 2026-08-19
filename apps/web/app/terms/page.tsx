import type { Metadata } from "next";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { FileText, ShieldCheck, Scale, Lock, UserCheck, AlertCircle, Phone, Mail, HelpCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms & Conditions — Taped",
  description:
    "Read Taped's Terms and Conditions regarding account creation, video hosting, 2GB free storage limits, email access controls, acceptable use policies, and user ownership rights.",
};

export default function TermsPage() {
  const lastUpdated = "August 12, 2026";

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden flex flex-col justify-between selection:bg-primary/30">
      {/* Dynamic Ambient Background Blur */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-xl sm:w-200 h-144 sm:h-200 bg-primary opacity-10 blur-3xl rounded-full pointer-events-none" />

      <PublicHeader currentPage="terms" />

      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-16 relative z-10 flex-1 space-y-8 sm:space-y-12">
        {/* Page Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider">
            <FileText className="w-4 h-4" /> Legal Agreement
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Terms & Conditions
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Last Updated: <span className="font-semibold text-foreground">{lastUpdated}</span>
          </p>
        </div>

        {/* Content Card */}
        <div className="glass-card p-6 sm:p-10 rounded-3xl border border-border shadow-xl space-y-8 text-sm leading-relaxed">
          {/* Intro Notice */}
          <div className="p-4 sm:p-5 rounded-2xl bg-primary/10 border border-primary/20 flex items-start gap-3 text-xs sm:text-sm">
            <Scale className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Welcome to Taped</p>
              <p className="text-muted-foreground">
                Please review these Terms & Conditions carefully before using our video hosting platform, screen recording tools, or developer APIs. By accessing or using Taped, you agree to be bound by these terms.
              </p>
            </div>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h2 className="text-lg font-bold tracking-tight">Acceptance of Terms</h2>
            </div>
            <p className="text-muted-foreground pl-10">
              By registering an account, uploading media, or using any service offered by Taped ("Platform", "we", "us"), you confirm that you are at least 18 years of age (or legal age of majority in your jurisdiction) and possess the legal authority to enter into this agreement.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h2 className="text-lg font-bold tracking-tight">User Account & Security</h2>
            </div>
            <p className="text-muted-foreground pl-10">
              You are responsible for maintaining the confidentiality of your login credentials and for all activities occurring under your account. You agree to notify us immediately of any unauthorized access or security breach. Taped cannot and will not be liable for losses resulting from lost passwords or unauthorized account access.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h2 className="text-lg font-bold tracking-tight">Acceptable Use Policy</h2>
            </div>
            <div className="pl-10 space-y-2 text-muted-foreground">
              <p>You agree NOT to upload, record, stream, or distribute any content that:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Violates copyright, trademark, privacy, or publicity rights of third parties.</li>
                <li>Contains illegal, harmful, hateful, defamatory, or explicit material.</li>
                <li>Distributes viruses, malware, phishing links, or malicious code.</li>
                <li>Attempts to bypass or defeat access control mechanisms or bandwidth limits.</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-sm">
                4
              </div>
              <h2 className="text-lg font-bold tracking-tight">Storage Limits & Adaptive Streaming</h2>
            </div>
            <p className="text-muted-foreground pl-10">
              Our Free Plan includes 2GB of free cloud storage space. Paid plans grant higher storage quotas and enhanced HLS adaptive resolution transcoding. Accounts exceeding their allotted storage limit may be prevented from uploading additional files until storage is freed or upgraded.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-sm">
                5
              </div>
              <h2 className="text-lg font-bold tracking-tight">User Content Ownership</h2>
            </div>
            <p className="text-muted-foreground pl-10">
              You retain full ownership and copyright of all videos, audio files, and thumbnails uploaded to your account. Taped does not claim ownership over your content. By uploading media, you grant Taped a non-exclusive license solely to host, transcode, store, and stream the media to authorized viewers designated by your privacy settings.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-sm">
                6
              </div>
              <h2 className="text-lg font-bold tracking-tight">Termination of Service</h2>
            </div>
            <p className="text-muted-foreground pl-10">
              We reserve the right to suspend or terminate accounts that breach this agreement, participate in abusive network practices, or violate intellectual property rights. Users may terminate their account at any time via dashboard settings.
            </p>
          </section>

          {/* Section 7 - Contact & Legal Notice */}
          <div className="pt-6 border-t border-border space-y-3">
            <h3 className="text-base font-bold flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" /> Questions & Contact Information
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              For any questions regarding these Terms & Conditions, please contact our legal and support team:
            </p>
            <div className="flex flex-wrap gap-4 text-xs font-semibold pt-2">
              <a
                href="tel:+917278765456"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border"
              >
                <Phone className="w-4 h-4 text-primary" />
                <span>+91 7278765456</span>
              </a>
              <a
                href="mailto:support@taped.in"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border"
              >
                <Mail className="w-4 h-4 text-primary" />
                <span>support@taped.in</span>
              </a>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
