"use client";

import React from "react";
import Link from "next/link";
import { Check, X, Sparkles, ArrowRight } from "lucide-react";

export default function LandingComparison() {
  const COMPARISON_ROWS = [
    {
      feature: "Free Storage Included",
      taped: "2GB Free Forever",
      others: "Strict 5-minute limits or trial only",
    },
    {
      feature: "Browser Screen & Webcam Recorder",
      taped: true,
      others: "Requires $15/mo (Loom)",
    },
    {
      feature: "Curated Multi-Video Playlists",
      taped: true,
      others: "Requires separate CMS plugin",
    },
    {
      feature: "Granular Email Access Control (OTP Passcode)",
      taped: true,
      others: "Requires complex enterprise paywall",
    },
    {
      feature: "Branded Conference & Webinar Rooms",
      taped: true,
      others: "Requires $15/mo (Zoom)",
    },
    {
      feature: "100% White-Label Branded Share Pages",
      taped: true,
      others: "Locked behind $65+/mo tiers",
    },
    {
      feature: "Monthly Stack Cost",
      taped: "$0 to Start (2GB Free)",
      others: "$50 – $100+ / month",
      isHighlight: true,
    },
  ];

  return (
    <section className="w-full py-16 sm:py-24 relative overflow-hidden" id="comparison">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Stop Fragmenting Your Stack
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">
            Why juggle 4 subscriptions?
          </h2>

          <p className="text-base text-muted-foreground font-medium">
            Taped replaces recording tools, video hosts, webinar platforms, and access paywalls in one high-performance dashboard.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="rounded-3xl border border-border bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-12 bg-slate-100/80 dark:bg-slate-800/80 p-4 sm:p-5 font-black text-xs sm:text-sm border-b border-border text-foreground">
            <div className="col-span-6 sm:col-span-6">Capability / Feature</div>
            <div className="col-span-3 sm:col-span-3 text-center text-primary font-extrabold flex items-center justify-center gap-1">
              <span>Taped</span>
              <span className="hidden sm:inline text-[9px] px-1.5 py-0.5 rounded bg-primary text-white">ALL-IN-ONE</span>
            </div>
            <div className="col-span-3 sm:col-span-3 text-center text-muted-foreground">
              Fragmented Stack
            </div>
          </div>

          <div className="divide-y divide-border text-xs sm:text-sm">
            {COMPARISON_ROWS.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-12 p-4 sm:p-5 items-center ${row.isHighlight ? "bg-primary/10 font-bold" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
              >
                <div className="col-span-6 sm:col-span-6 font-bold text-foreground">
                  {row.feature}
                </div>

                <div className="col-span-3 sm:col-span-3 text-center flex justify-center items-center">
                  {row.taped === true ? (
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-2xs">
                      <Check className="w-3.5 h-3.5 stroke-3" />
                    </div>
                  ) : (
                    <span className="font-black text-primary text-xs sm:text-sm">{row.taped}</span>
                  )}
                </div>

                <div className="col-span-3 sm:col-span-3 text-center flex justify-center items-center text-muted-foreground">
                  {typeof row.others === "string" ? (
                    <span className="text-[11px] sm:text-xs font-semibold">{row.others}</span>
                  ) : (
                    <X className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick CTA banner */}
        <div className="p-6 rounded-3xl bg-primary/10 border border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="font-extrabold text-base text-foreground">
              Get started with 2GB free storage today
            </h4>
            <p className="text-xs text-muted-foreground">
              No credit card required. Upgrade anytime if your storage needs grow.
            </p>
          </div>

          <Link
            href="/auth/register"
            className="px-6 py-3 rounded-2xl bg-primary text-white font-extrabold text-xs sm:text-sm shadow-lg hover:opacity-90 transition-all flex items-center gap-2 shrink-0"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
