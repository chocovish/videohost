"use client";

import React, { useState } from "react";
import {
  Video,
  UploadCloud,
  Layers,
  Lock,
  Share2,
  Users,
  Sparkles,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const STEPS = [
  {
    step: "01",
    title: "Record or Upload in Seconds",
    desc: "Use our in-browser studio to record your screen & webcam with zero software download, or drag & drop any video file for instant upload.",
    icon: Video,
    highlight: "100% In-Browser HD Recording",
  },
  {
    step: "02",
    title: "Organize into Playlists & Series",
    desc: "Group related tutorials, customer onboarding videos, or course modules into sleek, sequential playlists with custom ordering.",
    icon: Layers,
    highlight: "Embeddable Multi-Video Player",
  },
  {
    step: "03",
    title: "Set Granular Access Permissions",
    desc: "Lock your content to specific email addresses with one-time passcodes, add password protection, set link expiration, or make it public.",
    icon: Lock,
    highlight: "Email Whitelist Security",
  },
  {
    step: "04",
    title: "Host Live Meetings & Webinars",
    desc: "Launch collaborative video conference rooms with screen share, in-room chat, and automated 1-click cloud recording saved to your library.",
    icon: Users,
    highlight: "Video Conference & Webinars",
  },
  {
    step: "05",
    title: "Share with Your Custom Brand",
    desc: "Send luxury branded share links with your logo, custom theme presets, welcome banners, and direct CTA buttons with zero third-party watermark.",
    icon: Share2,
    highlight: "100% White-Label Experience",
  },
];

export default function LandingWorkflow() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  return (
    <section className="w-full py-16 sm:py-24 bg-slate-50/50 dark:bg-slate-950/40 border-y border-border relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> How It Works
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">
            From creation to delivery in 5 simple steps.
          </h2>

          <p className="text-base text-muted-foreground font-medium">
            A frictionless video workflow designed for speed, security, and exceptional branding.
          </p>
        </div>

        {/* Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-stretch">
          {STEPS.map((item, idx) => {
            const Icon = item.icon;
            const isCurrent = activeStepIndex === idx;
            return (
              <div
                key={item.step}
                onClick={() => setActiveStepIndex(idx)}
                className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 group ${isCurrent
                  ? "bg-white dark:bg-slate-900 border-primary ring-2 ring-primary/20 shadow-xl scale-[1.02]"
                  : "bg-white/60 dark:bg-slate-900/40 border-border hover:border-primary/40"
                  }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black font-mono text-primary opacity-80">
                      {item.step}
                    </span>
                    <div
                      className={`p-2.5 rounded-2xl transition-all ${isCurrent
                        ? "bg-primary text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-muted-foreground group-hover:text-primary"
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="text-base font-black text-foreground leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-border">
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-primary flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {item.highlight}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
