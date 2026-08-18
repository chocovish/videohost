"use client";

import React, { useState } from "react";
import { ChevronDown, Sparkles, HelpCircle } from "lucide-react";
import { FAQ_DATA, FaqItem } from "./faqData";

interface LandingFaqProps {
  items?: FaqItem[];
}

export default function LandingFaq({ items = FAQ_DATA }: LandingFaqProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);


  const toggleIndex = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="w-full py-16 sm:py-24 relative overflow-hidden" id="faq">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/30 text-[hsl(var(--primary))] text-xs font-black uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" /> Frequently Asked Questions
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[hsl(var(--foreground))]">
            Got questions? We&apos;ve got answers.
          </h2>

          <p className="text-base text-[hsl(var(--muted-foreground))] font-medium">
            Everything you need to know about Taped&apos;s video hosting, recording, security, and live meetings.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {FAQ_DATA.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isOpen
                    ? "bg-white dark:bg-slate-900 border-[hsl(var(--primary))]/50 shadow-lg"
                    : "bg-white/60 dark:bg-slate-900/40 border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/30"
                }`}
              >
                <button
                  onClick={() => toggleIndex(idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="font-extrabold text-sm sm:text-base text-[hsl(var(--foreground))] leading-snug">
                    {item.question}
                  </span>
                  <div
                    className={`p-1.5 rounded-xl border transition-transform duration-200 shrink-0 ${
                      isOpen
                        ? "rotate-180 bg-[hsl(var(--primary))] text-white border-transparent"
                        : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm text-[hsl(var(--muted-foreground))] leading-relaxed border-t border-[hsl(var(--border))]/50 animate-in fade-in duration-150">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
