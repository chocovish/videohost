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
} from "lucide-react";
import PublicHeader from "@/components/PublicHeader";

export const metadata: Metadata = {
  title: "VideoHost — Easily Upload & Share Videos Securely",
  description:
    "Easily upload, record, and share videos with granular email access control and 2GB free storage. Includes developer APIs, webhooks, and a free browser screen recorder.",
  keywords: [
    "video hosting platform",
    "secure video sharing",
    "email access control video",
    "2gb free video hosting",
    "developer video api",
    "video processing webhooks",
    "free screen recorder",
    "hd video streaming",
  ],
  openGraph: {
    title: "VideoHost — Easily Upload & Share Videos Securely",
    description:
      "Host and share videos securely with email access controls, enjoy 2GB free cloud storage, developer APIs & webhooks, plus a free built-in screen recorder.",
    url: "/",
    siteName: "VideoHost",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "VideoHost - Easily Upload & Share Videos",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VideoHost — Easily Upload & Share Videos Securely",
    description:
      "Host and share videos securely with email access controls, enjoy 2GB free cloud storage, developer APIs & webhooks, plus a free built-in screen recorder.",
    images: ["/og-image.png"],
  },
};

export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "VideoHost",
    "url": "https://videohost.app",
    "description":
      "Easily upload, record, and share videos with email access control, 2GB free cloud storage, developer APIs, webhooks, and free screen recorder.",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "All",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] relative overflow-hidden flex flex-col justify-between selection:bg-[hsl(var(--primary))]/30">
      {/* JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Dynamic Lime Glow Background Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] sm:w-[50rem] h-[36rem] sm:h-[50rem] bg-[hsl(var(--primary))] opacity-20 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[20rem] h-[20rem] bg-emerald-500 opacity-15 blur-3xl rounded-full pointer-events-none" />

      {/* Brand Header Navigation with Mobile Responsiveness */}
      <PublicHeader currentPage="home" />

      {/* Hero Section */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-16 text-center relative z-10 space-y-6 sm:space-y-8 my-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/30 text-[hsl(var(--primary))] text-xs sm:text-sm font-bold uppercase tracking-wider shadow-sm animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4" /> Easily Upload, Record & Share Videos
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.15]">
          Dead simple video hosting. <br />
          <span className="text-[hsl(var(--primary))] underline decoration-[hsl(var(--primary))]/40">
            Total control on who can view.
          </span>
        </h1>

        <p className="text-sm sm:text-lg text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto leading-relaxed">
          Host, stream with adaptive resolution, and share videos securely with granular email-based access permissions and 2GB free cloud storage. Includes a free built-in screen & webcam recorder.
        </p>

        {/* Primary Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 pt-2">
          <Link
            href="/auth/register"
            className="w-full sm:w-auto px-8 py-4 bg-[hsl(var(--primary))] text-white font-extrabold text-base rounded-2xl shadow-xl shadow-[hsl(var(--primary))]/20 hover:opacity-95 transition-all flex items-center justify-center gap-2.5 group active:scale-95"
          >
            <span>Start Hosting Free</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/record"
            className="w-full sm:w-auto px-7 py-4 border-2 border-[hsl(var(--primary))]/50 text-[hsl(var(--primary))] font-extrabold text-base rounded-2xl hover:bg-[hsl(var(--primary))]/10 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[hsl(var(--primary))]/10 active:scale-95"
          >
            <Video className="w-5 h-5" />
            <span>Free Studio Recorder</span>
            <span className="px-1.5 py-0.5 rounded-md bg-[hsl(var(--primary))] text-white text-[10px] uppercase tracking-wider font-black ml-1">
              Bonus
            </span>
          </Link>

          <Link
            href="/auth/login"
            className="w-full sm:w-auto px-6 py-4 glass-card font-bold text-base rounded-2xl border border-[hsl(var(--border))] hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            <Play className="w-4 h-4 fill-current text-[hsl(var(--primary))]" />
            <span>Sign In</span>
          </Link>
        </div>

        {/* Quick Feature Pills */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-4 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[hsl(var(--primary))]" />
            <span>2GB Free Cloud Storage</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[hsl(var(--primary))]" />
            <span>Email & Passcode Controls</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[hsl(var(--primary))]" />
            <span>Developer APIs & Webhooks</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[hsl(var(--primary))]" />
            <span>Free Built-in Recorder</span>
          </div>
        </div>

        {/* User-Friendly & SEO Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 text-left">
          {/* Feature 1: 2GB Storage & Hosting */}
          <div className="glass-card p-6 rounded-2xl border border-[hsl(var(--border))] space-y-3 hover:border-[hsl(var(--primary))]/50 transition-colors group shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center group-hover:scale-110 transition-transform">
              <HardDrive className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-lg tracking-tight">Seamless Cloud Video Hosting</h3>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
              Upload and organize all your videos, screen captures, and demos in high quality with 2GB of free cloud hosting space included.
            </p>
          </div>

          {/* Feature 2: Email Access Control */}
          <div className="glass-card p-6 rounded-2xl border border-[hsl(var(--border))] space-y-3 hover:border-[hsl(var(--primary))]/50 transition-colors group shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-lg tracking-tight">Granular Access Control</h3>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
              Take full control over who can view your shared videos. Restrict video playback by email addresses or passcodes so sensitive content stays private.
            </p>
          </div>

          {/* Feature 3: Developer APIs & Webhooks */}
          <div className="glass-card p-6 rounded-2xl border border-[hsl(var(--border))] space-y-3 hover:border-[hsl(var(--primary))]/50 transition-colors group shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Code2 className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-lg tracking-tight">Developer APIs & Webhooks</h3>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
              Easily upload videos programmatically via REST APIs and subscribe to webhooks to get real-time status updates on video processing.
            </p>
          </div>

          {/* Feature 4: Adaptive Resolution Streaming */}
          <div className="glass-card p-6 rounded-2xl border border-[hsl(var(--border))] space-y-3 hover:border-[hsl(var(--primary))]/50 transition-colors group shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-lg tracking-tight">Adaptive Resolution Streaming</h3>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
              Smart multi-bitrate HLS streaming automatically adjusts video resolution to match network conditions, ensuring instant buffer-free playback even on the slowest download speeds.
            </p>
          </div>

          {/* Feature 5: 1-Click Sharing & Embeds */}
          <div className="glass-card p-6 rounded-2xl border border-[hsl(var(--border))] space-y-3 hover:border-[hsl(var(--primary))]/50 transition-colors group shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Share2 className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-lg tracking-tight">Instant Share Links & Embeds</h3>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
              Copy short shareable links in 1-click or embed sleek, custom HTML video players straight into your blog posts, documentation, or websites.
            </p>
          </div>

          {/* Feature 6: Free Screen Recording Studio (Additional Feature) */}
          <div className="glass-card p-6 rounded-2xl border border-[hsl(var(--border))] space-y-3 hover:border-[hsl(var(--primary))]/50 transition-colors group shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-lg tracking-tight">Free Screen Recording Studio</h3>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
              Included free of charge — record your screen with webcam face overlay directly in your browser with zero watermark or software downloads.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[hsl(var(--border))] py-6 text-center text-xs text-[hsl(var(--muted-foreground))] relative z-10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-[hsl(var(--primary))]" />
            <span className="font-bold text-[hsl(var(--foreground))]">VideoHost Platform</span>
            <span>— Easily Upload, Record & Share Videos</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/record" className="hover:text-[hsl(var(--primary))] transition-colors">
              Free Studio Recorder
            </Link>
            <Link href="/auth/login" className="hover:text-[hsl(var(--primary))] transition-colors">
              Sign In
            </Link>
            <Link href="/auth/register" className="hover:text-[hsl(var(--primary))] transition-colors">
              Get Started Free
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
