"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  KeyRound,
  Layers,
  Mic,
  Monitor,
  Palette,
  Play,
  Radio,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  Volume2,
  Zap,
} from "lucide-react";

interface FeatureStep {
  id: string;
  stepNumber: string;
  tag: string;
  tagColor: string;
  title: string;
  subtitle: string;
  description: string;
  seoKeywords: string[];
  keyHighlights: string[];
  ctaText: string;
  ctaLink: string;
  badge: string;
  icon: React.ElementType;
}

const TIMELINE_STEPS: FeatureStep[] = [
  {
    id: "studio-recorder",
    stepNumber: "01",
    tag: "Studio Recording",
    tagColor: "from-lime-500/20 to-emerald-500/20 text-lime-400 border-lime-500/30",
    title: "In-Browser Screen & Facecam Studio",
    subtitle: "Zero software downloads. Studio-quality screen and webcam capture directly from your browser.",
    description:
      "Capture high-definition 1080p 60fps screen recordings, browser tabs, system audio, and microphone commentary with a movable, customizable webcam bubble overlay. Save directly to your cloud library with zero watermarks.",
    seoKeywords: [
      "in-browser screen recorder",
      "webcam facecam bubble overlay",
      "no download screen capture",
      "free video studio recorder",
    ],
    keyHighlights: [
      "1080p 60fps crystal clear HD capture",
      "Resizable webcam facecam overlay",
      "System audio + microphone noise suppression",
      "Instant 1-click cloud sync & transcoding",
    ],
    ctaText: "Launch Studio Recorder",
    ctaLink: "/record",
    badge: "100% Free • In-Browser",
    icon: Camera,
  },
  {
    id: "playlist-curator",
    stepNumber: "02",
    tag: "Organization & Playlists",
    tagColor: "from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30",
    title: "Smart Curated Multi-Video Playlists",
    subtitle: "Group tutorials, course modules, and customer onboarding series into seamless players.",
    description:
      "Organize standalone videos into ordered, chaptered playlists with customized playback sequences. Generate responsive, distraction-free embed codes for your documentation, LMS, or client portals.",
    seoKeywords: [
      "embeddable video playlist player",
      "multi-video series manager",
      "course video playlist embed",
      "custom video chapter player",
    ],
    keyHighlights: [
      "Sequential multi-video continuous playback",
      "Drag-and-drop playlist reordering",
      "Embeddable responsive iframe player",
      "Total playlist duration & progress tracking",
    ],
    ctaText: "Explore Playlists",
    ctaLink: "/auth/register",
    badge: "Multi-Video Embeds",
    icon: Layers,
  },
  {
    id: "email-security-gate",
    stepNumber: "03",
    tag: "Confidentiality & Access",
    tagColor: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
    title: "Granular Access Control & Email Whitelists",
    subtitle: "Protect private demos and sensitive briefings with one-time passcodes and email gating.",
    description:
      "Lock down video viewing to specific verified corporate email addresses. Viewers receive a temporary 6-digit one-time passcode (OTP) to watch. Optionally enforce master passwords or time-based link expiration.",
    seoKeywords: [
      "email gated video access control",
      "one time passcode video protection",
      "private secure video sharing",
      "whitelisted viewer permissions",
    ],
    keyHighlights: [
      "Strict email domain & user whitelisting",
      "Automated 6-digit OTP verification email",
      "Custom expiration dates & view limits",
      "Detailed view audit logs & instant revocation",
    ],
    ctaText: "Secure Your Content",
    ctaLink: "/auth/register",
    badge: "Email OTP Security",
    icon: ShieldCheck,
  },
  {
    id: "webrtc-conference",
    stepNumber: "04",
    tag: "Live Collaboration",
    tagColor: "from-violet-500/20 to-purple-500/20 text-violet-400 border-violet-500/30",
    title: "WebRTC Conference & Dual-Mode Recording",
    subtitle: "Record the full meeting room grid or isolate individual participants directly to your library.",
    description:
      "Ditch external meeting apps. Host low-latency WebRTC video conference rooms with multi-speaker grids, screen share, in-room chat, and granular cloud recording: capture the entire meeting gallery or record single individual participants as isolated HD tracks.",
    seoKeywords: [
      "record whole meeting or individual person",
      "isolate individual speaker recording",
      "webrtc conference room recording",
      "multi participant cloud video recording",
    ],
    keyHighlights: [
      "Record whole meeting grid OR isolate individual persons",
      "Isolate single participant video & audio tracks",
      "Automated server-side recording with zero CPU lag",
      "Direct auto-save to video library on call finish",
    ],
    ctaText: "Join or Create a Room",
    ctaLink: "/rooms",
    badge: "Full & Solo Recording",
    icon: Users,
  },
  {
    id: "white-label-branding",
    stepNumber: "05",
    tag: "Custom Branding",
    tagColor: "from-pink-500/20 to-rose-500/20 text-pink-400 border-pink-500/30",
    title: "100% White-Label Branded Watch Pages",
    subtitle: "Send luxury, customized video watch pages with your brand logo, colors, and direct CTAs.",
    description:
      "Make every video look like it lives on your own custom domain. Upload custom logos, hero background banners, pick curated color palettes, and insert high-converting call-to-action buttons with zero Taped watermarks.",
    seoKeywords: [
      "white label video share page",
      "custom branded video player",
      "video call to action conversion button",
      "custom domain video hosting",
    ],
    keyHighlights: [
      "Custom logo, banner & color theme switcher",
      "High-converting actionable CTA buttons",
      "Zero third-party branding or forced watermarks",
      "Clean, distraction-free viewer experience",
    ],
    ctaText: "Customize Your Brand",
    ctaLink: "/auth/register",
    badge: "100% White-Label",
    icon: Palette,
  },
  {
    id: "developer-api-cdn",
    stepNumber: "06",
    tag: "Developer & Scale",
    tagColor: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30",
    title: "REST APIs, Webhooks & Global Multi-Bitrate CDN",
    subtitle: "Automate video workflows and stream with adaptive HLS to viewers across the globe.",
    description:
      "Integrate programmatic video uploads, thumbnail generation, playlist management, and real-time webhook event notifications into your own apps. Backed by 2GB free storage and global edge streaming.",
    seoKeywords: [
      "video developer rest api",
      "video webhook event notifications",
      "adaptive bitrate hls streaming",
      "fast global video cdn",
    ],
    keyHighlights: [
      "RESTful API with scoped API keys",
      "Real-time webhook notifications (ready, viewed)",
      "Adaptive multi-bitrate HLS video transcode",
      "2GB free permanent cloud storage included",
    ],
    ctaText: "Read Developer Docs",
    ctaLink: "/auth/register",
    badge: "REST APIs & Webhooks",
    icon: Code2,
  },
];

