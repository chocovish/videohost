"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Briefcase,
  Code2,
  Presentation,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const PERSONAS = [
  {
    id: "creators",
    title: "Course Creators & Educators",
    icon: GraduationCap,
    headline: "Deliver high-definition video courses with zero buffering and embeddable playlists.",
    benefits: [
      "Organize tutorials and series into sequential multi-video playlists",
      "Seamless high-speed video playback across desktop, tablet, and mobile devices",
      "Embed video players directly inside LMS platforms, Notion, and websites",
      "Apply custom branding colors and logos to match your academy style",
    ],
    ctaText: "Start Building Courses Free",
    ctaLink: "/auth/register",
  },
  {
    id: "sales",
    title: "Sales & Client Success Teams",
    icon: Briefcase,
    headline: "Close deals faster with personalized video messages and gated confidentiality.",
    benefits: [
      "Record quick screen + webcam proposals in 1-click without leaving browser",
      "Restrict viewing permissions strictly to prospect email domains",
      "Direct prospects with an embedded 'Book a Meeting' call-to-action button",
      "Track when prospects open and view your video pitches",
    ],
    ctaText: "Record Your First Pitch",
    ctaLink: "/record",
  },
  {
    id: "engineering",
    title: "Product & Engineering Teams",
    icon: Code2,
    headline: "Speed up reviews and automate video workflows with developer APIs & webhooks.",
    benefits: [
      "Upload media programmatically via standard REST API endpoints",
      "Receive real-time webhooks for upload and processing completion",
      "Record bug walkthroughs with microphone audio and screen draw tools",
      "Integrate custom video playback into web apps via clean iframe embeds",
    ],
    ctaText: "Explore Developer Docs",
    ctaLink: "/auth/register",
  },
  {
    id: "coaches",
    title: "Coaches, Consultants & Event Hosts",
    icon: Presentation,
    headline: "Host live interactive webinars and distribute branded replays seamlessly.",
    benefits: [
      "Crystal-clear WebRTC video conference rooms with screen sharing",
      "Automated cloud recording immediately saved to your video library",
      "Send password or email-protected replay links to attendees",
      "Keep 100% of viewer attention with zero third-party ads or watermarks",
    ],
    ctaText: "Host Your First Webinar",
    ctaLink: "/auth/register",
  },
];

export default function LandingUseCases() {
  const [activePersona, setActivePersona] = useState(PERSONAS[0]);

  return (
    <section className="w-full py-16 sm:py-24 relative overflow-hidden" id="use-cases">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Tailored Use Cases
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">
            Built for modern teams & ambitious creators.
          </h2>

          <p className="text-base text-muted-foreground font-medium">
            Discover how diverse industries use Taped to record, protect, stream, and monetize video.
          </p>
        </div>

        {/* Persona Tabs Navigation */}
        <div className="w-full max-w-4xl mx-auto p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-border overflow-x-auto">
          <div className="flex items-center justify-start md:justify-center gap-1.5 min-w-max md:min-w-0 md:grid md:grid-cols-4 md:w-full">
            {PERSONAS.map((p) => {
              const Icon = p.icon;
              const isSelected = activePersona.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setActivePersona(p)}
                  className={`py-3 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap text-center ${
                    isSelected
                      ? "bg-white dark:bg-slate-950 text-foreground shadow-md border border-primary/30 ring-1 ring-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-primary" : ""}`} />
                  <span className="truncate">{p.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Persona Showcase Card */}
        <div className="rounded-3xl border border-border bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-10 shadow-2xl max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-8 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/15 text-primary text-xs font-black">
                {activePersona.title}
              </div>

              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-foreground leading-snug">
                {activePersona.headline}
              </h3>

              <ul className="space-y-3 pt-2">
                {activePersona.benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs sm:text-sm text-muted-foreground font-medium">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-4 flex flex-col justify-center items-center md:items-start p-6 rounded-2xl bg-primary/10 border border-primary/20 space-y-4 text-center md:text-left">
              <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                Ready to level up?
              </span>
              <p className="text-xs text-foreground font-bold">
                Get started today with 2GB free cloud storage included.
              </p>
              <Link
                href={activePersona.ctaLink}
                className="w-full py-3 px-4 bg-primary text-white font-extrabold text-xs rounded-xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <span>{activePersona.ctaText}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
