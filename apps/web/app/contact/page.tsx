import type { Metadata } from "next";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import ContactForm from "./ContactForm";
import { Phone, Mail, MessageCircle, Clock, MapPin, Sparkles, HelpCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact Us — Taped Support",
  description:
    "Get in touch with Taped customer support, technical assistance, or business inquiries via phone (+91 7278765456), WhatsApp (+91 7278765456), or email (support@taped.in).",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] relative overflow-hidden flex flex-col justify-between selection:bg-[hsl(var(--primary))]/30">
      {/* Background Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] sm:w-[50rem] h-[36rem] sm:h-[50rem] bg-[hsl(var(--primary))] opacity-15 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[20rem] h-[20rem] bg-emerald-500 opacity-10 blur-3xl rounded-full pointer-events-none" />

      <PublicHeader currentPage="contact" />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-16 relative z-10 flex-1 space-y-10 sm:space-y-14">
        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/30 text-[hsl(var(--primary))] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" /> 24/7 Dedicated Support
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            We're Here to Help
          </h1>
          <p className="text-sm sm:text-base text-[hsl(var(--muted-foreground))] leading-relaxed">
            Have a question about video hosting, API integration, or subscription plans? Contact us directly via phone, WhatsApp, or email.
          </p>
        </div>

        {/* Contact Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Phone */}
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-[hsl(var(--border))] space-y-4 hover:border-[hsl(var(--primary))]/50 transition-all group shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Phone className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold tracking-tight">Phone Support</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Speak directly with our support team for urgent queries.
              </p>
            </div>
            <div className="pt-2 space-y-2">
              <a
                href="tel:+917278765456"
                className="text-base sm:text-lg font-extrabold text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors block"
              >
                +91 7278765456
              </a>
              <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                <Clock className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                <span>Mon - Sat: 9:00 AM - 7:00 PM IST</span>
              </div>
            </div>
          </div>

          {/* Card 2: WhatsApp Support */}
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-[hsl(var(--border))] space-y-4 hover:border-emerald-500/50 transition-all group shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold tracking-tight">WhatsApp Chat</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Instant messaging for quick questions and support updates.
              </p>
            </div>
            <div className="pt-2 space-y-2">
              <a
                href="https://wa.me/917278765456"
                target="_blank"
                rel="noopener noreferrer"
                className="text-base sm:text-lg font-extrabold text-emerald-700 dark:text-emerald-300 hover:underline block"
              >
                +91 7278765456
              </a>
              <a
                href="https://wa.me/917278765456"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-500/20 transition-all"
              >
                <span>Start WhatsApp Chat</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Card 3: Email Support */}
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-[hsl(var(--border))] space-y-4 hover:border-[hsl(var(--primary))]/50 transition-all group shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Mail className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold tracking-tight">Email Support</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Send technical requests, invoices, or feedback anytime.
              </p>
            </div>
            <div className="pt-2 space-y-2">
              <a
                href="mailto:support@taped.in"
                className="text-base sm:text-lg font-extrabold text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors block"
              >
                support@taped.in
              </a>
              <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                <Clock className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                <span>Response within 24 hours</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form Section */}
        <ContactForm />

        {/* FAQ Section */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Frequently Asked Questions</h2>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">
              Quick answers to common questions about Taped
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-[hsl(var(--border))] space-y-2">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[hsl(var(--primary))]" /> How much free storage do I get?
              </h4>
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                All users automatically receive 2GB of free storage upon registration with zero setup fees or credit card requirements.
              </p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-[hsl(var(--border))] space-y-2">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[hsl(var(--primary))]" /> How does email access restriction work?
              </h4>
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                You can restrict video playback to specific viewer email addresses. Viewers receive a 6-digit OTP code to verify their identity before viewing.
              </p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-[hsl(var(--border))] space-y-2">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[hsl(var(--primary))]" /> Can I request a refund if I upgrade?
              </h4>
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                Yes! We offer a 7-day money-back guarantee for initial plan upgrades. Contact support@taped.in or call +91 7278765456.
              </p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-[hsl(var(--border))] space-y-2">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[hsl(var(--primary))]" /> How do I cancel my subscription?
              </h4>
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                You can cancel your subscription with 1-click in your account settings. You will retain access until the billing cycle ends.
              </p>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
