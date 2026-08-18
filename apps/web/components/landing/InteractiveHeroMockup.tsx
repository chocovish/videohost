"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Video,
  Play,
  Pause,
  Sliders,
  ShieldCheck,
  Users,
  Layers,
  Palette,
  Sparkles,
  Lock,
  Mail,
  Plus,
  Trash2,
  CheckCircle2,
  Share2,
  Maximize2,
  Volume2,
  Mic,
  Settings,
  Flame,
  Radio,
  Eye,
  ArrowRight,
  Monitor,
  Disc,
  ExternalLink,
  Zap,
} from "lucide-react";

type TabKey = "recorder" | "playlist" | "security" | "webinar" | "branding";

const TABS: { id: TabKey; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: "recorder", label: "Studio Recorder", icon: Video, badge: "In-Browser" },
  { id: "security", label: "Email Access & Gate", icon: Lock, badge: "Selective" },
  { id: "playlist", label: "Playlist Manager", icon: Layers, badge: "Multi-Video" },
  { id: "webinar", label: "Conference & Webinar", icon: Users, badge: "LiveKit" },
  { id: "branding", label: "Custom Share Pages", icon: Palette, badge: "White-Label" },
];

export default function InteractiveHeroMockup() {
  const [activeTab, setActiveTab] = useState<TabKey>("recorder");

  // Recorder Simulation State
  const [isRecording, setIsRecording] = useState(true);
  const [cameraSize, setCameraSize] = useState<"sm" | "md" | "lg">("md");
  const [micActive, setMicActive] = useState(true);
  const [recordTimer, setRecordTimer] = useState(148);

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setRecordTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Security Simulation State
  const [emailInput, setEmailInput] = useState("");
  const [allowedEmails, setAllowedEmails] = useState<string[]>([
    "sarah.director@acmecorp.com",
    "investor.lead@venturecap.io",
    "engineering-review@client.org",
  ]);
  const [passcodeEnabled, setPasscodeEnabled] = useState(true);
  const [expirationEnabled, setExpirationEnabled] = useState(false);

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    if (!allowedEmails.includes(emailInput.trim())) {
      setAllowedEmails([...allowedEmails, emailInput.trim()]);
    }
    setEmailInput("");
  };

  const handleRemoveEmail = (target: string) => {
    setAllowedEmails(allowedEmails.filter((email) => email !== target));
  };


  // Webinar Simulation State
  const [isWebinarRecording, setIsWebinarRecording] = useState(true);
  const [activeSpeaker, setActiveSpeaker] = useState("Alex Rivers (Host)");
  const [participantCount, setParticipantCount] = useState(48);

  // Branding Simulation State
  const [brandTheme, setBrandTheme] = useState<"obsidian" | "cyberpunk" | "vaporwave" | "ocean">("obsidian");
  const [brandAccent, setBrandAccent] = useState("#84cc16");
  const [brandTitle, setBrandTitle] = useState("Acme Studio Masterclass");
  const [brandCtaText, setBrandCtaText] = useState("Book Strategy Call");

  const THEME_STYLES = {
    obsidian: {
      bg: "from-slate-950 via-zinc-900 to-black",
      card: "bg-slate-900/90 border-lime-500/30",
      accent: "#84cc16",
      badge: "bg-lime-500/20 text-lime-400 border-lime-500/40",
      btn: "bg-lime-500 text-black hover:bg-lime-400",
    },
    cyberpunk: {
      bg: "from-slate-950 via-cyan-950 to-slate-900",
      card: "bg-cyan-950/60 border-cyan-500/40",
      accent: "#06b6d4",
      badge: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40",
      btn: "bg-cyan-500 text-black hover:bg-cyan-400",
    },
    vaporwave: {
      bg: "from-purple-950 via-pink-950 to-slate-950",
      card: "bg-purple-950/60 border-pink-500/40",
      accent: "#ec4899",
      badge: "bg-pink-500/20 text-pink-400 border-pink-500/40",
      btn: "bg-pink-500 text-white hover:bg-pink-400",
    },
    ocean: {
      bg: "from-sky-950 via-blue-950 to-slate-950",
      card: "bg-blue-950/60 border-sky-500/40",
      accent: "#38bdf8",
      badge: "bg-sky-500/20 text-sky-400 border-sky-500/40",
      btn: "bg-sky-500 text-slate-950 hover:bg-sky-400",
    },
  };

  return (
    <div className="w-full max-w-5xl mx-auto rounded-3xl border border-[hsl(var(--border))] bg-white/70 dark:bg-slate-950/80 backdrop-blur-2xl shadow-2xl overflow-hidden transition-all">
      {/* Top Header Bar / Mac Window Chrome */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-4 sm:px-6 py-3 border-b border-[hsl(var(--border))] bg-slate-100/70 dark:bg-slate-900/80 gap-3">
        {/* Window controls & Live Simulator badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shadow-xs" />
            <span className="w-3 h-3 rounded-full bg-amber-400 inline-block shadow-xs" />
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-xs" />
          </div>
          <div className="flex items-center gap-2 pl-2">
            <span className="text-xs font-black uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Interactive Product Demo
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/30 text-[hsl(var(--primary))] text-[10px] font-extrabold animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))]" />
              Live Interactive
            </span>
          </div>
        </div>

        {/* Free Storage Value Counter */}
        <div className="flex items-center gap-2 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
          <span className="px-2.5 py-1 rounded-lg bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> 2GB Free Cloud Storage
          </span>
          <span className="hidden md:inline text-[11px] text-[hsl(var(--muted-foreground))]">• No external tools needed</span>
        </div>
      </div>

      {/* Feature Selector Tabs */}
      <div className="p-2 sm:p-3 bg-slate-50/90 dark:bg-slate-900/60 border-b border-[hsl(var(--border))] overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isCurrent = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${isCurrent
                    ? "bg-[hsl(var(--primary))] text-white shadow-md shadow-[hsl(var(--primary))]/25 ring-2 ring-[hsl(var(--primary))]/20"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isCurrent ? "text-white" : "text-[hsl(var(--primary))]"}`} />
                <span>{t.label}</span>
                {t.badge && (
                  <span
                    className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-md font-extrabold ${isCurrent ? "bg-white/20 text-white" : "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                      }`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Stage Area */}
      <div className="p-4 sm:p-6 min-h-[380px] sm:min-h-[420px] flex items-center justify-center bg-radial from-slate-900/5 via-transparent to-transparent">
        {/* ========================================================= */}
        {/* TAB 1: STUDIO RECORDER MOCKUP                             */}
        {/* ========================================================= */}
        {activeTab === "recorder" && (
          <div className="w-full max-w-3xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="relative rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-950 to-slate-900 text-white p-5 shadow-2xl overflow-hidden min-h-[280px] flex flex-col justify-between">
              {/* Simulated Desktop Screen Recording Background */}
              <div className="absolute inset-0 bg-dot-grid opacity-25 pointer-events-none" />

              {/* Recorder Top Controls HUD */}
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${isRecording ? "bg-red-500 animate-ping" : "bg-slate-500"
                      }`}
                  />
                  <span className="text-xs font-mono font-bold tracking-wider">
                    {isRecording ? `REC: ${formatTimer(recordTimer)}` : "STANDBY"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold border-l border-white/20 pl-2">
                    1080p 60fps • Zero Lag
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 text-xs">
                    <Monitor className="w-3.5 h-3.5 text-lime-400" />
                    <span className="text-[11px] font-medium text-slate-300">Entire Screen + System Audio</span>
                  </div>
                </div>
              </div>

              {/* Center Screen Preview Graphics */}
              <div className="flex-1 flex items-center justify-center my-4 relative z-10">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center max-w-sm space-y-2">
                  <p className="text-xs text-lime-400 font-extrabold uppercase tracking-wider">
                    🎙️ Direct Browser Recording Studio
                  </p>
                  <p className="text-sm font-bold text-slate-100">
                    No software download or extensions needed. Capture screen, microphone audio & camera overlay in 1-click.
                  </p>
                </div>
              </div>

              {/* Camera Bubble Overlay (Draggable & Resizable Simulator) */}
              <div
                className={`absolute bottom-16 right-5 rounded-full border-2 border-lime-400 shadow-2xl overflow-hidden bg-slate-800 transition-all z-20 flex items-center justify-center group ${cameraSize === "sm"
                    ? "w-16 h-16"
                    : cameraSize === "md"
                      ? "w-24 h-24 sm:w-28 sm:h-28"
                      : "w-32 h-32 sm:w-36 sm:h-36"
                  }`}
              >
                <div className="relative w-full h-full bg-gradient-to-tr from-lime-600 via-emerald-700 to-slate-900 flex items-center justify-center text-white">
                  <div className="text-center">
                    <span className="text-lg sm:text-2xl">👨‍💻</span>
                    <span className="block text-[8px] font-bold uppercase tracking-tight text-lime-200">You (Webcam)</span>
                  </div>
                </div>
              </div>

              {/* Bottom Interactive HUD Controls */}
              <div className="flex items-center justify-between relative z-10 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2">
                  {/* Start / Pause button */}
                  <button
                    onClick={() => setIsRecording(!isRecording)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${isRecording
                        ? "bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30"
                        : "bg-lime-500 text-black font-extrabold hover:bg-lime-400"
                      }`}
                  >
                    {isRecording ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isRecording ? "Pause" : "Record"}</span>
                  </button>

                  {/* Mic Audio Meter Indicator */}
                  <button
                    onClick={() => setMicActive(!micActive)}
                    className={`p-2 rounded-xl text-xs border transition-all cursor-pointer flex items-center gap-1.5 ${micActive
                        ? "border-lime-500/40 text-lime-400 bg-lime-500/10"
                        : "border-slate-700 text-slate-400 bg-slate-800"
                      }`}
                    title="Toggle Microphone"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    {micActive && (
                      <div className="flex items-center gap-0.5 h-3">
                        <span className="w-0.5 h-2 bg-lime-400 rounded-full animate-bounce" />
                        <span className="w-0.5 h-3 bg-lime-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                        <span className="w-0.5 h-1.5 bg-lime-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      </div>
                    )}
                  </button>
                </div>

                {/* Webcam Bubble Size Controller */}
                <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-400 font-bold px-1 hidden sm:inline">Cam Size:</span>
                  {(["sm", "md", "lg"] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setCameraSize(size)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${cameraSize === size
                          ? "bg-lime-500 text-black font-extrabold"
                          : "text-slate-400 hover:text-white"
                        }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Feature Description Footnote */}
            <div className="flex flex-wrap items-center justify-between text-xs text-[hsl(var(--muted-foreground))] font-semibold px-2">
              <span className="flex items-center gap-1.5 text-[hsl(var(--primary))] font-bold">
                <CheckCircle2 className="w-4 h-4" /> Instant automated upload to your 2GB cloud library
              </span>
              <span>Available on Chrome, Edge, Brave, Firefox & Safari</span>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: EMAIL ACCESS CONTROL & SECURITY MOCKUP               */}
        {/* ========================================================= */}
        {activeTab === "security" && (
          <div className="w-full max-w-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-lime-500/15 text-[hsl(var(--primary))]">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[hsl(var(--foreground))]">
                      Granular Email-Based Sharing & Access Control
                    </h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Only verified recipients can unlock and stream this video
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Restricted Mode Active
                </span>
              </div>

              {/* Add Email Form */}
              <form onSubmit={handleAddEmail} className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Enter email to grant playback access (e.g. client@corp.com)..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[hsl(var(--border))] bg-slate-50 dark:bg-slate-950 text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[hsl(var(--primary))] text-white text-xs font-bold rounded-xl shadow-md hover:opacity-90 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Grant Access</span>
                </button>
              </form>

              {/* Active Whitelisted Emails List */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">
                  Authorized Viewers ({allowedEmails.length})
                </span>

                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {allowedEmails.map((email) => (
                    <div
                      key={email}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-[hsl(var(--border))] text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="font-semibold text-[hsl(var(--foreground))]">{email}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-lime-500/15 text-[hsl(var(--primary))] font-bold">
                          1-Time Passcode Auth
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveEmail(email)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                        title="Revoke Access"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Switches */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[hsl(var(--border))]">
                <div
                  onClick={() => setPasscodeEnabled(!passcodeEnabled)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${passcodeEnabled
                      ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5"
                      : "border-[hsl(var(--border))] opacity-75"
                    }`}
                >
                  <div>
                    <span className="font-bold text-[hsl(var(--foreground))] block">Require 6-Digit PIN</span>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Emailed upon stream request</span>
                  </div>
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${passcodeEnabled ? "bg-[hsl(var(--primary))] text-white border-transparent" : "border-slate-400"
                      }`}
                  >
                    {passcodeEnabled && <CheckCircle2 className="w-3 h-3" />}
                  </span>
                </div>

                <div
                  onClick={() => setExpirationEnabled(!expirationEnabled)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${expirationEnabled
                      ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5"
                      : "border-[hsl(var(--border))] opacity-75"
                    }`}
                >
                  <div>
                    <span className="font-bold text-[hsl(var(--foreground))] block">Auto-Expire Link</span>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Disable access after 7 days</span>
                  </div>
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${expirationEnabled ? "bg-[hsl(var(--primary))] text-white border-transparent" : "border-slate-400"
                      }`}
                  >
                    {expirationEnabled && <CheckCircle2 className="w-3 h-3" />}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: CONFERENCE ROOM & WEBINAR MOCKUP                   */}
        {/* ========================================================= */}
        {activeTab === "webinar" && (
          <div className="w-full max-w-3xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="rounded-2xl border border-slate-700/60 bg-slate-950 text-white p-4 sm:p-5 shadow-2xl space-y-3">
              {/* Webinar Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1.5">
                    <Radio className="w-4 h-4 animate-pulse text-red-500" />
                    <span className="text-xs font-black uppercase tracking-wider">LIVE WEBINAR</span>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-100">Global Product Keynote & Strategy 2026</h3>
                    <p className="text-[11px] text-slate-400">WebRTC crystal-clear audio/video powered by LiveKit</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsWebinarRecording(!isWebinarRecording)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${isWebinarRecording
                        ? "bg-red-500/20 text-red-400 border border-red-500/40"
                        : "bg-slate-800 text-slate-400"
                      }`}
                  >
                    <Disc className={`w-3.5 h-3.5 ${isWebinarRecording ? "animate-spin" : ""}`} />
                    <span>{isWebinarRecording ? "Cloud Recording ON" : "Record Off"}</span>
                  </button>

                  <span className="px-2.5 py-1 rounded-xl bg-white/10 text-xs font-semibold flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-lime-400" /> {participantCount} Viewers
                  </span>
                </div>
              </div>

              {/* Conference Grid Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 min-h-[200px]">
                {/* Main Presenter / Screen Share View (Spans 2 cols) */}
                <div className="sm:col-span-2 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 border border-white/10 p-3 relative overflow-hidden flex flex-col justify-between aspect-video sm:aspect-auto">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-lime-400 flex items-center gap-1">
                      <Monitor className="w-3 h-3" /> Screen Share: Figma Prototype
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">1080p 60fps WebRTC</span>
                  </div>

                  <div className="flex items-center justify-center my-4">
                    <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-center max-w-xs">
                      <p className="text-xs font-bold text-slate-200">📊 Q3 Revenue & Product Demo Deck</p>
                      <p className="text-[10px] text-slate-400">Live synchronized viewport across all participants</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-bold text-[11px] text-white">Alex Rivers (Host & Speaker)</span>
                    <span className="text-lime-400 text-[10px] font-bold flex items-center gap-1">
                      <Mic className="w-3 h-3" /> Speaking
                    </span>
                  </div>
                </div>

                {/* Side Participant Tiles */}
                <div className="space-y-2 flex flex-col justify-between">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                        EM
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-100 block">Elena Miller</span>
                        <span className="text-[10px] text-slate-400">Co-Host</span>
                      </div>
                    </div>
                    <Mic className="w-3 h-3 text-lime-400" />
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
                        DK
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-100 block">David Kim</span>
                        <span className="text-[10px] text-slate-400">Panelist</span>
                      </div>
                    </div>
                    <Mic className="w-3 h-3 text-slate-500" />
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/5 border border-dashed border-white/20 text-center">
                    <span className="text-[11px] font-semibold text-slate-300 block">+45 more attendees</span>
                    <span className="text-[10px] text-lime-400">Auto-saved to video library upon end</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: PLAYLIST & CURRICULUM MANAGER MOCKUP               */}
        {/* ========================================================= */}
        {activeTab === "playlist" && (
          <div className="w-full max-w-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[hsl(var(--foreground))]">
                      Full-Stack Video Masterclass (Playlist)
                    </h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      4 Episodes • Total Duration: 48 mins • Public Embed Link
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] text-xs font-bold">
                  Autoplay Next
                </span>
              </div>

              {/* Playlist Items Queue */}
              <div className="space-y-2">
                {[
                  { id: 1, title: "Module 1: Getting Started & Screen Studio Setup", duration: "12:45", active: true },
                  { id: 2, title: "Module 2: Cloud Storage Organization & Batch Uploads", duration: "18:20", active: false },
                  { id: 3, title: "Module 3: Granular Access Control & LiveKit Rooms", duration: "09:15", active: false },
                  { id: 4, title: "Module 4: White-Label Customization & Webhook Delivery", duration: "08:10", active: false },
                ].map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all text-xs ${item.active
                        ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 font-bold"
                        : "border-[hsl(var(--border))] bg-slate-50/50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-900"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold ${item.active ? "bg-[hsl(var(--primary))] text-white" : "bg-slate-200 dark:bg-slate-800 text-[hsl(var(--foreground))]"
                          }`}
                      >
                        {item.id}
                      </span>
                      <span className="text-[hsl(var(--foreground))]">{item.title}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[hsl(var(--muted-foreground))]">{item.duration}</span>
                      {item.active ? (
                        <Play className="w-3.5 h-3.5 fill-current text-[hsl(var(--primary))]" />
                      ) : (
                        <Sliders className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Share & Embed Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-[hsl(var(--border))] text-xs">
                <span className="text-[hsl(var(--muted-foreground))]">Embed player supported in Notion, WordPress, Next.js</span>
                <span className="font-bold text-[hsl(var(--primary))] flex items-center gap-1 cursor-pointer">
                  <Share2 className="w-3.5 h-3.5" /> 1-Click Copy Playlist Share Link
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: WHITE-LABEL BRAND STUDIO MOCKUP                    */}
        {/* ========================================================= */}
        {activeTab === "branding" && (
          <div className="w-full max-w-3xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Controls Column */}
              <div className="md:col-span-4 space-y-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-[hsl(var(--border))] text-xs">
                <span className="font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">
                  Select Theme Preset
                </span>

                <div className="space-y-1.5">
                  {[
                    { id: "obsidian", label: "Obsidian Neon", color: "#84cc16" },
                    { id: "cyberpunk", label: "Cyberpunk Blue", color: "#06b6d4" },
                    { id: "vaporwave", label: "Vaporwave Pink", color: "#ec4899" },
                    { id: "ocean", label: "Ocean Breeze", color: "#38bdf8" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setBrandTheme(t.id as any);
                        setBrandAccent(t.color);
                      }}
                      className={`w-full p-2 rounded-xl border text-left font-bold transition-all flex items-center justify-between cursor-pointer ${brandTheme === t.id
                          ? "border-[hsl(var(--primary))] ring-2 ring-[hsl(var(--primary))]/20 bg-[hsl(var(--primary))]/10"
                          : "border-[hsl(var(--border))] hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                    >
                      <span className="text-[hsl(var(--foreground))]">{t.label}</span>
                      <span className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: t.color }} />
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-[hsl(var(--border))] space-y-1">
                  <span className="font-bold text-[hsl(var(--foreground))] block">Custom CTA Label</span>
                  <input
                    type="text"
                    value={brandCtaText}
                    onChange={(e) => setBrandCtaText(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[hsl(var(--border))] bg-slate-50 dark:bg-slate-950 text-[hsl(var(--foreground))]"
                  />
                </div>
              </div>

              {/* Dynamic Branded Share Page Live Preview */}
              <div
                className={`md:col-span-8 rounded-2xl border p-4 shadow-xl flex flex-col justify-between transition-all bg-gradient-to-br ${THEME_STYLES[brandTheme].bg} ${THEME_STYLES[brandTheme].card}`}
              >
                {/* Branded Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10 text-white">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-black" style={{ backgroundColor: brandAccent }}>
                      A
                    </div>
                    <span className="font-bold text-xs">Acme Corporation</span>
                  </div>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${THEME_STYLES[brandTheme].badge}`}>
                    White-Label
                  </span>
                </div>

                {/* Branded Video Container */}
                <div className="my-4 rounded-xl bg-black/60 border border-white/10 p-4 text-center space-y-2 text-white">
                  <p className="text-xs font-bold text-slate-300">{brandTitle}</p>
                  <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center text-black font-bold shadow-lg" style={{ backgroundColor: brandAccent }}>
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                  <p className="text-[10px] text-slate-400">Zero Taped branding visible to your viewers</p>
                </div>

                {/* Custom CTA Button at Bottom */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-[10px] text-slate-400">© 2026 Acme Corp. All rights reserved.</span>
                  <button className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-md transition-transform hover:scale-105 ${THEME_STYLES[brandTheme].btn}`}>
                    {brandCtaText}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sub-Footer Bar with Quick CTA */}
      <div className="px-4 sm:px-6 py-3.5 bg-slate-100/80 dark:bg-slate-900/80 border-t border-[hsl(var(--border))] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-semibold text-[hsl(var(--muted-foreground))] text-center sm:text-left">
          <Sparkles className="w-4 h-4 text-[hsl(var(--primary))]" />
          <span>Experience all 5 video tools in one unified dashboard with zero context switching.</span>
        </div>

        <Link
          href="/auth/register"
          className="px-4 py-2 rounded-xl bg-[hsl(var(--primary))] text-white font-black hover:opacity-90 transition-all flex items-center gap-1.5 shrink-0 shadow-md"
        >
          <span>Claim 2GB Free Storage</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
