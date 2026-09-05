import Link from "next/link";
import Image from "next/image";
import {
  Phone,
  Mail,
  MessageCircle,
  ShieldCheck,
  FileText,
  RefreshCcw,
  HelpCircle,
} from "lucide-react";
import { FEATURES } from "@/lib/features";

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-white/50 dark:bg-slate-950/60 backdrop-blur-xl relative z-10 text-foreground transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-10 pb-12 border-b border-border/60">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center group">
              <Image
                src="/taped-in-logo.webp"
                alt="Taped"
                width={140}
                height={48}
                className="h-8 sm:h-9 w-auto object-contain"
              />
            </Link>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md">
              High-performance video hosting platform with 2GB free storage, granular email access control, multi-bitrate HLS streaming, developer APIs, and a free browser recording studio.
            </p>

            {/* Quick Contact Badges */}
            {/* <div className="pt-2 flex flex-wrap items-center gap-2.5">
              <a
                href="tel:+917278765456"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-border text-xs font-semibold hover:border-primary hover:text-primary transition-all"
              >
                <Phone className="w-3.5 h-3.5 text-primary" />
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
                href="mailto:support@taped.in"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-border text-xs font-semibold hover:border-primary hover:text-primary transition-all"
              >
                <Mail className="w-3.5 h-3.5 text-primary" />
                <span>support@taped.in</span>
              </a>
            </div> */}
          </div>

          {/* Navigation Links Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Product
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm font-medium">
              <li>
                <Link
                  href="/"
                  className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                >
                  Overview
                </Link>
              </li>
              <li>
                <Link
                  href="/features"
                  className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                >
                  All Features
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                >
                  Pricing Plans
                </Link>
              </li>
              <li>
                <Link
                  href="/record"
                  className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                >
                  <span>Free Studio Recorder</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-primary/20 text-primary text-[10px] font-black uppercase">
                    Free
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/auth/register"
                  className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                >
                  Create Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Features Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Features
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm font-medium">
              {FEATURES.map((feature) => (
                <li key={feature.slug}>
                  <Link
                    href={`/features/${feature.slug}`}
                    className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                  >
                    {feature.navLabel}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Policies Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Legal & Policies
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm font-medium">
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <span>Terms & Conditions</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <span>Privacy Policy</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/refund"
                  className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                >
                  <RefreshCcw className="w-3.5 h-3.5 text-primary" />
                  <span>Refund Policy</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Contact Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Support
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm font-medium">
              <li>
                <Link
                  href="/contact"
                  className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-primary" />
                  <span>Contact Us</span>
                </Link>
              </li>
              <li className="text-xs text-muted-foreground pt-1">
                <span className="font-semibold block text-foreground">Support Email</span>
                <a href="mailto:support@taped.in" className="hover:underline">support@taped.in</a>
              </li>
              <li className="text-xs text-muted-foreground">
                <span className="font-semibold block text-foreground">Phone & WhatsApp</span>
                <a href="tel:+917278765456" className="hover:underline">+91 7278765456</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {currentYear} Taped. All rights reserved.</p>
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
