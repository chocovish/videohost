import type { Metadata } from "next";
import Link from "next/link";
import {
  Video,
  ArrowRight,
  Play,
  Sparkles,
  HardDrive,
  Lock,
  Camera,
  Zap,
  Share2,
  Code2,
  CheckCircle2,
  Users,
  Layers,
  Palette,
  ShieldCheck,
  Radio,
  Tv,
} from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import InteractiveHeroMockup from "@/components/landing/InteractiveHeroMockup";
import LandingFeaturesBento from "@/components/landing/LandingFeaturesBento";
import LandingWorkflow from "@/components/landing/LandingWorkflow";
import LandingComparison from "@/components/landing/LandingComparison";
import LandingUseCases from "@/components/landing/LandingUseCases";
import LandingFaq from "@/components/landing/LandingFaq";
import { FAQ_DATA } from "@/components/landing/faqData";


export const metadata: Metadata = {
  title: "Taped — All-in-One Video Platform: Record, Playlists, Email Gate & Meet",
  description:
    "The one-stop solution for all your video needs. In-browser screen recording studio, curated playlists, granular email access control, WebRTC conference rooms, and 100% white-label customizable share pages with 2GB free storage.",
  keywords: [
    "all in one video platform",
    "free video hosting 2gb",
    "screen recorder online no download",
    "email access control video",
    "custom video playlist embed",
    "white label video share page",
    "video conference webinar",
    "developer video api webhooks",
    "secure private video sharing",
  ],
  alternates: {
    canonical: "https://taped.app",
  },
  openGraph: {
    title: "Taped — All-in-One Video Platform: Record, Playlists, Email Gate & Meet",
    description:
      "Record in-browser, curate playlists, restrict view access strictly by email whitelist, host live webinars, and brand your share pages. Join now with 2GB free cloud storage.",
    url: "https://taped.app",
    siteName: "Taped",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Taped All-in-One Video Platform",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Taped — All-in-One Video Platform",
    description:
      "Record, create playlists, email-gate views, host live webinars, and white-label share pages with 2GB free cloud storage.",
    images: ["/og-image.png"],
  },
};

