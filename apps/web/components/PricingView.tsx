"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Zap,
  Sparkles,
  Shield,
  Loader2,
  CheckCircle2,
  HardDrive,
  Video,
  Share2,
  Building2,
  Users,
  Headphones,
  MessageSquare,
  Mail,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

interface PricingViewProps {
  isEmbedded?: boolean;
}

export default function PricingView({ isEmbedded = false }: PricingViewProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [loadingPlan, setLoadingPlan] = useState<boolean>(true);
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    async function fetchCurrentPlan() {
      if (!session) {
        setLoadingPlan(false);
        return;
      }
      try {
        const res = await fetch("/api/v1/usage");
        if (res.ok) {
          const data = await res.json();
          if (data.plan) {
            setCurrentPlan(data.plan.toLowerCase());
          }
        }
      } catch (e) {
        console.error("Error fetching current plan:", e);
      } finally {
        setLoadingPlan(false);
      }
    }
    fetchCurrentPlan();
  }, [session]);

  const handleSelectPlan = async (planKey: "free" | "pro" | "enterprise") => {
    if (!session) {
      router.push("/auth/login?callbackUrl=/pricing");
      return;
    }

    if (planKey === currentPlan || updatingPlan) return;

    setUpdatingPlan(planKey);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/organization/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planName: planKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update plan");
      }

      setCurrentPlan(planKey);
      setSuccessMsg(`Successfully updated active workspace plan to ${planKey.toUpperCase()}!`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("usage-updated"));
      }
      router.refresh();
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to change plan");
      setTimeout(() => setErrorMsg(""), 5000);
    } finally {
      setUpdatingPlan(null);
    }
  };

  const plans = [
    {
      id: "free",
      name: "Free",
      price: "₹0",
      period: "forever",
      tagline: "Essential tools for personal screen recording & email-secured sharing",
      popular: false,
      badge: "Get Started",
      accentColor: "border-slate-200 dark:border-slate-800",
      buttonVariant: "outline",
      features: [
        { title: "Unlimited screen record", icon: Video, highlight: true },
        { title: "Unlimited videos upload", icon: Video, highlight: true },
        { title: "2GB cloud storage", icon: HardDrive, highlight: true },
        { title: "Share videos with specific email users or make them publicly accessible.", icon: Share2, highlight: true },
        { title: "Email based support", icon: Mail, highlight: false },
      ],
      notIncluded: [
        "Adaptive bitrate HLS conversion",
        "Multiple organizations creation",
        "Team member invitations",
      ],
    },
    {
      id: "pro",
      name: "Pro",
      price: "Rs. 999",
      period: "per month",
      tagline: "For professional creators needing adaptive bitrate & high storage",
      popular: true,
      badge: "Most Popular",
      accentColor: "border-[hsl(var(--primary))] ring-2 ring-[hsl(var(--primary))]/30 shadow-xl",
      buttonVariant: "primary",
      features: [
        { title: "All in Free plan +", icon: Sparkles, highlight: true },
        { title: "200GB cloud storage", icon: HardDrive, highlight: true },
        { title: "Store videos in adaptive bitrate (multi-quality HLS for weak connections)", icon: Zap, highlight: true },
        { title: "Live chat support", icon: MessageSquare, highlight: true },
      ],
      notIncluded: [
        "Multiple organizations creation",
        "Team member invitations",
      ],
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "Rs. 2999",
      period: "per month",
      tagline: "For teams & multi-org teams requiring unlimited storage & full controls",
      popular: false,
      badge: "Full Access",
      accentColor: "border-purple-500/50 dark:border-purple-500/30 shadow-lg",
      buttonVariant: "enterprise",
      features: [
        { title: "All in Pro plan +", icon: Sparkles, highlight: true },
        { title: "Unlimited cloud storage", icon: HardDrive, highlight: true },
        { title: "Create multiple organizations (up to 5 workspaces)", icon: Building2, highlight: true },
        { title: "Invite team members & manage roles", icon: Users, highlight: true },
        { title: "Dedicated call support", icon: Headphones, highlight: true },
      ],
      notIncluded: [],
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-8">
      {/* Header Banner */}
      {!isEmbedded && (
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/30 text-[hsl(var(--primary))] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" /> Clear & Transparent Pricing
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[hsl(var(--foreground))]">
            Simple plans for creators & teams.
          </h1>
          <p className="text-base sm:text-lg text-[hsl(var(--muted-foreground))]">
            Start free with 2GB storage, or upgrade to unlock 200GB+, adaptive bitrate video streaming, multiple organizations, and team invites.
          </p>
        </div>
      )}

      {/* Toast Notifications */}
      {successMsg && (
        <div className="max-w-xl mx-auto p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm font-semibold flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg("")}
            className="text-xs text-emerald-700 dark:text-emerald-300 underline font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="max-w-xl mx-auto p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-700 dark:text-red-300 text-sm font-semibold flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg("")}
            className="text-xs text-red-700 dark:text-red-300 underline font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch pt-4">
        {plans.map((plan) => {
          const isCurrent = session && currentPlan === plan.id;
          const isUpdating = updatingPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between p-6 sm:p-8 rounded-3xl bg-[hsl(var(--card))] border transition-all duration-300 hover:shadow-2xl ${plan.accentColor
                } ${plan.popular ? "scale-[1.02] bg-gradient-to-b from-white via-white to-lime-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/40" : ""}`}
            >
              {/* Popular / Badge Ribbon */}
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[hsl(var(--primary))] text-white font-extrabold text-xs uppercase tracking-wider shadow-md flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> {plan.badge}
                </div>
              )}

              <div>
                {/* Plan Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-xl sm:text-2xl font-black text-[hsl(var(--foreground))]">{plan.name}</h3>
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))] font-extrabold text-[11px] uppercase tracking-wider border border-[hsl(var(--primary))]/40">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Current Plan
                    </span>
                  )}
                </div>

                <p className="text-xs text-[hsl(var(--muted-foreground))] mb-6 min-h-[32px]">{plan.tagline}</p>

                {/* Price Display */}
                <div className="mb-6 pb-6 border-b border-[hsl(var(--border))]">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-[hsl(var(--foreground))] tracking-tight">
                      {plan.price}
                    </span>
                    <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">/{plan.period}</span>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-3.5 mb-8">
                  <p className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    What's included:
                  </p>
                  {plan.features.map((feat, idx) => {
                    const FeatIcon = feat.icon;
                    return (
                      <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm">
                        <div className="w-5 h-5 rounded-full bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center shrink-0 mt-0.5">
                          <FeatIcon className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-semibold text-[hsl(var(--foreground))] leading-snug">
                          {feat.title}
                        </span>
                      </div>
                    );
                  })}

                  {/* Not included items */}
                  {plan.notIncluded.length > 0 && (
                    <div className="pt-2 space-y-2 border-t border-[hsl(var(--border))]/60">
                      {plan.notIncluded.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]/70 line-through">
                          <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold">✕</span>
                          </div>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div>
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-3 px-4 rounded-2xl bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] font-bold text-sm border border-[hsl(var(--border))] opacity-75 cursor-default flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[hsl(var(--primary))]" /> Active Workspace Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleSelectPlan(plan.id as any)}
                    disabled={updatingPlan !== null || loadingPlan}
                    className={`w-full py-3.5 px-4 rounded-2xl font-extrabold text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${plan.id === "pro"
                        ? "bg-[hsl(var(--primary))] text-white hover:opacity-90 shadow-[hsl(var(--primary))]/20"
                        : plan.id === "enterprise"
                          ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20"
                          : "bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white"
                      }`}
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Updating Plan...
                      </>
                    ) : session ? (
                      <>
                        <span>Select {plan.name}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <span>Get Started with {plan.name}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Table / FAQ Footer */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-[hsl(var(--border))] space-y-6 mt-12">
        <h3 className="font-extrabold text-xl text-[hsl(var(--foreground))] text-center">
          Frequently Asked Questions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="space-y-1.5 p-4 rounded-2xl bg-[hsl(var(--muted))]/40">
            <h4 className="font-bold text-[hsl(var(--foreground))]">What is Adaptive Bitrate Streaming?</h4>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Available on Pro and Enterprise plans, adaptive bitrate generates multi-quality HLS streams (480p, 720p, 1080p, 4K) so viewers experience continuous playback without buffering even on weak mobile connections.
            </p>
          </div>

          <div className="space-y-1.5 p-4 rounded-2xl bg-[hsl(var(--muted))]/40">
            <h4 className="font-bold text-[hsl(var(--foreground))]">What video sharing options are available on the Free plan?</h4>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Free plan users enjoy both public link sharing (anyone with link can watch) and email-restricted sharing (only specified authenticated emails can access).
            </p>
          </div>

          <div className="space-y-1.5 p-4 rounded-2xl bg-[hsl(var(--muted))]/40">
            <h4 className="font-bold text-[hsl(var(--foreground))]">Can I switch plans at any time?</h4>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Yes! Organization owners can switch between Free, Pro, and Enterprise plans at any time. Your limits and feature entitlements update instantly.
            </p>
          </div>

          <div className="space-y-1.5 p-4 rounded-2xl bg-[hsl(var(--muted))]/40">
            <h4 className="font-bold text-[hsl(var(--foreground))]">Who needs the Enterprise plan?</h4>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Teams that require multiple separate workspace organizations, team member role invitations, unlimited storage, and dedicated phone support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
