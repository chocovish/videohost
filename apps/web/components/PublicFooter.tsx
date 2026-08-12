import Link from "next/link";
import {
  Video,
  Phone,
  Mail,
  MessageCircle,
  ShieldCheck,
  FileText,
  RefreshCcw,
  HelpCircle,
} from "lucide-react";

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[hsl(var(--border))] bg-white/50 dark:bg-slate-950/60 backdrop-blur-xl relative z-10 text-[hsl(var(--foreground))] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 pb-12 border-b border-[hsl(var(--border))]/60">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                <Video className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-tight leading-none">
                  VideoHost
                </span>
                <span className="text-[10px] font-bold text-[hsl(var(--primary))] tracking-wider uppercase">
                  Secure Video Hosting
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] leading-relaxed max-w-md">
              High-performance video hosting platform with 2GB free storage, granular email access control, multi-bitrate HLS streaming, developer APIs, and a free browser recording studio.
            </p>

            {/* Quick Contact Badges */}
            {/* <div className="pt-2 flex flex-wrap items-center gap-2.5">
              <a
                href="tel:+917278765456"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-[hsl(var(--border))] text-xs font-semibold hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] transition-all"
              >
                <Phone className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                <span>+91 7278765456</span>
              </a>

              <a
                href="https://wa.me/917278765456"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp Support</span>
              </a>

              <a
                href="mailto:support@tool4.in"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-[hsl(var(--border))] text-xs font-semibold hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] transition-all"
              >
                <Mail className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                <span>support@tool4.in</span>
              </a>
            </div> */}
          </div>

          {/* Navigation Links Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">
              Product
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm font-medium">
              <li>
                <Link
                  href="/"
                  className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors inline-flex items-center gap-1.5"
                >
                  Overview
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors inline-flex items-center gap-1.5"
                >
                  Pricing Plans
                </Link>
              </li>
              <li>
                <Link
                  href="/record"
                  className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors inline-flex items-center gap-1.5"
                >
                  <span>Free Studio Recorder</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))] text-[10px] font-black uppercase">
                    Free
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/auth/register"
                  className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors inline-flex items-center gap-1.5"
                >
                  Create Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Policies Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">
              Legal & Policies
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm font-medium">
              <li>
                <Link
                  href="/terms"
                  className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors inline-flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                  <span>Terms & Conditions</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors inline-flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                  <span>Privacy Policy</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/refund"
                  className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors inline-flex items-center gap-1.5"
                >
                  <RefreshCcw className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                  <span>Refund Policy</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Contact Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">
              Support
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm font-medium">
              <li>
                <Link
                  href="/contact"
                  className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors inline-flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                  <span>Contact Us</span>
                </Link>
              </li>
              <li className="text-xs text-[hsl(var(--muted-foreground))] pt-1">
                <span className="font-semibold block text-[hsl(var(--foreground))]">Support Email</span>
                <a href="mailto:support@tool4.in" className="hover:underline">support@tool4.in</a>
              </li>
              <li className="text-xs text-[hsl(var(--muted-foreground))]">
                <span className="font-semibold block text-[hsl(var(--foreground))]">Phone & WhatsApp</span>
                <a href="tel:+917278765456" className="hover:underline">+91 7278765456</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[hsl(var(--muted-foreground))]">
          <p>© {currentYear} VideoHost. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="hover:underline">Terms</Link>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <Link href="/refund" className="hover:underline">Refund Policy</Link>
            <Link href="/contact" className="hover:underline">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
