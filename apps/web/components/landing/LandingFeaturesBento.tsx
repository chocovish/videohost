"use client";

import React from "react";
import Link from "next/link";
import {
  Video,
  Play,
  Layers,
  Lock,
  Users,
  Palette,
  ArrowRight,
  Sparkles,
  Zap,
  ShieldCheck,
  HardDrive,
  Code2,
  Share2,
  CheckCircle2,
  Tv,
  Camera,
  Radio,
  Sliders,
  ExternalLink,
} from "lucide-react";

export default function LandingFeaturesBento() {
  return (
    <section className="w-full py-16 sm:py-24 relative overflow-hidden" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
        {/* Section Title & Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/30 text-[hsl(var(--primary))] text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> All-in-One Video Platform
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[hsl(var(--foreground))]">
            Everything you need for video. <br className="hidden sm:inline" />
            <span className="text-[hsl(var(--primary))]">Zero external tools required.</span>
          </h2>

          <p className="text-base sm:text-lg text-[hsl(var(--muted-foreground))] font-medium leading-relaxed">
            Stop stitching together 5 different tools for recording, hosting, playlisting, gated sharing, and webinars. Taped delivers a state-of-the-art suite in one cohesive dashboard.
          </p>
        </div>

        {/* Bento Grid Layout (6 Core Pillars) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          {/* Card 1: Studio Screen & Webcam Recorder (Spans 7 cols) */}
          <div className="md:col-span-7 rounded-3xl border border-[hsl(var(--border))] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 flex flex-col justify-between space-y-6 glow-card-hover group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[hsl(var(--primary))]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

            <div className="space-y-3 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="w-6 h-6" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] text-[11px] font-black uppercase tracking-wide">
                100% In-Browser • Free Bonus
              </div>
              <h3 className="text-2xl font-black tracking-tight text-[hsl(var(--foreground))]">
                Browser Studio Recorder
              </h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                Capture high-definition screen captures, browser tabs, microphone audio, and webcam bubble overlays directly in your browser. No bloated software or Chrome extensions to install.
              </p>
            </div>

            {/* Visual Mini Mockup */}
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-slate-950 p-4 text-white space-y-3 shadow-lg relative z-10">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="font-mono font-bold text-red-400">REC: 00:04:18</span>
                  <span className="text-[10px] text-slate-400 font-semibold">• 1080p 60fps HD</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold">Auto Cloud Upload</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
                <span className="text-[11px]">Webcam Face Cam Overlay Enabled</span>
                <span className="text-lime-400 font-bold text-[11px]">Zero Watermark</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold text-[hsl(var(--primary))] pt-2">
              <Link href="/record" className="flex items-center gap-1.5 hover:underline">
                <span>Launch Free Studio Recorder</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2: Selective Email Access & Security (Spans 5 cols) */}
          <div className="md:col-span-5 rounded-3xl border border-[hsl(var(--border))] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 flex flex-col justify-between space-y-6 glow-card-hover group relative overflow-hidden">
            <div className="space-y-3 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-black uppercase tracking-wide">
                Email-Gated Whitelist
              </div>
              <h3 className="text-2xl font-black tracking-tight text-[hsl(var(--foreground))]">
                Granular Access Control
              </h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                Take complete ownership of confidentiality. Restrict video viewing by specific email addresses with one-time passcodes, require password protection, or make links public with 1-click.
              </p>
            </div>

            <div className="rounded-2xl border border-[hsl(var(--border))] bg-slate-50 dark:bg-slate-950 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between text-xs font-bold text-[hsl(var(--foreground))]">
                <span>Authorized Audience</span>
                <span className="text-[10px] text-emerald-500 font-extrabold uppercase">Verified Only</span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-[hsl(var(--border))] flex items-center justify-between">
                <span className="font-mono text-[11px] text-[hsl(var(--foreground))]">partner@enterprise.com</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">PIN Gated</span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-[hsl(var(--border))] flex items-center justify-between">
                <span className="font-mono text-[11px] text-[hsl(var(--foreground))]">exec-board@client.io</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">PIN Gated</span>
              </div>
            </div>

            <div className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">
              No unwanted leaks or unauthorized downloads.
            </div>
          </div>

          {/* Card 3: 2GB Free Cloud Storage & Zero Egress (Spans 4 cols) */}
          <div className="md:col-span-4 rounded-3xl border border-[hsl(var(--border))] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 flex flex-col justify-between space-y-6 glow-card-hover group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <HardDrive className="w-6 h-6" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[11px] font-black uppercase tracking-wide">
                2GB Free Cloud Storage
              </div>
              <h3 className="text-xl font-black tracking-tight text-[hsl(var(--foreground))]">
                Generous Cloud Hosting
              </h3>
              <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                Upload, organize, and store your media library with 2GB of free cloud hosting space included. Zero hidden bandwidth egress fees or surprise lockouts.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-[hsl(var(--foreground))]">
                2GB Free Forever
              </span>
              <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-[hsl(var(--foreground))]">
                Zero Egress Fees
              </span>
              <span className="px-2 py-1 rounded-lg bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] text-[11px] font-extrabold">
                Fast S3 Upload
              </span>
            </div>
          </div>

          {/* Card 4: Curated Multi-Video Playlists (Spans 4 cols) */}
          <div className="md:col-span-4 rounded-3xl border border-[hsl(var(--border))] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 flex flex-col justify-between space-y-6 glow-card-hover group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[11px] font-black uppercase tracking-wide">
                Series & Courses
              </div>
              <h3 className="text-xl font-black tracking-tight text-[hsl(var(--foreground))]">
                Playlists & Collections
              </h3>
              <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                Bundle multiple videos into structured courses, product onboarding series, or client deliverable playlists with auto-play sequence and custom ordering.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-[hsl(var(--border))] space-y-1 text-xs">
              <div className="flex items-center justify-between font-bold text-[hsl(var(--foreground))]">
                <span>Course Modules (4 Videos)</span>
                <span className="text-[10px] text-[hsl(var(--primary))]">Embed Ready</span>
              </div>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Share as single URL or iframe player</p>
            </div>
          </div>

          {/* Card 5: Real-Time Conference & Webinars (Spans 4 cols) */}
          <div className="md:col-span-4 rounded-3xl border border-[hsl(var(--border))] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 flex flex-col justify-between space-y-6 glow-card-hover group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[11px] font-black uppercase tracking-wide">
                Lag Free
              </div>
              <h3 className="text-xl font-black tracking-tight text-[hsl(var(--foreground))]">
                Conference & Webinars
              </h3>
              <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                Host live video meetings, collaborative webinars, and customer presentations with screen sharing and automatic cloud recording straight to your video library.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-[hsl(var(--border))] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                <span className="font-bold text-[hsl(var(--foreground))]">Auto-Record Stage</span>
              </div>
              <span className="text-[10px] text-slate-400">1-Click Meeting Link</span>
            </div>
          </div>

          {/* Card 6: 100% White-Label Branded Share Pages (Spans 12 cols) */}
          <div className="md:col-span-12 rounded-3xl border border-[hsl(var(--border))] bg-gradient-to-r from-slate-900 via-zinc-900 to-slate-950 text-white p-6 sm:p-10 flex flex-col lg:flex-row items-center justify-between gap-8 glow-card-hover relative overflow-hidden">
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-lime-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-4 max-w-xl relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-500/20 border border-lime-500/30 text-lime-400 text-xs font-black uppercase tracking-wider">
                <Palette className="w-3.5 h-3.5" /> 100% White-Label Share Experience
              </div>

              <h3 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                Your brand. Your logo. Your colors. <br />
                <span className="text-lime-400">Viewers never leave your ecosystem.</span>
              </h3>

              <p className="text-sm text-slate-300 leading-relaxed">
                Transform standard share links into luxury, fully branded landing pages. Upload your company logo, welcome hero banner, custom call-to-action buttons (like <em>&quot;Book Demo&quot;</em> or <em>&quot;Download Files&quot;</em>), and choose from sleek presets like Obsidian, Cyberpunk, and Vaporwave.
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-200 pt-2">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-lime-400" /> Custom Organization Logo
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-lime-400" /> Welcome Banner Images
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-lime-400" /> Actionable CTA Buttons
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-lime-400" /> Zero Taped Watermark
                </div>
              </div>
            </div>

            {/* Visual Action Box */}
            <div className="w-full lg:w-auto relative z-10 shrink-0">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/15 backdrop-blur-md space-y-4 text-center max-w-sm">
                <span className="text-xs font-black text-lime-400 uppercase tracking-wider block">
                  Free 2GB Cloud Storage Included
                </span>
                <p className="text-sm font-semibold text-slate-200">
                  Ready to elevate your video sharing, hosting, and meeting workflow?
                </p>
                <Link
                  href="/auth/register"
                  className="w-full py-3 px-6 bg-lime-500 text-black font-black text-sm rounded-xl shadow-xl shadow-lime-500/20 hover:bg-lime-400 transition-all flex items-center justify-center gap-2"
                >
                  <span>Start Free Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
