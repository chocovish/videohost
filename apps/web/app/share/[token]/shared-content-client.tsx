"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Film,
  Folder,
  ChevronRight,
  ChevronLeft,
  Clock,
  Play,
  Share2,
  Building2,
  AlertTriangle,
  Sparkles,
  Lock,
  LogIn,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Shield,
  UserX,
  Copy,
  Check,
  ExternalLink,
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Mail,
  Send,
  Globe,
  ListVideo,
  SkipBack,
  SkipForward,
  Search,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Loader2,
  DollarSign,
  CreditCard,
  Tag,
  ShoppingBag,
  Calendar,
  Ticket,
  Video,
  Mic,
  Radio,
  Users,
  Tv,
} from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import VideoThumbnail from "@/components/VideoThumbnail";
import { formatDuration } from "@/lib/video-utils";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface SharePageConfigData {
  themePreset?: string;
  accentColor?: string;
  backgroundStyle?: string;
  cardRoundness?: string;
  customTitle?: string | null;
  welcomeTagline?: string | null;
  welcomeTaglineFontSize?: string | null;
  showLogo?: boolean;
  customLogoUrl?: string | null;
  welcomeBannerUrl?: string | null;
  showCta?: boolean;
  ctaText?: string | null;
  ctaUrl?: string | null;
  ctaStyle?: string;
  showShareButton?: boolean;
  showSocialBar?: boolean;
  showDuration?: boolean;
  autoPlayMuted?: boolean;
  footerText?: string | null;
}

export interface SharedData {
  type: "video" | "folder" | "playlist" | "meeting";
  accessMode?: string;
  isPurchased?: boolean;
  isLoggedIn?: boolean;
  price?: number | null;
  currency?: string;
  countryPricing?: Array<{ countryCode: string; countryName: string; amount: number; currency: string }>;
  detectedCountryCode?: string;
  itemTitle?: string;
  joinUrl?: string;
  organization: {
    name: string;
    logoUrl?: string | null;
    coverUrl?: string | null;
    slug: string;
  };
  sharePageConfig?: SharePageConfigData | null;
  parentFolder?: {
    id: string;
    name: string;
  } | null;
  meeting?: {
    id: string;
    title: string;
    description?: string | null;
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
    status: string;
    isInstant: boolean;
    recordOnStart: boolean;
    allowGuests?: boolean;
    createdAt: string;
    createdBy?: {
      name: string;
      image?: string | null;
    };
  };
  video?: {
    id: string;
    title: string;
    description?: string;
    status: string;
    durationSeconds?: number;
    thumbnailUrl?: string;
    playbackUrl?: string;
    createdAt: string;
  };
  playlist?: {
    id: string;
    title: string;
    description?: string;
    itemCount: number;
    totalDurationSeconds: number;
    thumbnailUrl?: string | null;
    createdAt: string;
  };
  rootFolder?: {
    id: string;
    name: string;
  };
  currentFolder?: {
    id: string;
    name: string;
    parentId?: string | null;
  };
  videos?: Array<{
    id: string;
    itemId?: string;
    order?: number;
    title: string;
    description?: string;
    status: string;
    durationSeconds?: number;
    thumbnailUrl?: string;
    playbackUrl?: string;
    createdAt: string;
  }>;
  subfolders?: Array<{
    id: string;
    name: string;
  }>;
}

interface SharedContentClientProps {
  overrideConfig?: SharePageConfigData;
  previewData?: SharedData;
}

