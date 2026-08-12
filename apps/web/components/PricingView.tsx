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
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface PricingViewProps {
  isEmbedded?: boolean;
}

export default function PricingView({ isEmbedded = false }: PricingViewProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [loadingPlan, setLoadingPlan] = useState<boolean>(true);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [billingMode, setBillingMode] = useState<"ONE_TIME" | "RECURRING">("ONE_TIME");
  const [orgDetails, setOrgDetails] = useState<any>(null);
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [confirmCancelModalOpen, setConfirmCancelModalOpen] = useState<boolean>(false);
  const [pendingPlanSwitch, setPendingPlanSwitch] = useState<"free" | "pro" | "enterprise" | null>(null);

  useEffect(() => {
    async function fetchCurrentPlan() {
      if (!session) {
        setLoadingPlan(false);
        return;
      }
      try {
        const [usageRes, orgRes] = await Promise.all([
          fetch("/api/v1/usage"),
          fetch("/api/organization"),
        ]);
        if (usageRes.ok) {
          const data = await usageRes.json();
          if (data.plan) {
            setCurrentPlan(data.plan.toLowerCase());
          }
        }
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          if (orgData.organization) {
            setOrgDetails(orgData.organization);
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

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined") return resolve(false);
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const executeCancelSubscription = async () => {
    setUpdatingPlan("cancel");
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/payments/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel recurring subscription");

      setSuccessMsg(
        data.message ||
          "Auto-renewal cancelled successfully! Your paid plan remains active in one-time mode until expiration."
      );
      if (data.organization) {
        setOrgDetails((prev: any) => ({ ...prev, ...data.organization }));
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("usage-updated"));
      }
      router.refresh();
      setTimeout(() => setSuccessMsg(""), 7000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to cancel subscription");
      setTimeout(() => setErrorMsg(""), 5000);
    } finally {
      setUpdatingPlan(null);
      setConfirmCancelModalOpen(false);
      setPendingPlanSwitch(null);
    }
  };

  const executePlanSwitch = async (planKey: "free" | "pro" | "enterprise") => {
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
      if (!res.ok) throw new Error(data.error || "Failed to update plan");

      setCurrentPlan(planKey);
      setSuccessMsg(data.message || `Successfully updated workspace plan to ${planKey.toUpperCase()}!`);
      if (data.organization) {
        setOrgDetails((prev: any) => ({ ...prev, ...data.organization }));
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("usage-updated"));
      }
      router.refresh();
      setTimeout(() => setSuccessMsg(""), 6000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to change plan");
      setTimeout(() => setErrorMsg(""), 5000);
    } finally {
      setUpdatingPlan(null);
      setConfirmCancelModalOpen(false);
      setPendingPlanSwitch(null);
    }
  };

  const handleSelectPlan = async (planKey: "free" | "pro" | "enterprise") => {
    if (!session) {
      router.push("/auth/login?callbackUrl=/pricing");
      return;
    }

    if (planKey === currentPlan || updatingPlan) return;

    // If downgrading/selecting Free plan directly
    if (planKey === "free") {
      // If organization has active recurring subscription or subscription ID, prompt confirmation
      if (
        orgDetails?.billingMode === "RECURRING" ||
        orgDetails?.subscriptionStatus === "ACTIVE" ||
        orgDetails?.subscriptionId
      ) {
        setPendingPlanSwitch("free");
        setConfirmCancelModalOpen(true);
        return;
      }
      await executePlanSwitch("free");
      return;
    }

    // For Paid Plans (Pro & Enterprise), trigger Razorpay Payment Gateway
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Razorpay SDK failed to load. Please check your network connection.");
      }

      // 1. Create Razorpay Order
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planName: planKey, billingMode, billingCycle }),
      });

      const orderData = await res.json();
      if (!res.ok) {
        throw new Error(orderData.error || "Failed to initiate payment order");
      }

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "VideoHost",
        description: `Upgrade to ${planKey.toUpperCase()} Plan`,
        order_id: orderData.orderId,
        prefill: {
          name: session.user?.name || "",
          email: session.user?.email || "",
          contact: (session.user as any)?.phone || "",
        },
        theme: {
          color: planKey === "pro" ? "#84cc16" : "#9333ea",
        },
        handler: async function (response: any) {
          try {
            // 3. Verify Payment Signature
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "Payment verification failed");
            }

            setCurrentPlan(planKey);
            setSuccessMsg(`Payment verified! Active workspace plan upgraded to ${planKey.toUpperCase()}!`);
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("usage-updated"));
            }
            router.refresh();
            setTimeout(() => setSuccessMsg(""), 5000);
          } catch (verifyErr: any) {
            setErrorMsg(verifyErr.message || "Payment verification failed");
            setTimeout(() => setErrorMsg(""), 5000);
          } finally {
            setUpdatingPlan(null);
          }
        },
        modal: {
          ondismiss: function () {
            setUpdatingPlan(null);
          },
        },
      };

      const razorpayWindow = new (window as any).Razorpay(options);
      razorpayWindow.on("payment.failed", function (failResponse: any) {
        console.error("Razorpay Payment Failed:", failResponse.error);
        setErrorMsg(failResponse.error?.description || "Payment process was not completed.");
        setUpdatingPlan(null);
        setTimeout(() => setErrorMsg(""), 5000);
      });

      razorpayWindow.open();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initiate Razorpay checkout");
      setUpdatingPlan(null);
      setTimeout(() => setErrorMsg(""), 5000);
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
        { title: "Unlimited screen record with face cam overlay", icon: Video, highlight: true },
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
      price: billingCycle === "YEARLY" ? "₹9,990" : "₹999",
      period: billingCycle === "YEARLY" ? "per year (2 months free)" : "per month",
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
      price: billingCycle === "YEARLY" ? "₹29,990" : "₹2,999",
      period: billingCycle === "YEARLY" ? "per year (2 months free)" : "per month",
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

      {/* Active Plan Subscription Status Banner */}
      {orgDetails && orgDetails.planExpiresAt && currentPlan !== "free" && (
        <div className="max-w-3xl mx-auto p-4 rounded-2xl bg-gradient-to-r from-lime-500/10 via-emerald-500/10 to-teal-500/10 border border-lime-500/30 text-sm flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))] shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                Active Plan: <span className="uppercase text-[hsl(var(--primary))] font-extrabold">{currentPlan}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-black uppercase">
                  {orgDetails.subscriptionStatus || "ACTIVE"}
                </span>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                Paid Validity Ends: <span className="font-semibold text-[hsl(var(--foreground))]">{new Date(orgDetails.planExpiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span> ({orgDetails.billingMode === "RECURRING" ? "Auto-renewing subscription" : "One-time validity"})
              </p>
            </div>
          </div>
          {orgDetails.billingMode === "RECURRING" && orgDetails.subscriptionStatus !== "CANCELLED" ? (
            <button
              type="button"
              onClick={() => {
                setPendingPlanSwitch("free");
                setConfirmCancelModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-extrabold transition-all shadow-xs shrink-0 cursor-pointer"
            >
              Cancel Subscription
            </button>
          ) : orgDetails.subscriptionStatus === "CANCELLED" ? (
            <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
              Subscription cancelled — Active until {new Date(orgDetails.planExpiresAt).toLocaleDateString()}
            </span>
          ) : null}
        </div>
      )}

      {/* Billing Cycle & Mode Toggles */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-2">
        {/* Monthly / Yearly Cycle */}
        <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setBillingCycle("MONTHLY")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${billingCycle === "MONTHLY"
              ? "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-md"
              : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("YEARLY")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${billingCycle === "YEARLY"
              ? "bg-[hsl(var(--primary))] text-white shadow-md"
              : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              }`}
          >
            Yearly Billing
            <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] uppercase font-black">
              2 Months Free
            </span>
          </button>
        </div>

        {/* One-Time vs Recurring Mode */}
        <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setBillingMode("ONE_TIME")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${billingMode === "ONE_TIME"
              ? "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-md"
              : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              }`}
          >
            One-Time Payment
          </button>
          <button
            type="button"
            onClick={() => setBillingMode("RECURRING")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${billingMode === "RECURRING"
              ? "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-md"
              : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              }`}
          >
            Auto-Renewing Subscription
          </button>
        </div>
      </div>

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
                  <div className="space-y-2">
                    <button
                      disabled
                      className="w-full py-3 px-4 rounded-2xl bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] font-bold text-sm border border-[hsl(var(--border))] opacity-75 cursor-default flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[hsl(var(--primary))]" /> Active Workspace Plan
                    </button>
                    {plan.id !== "free" && currentPlan !== "free" && orgDetails?.billingMode === "RECURRING" && orgDetails?.subscriptionStatus !== "CANCELLED" && (
                      <button
                        type="button"
                        onClick={() => {
                          setPendingPlanSwitch("free");
                          setConfirmCancelModalOpen(true);
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        Cancel Subscription
                      </button>
                    )}
                  </div>
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

      {/* Recurring Subscription Cancellation Confirmation Modal */}
      <Dialog open={confirmCancelModalOpen} onOpenChange={setConfirmCancelModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Cancel Auto-Renewing Subscription?</DialogTitle>
                <DialogDescription className="mt-1">
                  Cancel auto-renewal for your <strong className="text-[hsl(var(--foreground))] uppercase">{currentPlan}</strong> plan.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs text-[hsl(var(--muted-foreground))]">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-medium">
              ✅ <strong>Keep Paid Features Until Expiry:</strong> You will remain on your paid <strong>{currentPlan.toUpperCase()}</strong> plan in one-time mode with full feature access until <strong>{orgDetails?.planExpiresAt ? new Date(orgDetails.planExpiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'expiration'}</strong>.
            </div>
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 font-medium">
              ⚠️ <strong>No Future Charges:</strong> Auto-renewal on Razorpay will be cancelled immediately. Once your paid validity ends on <strong>{orgDetails?.planExpiresAt ? new Date(orgDetails.planExpiresAt).toLocaleDateString() : 'expiration'}</strong>, your workspace will automatically move to the Free plan.
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => {
                setConfirmCancelModalOpen(false);
                setPendingPlanSwitch(null);
              }}
              className="px-4 py-2.5 rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] font-bold text-xs hover:bg-[hsl(var(--muted))]/80 transition-all cursor-pointer"
            >
              Keep Auto-Renew
            </button>
            <button
              type="button"
              disabled={updatingPlan !== null}
              onClick={() => executeCancelSubscription()}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {updatingPlan ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Cancelling...
                </>
              ) : (
                "Yes, Cancel Auto-Renew"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