export default function LandingPage() {
  // Rich Structured JSON-LD Data for SEO
  const jsonLdApp = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Taped",
    "url": "https://taped.app",
    "description":
      "All-in-one video suite: in-browser screen & webcam recorder, playlists, email access control, WebRTC conference rooms, and customizable share pages.",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Web, All",
    "browserRequirements": "Requires HTML5/WebRTC capable modern browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "2GB Free Forever Cloud Storage Tier",
    },
    "featureList": [
      "In-Browser Screen & Webcam Recording Studio",
      "Curated Multi-Video Playlists & Embeddable Player",
      "Granular Selective Email Access Control with One-Time Passcodes",
      "Built-in WebRTC Conference Rooms and Webinars with Cloud Recording",
      "White-Label Branded Video Share Pages with Custom Logo, Banner & CTA",
      "Developer REST APIs & Real-time Webhooks",
      "2GB Free Cloud Storage Included",
    ],
  };

  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQ_DATA.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden flex flex-col justify-between selection:bg-primary/30">
      {/* JSON-LD for Search Engine Microdata */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />

      {/* Dynamic Background Radial Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-180 sm:w-260 h-120 sm:h-180 bg-primary opacity-15 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-[800px] -right-20 w-100 h-100 bg-emerald-500 opacity-10 blur-[100px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-[1800px] -left-20 w-120 h-120 bg-cyan-500 opacity-10 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Brand Header Navigation */}
      <PublicHeader currentPage="home" />

      {/* Hero Section */}
      <main className="w-full flex-1 relative z-10">
        <section className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-12 text-center space-y-8">
          {/* Top Announcement Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs sm:text-sm font-extrabold uppercase tracking-wider shadow-xs animate-in fade-in slide-in-from-top-2">
            <Sparkles className="w-4 h-4 animate-spin [animation-duration:8s]" />
            <span>One-Stop Solution for All Your Video Needs • 2GB Free</span>
          </div>

          {/* Primary High-Impact Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.1] max-w-5xl mx-auto">
            Record, organize, <br className="hidden sm:inline" />
            <span className="shimmer-text">share & meet in one place.</span>
          </h1>

          {/* Value Proposition Description */}
          <p className="text-base sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium">
            The all-in-one video suite with in-browser studio recording, curated playlists, selective email access control, conference rooms, and custom branded share pages.
          </p>

          {/* Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 pt-2">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto px-8 py-4 bg-primary text-white font-black text-base sm:text-lg rounded-2xl shadow-xl shadow-primary/25 hover:opacity-95 hover:scale-[1.02] transition-all flex items-center justify-center gap-2.5 group active:scale-95 cursor-pointer"
            >
              <span>Get Started Free — 2GB Included</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/record"
              className="w-full sm:w-auto px-7 py-4 border-2 border-primary/50 text-primary font-extrabold text-base rounded-2xl hover:bg-primary/10 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/10 active:scale-95 cursor-pointer"
            >
              <Video className="w-5 h-5" />
              <span>Try Studio Recorder</span>
              <span className="px-2 py-0.5 rounded-md bg-primary text-white text-[10px] uppercase tracking-wider font-black ml-1">
                Free
              </span>
            </Link>

            <Link
              href="/auth/login"
              className="w-full sm:w-auto px-6 py-4 glass-card font-bold text-base rounded-2xl border border-border hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-foreground"
            >
              <Play className="w-4 h-4 fill-current text-primary" />
              <span>Sign In</span>
            </Link>
          </div>

          {/* Trust Value Proof Checkpoints */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-3 text-xs sm:text-sm font-bold text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>2GB Free Cloud Storage</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>Email Whitelist & Passcodes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>Curated Playlists & Embeds</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>Video Conference Rooms</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>White Label Share Pages</span>
            </div>
          </div>

          {/* Interactive Hero SaaS Product Showcase */}
          <div className="pt-8 sm:pt-12">
            <InteractiveHeroMockup />
          </div>
        </section>

        {/* Metric Proof / Key Stats Strip */}
        <section className="w-full border-y border-border bg-slate-100/50 dark:bg-slate-900/50 py-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="space-y-1">
                <span className="text-3xl sm:text-4xl font-black text-primary">2 GB</span>
                <p className="text-xs sm:text-sm font-bold text-foreground">Free Storage Included</p>
                <p className="text-[11px] text-muted-foreground">Zero credit card required</p>
              </div>

              <div className="space-y-1">
                <span className="text-3xl sm:text-4xl font-black text-primary">100%</span>
                <p className="text-xs sm:text-sm font-bold text-foreground">In-Browser Recording</p>
                <p className="text-[11px] text-muted-foreground">Screen, audio & camera bubble</p>
              </div>

              <div className="space-y-1">
                <span className="text-3xl sm:text-4xl font-black text-primary">100%</span>
                <p className="text-xs sm:text-sm font-bold text-foreground">White-Label Pages</p>
                <p className="text-[11px] text-muted-foreground">Your logo, banner & CTAs</p>
              </div>

              <div className="space-y-1">
                <span className="text-3xl sm:text-4xl font-black text-primary">0</span>
                <p className="text-xs sm:text-sm font-bold text-foreground">Context Switching</p>
                <p className="text-[11px] text-muted-foreground">Record, host, gate & meet here</p>
              </div>
            </div>
          </div>
        </section>

        {/* 6 Core Pillars Bento Grid */}
        <LandingFeaturesBento />

        {/* 5-Step Visual Workflow */}
        <LandingWorkflow />

        {/* Stack Comparison Matrix */}
        <LandingComparison />

        {/* Persona Use Cases */}
        <LandingUseCases />

        {/* Frequently Asked Questions */}
        <LandingFaq />

        {/* High Converting Bottom CTA Banner */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="rounded-3xl border border-primary/30 bg-linear-to-br from-primary/15 via-slate-900/90 to-slate-950 text-white p-8 sm:p-14 shadow-2xl relative overflow-hidden text-center space-y-6">
            <div className="absolute inset-0 bg-dot-grid opacity-20 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary opacity-25 blur-3xl rounded-full pointer-events-none" />

            <div className="relative z-10 space-y-4 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-lime-400 text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Stop switching between 5 different tools
              </div>

              <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                Join now and get <span className="text-lime-400">2 GB of free storage.</span>
              </h2>

              <p className="text-sm sm:text-lg text-slate-300 font-medium leading-relaxed max-w-2xl mx-auto">
                Record in seconds, host multi-bitrate video, organize playlists, gate by email, and host live conference rooms — all with your custom branding. You never need to step outside of our app.
              </p>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/auth/register"
                className="w-full sm:w-auto px-8 py-4 bg-lime-500 text-black font-black text-base rounded-2xl shadow-xl shadow-lime-500/25 hover:bg-lime-400 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Create Your Free Account</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/record"
                className="w-full sm:w-auto px-7 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-extrabold text-base rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <Video className="w-4 h-4 text-lime-400" />
                <span>Launch Studio Recorder</span>
              </Link>
            </div>

            <div className="relative z-10 pt-2 text-xs text-slate-400 font-semibold">
              <span>Free forever plan • No credit card required • Instant access</span>
            </div>
          </div>
        </section>
      </main>

      {/* Public Footer */}
      <PublicFooter />
    </div>
  );
}
