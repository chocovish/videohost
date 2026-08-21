"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Play,
  Sparkles,
} from "lucide-react";

export default function LandingHero() {
  return (
    <section className="relative w-full pt-8 sm:pt-14 pb-12 sm:pb-16 overflow-hidden">
      {/* Background Radial Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90vw] max-w-5xl h-96 bg-primary/15 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-48 -right-20 w-80 h-80 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-48 -left-20 w-80 h-80 bg-purple-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Main Hero Header */}
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          {/* Top Announcement Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs sm:text-sm font-extrabold uppercase tracking-wider shadow-xs backdrop-blur-md animate-in fade-in slide-in-from-top-2">
            <Sparkles className="w-4 h-4 text-primary animate-spin [animation-duration:9s]" />
            <span>The All-in-One Video Platform • 2GB Free Cloud Storage</span>
          </div>

          {/* Primary High-Impact Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.08] text-foreground">
            Upload, Record, Organize <br className="hidden sm:inline" />
            <span className="shimmer-text">& Meet in One Place.</span>
          </h1>

          {/* Value Proposition Description */}
          <p className="text-base sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium">
            Everything you need for video: <strong className="text-foreground font-bold">upload or record</strong> in-browser, build <strong className="text-foreground font-bold">continuous playlists</strong>, <strong className="text-foreground font-bold">share selectively</strong> with email OTP verification, and <strong className="text-foreground font-bold">host meetings</strong> with instant recording.
          </p>

          {/* Hero Call to Action Buttons */}
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
              className="w-full sm:w-auto px-7 py-4 border-2 border-primary/50 text-primary font-extrabold text-base rounded-2xl hover:bg-primary/10 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/10 active:scale-95 cursor-pointer bg-background/80 backdrop-blur-sm"
            >
              <Camera className="w-5 h-5" />
              <span>Try Studio Recorder</span>
              <span className="px-2 py-0.5 rounded-md bg-primary text-white text-[10px] uppercase tracking-wider font-black ml-1">
                No Login
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

          {/* Quick Value Proof Checkpoints */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 text-xs sm:text-sm font-bold text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>2GB Free Storage</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>No Credit Card Required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-purple-500" />
              <span>Email OTP Gate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-500" />
              <span>Live Conference Rooms</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