const THEMES = {
  obsidian: {
    name: "Obsidian",
    bg: "bg-slate-950",
    border: "border-lime-500/40",
    accentText: "text-lime-400",
    accentBg: "bg-lime-500",
    ctaBg: "bg-lime-500 text-black hover:bg-lime-400",
    logo: "⚡ ACME Studio Pro",
  },
  neon: {
    name: "Cyan Cyber",
    bg: "bg-slate-950",
    border: "border-cyan-500/40",
    accentText: "text-cyan-400",
    accentBg: "bg-cyan-500",
    ctaBg: "bg-cyan-500 text-black hover:bg-cyan-400",
    logo: "💠 HyperScale Media",
  },
  ocean: {
    name: "Deep Ocean",
    bg: "bg-slate-950",
    border: "border-sky-500/40",
    accentText: "text-sky-400",
    accentBg: "bg-sky-500",
    ctaBg: "bg-sky-500 text-slate-950 hover:bg-sky-400",
    logo: "🌊 Pacific Agency",
  },
  sunset: {
    name: "Sunset Magenta",
    bg: "bg-slate-950",
    border: "border-pink-500/40",
    accentText: "text-pink-400",
    accentBg: "bg-pink-500",
    ctaBg: "bg-pink-500 text-white hover:bg-pink-400",
    logo: "🌸 Bloom Digital",
  },
};