function MeetingCountdown({
  scheduledStart,
  accentHex,
}: {
  scheduledStart: string;
  accentHex: string;
}) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });

  useEffect(() => {
    const calculate = () => {
      const target = new Date(scheduledStart).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [scheduledStart]);

  if (timeLeft.isPast) {
    return (
      <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-3 text-emerald-400 text-xs font-bold shadow-inner">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <span>Meeting room is open and ready for attendees to join!</span>
        </div>
        <span className="hidden sm:inline-block uppercase tracking-wider text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40 font-mono">
          Ready
        </span>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3 backdrop-blur-md">
      <div className="flex items-center justify-between text-xs font-bold text-slate-400">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" style={{ color: accentHex }} />
          <span>Countdown to Session Start</span>
        </span>
        <span className="text-[11px] text-slate-400 font-mono">Live Timer</span>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center">
        {[
          { label: "Days", val: timeLeft.days },
          { label: "Hours", val: timeLeft.hours },
          { label: "Mins", val: timeLeft.minutes },
          { label: "Secs", val: timeLeft.seconds },
        ].map((item, idx) => (
          <div key={idx} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xs">
            <p className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
              {String(item.val).padStart(2, "0")}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SharedContentClient({
  overrideConfig,
  previewData,
}: SharedContentClientProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = params?.token as string;
  const subfolderId = searchParams?.get("subfolderId");
  const folderIdParam = searchParams?.get("folderId") || searchParams?.get("fromFolder") || searchParams?.get("fromFolderId");
  const rootFolderIdParam = searchParams?.get("rootFolderId");

  const [data, setData] = useState<SharedData | null>(previewData || null);
  const [loading, setLoading] = useState(!previewData);
  const [copied, setCopied] = useState(false);
  const [activePlaylistIndex, setActivePlaylistIndex] = useState(0);
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState("");
  const [errorState, setErrorState] = useState<{
    code: string;
    message?: string;
    userEmail?: string;
    organizationName?: string;
    itemTitle?: string;
    itemDescription?: string | null;
    type?: string;
  } | null>(null);

  // Purchase & Checkout state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedBuyerCountry, setSelectedBuyerCountry] = useState<string>("US");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutSuccess, setCheckoutSuccess] = useState("");

  // Access Request state
  const [requestAccessLoading, setRequestAccessLoading] = useState(false);
  const [requestAccessSuccess, setRequestAccessSuccess] = useState(false);
  const [requestAccessMessage, setRequestAccessMessage] = useState("");
  const [requestAccessError, setRequestAccessError] = useState("");

  const handleRequestAccess = async () => {
    if (!token) return;
    try {
      setRequestAccessLoading(true);
      setRequestAccessError("");
      const res = await fetch(`/api/share/${token}/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: errorState?.userEmail,
        }),
      });
      const resData = await res.json();
      if (res.ok) {
        setRequestAccessSuccess(true);
        setRequestAccessMessage(resData.message || "Access request submitted! The creator has been notified.");
      } else {
        setRequestAccessError(resData.error || "Failed to submit access request.");
      }
    } catch (e: any) {
      console.error("Access request error:", e);
      setRequestAccessError("Network error. Please try again.");
    } finally {
      setRequestAccessLoading(false);
    }
  };

  // Detect visitor's local country on client
  useEffect(() => {
    if (data?.detectedCountryCode) {
      setSelectedBuyerCountry(data.detectedCountryCode.toUpperCase());
      return;
    }
    try {
      if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        if (tz.includes("Calcutta") || tz.includes("Kolkata") || tz.startsWith("Asia/Kolkata")) {
          setSelectedBuyerCountry("IN");
          return;
        }
        if (tz.startsWith("America/New_York") || tz.startsWith("America/Chicago") || tz.startsWith("America/Los_Angeles") || tz.startsWith("America/Denver") || tz.startsWith("US/")) {
          setSelectedBuyerCountry("US");
          return;
        }
        if (tz.startsWith("Europe/London")) { setSelectedBuyerCountry("GB"); return; }
        if (tz.startsWith("Europe/Paris")) { setSelectedBuyerCountry("FR"); return; }
        if (tz.startsWith("Europe/Berlin")) { setSelectedBuyerCountry("DE"); return; }
        if (tz.startsWith("Asia/Tokyo")) { setSelectedBuyerCountry("JP"); return; }
        if (tz.startsWith("Australia/")) { setSelectedBuyerCountry("AU"); return; }
        if (tz.startsWith("America/Toronto") || tz.startsWith("Canada/")) { setSelectedBuyerCountry("CA"); return; }
        if (tz.startsWith("Asia/Singapore")) { setSelectedBuyerCountry("SG"); return; }
        if (tz.startsWith("Asia/Dubai")) { setSelectedBuyerCountry("AE"); return; }
        if (tz.startsWith("America/Sao_Paulo")) { setSelectedBuyerCountry("BR"); return; }
      }
      if (typeof navigator !== "undefined") {
        const lang = navigator.language || (navigator.languages && navigator.languages[0]) || "";
        const parts = lang.split("-");
        if (parts.length > 1 && parts[1].length === 2) {
          setSelectedBuyerCountry(parts[1].toUpperCase());
          return;
        }
      }
    } catch (e) { }
  }, [data?.detectedCountryCode]);

  const getCalculatedPrice = (dataObj: SharedData | null, targetCountryCode: string) => {
    if (!dataObj) return { amount: 0, currency: "USD", formatted: "Free", isFree: true };
    let finalAmount = dataObj.price !== null && dataObj.price !== undefined ? Number(dataObj.price) : 0;
    let finalCurrency = dataObj.currency || "USD";

    if (dataObj.countryPricing && Array.isArray(dataObj.countryPricing)) {
      const matched = dataObj.countryPricing.find(
        (cp) => cp.countryCode?.toUpperCase() === targetCountryCode?.toUpperCase()
      );
      if (matched && matched.amount !== undefined) {
        finalAmount = Number(matched.amount);
        if (matched.currency) finalCurrency = matched.currency;
      }
    }

    const symbolMap: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      INR: "₹",
      CAD: "CA$",
      AUD: "AU$",
      JPY: "¥",
      SGD: "SG$",
      AED: "AED ",
      BRL: "R$",
    };

    const isFree = finalAmount <= 0;
    const sym = symbolMap[finalCurrency] || `${finalCurrency} `;
    return {
      amount: finalAmount,
      currency: finalCurrency,
      isFree,
      formatted: isFree ? "Free" : `${sym}${finalAmount.toFixed(2)}`,
    };
  };

  const formatMeetingTime = (dateStr?: string | null) => {
    if (!dateStr) return "Flexible / Scheduled Conference";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      });
    } catch {
      return dateStr;
    }
  };

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

  const loadCashfreeScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined") return resolve(false);
      if ((window as any).Cashfree) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleExecuteCheckout = async () => {
    if (!token) return;
    const priceInfo = getCalculatedPrice(data, selectedBuyerCountry);

    // If cost is 0, claim for free directly without invoking payment gateway
    if (priceInfo.isFree) {
      if (!data?.isLoggedIn) {
        const callback = typeof window !== "undefined" ? window.location.href : `/share/${token}`;
        router.push(`/auth/login?callbackUrl=${encodeURIComponent(callback)}`);
        return;
      }

      setIsCheckingOut(true);
      setCheckoutError("");
      setCheckoutSuccess("");

      try {
        const res = await fetch("/api/content-purchases/free-claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentType: data?.type || "video",
            contentId: token,
            countryCode: selectedBuyerCountry,
          }),
        });

        const resData = await res.json();
        if (!res.ok) {
          if (resData.error === "LOGIN_REQUIRED") {
            const callback = typeof window !== "undefined" ? window.location.href : `/share/${token}`;
            router.push(`/auth/login?callbackUrl=${encodeURIComponent(callback)}`);
            return;
          }
          throw new Error(resData.message || resData.error || "Failed to claim free access.");
        }

        setCheckoutSuccess(resData.message || "Unlocked successfully! Loading content...");
        setTimeout(async () => {
          setIsCheckoutOpen(false);
          setCheckoutSuccess("");
          await fetchSharedContent();
        }, 1000);
      } catch (err: any) {
        setCheckoutError(err?.message || "Failed to claim free access.");
      } finally {
        setIsCheckingOut(false);
      }
      return;
    }

    setIsCheckingOut(true);
    setCheckoutError("");
    setCheckoutSuccess("");

    try {
      // 1. Create order on backend with active payment gateway
      const res = await fetch("/api/content-purchases/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: data?.type || "video",
          contentId: token,
          countryCode: selectedBuyerCountry,
        }),
      });

      const orderData = await res.json();
      if (!res.ok) {
        if (orderData.error === "LOGIN_REQUIRED") {
          const callback = typeof window !== "undefined" ? window.location.href : `/share/${token}`;
          router.push(`/auth/login?callbackUrl=${encodeURIComponent(callback)}`);
          return;
        }
        throw new Error(orderData.message || orderData.error || "Failed to initialize payment gateway order.");
      }

      // If already purchased or unlocked
      if (orderData.alreadyPurchased) {
        setCheckoutSuccess(orderData.message || "You own access to this content! Unlocking...");
        setTimeout(async () => {
          setIsCheckoutOpen(false);
          setCheckoutSuccess("");
          await fetchSharedContent();
        }, 1000);
        return;
      }

      // 2A. CASHFREE GATEWAY CHECKOUT
      if (orderData.gateway === "cashfree") {
        const scriptLoaded = await loadCashfreeScript();
        if (!scriptLoaded || !(window as any).Cashfree) {
          throw new Error("Cashfree payment gateway SDK failed to load. Please check your network connection.");
        }

        const cashfree = (window as any).Cashfree({
          mode: orderData.cfEnv === "production" ? "production" : "sandbox",
        });

        const checkoutOptions = {
          paymentSessionId: orderData.paymentSessionId,
          redirectTarget: "_modal",
        };

        cashfree.checkout(checkoutOptions).then(async (result: any) => {
          if (result.error) {
            console.warn("[Cashfree Modal Result]:", result.error);
            if (result.error.message && result.error.message !== "User closed the popup") {
              setCheckoutError(result.error.message || "Payment cancelled or failed.");
            }
            setIsCheckingOut(false);
            return;
          }

          // Verify Cashfree Payment
          try {
            const verifyRes = await fetch("/api/content-purchases/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                gateway: "cashfree",
                order_id: orderData.orderId,
                contentType: data?.type || "video",
                contentId: token,
                countryCode: selectedBuyerCountry,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "Payment verification failed.");
            }

            setCheckoutSuccess(verifyData.message || "Payment verified! Unlocking content...");
            setTimeout(async () => {
              setIsCheckoutOpen(false);
              setCheckoutSuccess("");
              await fetchSharedContent();
            }, 1200);
          } catch (verifyErr: any) {
            setCheckoutError(verifyErr.message || "Payment verification failed.");
          } finally {
            setIsCheckingOut(false);
          }
        });

        return;
      }

      // 2B. RAZORPAY GATEWAY CHECKOUT (Default)
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !(window as any).Razorpay) {
        throw new Error("Razorpay payment gateway SDK failed to load. Please check your network connection.");
      }

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: data?.organization?.name || "Taped",
        description: `Purchase: ${orderData.contentTitle || "Content Access"}`,
        order_id: orderData.orderId,
        prefill: {
          name: orderData.prefill?.name || "",
          email: orderData.prefill?.email || "",
        },
        theme: {
          color: accentHex || "#84cc16",
        },
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/content-purchases/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                gateway: "razorpay",
                contentType: data?.type || "video",
                contentId: token,
                countryCode: selectedBuyerCountry,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "Payment verification failed.");
            }

            setCheckoutSuccess(verifyData.message || "Payment verified! Unlocking content...");
            setTimeout(async () => {
              setIsCheckoutOpen(false);
              setCheckoutSuccess("");
              await fetchSharedContent();
            }, 1200);
          } catch (verifyErr: any) {
            setCheckoutError(verifyErr.message || "Payment verification failed.");
          } finally {
            setIsCheckingOut(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsCheckingOut(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        console.warn("[Razorpay Payment Failed]:", response.error);
        setCheckoutError(response.error?.description || "Payment failed.");
        setIsCheckingOut(false);
      });
      rzp.open();
    } catch (err: any) {
      setCheckoutError(err.message || "An unexpected error occurred during checkout.");
      setIsCheckingOut(false);
    }
  };

  // One-time OTP state
  const [authViewMode, setAuthViewMode] = useState<"options" | "otp">("options");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otpEmail) return;
    setOtpLoading(true);
    setOtpError("");
    setOtpSuccess("");

    try {
      const res = await fetch("/api/share/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email: otpEmail }),
      });

      const resData = await res.json();
      if (!res.ok) {
        setOtpError(resData.message || resData.error || "Failed to send code.");
      } else {
        setOtpStep("verify");
        setOtpSuccess(resData.message || "A 6-digit access code has been sent to your email.");
      }
    } catch (err: any) {
      setOtpError("An error occurred while sending the code. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otpCode || !otpEmail) return;
    setOtpLoading(true);
    setOtpError("");
    setOtpSuccess("");

    try {
      const res = await fetch("/api/share/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email: otpEmail, code: otpCode }),
      });

      const resData = await res.json();
      if (!res.ok) {
        setOtpError(resData.message || resData.error || "Invalid access code.");
      } else {
        setOtpSuccess("Access granted! Loading content...");
        setErrorState(null);
        await fetchSharedContent();
      }
    } catch (err: any) {
      setOtpError("An error occurred while verifying the code. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const fetchSharedContent = async () => {
    if (previewData) return;
    try {
      setLoading(true);
      setErrorState(null);

      const qp = new URLSearchParams();
      if (subfolderId) qp.set("subfolderId", subfolderId);
      if (folderIdParam) qp.set("folderId", folderIdParam);
      if (rootFolderIdParam) qp.set("rootFolderId", rootFolderIdParam);
      const qStr = qp.toString();

      const url = qStr ? `/api/share/${token}?${qStr}` : `/api/share/${token}`;

      const res = await fetch(url);
      const result = await res.json();

      if (!res.ok) {
        setErrorState({
          code: result.error || "UNKNOWN_ERROR",
          message: result.message,
          userEmail: result.userEmail,
          organizationName: result.organization?.name,
          itemTitle: result.itemTitle,
          itemDescription: result.itemDescription,
          type: result.type,
        });
        return;
      }

      setData(result);
    } catch (err: any) {
      setErrorState({
        code: "FETCH_FAILED",
        message: err.message || "Failed to load shared content.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!previewData && token) {
      fetchSharedContent();
    }
  }, [token, subfolderId, folderIdParam, rootFolderIdParam, previewData]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubfolderClick = (folderId: string) => {
    if (previewData) return;
    router.push(`/share/${token}?subfolderId=${folderId}`);
  };

  const handleBackToRoot = () => {
    if (previewData) return;
    router.push(`/share/${token}`);
  };

  const handleVideoClick = (videoId: string) => {
    if (previewData) return;
    const currentFid = data?.currentFolder?.id || token;
    const rootFid = data?.rootFolder?.id;
    const query = new URLSearchParams();
    if (currentFid) query.set("folderId", currentFid);
    if (rootFid && rootFid !== currentFid) query.set("rootFolderId", rootFid);
    const qStr = query.toString();
    router.push(`/share/${videoId}${qStr ? `?${qStr}` : ""}`);
  };

  const handleBackToFolder = () => {
    if (previewData) return;
    if (rootFolderIdParam && folderIdParam && rootFolderIdParam !== folderIdParam) {
      router.push(`/share/${rootFolderIdParam}?subfolderId=${folderIdParam}`);
    } else if (folderIdParam) {
      router.push(`/share/${folderIdParam}`);
    } else if (data?.parentFolder?.id) {
      router.push(`/share/${data.parentFolder.id}`);
    } else {
      router.back();
    }
  };

  // Merge database config with live preview override config
  const config: SharePageConfigData = {
    themePreset: "obsidian",
    accentColor: "#84cc16",
    backgroundStyle: "mesh-gradient",
    cardRoundness: "3xl",
    showLogo: true,
    showCta: false,
    ctaText: "Schedule a Call",
    ctaUrl: "https://example.com",
    ctaStyle: "gradient",
    showShareButton: false,
    showSocialBar: false,
    showDuration: true,
    autoPlayMuted: false,
    ...data?.sharePageConfig,
    ...overrideConfig,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-lime-500 selection:text-black">
        <div className="flex flex-col items-center gap-4 p-8 bg-slate-900/50 border border-white/5 rounded-3xl backdrop-blur-2xl shadow-2xl">
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 border-4 border-lime-500/20 border-t-lime-500 rounded-full animate-spin" />
            <Sparkles className="w-5 h-5 text-lime-400 absolute animate-pulse" />
          </div>
          <p className="text-sm font-bold text-slate-300 tracking-wide">Loading shared portal...</p>
        </div>
      </div>
    );
  }

  // 1. PRIVATE CONTENT ACCESS BLOCKED
  if (errorState?.code === "PRIVATE_CONTENT") {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-lime-500 selection:text-black relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-md w-full p-8 bg-slate-900/80 border border-white/10 rounded-3xl shadow-2xl shadow-black/80 space-y-6 text-center backdrop-blur-2xl relative z-10">
          <div className="p-4 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 shadow-lg inline-flex mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          {errorState.organizationName && (
            <span className="inline-block text-xs font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3.5 py-1 rounded-full border border-amber-500/20">
              {errorState.organizationName}
            </span>
          )}

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">Private Access</h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              The owner of <span className="font-semibold text-slate-200">"{errorState.itemTitle || "this item"}"</span> has set access to Private. Link sharing is currently disabled.
            </p>
          </div>

          {errorState.itemDescription && (
            <div className="w-full p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-left space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                About this content
              </span>
              <RichTextViewer
                content={errorState.itemDescription}
                className="text-xs text-slate-300 leading-relaxed [&_a]:text-amber-400"
              />
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-4 border-t border-slate-800/80">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Taped Protected Portal</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. AUTHENTICATION REQUIRED (NOT LOGGED IN)
  if (errorState?.code === "LOGIN_REQUIRED") {
    const callbackUrl = `/share/${token}${subfolderId ? `?subfolderId=${subfolderId}` : ""}`;
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-lime-500 selection:text-black relative overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-lime-500/10 blur-[140px] rounded-full pointer-events-none" />
        <div className="max-w-md w-full p-6 sm:p-8 bg-slate-900/80 border border-white/10 rounded-3xl shadow-2xl shadow-black/80 space-y-6 backdrop-blur-2xl relative z-10">
          {authViewMode === "options" ? (
            <>
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-4 bg-lime-500/10 text-lime-400 rounded-2xl border border-lime-500/20 shadow-lg shadow-lime-500/10">
                  <Lock className="w-8 h-8" />
                </div>

                {errorState.organizationName && (
                  <span className="text-xs font-extrabold uppercase tracking-wider text-lime-400 bg-lime-500/10 px-3.5 py-1 rounded-full border border-lime-500/20">
                    {errorState.organizationName}
                  </span>
                )}

                <h1 className="text-2xl font-black text-slate-100 tracking-tight">
                  Authentication Required
                </h1>

                <p className="text-sm text-slate-400 leading-relaxed">
                  Access to <span className="font-semibold text-slate-200">"{errorState.itemTitle || "this content"}"</span> is restricted. Choose how you would like to view this content:
                </p>

                {errorState.itemDescription && (
                  <div className="w-full p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-left space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      About this content
                    </span>
                    <RichTextViewer
                      content={errorState.itemDescription}
                      className="text-xs text-slate-300 leading-relaxed [&_a]:text-lime-400"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => router.push(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)}
                  className="w-full py-3.5 px-4 bg-lime-500 hover:bg-lime-400 text-slate-950 font-black rounded-xl shadow-lg shadow-lime-500/25 transition-all flex items-center justify-center gap-2 text-sm active:scale-98 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In to Access
                </button>

                <button
                  onClick={() => router.push(`/auth/register?mode=viewer&callbackUrl=${encodeURIComponent(callbackUrl)}`)}
                  className="w-full py-3.5 px-4 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700/80 transition-all flex items-center justify-center gap-2 text-sm active:scale-98 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-lime-400" />
                  Create Free Viewer Account
                </button>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    <span className="bg-slate-900 px-2">or temporary access</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setAuthViewMode("otp");
                    setOtpError("");
                    setOtpSuccess("");
                  }}
                  className="w-full py-3 px-4 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold rounded-xl border border-slate-800 hover:border-lime-500/40 transition-all flex items-center justify-center gap-2 text-xs active:scale-98 cursor-pointer group"
                >
                  <KeyRound className="w-3.5 h-3.5 text-lime-400 group-hover:scale-110 transition-transform" />
                  <span>Access with One-Time Email Code (24h Pass)</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-5">
              {/* Back to auth choices button */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setAuthViewMode("options");
                    setOtpError("");
                    setOtpSuccess("");
                  }}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Sign In options
                </button>

                <span className="text-[10px] font-extrabold uppercase tracking-wider text-lime-400 bg-lime-500/10 px-2.5 py-0.5 rounded-full border border-lime-500/20">
                  24h Viewer Pass
                </span>
              </div>

              <div className="text-left space-y-1.5">
                <h2 className="text-xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-lime-400" />
                  One-Time Code Access
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enter your invited email address to receive a 6-digit access code for 24-hour viewer access in this browser.
                </p>
              </div>

              {/* Professional Guidance Notice */}
              <div className="p-3.5 rounded-xl bg-lime-950/30 border border-lime-500/25 space-y-1.5 text-left">
                <div className="flex items-center gap-1.5 text-xs font-bold text-lime-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Recommended: Create an Account</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Signing in saves all videos shared with you directly into your dashboard. You won't need to request or verify OTP codes again to watch your content.
                </p>
                <div className="pt-1 flex items-center gap-3">
                  <button
                    onClick={() => router.push(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)}
                    className="text-xs font-bold text-lime-400 hover:underline cursor-pointer"
                  >
                    Sign In &rarr;
                  </button>
                  <button
                    onClick={() => router.push(`/auth/register?mode=viewer&callbackUrl=${encodeURIComponent(callbackUrl)}`)}
                    className="text-xs font-bold text-slate-300 hover:text-white hover:underline cursor-pointer"
                  >
                    Create Free Account &rarr;
                  </button>
                </div>
              </div>

              {otpError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-start gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{otpError}</span>
                </div>
              )}

              {otpSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-start gap-2 text-left">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{otpSuccess}</span>
                </div>
              )}

              {otpStep === "request" ? (
                <form onSubmit={handleSendOtp} className="space-y-3.5 text-left">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Your Invited Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={otpEmail}
                        onChange={(e) => setOtpEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 focus:outline-hidden focus:ring-2 focus:ring-lime-400 text-sm text-slate-100 placeholder:text-slate-500 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={otpLoading}
                    className="w-full py-3 px-4 bg-lime-500 hover:bg-lime-400 text-slate-950 font-black rounded-xl shadow-lg shadow-lime-500/25 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer active:scale-98"
                  >
                    {otpLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Access Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Send 6-Digit Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-3.5 text-left">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Code sent to <span className="text-slate-200 font-semibold">{otpEmail}</span></span>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpStep("request");
                        setOtpCode("");
                        setOtpError("");
                        setOtpSuccess("");
                      }}
                      className="text-lime-400 hover:underline font-bold cursor-pointer"
                    >
                      Change
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      6-Digit Access Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      autoFocus
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/80 focus:outline-hidden focus:ring-2 focus:ring-lime-400 text-center font-mono text-xl font-bold tracking-[6px] text-slate-100 placeholder:text-slate-600 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={otpLoading || otpCode.length < 6}
                    className="w-full py-3 px-4 bg-lime-500 hover:bg-lime-400 text-slate-950 font-black rounded-xl shadow-lg shadow-lime-500/25 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer active:scale-98"
                  >
                    {otpLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Pass...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Verify & Unlock Content</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpLoading}
                      className="text-xs text-slate-400 hover:text-slate-200 font-semibold hover:underline cursor-pointer disabled:opacity-50"
                    >
                      Didn't receive the code? Resend
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-3 border-t border-slate-800/80">
            <ShieldCheck className="w-4 h-4 text-lime-400" />
            <span>Secure Taped Sharing Portal</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. LOGGED IN BUT ACCESS DENIED
  if (errorState?.code === "ACCESS_DENIED") {
    const callbackUrl = `/share/${token}${subfolderId ? `?subfolderId=${subfolderId}` : ""}`;
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-lime-500 selection:text-black relative overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-500/10 blur-[140px] rounded-full pointer-events-none" />
        <div className="max-w-md w-full p-8 bg-slate-900/80 border border-white/10 rounded-3xl shadow-2xl shadow-black/80 space-y-6 text-center backdrop-blur-2xl relative z-10">
          <div className="p-4 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20 shadow-lg inline-flex mx-auto">
            <UserX className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">Access Denied</h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Signed in as <span className="font-bold text-slate-200">{errorState.userEmail}</span>, but this email address has not been granted access to <span className="font-semibold text-slate-200">"{errorState.itemTitle || "this item"}"</span>.
            </p>
          </div>

          {errorState.itemDescription && (
            <div className="w-full p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-left space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                About this content
              </span>
              <RichTextViewer
                content={errorState.itemDescription}
                className="text-xs text-slate-300 leading-relaxed [&_a]:text-lime-400"
              />
            </div>
          )}
          {/* Request Access Action Box */}
          <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-3 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Need Access to this Content?</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-lime-400 bg-lime-500/10 px-2 py-0.5 rounded-full border border-lime-500/20">
                Restricted
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              You can send an access request to the content creator. Once approved, you'll be granted permission to view and stream this content.
            </p>

            {requestAccessSuccess ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{requestAccessMessage || "Access request submitted! The creator has been notified."}</span>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                {requestAccessError && (
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{requestAccessError}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleRequestAccess}
                  disabled={requestAccessLoading}
                  className="w-full py-3 px-4 bg-lime-500 hover:bg-lime-400 text-slate-950 font-black rounded-xl shadow-lg shadow-lime-500/20 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {requestAccessLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Request Access from Creator</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="pt-1">
            <button
              onClick={() => signOut({ callbackUrl: `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}` })}
              className="w-full py-3 px-4 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl border border-slate-700/80 transition-all flex items-center justify-center gap-2 text-xs active:scale-98 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-400" />
              <span>Sign In with a Different Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. UNHANDLED ERROR / LINK NOT FOUND
  if (errorState || !data) {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-lime-500 selection:text-black">
        <div className="max-w-md w-full p-8 bg-slate-900/80 border border-white/10 rounded-3xl shadow-2xl text-center space-y-4 backdrop-blur-2xl">
          <div className="inline-flex p-4 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-slate-100">Unable to load shared content</h1>
          <p className="text-sm text-slate-400">{errorState?.message || "This share link is invalid or expired."}</p>
        </div>
      </div>
    );
  }

  const { organization } = data;
  const isVideo = data.type === "video";
  const isPlaylist = data.type === "playlist";
  const isFolder = data.type === "folder";
  const isMeeting = data.type === "meeting";

  // Dynamic Theme Preset Class & Style Mapping
  const preset = config.themePreset || "obsidian";

  let bgClass = "bg-[#030712] text-slate-100";
  let cardBgClass = "bg-slate-900/80 border-white/10 shadow-2xl";
  let headerBgClass = "bg-[#030712]/75 border-white/8";
  let accentHex = config.accentColor || "#84cc16";

  if (preset === "cyberpunk") {
    bgClass = "bg-[#070312] text-slate-100";
    cardBgClass = "bg-[#0f0724]/90 border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)]";
    headerBgClass = "bg-[#070312]/80 border-cyan-500/20";
    if (!config.accentColor || config.accentColor === "#84cc16") accentHex = "#06b6d4";
  } else if (preset === "vaporwave") {
    bgClass = "bg-[#0f041c] text-purple-100";
    cardBgClass = "bg-[#1d0836]/90 border-pink-500/30 shadow-[0_0_40px_rgba(236,72,153,0.15)]";
    headerBgClass = "bg-[#0f041c]/80 border-pink-500/20";
    if (!config.accentColor || config.accentColor === "#84cc16") accentHex = "#ec4899";
  } else if (preset === "gold") {
    bgClass = "bg-[#0c0a09] text-stone-100";
    cardBgClass = "bg-[#1c1917]/90 border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.15)]";
    headerBgClass = "bg-[#0c0a09]/80 border-amber-500/20";
    if (!config.accentColor || config.accentColor === "#84cc16") accentHex = "#eab308";
  } else if (preset === "ocean") {
    bgClass = "bg-[#021124] text-sky-100";
    cardBgClass = "bg-[#072449]/90 border-sky-400/30 shadow-[0_0_40px_rgba(56,189,248,0.15)]";
    headerBgClass = "bg-[#021124]/80 border-sky-400/20";
    if (!config.accentColor || config.accentColor === "#84cc16") accentHex = "#38bdf8";
  } else if (preset === "sunset") {
    bgClass = "bg-[#17050b] text-rose-50";
    cardBgClass = "bg-[#2d0d17]/90 border-orange-500/30 shadow-[0_0_40px_rgba(249,115,22,0.15)]";
    headerBgClass = "bg-[#17050b]/80 border-orange-500/20";
    if (!config.accentColor || config.accentColor === "#84cc16") accentHex = "#f97316";
  } else if (preset === "minimal-light") {
    bgClass = "bg-slate-50 text-slate-900";
    cardBgClass = "bg-white border-slate-200/90 shadow-xl shadow-slate-200/50";
    headerBgClass = "bg-white/80 border-slate-200";
    if (!config.accentColor || config.accentColor === "#84cc16") accentHex = "#2563eb";
  }

  // Card roundness
  let roundnessClass = "rounded-3xl";
  if (config.cardRoundness === "xl") roundnessClass = "rounded-xl";
  if (config.cardRoundness === "pill") roundnessClass = "rounded-[2.5rem]";
  if (config.cardRoundness === "square") roundnessClass = "rounded-none";

  // Display logo URL
  const logoUrlToDisplay = config.customLogoUrl || organization.logoUrl;
  // Display page title
  const displayTitle = config.customTitle || organization.name;

  // Current page URL for social sharing
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareTitle = data.video?.title
    ? `${data.video.title} — ${displayTitle}`
    : data.playlist?.title
      ? `${data.playlist.title} (Playlist) — ${displayTitle}`
      : data.meeting?.title
        ? `${data.meeting.title} (Meeting) — ${displayTitle}`
        : displayTitle;

  return (
    <div
      className={`min-h-screen flex flex-col selection:bg-lime-500 selection:text-black font-sans antialiased transition-colors duration-500 relative ${bgClass}`}
    >
      {/* Background Aura Effects */}
      {config.backgroundStyle === "mesh-gradient" && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div
            className="absolute -top-32 left-1/4 w-[500px] h-[500px] rounded-full blur-[140px] opacity-25 animate-pulse"
            style={{ backgroundColor: accentHex }}
          />
          <div
            className="absolute top-1/3 -right-20 w-[450px] h-[450px] rounded-full blur-[160px] opacity-20"
            style={{ backgroundColor: accentHex }}
          />
        </div>
      )}

      {config.backgroundStyle === "obsidian-aura" && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[180px] opacity-20"
            style={{ backgroundColor: accentHex }}
          />
        </div>
      )}

      {config.backgroundStyle === "neon-grid" && (
        <div
          className="fixed inset-0 pointer-events-none z-0 opacity-15"
          style={{
            backgroundImage: `radial-gradient(${accentHex} 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
      )}

      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-2xl border-b shadow-lg transition-all ${headerBgClass}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrlToDisplay ? (
              <img
                src={logoUrlToDisplay}
                alt={displayTitle}
                className="w-10 h-10 rounded-xl object-cover border border-white/10 shadow-md"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-950 font-black text-lg shadow-lg ring-1 ring-white/20"
                style={{ backgroundColor: accentHex }}
              >
                {displayTitle.substring(0, 2).toUpperCase()}
              </div>
            )}

            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-tight flex items-center gap-1.5">
                  {displayTitle}
                </span>
                {isFolder && data.currentFolder && (
                  <span className="hidden sm:inline-block text-xs font-bold text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700/60">
                    {data.currentFolder.name}
                  </span>
                )}
                {isPlaylist && data.playlist && (
                  <span className="hidden sm:inline-block text-xs font-bold text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700/60">
                    {data.playlist.title}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {config.showShareButton && (
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-xs font-bold text-slate-200 transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                title="Copy link to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" style={{ color: accentHex }} />
                    <span style={{ color: accentHex }}>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        {/* Welcome Banner Image & Subtitle Banner */}
        {((config.welcomeBannerUrl || organization.coverUrl) || config.welcomeTagline) && (
          <div className="max-w-4xl mx-auto space-y-4 text-center">
            {(config.welcomeBannerUrl || organization.coverUrl) && (
              <div className={`w-full overflow-hidden border border-white/10 shadow-2xl max-h-72 bg-slate-900 ${roundnessClass}`}>
                <img
                  src={config.welcomeBannerUrl || organization.coverUrl || ""}
                  alt="Welcome Banner"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            {config.welcomeTagline && (
              <div className="py-2">
                {(() => {
                  const val = config.welcomeTaglineFontSize || "24";
                  let fontSizePx = "24px";
                  let weightClass = "font-black";

                  if (val === "sm") { fontSizePx = "14px"; weightClass = "font-semibold"; }
                  else if (val === "md") { fontSizePx = "16px"; weightClass = "font-bold"; }
                  else if (val === "lg") { fontSizePx = "18px"; weightClass = "font-extrabold"; }
                  else if (val === "xl") { fontSizePx = "24px"; weightClass = "font-black"; }
                  else if (val === "2xl") { fontSizePx = "36px"; weightClass = "font-black"; }
                  else {
                    const parsed = parseInt(val, 10);
                    if (!isNaN(parsed) && parsed > 0) {
                      fontSizePx = `${parsed}px`;
                      if (parsed <= 14) weightClass = "font-semibold";
                      else if (parsed <= 18) weightClass = "font-bold";
                      else if (parsed >= 28) weightClass = "font-black";
                      else weightClass = "font-extrabold";
                    }
                  }

                  return (
                    <h2
                      className={`tracking-tight ${weightClass}`}
                      style={{ fontSize: fontSizePx }}
                    >
                      {config.welcomeTagline}
                    </h2>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* MEETING SHARE & ENTRY PASS VIEW */}
        {isMeeting && data.meeting && (
          <div className="relative group max-w-4xl mx-auto space-y-6">
            {/* Ambient Glow */}
            <div
              className="absolute -inset-1 rounded-3xl blur-3xl opacity-35 group-hover:opacity-70 transition-opacity duration-1000 -z-10 pointer-events-none"
              style={{ backgroundColor: accentHex }}
            />

            {/* Hero Conference Card */}
            <div className={`overflow-hidden border backdrop-blur-2xl shadow-2xl ${cardBgClass} ${roundnessClass}`}>
              {/* Top Banner / Status Strip */}
              <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                    {data.meeting.status === "ACTIVE"
                      ? "Live Meeting In Progress"
                      : data.meeting.status === "COMPLETED"
                        ? "Meeting Concluded"
                        : "Live Scheduled Conference"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {data.accessMode === "PURCHASABLE" && (
                    <Badge
                      variant="outline"
                      className="text-xs font-bold gap-1 px-3 py-1 bg-amber-500/10 border-amber-500/30 text-amber-400"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>{data.isPurchased ? "Entry Pass Verified" : "Purchasable Entry Pass"}</span>
                    </Badge>
                  )}
                  {data.meeting.recordOnStart && (
                    <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wide">
                      Auto-Record
                    </Badge>
                  )}
                </div>
              </div>

              <div className="p-6 sm:p-10 space-y-8">
                {/* Main Title & Host Section */}
                <div className="space-y-4">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
                    {data.meeting.title}
                  </h1>

                  {data.meeting.description && (
                    <div className="text-base text-slate-300 leading-relaxed max-w-3xl">
                      <RichTextViewer content={data.meeting.description} className="text-slate-300 [&_a]:text-primary" />
                    </div>
                  )}
                </div>

                {/* Host Profile & Organization Card */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 backdrop-blur-md">
                  <div className="flex items-center gap-3.5">
                    {data.meeting.createdBy?.image ? (
                      <img
                        src={data.meeting.createdBy.image}
                        alt={data.meeting.createdBy.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-slate-700 shadow-md"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-base text-slate-950 shadow-md"
                        style={{ backgroundColor: accentHex }}
                      >
                        {(data.meeting.createdBy?.name || "H").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-extrabold text-slate-100">
                          {data.meeting.createdBy?.name || "Meeting Host"}
                        </p>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          Host
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Organized by {organization.name}
                      </p>
                    </div>
                  </div>

                  {/* Scheduled Date/Time Badge */}
                  {data.meeting.scheduledStart && (
                    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <Calendar className="w-5 h-5" style={{ color: accentHex }} />
                      <div className="text-left">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Scheduled For</p>
                        <p className="text-xs font-bold text-slate-200">
                          {formatMeetingTime(data.meeting.scheduledStart)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Live Countdown & Event Room Readiness */}
                {data.meeting.scheduledStart && (
                  <MeetingCountdown scheduledStart={data.meeting.scheduledStart} accentHex={accentHex} />
                )}

                {/* TICKET STUB / PASS PURCHASE OR JOIN ACTION SECTION */}
                {data.accessMode === "PURCHASABLE" && !data.isPurchased ? (
                  /* UNPURCHASED PASS STATE */
                  <div className="relative p-6 sm:p-8 rounded-2xl bg-linear-to-b from-slate-950 to-slate-900 border-2 border-dashed border-slate-700 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Ticket className="w-5 h-5 text-amber-400" />
                          <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
                            Official Entry Pass Required
                          </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-white">
                          Buy Entry Ticket for this Meeting
                        </h2>
                        <p className="text-xs text-slate-400">
                          One-time pass grants full attendee access when the meeting starts.
                        </p>
                      </div>

                      {/* Price & Currency Display */}
                      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center sm:text-right shrink-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pass Price</p>
                        <p className="text-3xl font-black mt-0.5" style={{ color: accentHex }}>
                          {getCalculatedPrice(data, selectedBuyerCountry).formatted}
                        </p>
                      </div>
                    </div>

                    {/* Country Selector for Dynamic Pricing */}
                    {data.countryPricing && data.countryPricing.length > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                        <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5 text-slate-400" /> Billing Country:
                        </span>
                        <select
                          value={selectedBuyerCountry}
                          onChange={(e) => setSelectedBuyerCountry(e.target.value)}
                          className="bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 rounded-lg px-3 py-1.5 focus:outline-hidden"
                        >
                          <option value="">Default International ({data.currency || "USD"})</option>
                          {data.countryPricing.map((cp) => (
                            <option key={cp.countryCode} value={cp.countryCode}>
                              {cp.countryName || cp.countryCode} ({cp.currency} {cp.amount})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Primary Action Button */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
                      {!data.isLoggedIn ? (
                        <button
                          onClick={() => {
                            const callback = typeof window !== "undefined" ? window.location.href : `/share/${token}`;
                            router.push(`/auth/login?callbackUrl=${encodeURIComponent(callback)}`);
                          }}
                          className="w-full py-4 px-8 rounded-xl font-black text-sm text-slate-950 flex items-center justify-center gap-2.5 shadow-2xl transition-all hover:opacity-90 active:scale-98 cursor-pointer"
                          style={{ backgroundColor: accentHex }}
                        >
                          <LogIn className="w-4 h-4" />
                          <span>
                            {getCalculatedPrice(data, selectedBuyerCountry).isFree
                              ? "Sign in to Claim Free Pass"
                              : `Sign in to Purchase Pass • ${getCalculatedPrice(data, selectedBuyerCountry).formatted}`}
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={handleExecuteCheckout}
                          disabled={isCheckingOut}
                          className="w-full py-4 px-8 rounded-xl font-black text-sm text-slate-950 flex items-center justify-center gap-2.5 shadow-2xl transition-all hover:opacity-90 active:scale-98 disabled:opacity-50 cursor-pointer"
                          style={{ backgroundColor: accentHex }}
                        >
                          {isCheckingOut ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> Unlocking Free Pass...
                            </>
                          ) : getCalculatedPrice(data, selectedBuyerCountry).isFree ? (
                            <>
                              <Sparkles className="w-4 h-4 stroke-[2.5]" />
                              <span>Buy for Free</span>
                            </>
                          ) : (
                            <>
                              <Ticket className="w-4 h-4 stroke-[2.5]" />
                              <span>Purchase Entry Pass &bull; {getCalculatedPrice(data, selectedBuyerCountry).formatted}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Instant Digital Pass • 256-bit Encrypted Checkout • Money-Back Guarantee</span>
                    </div>
                  </div>
                ) : (
                  /* PURCHASED OR OPEN ACCESS STATE */
                  <div className="p-6 sm:p-8 rounded-2xl bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-emerald-500/40 shadow-xl space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                            Attendee Pass Confirmed
                          </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-white">
                          You Have Access to this Meeting
                        </h2>
                        <p className="text-xs text-slate-400">
                          Your seat is reserved. Click below to enter the live conference room when ready.
                        </p>
                      </div>

                      <div className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center shrink-0">
                        <span>Pass Status: ACTIVE</span>
                      </div>
                    </div>

                    {/* Join Meeting Action */}
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <button
                        onClick={() => router.push(`/meet/${data.meeting?.id || token}`)}
                        className="w-full sm:flex-1 py-4 px-8 rounded-xl font-black text-sm text-slate-950 flex items-center justify-center gap-2.5 shadow-2xl transition-all hover:opacity-90 active:scale-98 cursor-pointer"
                        style={{ backgroundColor: accentHex }}
                      >
                        <Video className="w-5 h-5" />
                        <span>Join Meeting Room Now</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <button
                        onClick={handleCopyLink}
                        className="w-full sm:w-auto px-5 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        <span>{copied ? "Copied Link" : "Copy Invite"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SINGLE VIDEO SHARE VIEW */}
        {isVideo && data.video && (
          <div className="relative group max-w-5xl mx-auto space-y-6">
            {/* Ambient Backlight */}
            <div
              className="absolute -inset-1 rounded-3xl blur-2xl opacity-40 group-hover:opacity-80 transition-opacity duration-1000 -z-10 pointer-events-none"
              style={{ backgroundColor: accentHex }}
            />

            {/* Back to Folder Navigation */}
            {data.parentFolder && (
              <div className={`flex items-center justify-between gap-3 text-xs sm:text-sm backdrop-blur-xl px-4 py-3 border transition-all ${cardBgClass} ${roundnessClass}`}>
                <button
                  onClick={handleBackToFolder}
                  className="font-bold flex items-center gap-2 transition-all group cursor-pointer hover:opacity-90 active:scale-98 text-slate-200"
                >
                  <div
                    className="p-1.5 rounded-lg group-hover:scale-110 transition-transform flex items-center justify-center shadow-xs"
                    style={{
                      backgroundColor: `${accentHex}15`,
                      color: accentHex,
                    }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </div>
                  <span className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-medium">Back to</span>
                    <span className="font-extrabold" style={{ color: accentHex }}>
                      {data.parentFolder.name}
                    </span>
                  </span>
                </button>

                <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-semibold bg-slate-800/50 px-2.5 py-1 rounded-lg border border-slate-700/40">
                  <Folder className="w-3.5 h-3.5 text-amber-400" />
                  <span>Folder Collection</span>
                </div>
              </div>
            )}

            {/* Video Player or Purchasable Paywall */}
            <div className={data.video.playbackUrl ? "aspect-video w-full rounded-xl overflow-hidden shadow-2xl" : "w-full min-h-[440px] sm:min-h-[480px] sm:aspect-video rounded-2xl overflow-hidden shadow-2xl relative"}>
              {data.video.playbackUrl ? (
                <VideoPlayer src={data.video.playbackUrl} poster={data.video.thumbnailUrl} className="w-full h-full rounded-xl" />
              ) : data.accessMode === "PURCHASABLE" ? (
                <div className="relative w-full h-full min-h-[440px] sm:min-h-0 bg-slate-950 flex flex-col items-center justify-center text-center p-5 sm:p-8 overflow-hidden border border-slate-800">
                  {/* Poster Backdrop with Blur */}
                  {data.video.thumbnailUrl && (
                    <div
                      className="absolute inset-0 bg-cover bg-center filter blur-lg opacity-25 scale-105"
                      style={{ backgroundImage: `url(${data.video.thumbnailUrl})` }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />

                  <div className="relative z-10 max-w-md w-full mx-auto space-y-3.5 sm:space-y-4 flex flex-col items-center">
                    <div
                      className="p-3 sm:p-3.5 rounded-2xl flex items-center justify-center shadow-lg border"
                      style={{
                        backgroundColor: `${accentHex}20`,
                        borderColor: `${accentHex}40`,
                        color: accentHex,
                      }}
                    >
                      <Lock className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                        Purchasable Video
                      </span>
                      <h3 className="text-lg sm:text-2xl font-black text-white leading-snug">
                        {data.video.title}
                      </h3>
                    </div>

                    {/* Listed price based on current country */}
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md text-center min-w-[180px] sm:min-w-[200px] shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Price</p>
                      <p className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5" style={{ color: accentHex }}>
                        {getCalculatedPrice(data, selectedBuyerCountry).formatted}
                      </p>
                    </div>

                    {/* Country Selector for Dynamic Pricing */}
                    {data.countryPricing && data.countryPricing.length > 0 && (
                      <div className="w-full flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                        <span className="text-slate-400 font-semibold flex items-center gap-1.5 shrink-0 text-[11px] sm:text-xs">
                          <Globe className="w-3.5 h-3.5 text-slate-400" /> Billing Country:
                        </span>
                        <select
                          value={selectedBuyerCountry}
                          onChange={(e) => setSelectedBuyerCountry(e.target.value)}
                          className="bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 rounded-lg px-2.5 py-1 focus:outline-hidden"
                        >
                          <option value="">Default ({data.currency || "USD"})</option>
                          {data.countryPricing.map((cp) => (
                            <option key={cp.countryCode} value={cp.countryCode}>
                              {cp.countryName || cp.countryCode} ({cp.currency} {cp.amount})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Action Button */}
                    {!data.isLoggedIn ? (
                      <button
                        onClick={() => {
                          const callback = typeof window !== "undefined" ? window.location.href : `/share/${token}`;
                          router.push(`/auth/login?callbackUrl=${encodeURIComponent(callback)}`);
                        }}
                        className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-slate-950 flex items-center justify-center gap-2 transition-all shadow-xl hover:opacity-90 active:scale-95 cursor-pointer"
                        style={{ backgroundColor: accentHex }}
                      >
                        <LogIn className="w-4 h-4" />
                        <span>{getCalculatedPrice(data, selectedBuyerCountry).isFree ? "Sign in to Claim for Free" : `Sign in to Purchase • ${getCalculatedPrice(data, selectedBuyerCountry).formatted}`}</span>
                      </button>
                    ) : (
                      <button
                        onClick={getCalculatedPrice(data, selectedBuyerCountry).isFree ? handleExecuteCheckout : () => setIsCheckoutOpen(true)}
                        disabled={isCheckingOut}
                        className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-sm text-slate-950 flex items-center justify-center gap-2 transition-all shadow-xl hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer"
                        style={{ backgroundColor: accentHex }}
                      >
                        {isCheckingOut ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Claiming Free Access...
                          </>
                        ) : getCalculatedPrice(data, selectedBuyerCountry).isFree ? (
                          <>
                            <Sparkles className="w-4 h-4 stroke-[2.5]" />
                            <span>Buy for Free</span>
                          </>
                        ) : (
                          <>
                            <DollarSign className="w-4 h-4 stroke-[3]" />
                            <span>Buy Now &bull; {getCalculatedPrice(data, selectedBuyerCountry).formatted}</span>
                          </>
                        )}
                      </button>
                    )}

                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Instant Access &bull; Secure Checkout</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full min-h-[300px] bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-6 border border-slate-800">
                  <Film className="w-12 h-12 mb-2 text-slate-600 animate-pulse" />
                  <p className="text-sm font-semibold">Video is processing or unplayable.</p>
                </div>
              )}
            </div>

            {/* Video Detail & Controls Card */}
            <div className={`p-6 sm:p-8 space-y-6 backdrop-blur-2xl ${cardBgClass} ${roundnessClass}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="px-3 py-1 text-xs font-extrabold rounded-full flex items-center gap-1.5 border"
                      style={{
                        backgroundColor: `${accentHex}15`,
                        borderColor: `${accentHex}30`,
                        color: accentHex,
                      }}
                    >
                      <Film className="w-3.5 h-3.5" /> Shared Video
                    </span>
                    {config.showDuration && data.video.durationSeconds && (
                      <span className="px-3 py-1 bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-semibold rounded-full flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" style={{ color: accentHex }} />
                        {formatDuration(data.video.durationSeconds)}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
                    {data.video.title}
                  </h1>
                </div>

                {config.showShareButton && (
                  <button
                    onClick={handleCopyLink}
                    className="self-start sm:self-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold rounded-xl border border-slate-700/80 transition-all flex items-center gap-2 text-xs shadow-md active:scale-95 shrink-0 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" style={{ color: accentHex }} />
                        <span>Link Copied</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" style={{ color: accentHex }} />
                        <span>Share Video</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Purchasable Video Quick Action Banner */}
              {data.accessMode === "PURCHASABLE" && !data.isPurchased && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                  <div className="flex items-center gap-3 text-left w-full sm:w-auto">
                    <div
                      className="p-2.5 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${accentHex}20`, color: accentHex }}
                    >
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Full Video Access Required</h4>
                      <p className="text-xs text-slate-400">One-time purchase unlocks instant permanent playback</p>
                    </div>
                  </div>
                  <button
                    onClick={!data.isLoggedIn ? () => {
                      const callback = typeof window !== "undefined" ? window.location.href : `/share/${token}`;
                      router.push(`/auth/login?callbackUrl=${encodeURIComponent(callback)}`);
                    } : (getCalculatedPrice(data, selectedBuyerCountry).isFree ? handleExecuteCheckout : () => setIsCheckoutOpen(true))}
                    disabled={isCheckingOut}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs text-slate-950 flex items-center justify-center gap-2 shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                    style={{ backgroundColor: accentHex }}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{getCalculatedPrice(data, selectedBuyerCountry).isFree ? "Claim for Free" : `Buy Now • ${getCalculatedPrice(data, selectedBuyerCountry).formatted}`}</span>
                  </button>
                </div>
              )}

              {data.video.description && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Description</h3>
                  <RichTextViewer content={data.video.description} className="text-sm text-slate-300 leading-relaxed [&_a]:text-primary" />
                </div>
              )}

              {/* Call-to-Action (CTA) Card (if enabled) */}
              {config.showCta && config.ctaUrl && (
                <div
                  className="p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all shadow-lg"
                  style={{
                    backgroundColor: `${accentHex}10`,
                    borderColor: `${accentHex}40`,
                  }}
                >
                  <div className="space-y-1 text-center sm:text-left">
                    <h4 className="font-extrabold text-base tracking-tight">Interested in learning more?</h4>
                    <p className="text-xs text-slate-300">Click below to take the next step with {displayTitle}.</p>
                  </div>
                  <a
                    href={config.ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 rounded-xl text-slate-950 font-black text-sm transition-all flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 shrink-0"
                    style={{ backgroundColor: accentHex }}
                  >
                    <span>{config.ctaText || "Learn More"}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}

              {/* Social Sharing Bar */}
              {config.showSocialBar && (
                <div className="space-y-2 pt-2 border-t border-slate-800/60">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Share video to</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 text-slate-200"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      Twitter / X
                    </a>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 text-slate-200"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                      </svg>
                      LinkedIn
                    </a>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`${shareTitle} ${shareUrl}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 text-slate-200"
                    >
                      <Send className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                  </div>
                </div>
              )}

              {/* Portal Security Badge */}
              <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span>Hosted by</span>
                  <span className="font-bold bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/40">
                    {displayTitle}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <ShieldCheck className="w-4 h-4" style={{ color: accentHex }} />
                  <span>Encrypted Link Access</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PLAYLIST SHARE VIEW */}
        {isPlaylist && data.playlist && (
          <div className="space-y-6">
            {/* Top Playlist Header Banner */}
            <div className={`p-5 backdrop-blur-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${cardBgClass} ${roundnessClass}`}>
              <div className="flex items-center gap-3.5">
                <div
                  className="p-3 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
                  style={{
                    backgroundColor: `${accentHex}20`,
                    color: accentHex,
                  }}
                >
                  <ListVideo className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Shared Playlist
                    </span>
                    {data.playlist.totalDurationSeconds > 0 && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50 flex items-center gap-1">
                        <Clock className="w-3 h-3" style={{ color: accentHex }} />
                        {formatDuration(data.playlist.totalDurationSeconds)}
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-100">
                    {data.playlist.title}
                  </h1>
                  {data.playlist.description && (
                    <div className="mt-1.5 max-w-2xl">
                      <RichTextViewer
                        content={data.playlist.description}
                        className="text-xs sm:text-sm text-slate-300 leading-relaxed [&_a]:text-primary"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className="px-3 py-1.5 rounded-full text-xs font-black border flex items-center gap-1.5"
                  style={{
                    backgroundColor: `${accentHex}15`,
                    borderColor: `${accentHex}30`,
                    color: accentHex,
                  }}
                >
                  <Film className="w-3.5 h-3.5" />
                  {data.videos?.length || 0} {(data.videos?.length || 0) === 1 ? "Video" : "Videos"}
                </span>

                {config.showShareButton && (
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer border border-slate-700"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{copied ? "Link Copied" : "Share"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2-Column Main View: Video Player + Playlist Tracklist Queue */}
            {!data.videos || data.videos.length === 0 ? (
              <div className={`py-16 text-center border backdrop-blur-md ${cardBgClass} ${roundnessClass}`}>
                <ListVideo className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-pulse" />
                <p className="text-sm font-bold text-slate-300">This playlist is currently empty</p>
                <p className="text-xs text-slate-400 mt-1">Check back later for new videos.</p>
              </div>
            ) : (
              (() => {
                const currentVideo = data.videos[activePlaylistIndex] || data.videos[0];
                const filteredQueue = data.videos.filter((v) =>
                  v.title.toLowerCase().includes(playlistSearchQuery.toLowerCase())
                );

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Left Column (2 cols): Video Player & Info */}
                    <div className="lg:col-span-2 space-y-5">
                      {/* Video Player Box or Purchasable Paywall */}
                      <div className="relative group/player rounded-2xl overflow-hidden shadow-2xl bg-black border border-slate-800">
                        <div className={currentVideo?.playbackUrl ? "aspect-video w-full" : "w-full min-h-[440px] sm:min-h-[480px] sm:aspect-video"}>
                          {currentVideo?.playbackUrl ? (
                            <VideoPlayer
                              key={currentVideo.id}
                              src={currentVideo.playbackUrl}
                              poster={currentVideo.thumbnailUrl}
                              autoplay={activePlaylistIndex > 0 || config.autoPlayMuted}
                              className="w-full h-full"
                            />
                          ) : data.accessMode === "PURCHASABLE" ? (
                            <div className="relative w-full h-full min-h-[440px] sm:min-h-0 bg-slate-950 flex flex-col items-center justify-center text-center p-5 sm:p-8 overflow-hidden">
                              {data.playlist.thumbnailUrl && (
                                <div
                                  className="absolute inset-0 bg-cover bg-center filter blur-lg opacity-25 scale-105"
                                  style={{ backgroundImage: `url(${data.playlist.thumbnailUrl})` }}
                                />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />

                              <div className="relative z-10 max-w-md w-full mx-auto space-y-3.5 sm:space-y-4 flex flex-col items-center">
                                <div
                                  className="p-3 sm:p-3.5 rounded-2xl flex items-center justify-center shadow-lg border"
                                  style={{
                                    backgroundColor: `${accentHex}20`,
                                    borderColor: `${accentHex}40`,
                                    color: accentHex,
                                  }}
                                >
                                  <Lock className="w-6 h-6 sm:w-7 sm:h-7" />
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                                    Purchasable Playlist &bull; {data.videos?.length || 0} Videos Included
                                  </span>
                                  <h3 className="text-lg sm:text-2xl font-black text-white leading-snug">
                                    {data.playlist.title}
                                  </h3>
                                </div>

                                {/* Listed price based on current country */}
                                <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md text-center min-w-[180px] sm:min-w-[200px] shadow-sm">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Playlist Price</p>
                                  <p className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5" style={{ color: accentHex }}>
                                    {getCalculatedPrice(data, selectedBuyerCountry).formatted}
                                  </p>
                                </div>

                                {/* Country Selector for Dynamic Pricing */}
                                {data.countryPricing && data.countryPricing.length > 0 && (
                                  <div className="w-full flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                                    <span className="text-slate-400 font-semibold flex items-center gap-1.5 shrink-0 text-[11px] sm:text-xs">
                                      <Globe className="w-3.5 h-3.5 text-slate-400" /> Billing Country:
                                    </span>
                                    <select
                                      value={selectedBuyerCountry}
                                      onChange={(e) => setSelectedBuyerCountry(e.target.value)}
                                      className="bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 rounded-lg px-2.5 py-1 focus:outline-hidden"
                                    >
                                      <option value="">Default ({data.currency || "USD"})</option>
                                      {data.countryPricing.map((cp) => (
                                        <option key={cp.countryCode} value={cp.countryCode}>
                                          {cp.countryName || cp.countryCode} ({cp.currency} {cp.amount})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                {!data.isLoggedIn ? (
                                  <button
                                    onClick={() => {
                                      const callback = typeof window !== "undefined" ? window.location.href : `/share/${token}`;
                                      router.push(`/auth/login?callbackUrl=${encodeURIComponent(callback)}`);
                                    }}
                                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-slate-950 flex items-center justify-center gap-2 transition-all shadow-xl hover:opacity-90 active:scale-95 cursor-pointer"
                                    style={{ backgroundColor: accentHex }}
                                  >
                                    <LogIn className="w-4 h-4" />
                                    <span>
                                      {getCalculatedPrice(data, selectedBuyerCountry).isFree
                                        ? "Sign in to Unlock Playlist for Free"
                                        : `Sign in to Unlock Playlist • ${getCalculatedPrice(data, selectedBuyerCountry).formatted}`}
                                    </span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={getCalculatedPrice(data, selectedBuyerCountry).isFree ? handleExecuteCheckout : () => setIsCheckoutOpen(true)}
                                    disabled={isCheckingOut}
                                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-sm text-slate-950 flex items-center justify-center gap-2 transition-all shadow-xl hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer"
                                    style={{ backgroundColor: accentHex }}
                                  >
                                    {isCheckingOut ? (
                                      <>
                                        <Loader2 className="w-4 h-4 animate-spin" /> Unlocking Playlist...
                                      </>
                                    ) : getCalculatedPrice(data, selectedBuyerCountry).isFree ? (
                                      <>
                                        <Sparkles className="w-4 h-4 stroke-[2.5]" />
                                        <span>Buy for Free</span>
                                      </>
                                    ) : (
                                      <>
                                        <DollarSign className="w-4 h-4 stroke-[3]" />
                                        <span>Unlock Full Playlist &bull; {getCalculatedPrice(data, selectedBuyerCountry).formatted}</span>
                                      </>
                                    )}
                                  </button>
                                )}

                                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span>Instant Access &bull; Secure Checkout</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full min-h-[300px] bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-6">
                              <Film className="w-12 h-12 mb-2 text-slate-600 animate-pulse" />
                              <p className="text-sm font-semibold">Video is processing or unplayable.</p>
                            </div>
                          )}
                        </div>

                        {/* Player Controls Bar */}
                        <div className="p-3 bg-slate-950/95 border-t border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-300">
                          <button
                            onClick={() => setActivePlaylistIndex((prev) => Math.max(0, prev - 1))}
                            disabled={activePlaylistIndex === 0}
                            className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800/80 font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                          >
                            <SkipBack className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Previous</span>
                          </button>

                          <div className="flex items-center gap-2 font-bold text-xs">
                            <span className="text-slate-400 font-mono">
                              Track {activePlaylistIndex + 1} of {data.videos.length}
                            </span>
                          </div>

                          <button
                            onClick={() =>
                              setActivePlaylistIndex((prev) => Math.min((data.videos?.length || 1) - 1, prev + 1))
                            }
                            disabled={activePlaylistIndex >= (data.videos.length - 1)}
                            className="px-3 py-1.5 font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                            style={{
                              backgroundColor:
                                activePlaylistIndex < data.videos.length - 1 ? accentHex : "rgba(30,41,59,0.8)",
                              color: activePlaylistIndex < data.videos.length - 1 ? "#020617" : "#94a3b8",
                              opacity: activePlaylistIndex >= data.videos.length - 1 ? 0.3 : 1,
                            }}
                          >
                            <span className="hidden sm:inline">Next Video</span>
                            <SkipForward className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Video Details Card */}
                      <div className={`p-6 space-y-4 backdrop-blur-2xl ${cardBgClass} ${roundnessClass}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="px-2.5 py-0.5 text-[10px] font-black rounded-md uppercase tracking-wider"
                                style={{
                                  backgroundColor: `${accentHex}20`,
                                  color: accentHex,
                                }}
                              >
                                Now Playing #{activePlaylistIndex + 1}
                              </span>
                              {config.showDuration && currentVideo?.durationSeconds && (
                                <span className="px-2.5 py-0.5 bg-slate-800/80 border border-slate-700/60 text-slate-300 text-[11px] font-semibold rounded-md flex items-center gap-1">
                                  <Clock className="w-3 h-3" style={{ color: accentHex }} />
                                  {formatDuration(currentVideo.durationSeconds)}
                                </span>
                              )}
                            </div>
                            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
                              {currentVideo?.title}
                            </h2>
                          </div>
                        </div>

                        {/* Purchasable Playlist Quick Action Banner */}
                        {data.accessMode === "PURCHASABLE" && !data.isPurchased && (
                          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                            <div className="flex items-center gap-3 text-left w-full sm:w-auto">
                              <div
                                className="p-2.5 rounded-xl flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${accentHex}20`, color: accentHex }}
                              >
                                <Lock className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-white">Full Playlist Access Required</h4>
                                <p className="text-xs text-slate-400">Unlocks all {data.videos?.length || 0} videos in this collection</p>
                              </div>
                            </div>
                            <button
                              onClick={!data.isLoggedIn ? () => {
                                const callback = typeof window !== "undefined" ? window.location.href : `/share/${token}`;
                                router.push(`/auth/login?callbackUrl=${encodeURIComponent(callback)}`);
                              } : (getCalculatedPrice(data, selectedBuyerCountry).isFree ? handleExecuteCheckout : () => setIsCheckoutOpen(true))}
                              disabled={isCheckingOut}
                              className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs text-slate-950 flex items-center justify-center gap-2 shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                              style={{ backgroundColor: accentHex }}
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>{getCalculatedPrice(data, selectedBuyerCountry).isFree ? "Claim for Free" : `Unlock Playlist • ${getCalculatedPrice(data, selectedBuyerCountry).formatted}`}</span>
                            </button>
                          </div>
                        )}

                        {currentVideo?.description && (
                          <div className="space-y-1">
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                              About this video
                            </h3>
                            <RichTextViewer content={currentVideo.description} className="text-sm text-slate-300 leading-relaxed [&_a]:text-primary" />
                          </div>
                        )}

                        {/* Call-to-Action (CTA) Card (if enabled) */}
                        {config.showCta && config.ctaUrl && (
                          <div
                            className="p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all shadow-lg"
                            style={{
                              backgroundColor: `${accentHex}10`,
                              borderColor: `${accentHex}40`,
                            }}
                          >
                            <div className="space-y-1 text-center sm:text-left">
                              <h4 className="font-extrabold text-base tracking-tight">
                                Interested in learning more?
                              </h4>
                              <p className="text-xs text-slate-300">
                                Click below to take the next step with {displayTitle}.
                              </p>
                            </div>
                            <a
                              href={config.ctaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-6 py-3 rounded-xl text-slate-950 font-black text-sm transition-all flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 shrink-0"
                              style={{ backgroundColor: accentHex }}
                            >
                              <span>{config.ctaText || "Learn More"}</span>
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column (1 col): Playlist Tracklist Queue */}
                    <div className={`p-4 space-y-3 backdrop-blur-2xl sticky top-24 ${cardBgClass} ${roundnessClass}`}>
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <ListVideo className="w-4 h-4" style={{ color: accentHex }} />
                          <h3 className="font-bold text-sm text-slate-100">Playlist Queue</h3>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-400">
                          {activePlaylistIndex + 1}/{data.videos.length}
                        </span>
                      </div>

                      {/* Search Filter for Playlist Tracks */}
                      {data.videos.length > 3 && (
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Filter queue..."
                            value={playlistSearchQuery}
                            onChange={(e) => setPlaylistSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950/60 border border-slate-800 rounded-xl outline-hidden focus:ring-1 focus:ring-lime-400 text-slate-200"
                          />
                        </div>
                      )}

                      {/* Scrollable Track Queue */}
                      <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                        {filteredQueue.map((video) => {
                          const originalIdx = data.videos!.findIndex((v) => v.id === video.id);
                          const isActive = originalIdx === activePlaylistIndex;

                          return (
                            <div
                              key={video.id}
                              onClick={() => setActivePlaylistIndex(originalIdx)}
                              className={`p-2 rounded-xl border flex items-center gap-3 transition-all cursor-pointer group ${isActive
                                ? "border-2 shadow-lg"
                                : "border-slate-800/80 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/80"
                                }`}
                              style={{
                                borderColor: isActive ? accentHex : undefined,
                                backgroundColor: isActive ? `${accentHex}15` : undefined,
                              }}
                            >
                              {/* Track Number / Play Indicator */}
                              <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0">
                                {isActive ? (
                                  <Play className="w-3.5 h-3.5 fill-current" style={{ color: accentHex }} />
                                ) : (
                                  <span className="text-slate-500 group-hover:text-slate-300 font-mono text-[11px]">
                                    {originalIdx + 1}
                                  </span>
                                )}
                              </div>

                              {/* Thumbnail */}
                              <div className="relative w-16 aspect-video rounded-lg overflow-hidden bg-slate-950 shrink-0">
                                <VideoThumbnail
                                  src={video.thumbnailUrl}
                                  alt={video.title}
                                  status={(video as any).status}
                                  storageType={(video as any).storageType}
                                  compact={true}
                                  className="w-full h-full object-cover"
                                />
                                {video.durationSeconds && (
                                  <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 bg-black/80 text-[8px] font-bold text-slate-200 rounded">
                                    {formatDuration(video.durationSeconds)}
                                  </span>
                                )}
                              </div>

                              {/* Title & Info */}
                              <div className="flex-1 min-w-0">
                                <p
                                  className="text-xs font-bold truncate transition-colors"
                                  style={{ color: isActive ? accentHex : "#f1f5f9" }}
                                >
                                  {video.title}
                                </p>
                                {video.durationSeconds && (
                                  <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                    <Clock className="w-2.5 h-2.5" />
                                    {formatDuration(video.durationSeconds)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* FOLDER SHARE VIEW */}
        {!isVideo && data.currentFolder && (
          <div className="space-y-6">
            {/* Floating Breadcrumb Bar */}
            <div className={`flex items-center gap-2 text-xs sm:text-sm text-slate-400 backdrop-blur-xl px-4 py-3 border ${cardBgClass} ${roundnessClass}`}>
              <button
                onClick={handleBackToRoot}
                className="hover:text-lime-400 font-bold flex items-center gap-2 transition-colors group cursor-pointer"
              >
                <div
                  className="p-1.5 rounded-lg group-hover:scale-110 transition-transform"
                  style={{
                    backgroundColor: `${accentHex}15`,
                    color: accentHex,
                  }}
                >
                  <Folder className="w-4 h-4" />
                </div>
                <span>{data.rootFolder?.name || "Shared Folder"}</span>
              </button>
              {subfolderId && (
                <>
                  <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="font-extrabold text-slate-100 bg-slate-800/60 px-3 py-1 rounded-lg border border-slate-700/50">
                    {data.currentFolder.name}
                  </span>
                </>
              )}
            </div>

            {/* Subfolders Section */}
            {data.subfolders && data.subfolders.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Folders ({data.subfolders.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {data.subfolders.map((sf) => (
                    <button
                      key={sf.id}
                      onClick={() => handleSubfolderClick(sf.id)}
                      className={`flex items-center gap-3.5 p-4 border transition-all duration-300 text-left group shadow-lg hover:-translate-y-1 backdrop-blur-md cursor-pointer ${cardBgClass} ${roundnessClass}`}
                    >
                      <div className="p-3 bg-linear-to-br from-amber-500/20 to-amber-600/10 text-amber-400 rounded-xl border border-amber-500/20 group-hover:scale-110 transition-transform duration-300">
                        <Folder className="w-5 h-5 fill-amber-500/30" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold group-hover:text-lime-400 transition-colors truncate">
                          {sf.name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-semibold">Folder</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Videos Grid Section */}
            <div className="space-y-3">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Videos ({data.videos?.length || 0})
              </h2>

              {!data.videos || data.videos.length === 0 ? (
                <div className={`py-16 text-center border backdrop-blur-md ${cardBgClass} ${roundnessClass}`}>
                  <Film className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-pulse" />
                  <p className="text-sm font-bold text-slate-300">No videos in this folder</p>
                  <p className="text-xs text-slate-400 mt-1">Check back later for new updates.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {data.videos.map((vid) => (
                    <div
                      key={vid.id}
                      onClick={() => handleVideoClick(vid.id)}
                      className={`group relative border overflow-hidden shadow-xl transition-all duration-300 hover:-translate-y-1.5 backdrop-blur-md cursor-pointer ${cardBgClass} ${roundnessClass}`}
                    >
                      {/* Thumbnail Box */}
                      <div className="aspect-video bg-slate-950 relative overflow-hidden flex items-center justify-center">
                        <VideoThumbnail
                          src={vid.thumbnailUrl}
                          alt={vid.title}
                          status={(vid as any).status}
                          storageType={(vid as any).storageType}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        />

                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-[2px]">
                          <div
                            className="p-3.5 text-slate-950 rounded-full shadow-xl scale-90 group-hover:scale-100 transition-transform duration-300"
                            style={{ backgroundColor: accentHex }}
                          >
                            <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
                          </div>
                        </div>

                        {config.showDuration && vid.durationSeconds && (
                          <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-slate-950/80 backdrop-blur-md text-[11px] font-extrabold text-slate-200 rounded-md border border-slate-800/80 shadow-md">
                            {formatDuration(vid.durationSeconds)}
                          </span>
                        )}
                      </div>

                      {/* Content Info */}
                      <div className="p-4 space-y-1.5">
                        <h3 className="text-sm font-bold group-hover:opacity-90 transition-colors line-clamp-1">
                          {vid.title}
                        </h3>
                        {vid.description ? (
                          <RichTextViewer
                            content={vid.description}
                            clamp={2}
                            className="text-xs text-slate-400 line-clamp-2 leading-relaxed"
                          />
                        ) : (
                          <p className="text-xs text-slate-400 italic">No description</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* VISITOR CONTENT CHECKOUT MODAL */}
      <Dialog open={isCheckoutOpen} onOpenChange={(open) => !open && setIsCheckoutOpen(false)}>
        <DialogContent className="max-w-md p-6 bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${accentHex}20`, color: accentHex }}
              >
                {data?.type === "meeting" ? (
                  <Ticket className="w-5 h-5" />
                ) : (
                  <ShoppingBag className="w-5 h-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  {data?.type === "meeting"
                    ? "Purchase Meeting Entry Pass"
                    : data?.type === "playlist"
                      ? "Unlock Playlist"
                      : "Unlock Video"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  {data?.type === "meeting"
                    ? "Confirmed digital entry ticket to join the live session"
                    : "Instant permanent access with lifetime streaming"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-3 pr-1 text-xs">
            {checkoutError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            {checkoutSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{checkoutSuccess}</span>
              </div>
            )}

            {/* Order Summary Box */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {data?.type === "meeting"
                      ? "Live Meeting Pass"
                      : data?.type === "playlist"
                        ? "Playlist Collection"
                        : "Single Video"}
                  </span>
                  <p className="font-bold text-sm text-slate-100 mt-1">
                    {data?.type === "meeting"
                      ? data?.meeting?.title
                      : data?.type === "playlist"
                        ? data?.playlist?.title
                        : data?.video?.title}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Provided by {data?.organization?.name}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-400">Total</span>
                  <p className="text-lg font-black" style={{ color: accentHex }}>
                    {getCalculatedPrice(data, selectedBuyerCountry).formatted}
                  </p>
                </div>
              </div>

              {data?.type === "meeting" && data?.meeting?.scheduledStart && (
                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" style={{ color: accentHex }} />
                  <span>Scheduled: {formatMeetingTime(data.meeting.scheduledStart)}</span>
                </div>
              )}

              {data?.type === "playlist" && (
                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" style={{ color: accentHex }} />
                  <span>Unlocks all {data.videos?.length || 0} videos in this playlist</span>
                </div>
              )}
            </div>

            {/* Payment Method Notice */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {getCalculatedPrice(data, selectedBuyerCountry).isFree ? (
                  <>
                    <Sparkles className="w-4 h-4" style={{ color: accentHex }} />
                    <span className="font-semibold text-slate-200">Instant Free Access &bull; No Card Required</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" style={{ color: accentHex }} />
                    <span className="font-semibold text-slate-200">Encrypted Payment Gateway</span>
                  </>
                )}
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getCalculatedPrice(data, selectedBuyerCountry).isFree
                    ? "text-lime-400 bg-lime-950/60 border-lime-800/40"
                    : "text-emerald-400 bg-emerald-950/60 border-emerald-800/40"
                  }`}
              >
                {getCalculatedPrice(data, selectedBuyerCountry).isFree ? "Free Claim" : "Verified"}
              </span>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-800 shrink-0 mt-auto flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => setIsCheckoutOpen(false)}
              disabled={isCheckingOut}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteCheckout}
              disabled={isCheckingOut}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs text-slate-950 flex items-center justify-center gap-2 shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: accentHex }}
            >
              {isCheckingOut ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />{" "}
                  {getCalculatedPrice(data, selectedBuyerCountry).isFree ? "Claiming Access..." : "Processing Payment..."}
                </>
              ) : getCalculatedPrice(data, selectedBuyerCountry).isFree ? (
                <>
                  <Sparkles className="w-4 h-4" /> Buy for Free
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" /> Pay & Unlock {getCalculatedPrice(data, selectedBuyerCountry).formatted}
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer Text */}
      <footer className="py-6 border-t border-slate-800/40 text-center text-xs text-slate-400 relative z-10">
        <p>{config.footerText || `© ${new Date().getFullYear()} ${displayTitle}. Powered by Taped.`}</p>
      </footer>
    </div>
  );
}