export default function LandingFeatureTimeline() {
  // Interactive Simulation States
  const [recorderTimer, setRecorderTimer] = useState(134);
  const [isRecordingSim, setIsRecordingSim] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<keyof typeof THEMES>("obsidian");
  const [copiedApi, setCopiedApi] = useState(false);
  const [activeStepTab, setActiveStepTab] = useState<string>("studio-recorder");
  const [meetingRecordMode, setMeetingRecordMode] = useState<"whole" | "individual">("whole");

  useEffect(() => {
    if (!isRecordingSim) return;
    const interval = setInterval(() => {
      setRecorderTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecordingSim]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCopyApi = () => {
    setCopiedApi(true);
    setTimeout(() => setCopiedApi(false), 2000);
  };

  return (
    <section
      id="features-timeline"
      className="w-full py-16 sm:py-28 relative overflow-hidden bg-radial from-slate-900/30 via-background to-background"
      aria-label="Taped Core Features Line Timeline"
    >
      {/* Background Decorative Ambient Flares */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3/4 max-w-4xl h-96 bg-primary/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-2/3 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-[130px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <header className="text-center max-w-3xl mx-auto space-y-4 mb-16 sm:mb-24">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs sm:text-sm font-extrabold uppercase tracking-wider shadow-xs">
            <Sparkles className="w-4 h-4 animate-spin [animation-duration:9s]" />
            <span>Interactive Feature Journey</span>
          </div>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-foreground leading-[1.15]">
            Everything in one continuous flow. <br className="hidden sm:inline" />
            <span className="shimmer-text">Connected from start to finish.</span>
          </h2>

          <p className="text-base sm:text-lg text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
            Follow the journey of modern video: record without apps, curate playlists, lock down access, host conference rooms, and distribute under your custom brand.
          </p>

          {/* Quick Jump Step Navigation Bar */}
          <nav
            aria-label="Feature Steps Jump Bar"
            className="pt-6 flex flex-wrap items-center justify-center gap-2"
          >
            {TIMELINE_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <a
                  key={step.id}
                  href={`#${step.id}`}
                  onClick={() => setActiveStepTab(step.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeStepTab === step.id
                      ? "bg-primary text-white shadow-md shadow-primary/20 scale-105"
                      : "bg-slate-100 dark:bg-slate-900 border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{step.tag}</span>
                </a>
              );
            })}
          </nav>
        </header>

        {/* Timeline Stream Canvas */}
        <div className="relative">
          {/* Central Connecting Glowing Drawn Line (Desktop) */}
          <div className="hidden lg:block absolute left-1/2 top-10 bottom-10 -translate-x-1/2 w-1 pointer-events-none z-0">
            {/* Background Line Track */}
            <div className="w-full h-full bg-linear-to-b from-primary/10 via-primary/30 to-cyan-500/20 rounded-full" />
            {/* Glowing Active Pulse Beam */}
            <div className="absolute inset-0 bg-linear-to-b from-primary via-lime-400 to-cyan-400 opacity-60 rounded-full blur-[2px]" />
          </div>

          {/* Mobile Left-Aligned Connecting Line */}
          <div className="lg:hidden absolute left-5 sm:left-8 top-10 bottom-10 w-1 pointer-events-none z-0">
            <div className="w-full h-full bg-linear-to-b from-primary/30 via-cyan-500/30 to-emerald-500/30 rounded-full" />
            <div className="absolute inset-0 bg-primary/40 rounded-full blur-[2px]" />
          </div>

          {/* Timeline Feature Nodes Grid */}
          <div className="space-y-16 sm:space-y-24">
            {TIMELINE_STEPS.map((step, index) => {
              const isEven = index % 2 === 0;
              const Icon = step.icon;

              return (
                <article
                  key={step.id}
                  id={step.id}
                  className="relative z-10 scroll-mt-28"
                  aria-labelledby={`heading-${step.id}`}
                >
                  {/* Timeline Central Milestone Node (Desktop) */}
                  <div className="hidden lg:flex absolute left-1/2 top-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center z-20">
                    <div className="relative group">
                      {/* Animated Glow Ring */}
                      <div className="absolute -inset-2 bg-linear-to-r from-primary to-cyan-400 rounded-full opacity-60 blur-md group-hover:opacity-100 transition-opacity animate-pulse" />
                      {/* Node Circle Badge */}
                      <div className="relative w-14 h-14 rounded-2xl bg-slate-950 border-2 border-primary text-white flex flex-col items-center justify-center shadow-xl shadow-primary/20 group-hover:scale-110 transition-transform">
                        <span className="text-[10px] font-mono font-black text-primary leading-none">
                          {step.stepNumber}
                        </span>
                        <Icon className="w-4 h-4 text-white mt-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Timeline Mobile Left Node */}
                  <div className="lg:hidden absolute left-5 sm:left-8 top-8 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-20">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border-2 border-primary text-white flex items-center justify-center shadow-md">
                      <span className="text-xs font-mono font-black text-primary">
                        {step.stepNumber}
                      </span>
                    </div>
                  </div>

                  {/* Alternating Content Grid */}
                  <div
                    className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center ${
                      isEven ? "" : "lg:grid-flow-dense"
                    } pl-12 sm:pl-16 lg:pl-0`}
                  >
                    {/* Feature Description & Keyword Specs */}
                    <div
                      className={`space-y-5 ${
                        isEven ? "lg:text-right lg:pr-12" : "lg:col-start-2 lg:text-left lg:pl-12"
                      }`}
                    >
                      {/* Step Tag Pill */}
                      <div
                        className={`flex items-center gap-2 ${
                          isEven ? "lg:justify-end" : "lg:justify-start"
                        }`}
                      >
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black uppercase tracking-wider bg-linear-to-r ${step.tagColor}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{step.tag}</span>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-bold">
                          {step.badge}
                        </span>
                      </div>

                      {/* Main Title */}
                      <h3
                        id={`heading-${step.id}`}
                        className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground leading-snug"
                      >
                        {step.title}
                      </h3>

                      {/* Subtitle / Value Prop */}
                      <p className="text-sm sm:text-base font-semibold text-primary/90">
                        {step.subtitle}
                      </p>

                      {/* Deep Description */}
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>

                      {/* Bullet Highlights */}
                      <ul
                        className={`space-y-2 pt-1 text-xs sm:text-sm font-medium text-foreground ${
                          isEven ? "lg:flex lg:flex-col lg:items-end" : ""
                        }`}
                        aria-label={`${step.title} Highlights`}
                      >
                        {step.keyHighlights.map((highlight, hIdx) => (
                          <li
                            key={hIdx}
                            className={`flex items-center gap-2 ${
                              isEven ? "lg:flex-row-reverse" : ""
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>

                      {/* SEO Tags / Micro Keywords */}
                      <div
                        className={`flex flex-wrap gap-1.5 pt-2 ${
                          isEven ? "lg:justify-end" : "lg:justify-start"
                        }`}
                      >
                        {step.seoKeywords.map((kw, kwIdx) => (
                          <span
                            key={kwIdx}
                            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 border border-border text-muted-foreground text-[10px] font-mono font-medium"
                          >
                            #{kw}
                          </span>
                        ))}
                      </div>

                      {/* Direct CTA Link Button */}
                      <div
                        className={`pt-3 flex items-center ${
                          isEven ? "lg:justify-end" : "lg:justify-start"
                        }`}
                      >
                        <Link
                          href={step.ctaLink}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl font-bold text-xs sm:text-sm border border-primary/30 hover:border-primary transition-all group shadow-xs"
                        >
                          <span>{step.ctaText}</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                    </div>

                    {/* Direct UI Mockup Display (Clean, Standalone, No Outer Wrapper Box) */}
                    <div
                      className={`${
                        isEven ? "lg:pl-12" : "lg:col-start-1 lg:row-start-1 lg:pr-12"
                      }`}
                    >
                      {/* Step 01: Studio Recorder Mockup */}
                      {step.id === "studio-recorder" && (
                        <div className="relative rounded-2xl bg-linear-to-br from-slate-950 via-slate-900 to-black border border-slate-800 p-5 overflow-hidden text-white shadow-2xl min-h-[230px] flex flex-col justify-between group">
                          {/* Ambient Glow */}
                          <div className="absolute top-0 right-0 w-36 h-36 bg-lime-500/10 rounded-full blur-2xl pointer-events-none" />

                          {/* Top Bar with Live Indicator */}
                          <div className="flex items-center justify-between text-xs relative z-10">
                            <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/40 text-red-400 px-2.5 py-1 rounded-full font-mono font-bold">
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                              <span>REC {formatTimer(recorderTimer)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold text-slate-300">
                                1080p 60 FPS
                              </span>
                              <span className="px-2 py-0.5 rounded bg-lime-500/20 text-lime-400 text-[10px] font-bold">
                                Auto-Upload ON
                              </span>
                            </div>
                          </div>

                          {/* Simulated Screen Content & Facecam Overlay */}
                          <div className="my-4 py-4 text-center space-y-1.5 relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-slate-300">
                              <Monitor className="w-3.5 h-3.5 text-lime-400" />
                              <span>Sharing: Entire Screen + System Audio</span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Microphone: Studio Condenser (Active)
                            </p>
                          </div>

                          {/* Webcam Facecam Bubble Overlay */}
                          <div className="absolute bottom-5 right-5 w-20 h-20 rounded-full border-2 border-lime-400 overflow-hidden shadow-2xl bg-linear-to-tr from-slate-800 to-slate-700 flex items-center justify-center z-20">
                            <div className="text-center">
                              <Camera className="w-6 h-6 text-lime-400 mx-auto animate-pulse" />
                              <span className="text-[9px] font-black uppercase text-white">
                                Facecam
                              </span>
                            </div>
                          </div>

                          {/* Bottom Control Dock */}
                          <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs text-slate-300 relative z-10">
                            <div className="flex items-center gap-2">
                              <Volume2 className="w-3.5 h-3.5 text-lime-400" />
                              <div className="flex items-center gap-0.5">
                                <span className="w-1 h-3 bg-lime-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                                <span className="w-1 h-4 bg-lime-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                <span className="w-1 h-2 bg-lime-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                                <span className="w-1 h-5 bg-lime-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsRecordingSim(!isRecordingSim)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isRecordingSim
                                  ? "bg-red-500 text-white hover:bg-red-600"
                                  : "bg-lime-500 text-black hover:bg-lime-400"
                              }`}
                            >
                              {isRecordingSim ? "Pause" : "Resume"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Step 02: Playlists Mockup */}
                      {step.id === "playlist-curator" && (
                        <div className="relative rounded-2xl border border-cyan-500/30 bg-slate-950 p-5 text-white space-y-3 shadow-2xl">
                          <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

                          <div className="flex items-center justify-between pb-2 border-b border-slate-800 relative z-10">
                            <div className="space-y-0.5">
                              <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Product Masterclass Series</span>
                              </h4>
                              <span className="text-[10px] text-slate-400">
                                4 Videos • Total 48 mins • Auto-Next Enabled
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-extrabold">
                              EMBED READY
                            </span>
                          </div>

                          {/* Playlist Items List */}
                          <div className="space-y-2 relative z-10">
                            <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-md bg-cyan-500 text-black text-[10px] font-black flex items-center justify-center">
                                  ▶
                                </span>
                                <div>
                                  <p className="font-bold text-white text-[11px]">
                                    01. Architecture & Platform Overview
                                  </p>
                                  <span className="text-[10px] text-cyan-300">
                                    Playing • 12:40
                                  </span>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">1080p</span>
                            </div>

                            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs opacity-80">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-mono flex items-center justify-center">
                                  02
                                </span>
                                <div>
                                  <p className="font-semibold text-slate-200 text-[11px]">
                                    02. Granular Email Access & Security Gate
                                  </p>
                                  <span className="text-[10px] text-slate-400">Up next • 08:15</span>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">1080p</span>
                            </div>

                            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs opacity-70">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-mono flex items-center justify-center">
                                  03
                                </span>
                                <div>
                                  <p className="font-semibold text-slate-200 text-[11px]">
                                    03. Live WebRTC Conference Setup
                                  </p>
                                  <span className="text-[10px] text-slate-400">14:02</span>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">1080p</span>
                            </div>
                          </div>

                          {/* Embed Preview Tag */}
                          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 flex items-center justify-between relative z-10">
                            <span>&lt;iframe src=&quot;https://taped.app/embed/p/masterclass&quot;&gt;&lt;/iframe&gt;</span>
                            <span className="text-cyan-400 font-bold">Copy</span>
                          </div>
                        </div>
                      )}

                      {/* Step 03: Security & Access Gate Mockup */}
                      {step.id === "email-security-gate" && (
                        <div className="relative rounded-2xl border border-emerald-500/30 bg-slate-950 p-5 text-white space-y-3.5 shadow-2xl">
                          <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                          <div className="flex items-center justify-between pb-2 border-b border-slate-800 relative z-10">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-5 h-5 text-emerald-400" />
                              <div>
                                <h4 className="text-xs font-bold text-white">
                                  Confidential Q3 Executive Briefing
                                </h4>
                                <span className="text-[10px] text-emerald-400 font-bold">
                                  ● Email Whitelist Active (3 Whitelisted)
                                </span>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-black">
                              PIN GATED
                            </span>
                          </div>

                          {/* Whitelist Tags */}
                          <div className="space-y-1.5 relative z-10">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                              Authorized Viewers:
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <span className="px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-400" />
                                investor.lead@sequoia.com
                              </span>
                              <span className="px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-400" />
                                cfo@enterprise-corp.io
                              </span>
                            </div>
                          </div>

                          {/* Viewer OTP Simulation Box */}
                          <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-2 relative z-10">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-200 flex items-center gap-1">
                                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                                Viewer 6-Digit One-Time Code:
                              </span>
                              <span className="text-[10px] text-emerald-400 font-bold">
                                Sent via Email
                              </span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              {["8", "4", "2", "9", "0", "1"].map((num, nIdx) => (
                                <div
                                  key={nIdx}
                                  className="w-8 h-9 rounded-lg bg-slate-950 border border-emerald-500/60 text-emerald-400 font-mono font-black text-sm flex items-center justify-center shadow-xs"
                                >
                                  {num}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 04: WebRTC Conference Room Mockup with Whole vs Individual Record Switcher */}
                      {step.id === "webrtc-conference" && (
                        <div className="space-y-3">
                          {/* Recording Mode Interactive Selector */}
                          <div className="flex items-center justify-between gap-1 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-border">
                            <button
                              type="button"
                              onClick={() => setMeetingRecordMode("whole")}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                meetingRecordMode === "whole"
                                  ? "bg-violet-600 text-white shadow-md scale-[1.02]"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>Record Whole Meeting</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setMeetingRecordMode("individual")}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                meetingRecordMode === "individual"
                                  ? "bg-violet-600 text-white shadow-md scale-[1.02]"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <User className="w-3.5 h-3.5" />
                              <span>Record Individual Person</span>
                            </button>
                          </div>

                          {/* Meeting Room Standalone Card */}
                          <div className="relative rounded-2xl border border-violet-500/30 bg-slate-950 p-5 text-white space-y-3.5 shadow-2xl transition-all">
                            <div className="absolute top-0 right-0 w-36 h-36 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

                            <div className="flex items-center justify-between pb-2 border-b border-slate-800 relative z-10">
                              <div className="flex items-center gap-2">
                                <Radio className="w-4 h-4 text-violet-400 animate-pulse" />
                                <div>
                                  <h4 className="text-xs font-bold text-white">
                                    Room: taped.app/meet/sync-alpha
                                  </h4>
                                  <span className="text-[10px] text-slate-400">
                                    48 Participants • LiveKit WebRTC Mesh
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-full text-[10px] font-bold animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                <span>
                                  {meetingRecordMode === "whole"
                                    ? "REC: FULL ROOM GRID"
                                    : "REC: SOLO (ALEX R.)"}
                                </span>
                              </div>
                            </div>

                            {/* Participant Feeds Grid */}
                            <div className="grid grid-cols-2 gap-2 relative z-10">
                              {/* Participant 1: Alex R. */}
                              <div
                                className={`relative rounded-xl p-3 h-28 flex flex-col justify-between overflow-hidden transition-all ${
                                  meetingRecordMode === "individual"
                                    ? "bg-violet-950/50 border-2 border-violet-400 ring-2 ring-violet-500/30 shadow-lg shadow-violet-500/20"
                                    : "bg-slate-900 border-2 border-violet-500/80 shadow-md"
                                }`}
                              >
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="font-bold text-violet-300">Alex R. (Host)</span>
                                  <span className="px-1.5 py-0.5 rounded bg-violet-500/30 text-violet-200 text-[9px] font-extrabold">
                                    {meetingRecordMode === "individual" ? "🎯 Targeted Track" : "Speaking"}
                                  </span>
                                </div>
                                <div className="w-9 h-9 rounded-full bg-violet-600 text-white font-bold text-xs flex items-center justify-center mx-auto shadow-md">
                                  AR
                                </div>
                                <div className="text-[9px] text-slate-300 flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                    <Mic className="w-2.5 h-2.5 text-lime-400" />
                                    <span>Active Mic</span>
                                  </div>
                                  <span className="text-lime-400 font-bold text-[9px]">1080p 60fps</span>
                                </div>
                              </div>

                              {/* Participant 2: Elena K. */}
                              <div
                                className={`relative rounded-xl p-3 h-28 flex flex-col justify-between overflow-hidden transition-all ${
                                  meetingRecordMode === "individual"
                                    ? "bg-slate-900/40 border border-slate-800/80 opacity-50"
                                    : "bg-slate-900 border border-slate-800"
                                }`}
                              >
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="font-bold text-slate-300">Elena K.</span>
                                  <span className="text-[9px] text-slate-500">
                                    {meetingRecordMode === "individual" ? "Excluded" : "Muted"}
                                  </span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-cyan-700 text-white font-bold text-xs flex items-center justify-center mx-auto">
                                  EK
                                </div>
                                <div className="text-[9px] text-slate-500 flex items-center justify-between">
                                  <span>Participant</span>
                                  <span>{meetingRecordMode === "individual" ? "Off Track" : "In Grid"}</span>
                                </div>
                              </div>
                            </div>

                            {/* Mode Notification Pill */}
                            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[10px] text-slate-300 flex items-center justify-between relative z-10">
                              <span>
                                {meetingRecordMode === "whole"
                                  ? "🌐 Capturing all 48 video feeds & screen shares into one composite stream."
                                  : "🎯 Isolating Alex R.'s dedicated feed for clean, individual keynote & interview cuts."}
                              </span>
                              <span className="text-violet-400 font-black shrink-0 ml-2">Auto-Save ON</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 05: White-Label Branded Watch Page Mockup */}
                      {step.id === "white-label-branding" && (
                        <div className="space-y-3">
                          {/* Theme Selector Pills */}
                          <div className="flex items-center justify-between gap-1 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-border">
                            {(Object.keys(THEMES) as (keyof typeof THEMES)[]).map((themeKey) => (
                              <button
                                key={themeKey}
                                type="button"
                                onClick={() => setSelectedTheme(themeKey)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  selectedTheme === themeKey
                                    ? "bg-primary text-white shadow-xs scale-105"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {THEMES[themeKey].name}
                              </button>
                            ))}
                          </div>

                          {/* Branded Watch Page Standalone Card */}
                          <div
                            className={`rounded-2xl border ${THEMES[selectedTheme].border} ${THEMES[selectedTheme].bg} p-5 text-white space-y-4 shadow-2xl transition-all`}
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-white/10">
                              <span className="font-extrabold text-sm tracking-tight text-white">
                                {THEMES[selectedTheme].logo}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
                                custom.yourdomain.com
                              </span>
                            </div>

                            <div className="space-y-2">
                              <div className="h-28 rounded-xl bg-linear-to-tr from-slate-900 via-slate-800 to-black border border-white/10 flex flex-col items-center justify-center space-y-1 relative">
                                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                                  <Play className="w-4 h-4 fill-white ml-0.5" />
                                </div>
                                <span className="text-[11px] font-bold text-slate-200">
                                  Client Case Study & Onboarding
                                </span>
                                <span className="text-[9px] text-slate-400">Zero Taped Watermarks</span>
                              </div>

                              <div className="flex items-center justify-between pt-1">
                                <span className="text-xs font-bold text-slate-300">
                                  Ready to get started?
                                </span>
                                <button
                                  type="button"
                                  className={`px-4 py-2 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer ${THEMES[selectedTheme].ctaBg}`}
                                >
                                  Book Strategy Call ➔
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 06: Developer API Console Mockup */}
                      {step.id === "developer-api-cdn" && (
                        <div className="relative rounded-2xl border border-amber-500/30 bg-slate-950 p-5 text-white space-y-3 shadow-2xl font-mono text-xs">
                          <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] relative z-10">
                            <div className="flex items-center gap-2 text-amber-400 font-bold">
                              <Code2 className="w-4 h-4" />
                              <span>POST /api/v1/videos/upload</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleCopyApi}
                              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-800 cursor-pointer"
                            >
                              {copiedApi ? (
                                <>
                                  <Check className="w-3 h-3 text-lime-400" />
                                  <span className="text-lime-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy cURL</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="bg-slate-900/90 rounded-xl p-3 text-[11px] text-slate-300 leading-relaxed overflow-x-auto relative z-10">
                            <span className="text-amber-400 font-bold">curl</span> -X POST
                            https://taped.app/api/v1/videos \<br />
                            &nbsp;&nbsp;-H <span className="text-cyan-300">&quot;Authorization: Bearer tp_live_99f2x...&quot;</span> \<br />
                            &nbsp;&nbsp;-F <span className="text-emerald-300">&quot;file=@demo.mp4&quot;</span> \<br />
                            &nbsp;&nbsp;-F <span className="text-emerald-300">&quot;isEmailGated=true&quot;</span>
                          </div>

                          {/* Real-time Webhook Event Preview */}
                          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1 relative z-10">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <Zap className="w-3 h-3" /> webhook: &quot;video.ready&quot;
                              </span>
                              <span className="text-slate-400">200 OK • 18ms</span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono">
                              HLS Transcode 1080p/720p/480p complete. Ready for global CDN streaming.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
