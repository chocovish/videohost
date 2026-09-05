"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ListVideo,
  Calendar,
  Video as VideoIcon,
  Package,
  Briefcase,
  Sparkles,
  Star,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  Search,
  Mail,
  Send,
  Globe,
  Play,
  X,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Share2,
  Check,
  MessageSquare,
  Layers,
  Lock,
} from "lucide-react";
import {
  RiYoutubeLine,
  RiTwitterXLine,
  RiGithubLine,
  RiLinkedinLine,
  RiInstagramLine,
  RiDiscordLine,
  RiTwitchLine,
  RiTiktokLine,
  RiThreadsLine,
  RiTelegramLine,
  RiFacebookLine,
  RiWhatsappLine,
  RiSpotifyLine,
  RiRedditLine,
  RiMediumLine,
  RiArticleLine,
  RiDribbbleLine,
  RiPatreonLine,
  RiBlueskyLine,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";

export interface OfferingsConfigData {
  themePreset?: string;
  accentColor?: string;
  backgroundStyle?: string;
  cardRoundness?: string;
  headline?: string | null;
  subheadline?: string | null;
  bio?: string | null;
  showAvatar?: boolean;
  avatarKey?: string | null;
  avatarUrl?: string | null;
  bannerKey?: string | null;
  bannerUrl?: string | null;
  ctaText?: string | null;
  ctaAction?: string | null; // "SCROLL_OFFERINGS" | "INQUIRY_MODAL" | "CONTACT_SECTION" | "FEATURED_VIDEO" | "EXTERNAL_LINK"
  ctaUrl?: string | null;
  secondaryCtaText?: string | null;
  secondaryCtaAction?: string | null; // "SCROLL_OFFERINGS" | "INQUIRY_MODAL" | "CONTACT_SECTION" | "FEATURED_VIDEO" | "EXTERNAL_LINK"
  secondaryCtaUrl?: string | null;
  socialLinks?: Record<string, string | undefined> & {
    youtube?: string;
    twitter?: string;
    github?: string;
    linkedin?: string;
    instagram?: string;
    discord?: string;
    website?: string;
    twitch?: string;
    tiktok?: string;
    threads?: string;
    telegram?: string;
    facebook?: string;
    whatsapp?: string;
    spotify?: string;
    reddit?: string;
    medium?: string;
    substack?: string;
    dribbble?: string;
    patreon?: string;
    bluesky?: string;
    email?: string;
    custom?: string;
  };
  stats?: Array<{ label: string; value: string }>;
  sectionsConfig?: {
    showPlaylists?: boolean;
    showCourses?: boolean;
    showMeetings?: boolean;
    showVideos?: boolean;
    showProducts?: boolean;
    showServices?: boolean;
    showTestimonials?: boolean;
    testimonialsBadge?: string;
    testimonialsTitle?: string;
    testimonialsSubtitle?: string;
    testimonialsDescription?: string;
    showFaq?: boolean;
    showContact?: boolean;
  };
  testimonialsBadge?: string;
  testimonialsTitle?: string;
  testimonialsSubtitle?: string;
  testimonials?: Array<{
    name: string;
    role: string;
    company?: string;
    avatar?: string;
    quote: string;
    rating?: number;
  }>;
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
  featuredVideoUrl?: string | null;
  isPublished?: boolean;
  orgName?: string;
  orgSlug?: string;
  orgLogoUrl?: string | null;
}

export interface OfferingItemData {
  id: string;
  type: string; // "PLAYLIST" | "COURSE" | "MEETING" | "VIDEO" | "PRODUCT" | "SERVICE"
  title: string;
  subtitle?: string | null;
  description?: string | null;
  price?: string | null;
  pricePeriod?: string | null;
  badge?: string | null;
  coverImageUrl?: string | null;
  ctaText?: string | null;
  ctaAction?: string | null; // "INQUIRY_MODAL" | "EXTERNAL_LINK" | "FEATURED_VIDEO"
  ctaUrl?: string | null;
  shareUrl?: string | null;
  shareAccessMode?: "PUBLIC" | "RESTRICTED" | "PURCHASABLE" | "PRIVATE";
  userAccessState?: "PUBLIC" | "RESTRICTED" | "GRANTED" | "UNPURCHASED" | "PURCHASED";
  highlights?: string[];
  meetingDuration?: string | null;
  deliveryFormat?: string | null;
  order?: number;
  isFeatured?: boolean;
  isPublished?: boolean;
}

export interface OfferingsLandingClientProps {
  initialData?: {
    organization: {
      id: string;
      name: string;
      slug: string;
      logoUrl?: string | null;
    };
    config: OfferingsConfigData;
    items: OfferingItemData[];
    isLoggedIn?: boolean;
  };
  liveConfig?: OfferingsConfigData;
  liveItems?: OfferingItemData[];
  isPreview?: boolean;
  previewDevice?: "desktop" | "tablet" | "mobile";
}

// Preset Theme Color Palettes
export const THEME_PALETTES: Record<
  string,
  {
    bg: string;
    card: string;
    cardBorder: string;
    text: string;
    subtext: string;
    accent: string;
    glow: string;
    heroGradient: string;
  }
> = {
  pop: {
    bg: "#0e0918",
    card: "#181028",
    cardBorder: "rgba(168, 85, 247, 0.22)",
    text: "#fdf4ff",
    subtext: "#d8b4fe",
    accent: "#a855f7",
    glow: "rgba(168, 85, 247, 0.35)",
    heroGradient: "linear-gradient(180deg, rgba(168, 85, 247, 0.20) 0%, rgba(14, 9, 24, 0) 100%)",
  },
  obsidian: {
    bg: "#030712",
    card: "#0b1329",
    cardBorder: "rgba(255, 255, 255, 0.08)",
    text: "#f8fafc",
    subtext: "#94a3b8",
    accent: "#84cc16",
    glow: "rgba(132, 204, 22, 0.28)",
    heroGradient: "linear-gradient(180deg, rgba(132, 204, 22, 0.16) 0%, rgba(3, 7, 18, 0) 100%)",
  },
  arcade: {
    bg: "#100c04",
    card: "#1f180a",
    cardBorder: "rgba(234, 179, 8, 0.22)",
    text: "#fefce8",
    subtext: "#fde047",
    accent: "#eab308",
    glow: "rgba(234, 179, 8, 0.35)",
    heroGradient: "linear-gradient(180deg, rgba(234, 179, 8, 0.20) 0%, rgba(16, 12, 4, 0) 100%)",
  },
  bubblegum: {
    bg: "#14060f",
    card: "#260c1d",
    cardBorder: "rgba(236, 72, 153, 0.22)",
    text: "#fff1f2",
    subtext: "#fbcfe8",
    accent: "#ec4899",
    glow: "rgba(236, 72, 153, 0.35)",
    heroGradient: "linear-gradient(180deg, rgba(236, 72, 153, 0.20) 0%, rgba(20, 6, 15, 0) 100%)",
  },
  lime: {
    bg: "#071203",
    card: "#0f2407",
    cardBorder: "rgba(132, 204, 22, 0.22)",
    text: "#f7fee7",
    subtext: "#bef264",
    accent: "#84cc16",
    glow: "rgba(132, 204, 22, 0.35)",
    heroGradient: "linear-gradient(180deg, rgba(132, 204, 22, 0.20) 0%, rgba(7, 18, 3, 0) 100%)",
  },
  ocean: {
    bg: "#040d1a",
    card: "#091930",
    cardBorder: "rgba(14, 165, 233, 0.22)",
    text: "#f0f9ff",
    subtext: "#7dd3fc",
    accent: "#0ea5e9",
    glow: "rgba(14, 165, 233, 0.35)",
    heroGradient: "linear-gradient(180deg, rgba(14, 165, 233, 0.20) 0%, rgba(4, 13, 26, 0) 100%)",
  },
  aurora: {
    bg: "#070b19",
    card: "#0f172a",
    cardBorder: "rgba(99, 102, 241, 0.18)",
    text: "#f8fafc",
    subtext: "#94a3b8",
    accent: "#6366f1",
    glow: "rgba(99, 102, 241, 0.35)",
    heroGradient: "linear-gradient(180deg, rgba(99, 102, 241, 0.18) 0%, rgba(7, 11, 25, 0) 100%)",
  },
  sunset: {
    bg: "#0f0714",
    card: "#1e0e24",
    cardBorder: "rgba(249, 115, 22, 0.18)",
    text: "#fff1f2",
    subtext: "#fda4af",
    accent: "#f97316",
    glow: "rgba(249, 115, 22, 0.35)",
    heroGradient: "linear-gradient(180deg, rgba(249, 115, 22, 0.18) 0%, rgba(15, 7, 20, 0) 100%)",
  },
  "minimal-light": {
    bg: "#f8fafc",
    card: "#ffffff",
    cardBorder: "rgba(0, 0, 0, 0.08)",
    text: "#0f172a",
    subtext: "#64748b",
    accent: "#2563eb",
    glow: "rgba(37, 99, 235, 0.22)",
    heroGradient: "linear-gradient(180deg, rgba(37, 99, 235, 0.10) 0%, rgba(248, 250, 252, 0) 100%)",
  },
  minimal: {
    bg: "#f8fafc",
    card: "#ffffff",
    cardBorder: "rgba(0, 0, 0, 0.08)",
    text: "#0f172a",
    subtext: "#64748b",
    accent: "#2563eb",
    glow: "rgba(37, 99, 235, 0.22)",
    heroGradient: "linear-gradient(180deg, rgba(37, 99, 235, 0.10) 0%, rgba(248, 250, 252, 0) 100%)",
  },
  cyberpunk: {
    bg: "#070312",
    card: "#130724",
    cardBorder: "rgba(6, 182, 212, 0.22)",
    text: "#ecfeff",
    subtext: "#a5f3fc",
    accent: "#06b6d4",
    glow: "rgba(6, 182, 212, 0.35)",
    heroGradient: "linear-gradient(180deg, rgba(6, 182, 212, 0.20) 0%, rgba(7, 3, 18, 0) 100%)",
  },
  "rose-gold": {
    bg: "#0d070b",
    card: "#1b0f17",
    cardBorder: "rgba(244, 114, 182, 0.18)",
    text: "#fff1f2",
    subtext: "#fbcfe8",
    accent: "#f43f5e",
    glow: "rgba(244, 63, 94, 0.35)",
    heroGradient: "linear-gradient(180deg, rgba(244, 63, 94, 0.18) 0%, rgba(13, 7, 11, 0) 100%)",
  },
  emerald: {
    bg: "#03140d",
    card: "#082218",
    cardBorder: "rgba(16, 185, 129, 0.2)",
    text: "#ecfdf5",
    subtext: "#a7f3d0",
    accent: "#10b981",
    glow: "rgba(16, 185, 129, 0.35)",
    heroGradient: "linear-gradient(180deg, rgba(16, 185, 129, 0.18) 0%, rgba(3, 20, 13, 0) 100%)",
  },
  midnight: {
    bg: "#020617",
    card: "#091124",
    cardBorder: "rgba(56, 189, 248, 0.18)",
    text: "#f0f9ff",
    subtext: "#7dd3fc",
    accent: "#38bdf8",
    glow: "rgba(56, 189, 248, 0.35)",
    heroGradient: "linear-gradient(180deg, rgba(56, 189, 248, 0.18) 0%, rgba(2, 6, 23, 0) 100%)",
  },
};

export const getSocialPlatformMeta = (key: string, customAccentColor?: string) => {
  const normalized = key.toLowerCase().trim();
  const baseKey = normalized.includes("_") ? normalized.split("_")[0] : normalized;

  switch (baseKey) {
    case "youtube":
      return { label: "YouTube", icon: RiYoutubeLine, color: "#ef4444" };
    case "twitter":
    case "x":
      return { label: "Twitter / X", icon: RiTwitterXLine, color: "currentColor" };
    case "github":
      return { label: "GitHub", icon: RiGithubLine, color: "currentColor" };
    case "linkedin":
      return { label: "LinkedIn", icon: RiLinkedinLine, color: "#0ea5e9" };
    case "instagram":
      return { label: "Instagram", icon: RiInstagramLine, color: "#ec4899" };
    case "discord":
      return { label: "Discord", icon: RiDiscordLine, color: "#818cf8" };
    case "twitch":
      return { label: "Twitch", icon: RiTwitchLine, color: "#a855f7" };
    case "tiktok":
      return { label: "TikTok", icon: RiTiktokLine, color: "#22d3ee" };
    case "threads":
      return { label: "Threads", icon: RiThreadsLine, color: "currentColor" };
    case "telegram":
      return { label: "Telegram", icon: RiTelegramLine, color: "#38bdf8" };
    case "facebook":
      return { label: "Facebook", icon: RiFacebookLine, color: "#3b82f6" };
    case "whatsapp":
      return { label: "WhatsApp", icon: RiWhatsappLine, color: "#22c55e" };
    case "spotify":
      return { label: "Spotify", icon: RiSpotifyLine, color: "#22c55e" };
    case "reddit":
      return { label: "Reddit", icon: RiRedditLine, color: "#f97316" };
    case "medium":
      return { label: "Medium", icon: RiMediumLine, color: "currentColor" };
    case "substack":
      return { label: "Substack / Newsletter", icon: RiArticleLine, color: "#ea580c" };
    case "dribbble":
      return { label: "Dribbble", icon: RiDribbbleLine, color: "#f43f5e" };
    case "patreon":
      return { label: "Patreon", icon: RiPatreonLine, color: "#ff424d" };
    case "bluesky":
      return { label: "Bluesky", icon: RiBlueskyLine, color: "#0284c7" };
    case "email":
      return { label: "Email", icon: Mail, color: customAccentColor || "#eab308" };
    case "website":
      return { label: "Website", icon: Globe, color: customAccentColor || "#84cc16" };
    case "custom":
    default:
      return {
        label: key.charAt(0).toUpperCase() + key.slice(1),
        icon: Globe,
        color: customAccentColor || "#84cc16",
      };
  }
};

export const resolveVideoEmbedDetails = (url?: string | null) => {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // YouTube Links
  if (trimmed.includes("youtube.com") || trimmed.includes("youtu.be")) {
    let embedUrl = trimmed;
    if (trimmed.includes("watch?v=")) {
      embedUrl = trimmed.replace("watch?v=", "embed/");
    } else if (trimmed.includes("youtu.be/")) {
      embedUrl = trimmed.replace("youtu.be/", "youtube.com/embed/");
    }
    return { type: "iframe" as const, src: embedUrl };
  }

  // Vimeo Links
  if (trimmed.includes("vimeo.com/")) {
    const vimeoId = trimmed.split("vimeo.com/")[1]?.split("?")[0]?.split("/")[0];
    if (vimeoId) {
      return { type: "iframe" as const, src: `https://player.vimeo.com/video/${vimeoId}` };
    }
  }

  // Platform video embed (e.g. /embed/abc or https://.../embed/abc)
  if (trimmed.includes("/embed/")) {
    return { type: "iframe" as const, src: trimmed };
  }

  // Direct video ID without slash/path
  if (!trimmed.includes("/") && !trimmed.includes(".") && trimmed.length >= 6) {
    return { type: "iframe" as const, src: `/embed/${trimmed}` };
  }

  // Relative embed path
  if (trimmed.startsWith("embed/")) {
    return { type: "iframe" as const, src: `/${trimmed}` };
  }

  // Direct video file or stream
  return { type: "video" as const, src: trimmed };
};

export default function OfferingsLandingClient({
  initialData,
  liveConfig,
  liveItems,
  isPreview = false,
  previewDevice = "desktop",
}: OfferingsLandingClientProps) {
  const [liveOverrideConfig, setLiveOverrideConfig] = useState<OfferingsConfigData | null>(null);
  const [liveOverrideItems, setLiveOverrideItems] = useState<OfferingItemData[] | null>(null);
  const [currentDevice, setCurrentDevice] = useState<"desktop" | "tablet" | "mobile">(previewDevice);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const inIframe = window.parent !== window;
      setIsInIframe(inIframe);

      const searchParams = new URLSearchParams(window.location.search);
      const urlDevice = searchParams.get("device");
      if (urlDevice === "mobile" || urlDevice === "tablet" || urlDevice === "desktop") {
        setCurrentDevice(urlDevice);
      }

      if (inIframe) {
        window.parent.postMessage({ type: "OFFERINGS_PREVIEW_FRAME_READY" }, "*");
      }

      const handleMessage = (event: MessageEvent) => {
        if (!event.data || typeof event.data !== "object") return;
        if (event.data.type === "OFFERINGS_PREVIEW_UPDATE") {
          if (event.data.config) {
            setLiveOverrideConfig(event.data.config);
          }
          if (event.data.items) {
            setLiveOverrideItems(event.data.items);
          }
          if (event.data.previewDevice) {
            setCurrentDevice(event.data.previewDevice);
          }
        }
      };

      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }
  }, []);

  const isPreviewMode = isPreview || isInIframe;
  const isMobileView = isPreviewMode && currentDevice === "mobile";
  const isTabletView = isPreviewMode && currentDevice === "tablet";

  const offeringsGridClass = isMobileView
    ? "grid grid-cols-1 gap-4"
    : isTabletView
      ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
      : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6";

  const testimonialsGridClass = isMobileView
    ? "grid grid-cols-1 gap-4"
    : isTabletView
      ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
      : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6";

  const statsGridClass = isMobileView
    ? "grid grid-cols-2 gap-2 pt-3"
    : "grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4";

  const config: OfferingsConfigData = liveOverrideConfig || liveConfig || initialData?.config || {};
  const items: OfferingItemData[] = liveOverrideItems || liveItems || initialData?.items || [];
  const org = initialData?.organization || {
    id: "org-preview",
    name: config.orgName || "Creator Studio",
    slug: config.orgSlug || "creator",
    logoUrl: config.orgLogoUrl || null,
  };

  // Theme resolution
  const themeKey = config.themePreset || "obsidian";
  const theme = THEME_PALETTES[themeKey] || THEME_PALETTES.obsidian;
  const accentColor = config.accentColor || theme.accent;
  const effectiveGlow = useMemo(() => {
    if (config.accentColor) {
      if (config.accentColor.startsWith("#") && config.accentColor.length === 7) {
        return `${config.accentColor}25`;
      }
      return config.accentColor;
    }
    return theme.glow;
  }, [config.accentColor, theme.glow]);

  // Filter & Search State
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Inquiry / Booking Modal State
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [selectedOffering, setSelectedOffering] = useState<OfferingItemData | null>(null);
  const [inquiryName, setInquiryName] = useState("");
  const [inquiryEmail, setInquiryEmail] = useState("");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [inquiryPreferredTime, setInquiryPreferredTime] = useState("");
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState(false);
  const [inquiryError, setInquiryError] = useState("");

  // Video Modal State
  const [activeVideoModalUrl, setActiveVideoModalUrl] = useState<string | null>(null);

  // Copy share link feedback
  const [copiedLink, setCopiedLink] = useState(false);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const normalizedType = item.type === "COURSE" ? "PLAYLIST" : item.type;
      if (selectedCategory !== "ALL" && normalizedType !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesSubtitle = item.subtitle?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesBadge = item.badge?.toLowerCase().includes(q);
        return matchesTitle || matchesSubtitle || matchesDesc || matchesBadge;
      }
      return true;
    });
  }, [items, selectedCategory, searchQuery]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: items.length,
      PLAYLIST: 0,
      MEETING: 0,
      VIDEO: 0,
      PRODUCT: 0,
      SERVICE: 0,
    };
    items.forEach((it) => {
      const normalizedType = it.type === "COURSE" ? "PLAYLIST" : it.type;
      if (counts[normalizedType] !== undefined) {
        counts[normalizedType]++;
      }
    });
    return counts;
  }, [items]);

  const handleOpenInquiry = (item?: OfferingItemData | null) => {
    setSelectedOffering(item || null);
    if (item) {
      setInquiryMessage(`Hi! I'm interested in "${item.title}". I would love to learn more.`);
    } else {
      setInquiryMessage("Hi! I would like to get in touch regarding your offerings.");
    }
    setInquiryError("");
    setInquirySuccess(false);
    setInquiryModalOpen(true);
  };

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryName.trim() || !inquiryEmail.trim() || !inquiryMessage.trim()) {
      setInquiryError("Please fill out all required fields.");
      return;
    }

    if (isPreview) {
      setInquirySuccess(true);
      setTimeout(() => {
        setInquiryModalOpen(false);
        setInquirySuccess(false);
      }, 2000);
      return;
    }

    try {
      setSubmittingInquiry(true);
      setInquiryError("");
      const res = await fetch(`/api/public/offerings/${org.slug}/inquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inquiryName,
          email: inquiryEmail,
          message: inquiryMessage,
          preferredTime: inquiryPreferredTime || undefined,
          offeringItemId: selectedOffering?.id || undefined,
          offeringTitle: selectedOffering?.title || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setInquirySuccess(true);
        setInquiryName("");
        setInquiryEmail("");
        setInquiryMessage("");
        setInquiryPreferredTime("");
        setTimeout(() => {
          setInquiryModalOpen(false);
          setInquirySuccess(false);
        }, 2500);
      } else {
        setInquiryError(data.error || "Failed to submit inquiry. Please try again.");
      }
    } catch (err: any) {
      console.error("Inquiry submit error:", err);
      setInquiryError("An error occurred while submitting your message.");
    } finally {
      setSubmittingInquiry(false);
    }
  };

  const executeCtaAction = (
    action?: string | null,
    url?: string | null,
    itemContext?: OfferingItemData | null
  ) => {
    const act =
      action ||
      (url === "#offerings"
        ? "SCROLL_OFFERINGS"
        : url === "#inquiry" || url === "#contact"
          ? "INQUIRY_MODAL"
          : url?.startsWith("http")
            ? "EXTERNAL_LINK"
            : "SCROLL_OFFERINGS");

    if (act === "SCROLL_OFFERINGS") {
      const el = document.getElementById("offerings");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    if (act === "INQUIRY_MODAL") {
      handleOpenInquiry(itemContext || null);
      return;
    }

    if (act === "CONTACT_SECTION") {
      const el = document.getElementById("contact");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    if (act === "FEATURED_VIDEO") {
      const videoUrl = itemContext?.ctaUrl || config.featuredVideoUrl;
      if (videoUrl) {
        setActiveVideoModalUrl(videoUrl);
      } else {
        handleOpenInquiry(itemContext || null);
      }
      return;
    }

    if (act === "EXTERNAL_LINK" || (url && (url.startsWith("http") || url.startsWith("/")))) {
      if (url) {
        if (url.startsWith("/")) {
          window.location.href = url;
        } else {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      } else {
        handleOpenInquiry(itemContext || null);
      }
      return;
    }

    // Default fallback anchor navigation
    if (url?.startsWith("#")) {
      const target = document.querySelector(url);
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    } else if (url) {
      if (url.startsWith("/")) {
        window.location.href = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } else {
      handleOpenInquiry(itemContext || null);
    }
  };

  const renderCtaIcon = (action?: string | null, defaultIcon?: React.ReactNode) => {
    switch (action) {
      case "INQUIRY_MODAL":
        return <Calendar className="w-4 h-4" />;
      case "CONTACT_SECTION":
        return <MessageSquare className="w-4 h-4" />;
      case "FEATURED_VIDEO":
        return <Play className="w-4 h-4 fill-current" />;
      case "EXTERNAL_LINK":
        return <ExternalLink className="w-4 h-4" />;
      case "SCROLL_OFFERINGS":
      default:
        return defaultIcon || <ArrowRight className="w-4 h-4" />;
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/offerings/${org.slug}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const sections = config.sectionsConfig || {
    showPlaylists: true,
    showCourses: true,
    showMeetings: true,
    showVideos: true,
    showProducts: true,
    showServices: true,
    showTestimonials: true,
    testimonialsBadge: "Student & Client Reviews",
    testimonialsTitle: "Trusted by Creators & Engineers",
    testimonialsSubtitle: "Read what students, founders, and attendees say about our sessions and programs.",
    showFaq: true,
    showContact: true,
  };

  const roundnessClass =
    config.cardRoundness === "square"
      ? "rounded-none"
      : config.cardRoundness === "xl"
        ? "rounded-xl"
        : config.cardRoundness === "3xl"
          ? "rounded-3xl"
          : "rounded-2xl";

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case "PLAYLIST":
      case "COURSE":
        return <ListVideo className="w-4 h-4 text-emerald-400" />;
      case "MEETING":
        return <Calendar className="w-4 h-4 text-sky-400" />;
      case "VIDEO":
        return <VideoIcon className="w-4 h-4 text-indigo-400" />;
      case "PRODUCT":
        return <Package className="w-4 h-4 text-amber-400" />;
      case "SERVICE":
        return <Briefcase className="w-4 h-4 text-purple-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-primary" />;
    }
  };

  const getCategoryBadgeLabel = (type: string) => {
    switch (type) {
      case "PLAYLIST":
      case "COURSE":
        return "Playlist / Series";
      case "MEETING":
        return "Meeting";
      case "VIDEO":
        return "Featured Video";
      case "PRODUCT":
        return "Digital Resource";
      case "SERVICE":
        return "Custom Service";
      default:
        return "Offering";
    }
  };

  return (
    <div
      className="min-h-screen w-full relative selection:bg-primary/20 selection:text-primary transition-colors duration-300 font-sans"
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
      }}
    >
      {/* Sleek Preview Scrollbar & Inset Controls */}
      {isPreviewMode && (
        <style
          dangerouslySetInnerHTML={{
            __html:
              isMobileView || isTabletView
                ? `
              html, body {
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
                overflow-x: hidden !important;
              }
              ::-webkit-scrollbar {
                display: none !important;
                width: 0px !important;
                height: 0px !important;
              }
            `
                : `
              html, body {
                scrollbar-width: thin !important;
                scrollbar-color: rgba(140, 140, 150, 0.35) transparent !important;
                overflow-x: hidden !important;
              }
              ::-webkit-scrollbar {
                width: 6px !important;
                height: 6px !important;
              }
              ::-webkit-scrollbar-track {
                background: transparent !important;
              }
              ::-webkit-scrollbar-thumb {
                background: rgba(140, 140, 150, 0.35) !important;
                border-radius: 9999px !important;
              }
              ::-webkit-scrollbar-thumb:hover {
                background: rgba(140, 140, 150, 0.6) !important;
              }
            `,
          }}
        />
      )}
      {/* Background Ambience Layer */}
      {config.backgroundStyle === "mesh-gradient" && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div
            className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full blur-[140px] opacity-25"
            style={{ backgroundColor: accentColor }}
          />
          <div
            className="absolute top-[35%] -right-[15%] w-[50vw] h-[50vw] rounded-full blur-[160px] opacity-20"
            style={{ backgroundColor: themeKey === "minimal-light" ? "#3b82f6" : "#6366f1" }}
          />
          <div
            className="absolute bottom-[-10%] left-[20%] w-[55vw] h-[55vw] rounded-full blur-[150px] opacity-15"
            style={{ backgroundColor: accentColor }}
          />
        </div>
      )}

      {config.backgroundStyle === "obsidian-aura" && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[400px] rounded-full blur-[120px] opacity-30"
            style={{ backgroundColor: accentColor }}
          />
        </div>
      )}

      {config.backgroundStyle === "minimal-grid" && (
        <div
          className="fixed inset-0 pointer-events-none opacity-20 z-0"
          style={{
            backgroundImage: `radial-gradient(${theme.cardBorder} 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
      )}

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation Bar */}
        <header
          className="sticky top-0 z-40 backdrop-blur-xl border-b transition-all"
          style={{
            backgroundColor: `${theme.bg}cc`,
            borderColor: theme.cardBorder,
          }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {config.avatarUrl || org.logoUrl ? (
                <img
                  src={config.avatarUrl || org.logoUrl || ""}
                  alt={org.name}
                  className="w-8 h-8 rounded-full object-cover border"
                  style={{ borderColor: theme.cardBorder }}
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                  style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
                >
                  {org.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="font-bold text-sm sm:text-base tracking-tight truncate max-w-[180px] sm:max-w-xs">
                {org.name}
              </span>
              <span
                className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border"
                style={{
                  backgroundColor: `${accentColor}15`,
                  borderColor: `${accentColor}40`,
                  color: accentColor,
                }}
              >
                <ShieldCheck className="w-3 h-3" /> Verified Creator
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleCopyLink}
                title="Share portfolio link"
                className="p-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer hover:opacity-80"
                style={{
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                  color: theme.text,
                }}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Share</span>
                  </>
                )}
              </button>

              <Button
                onClick={() => handleOpenInquiry()}
                className="text-xs sm:text-sm font-semibold rounded-xl px-3 sm:px-4 py-2 text-white shadow-xs transition-transform active:scale-95 cursor-pointer"
                style={{ backgroundColor: accentColor }}
              >
                {config.ctaText || "Explore Offerings"}
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative pt-6 pb-12 sm:pb-16 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            {/* Banner Cover */}
            <div
              className={`w-full ${isMobileView ? "h-32" : "h-36 sm:h-52 md:h-64"} ${roundnessClass} overflow-hidden relative border transition-all`}
              style={{
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
                boxShadow: `0 8px 30px -4px ${effectiveGlow}`,
              }}
            >
              {config.bannerUrl ? (
                <img src={config.bannerUrl} alt="Cover Banner" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full relative"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor}30 0%, ${theme.bg} 100%)`,
                  }}
                >
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: `radial-gradient(${accentColor} 1px, transparent 1px)`,
                      backgroundSize: "20px 20px",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Creator Identity Bar (Overlapping Banner) */}
            <div
              className={`relative px-2 sm:px-6 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 text-center sm:text-left ${
                config.showAvatar !== false
                  ? isMobileView
                    ? "-mt-10"
                    : "-mt-10 sm:mt-0"
                  : "pt-4 sm:pt-6"
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                {config.showAvatar !== false && (
                  <div
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl p-1 shrink-0 relative border-2 transition-transform hover:scale-105 sm:-mt-14"
                    style={{
                      backgroundColor: theme.card,
                      borderColor: accentColor,
                      boxShadow: `0 8px 24px -2px ${effectiveGlow}`,
                    }}
                  >
                    {config.avatarUrl || org.logoUrl ? (
                      <img
                        src={config.avatarUrl || org.logoUrl || ""}
                        alt={org.name}
                        className="w-full h-full rounded-[22px] object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full rounded-[22px] flex items-center justify-center font-black text-2xl"
                        style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
                      >
                        {org.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-xs border"
                      style={{ backgroundColor: accentColor, borderColor: theme.bg }}
                      title="Verified Creator"
                    >
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                  </div>
                )}

                <div className="space-y-1 sm:pt-3">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-heading">{org.name}</h1>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-xs"
                      style={{
                        backgroundColor: `${accentColor}15`,
                        borderColor: `${accentColor}35`,
                        color: accentColor,
                      }}
                    >
                      Creator
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium" style={{ color: theme.subtext }}>
                    @{org.slug} • Portfolio & Offerings
                  </p>
                </div>
              </div>

              {/* Social Links Pill Bar */}
              {config.socialLinks && Object.entries(config.socialLinks).some(([_, url]) => Boolean(url && url.trim())) && (
                <div className="flex items-center justify-center flex-wrap gap-1.5 pt-2 sm:pt-3">
                  {Object.entries(config.socialLinks)
                    .filter(([_, url]) => Boolean(url && url.trim()))
                    .map(([platformKey, rawUrl]) => {
                      const meta = getSocialPlatformMeta(platformKey, accentColor);
                      const IconComp = meta.icon;
                      let finalHref = (rawUrl || "").trim();
                      const isEmail = platformKey.toLowerCase() === "email" || finalHref.startsWith("mailto:");
                      
                      if (isEmail && !finalHref.startsWith("mailto:")) {
                        finalHref = `mailto:${finalHref}`;
                      } else if (
                        !isEmail &&
                        !finalHref.startsWith("http://") &&
                        !finalHref.startsWith("https://") &&
                        !finalHref.startsWith("#")
                      ) {
                        finalHref = `https://${finalHref}`;
                      }

                      return (
                        <a
                          key={platformKey}
                          href={finalHref}
                          target={isEmail ? undefined : "_blank"}
                          rel={isEmail ? undefined : "noopener noreferrer"}
                          className="p-2 rounded-xl border shadow-xs transition-all hover:scale-110"
                          style={{
                            backgroundColor: theme.card,
                            borderColor: theme.cardBorder,
                            color: meta.color === "currentColor" ? theme.text : meta.color,
                          }}
                          title={meta.label}
                        >
                          <IconComp className="w-4 h-4" />
                        </a>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Headline, Subheadline & Bio */}
            <div className="mt-8 space-y-4 text-center sm:text-left">
              {config.headline && (
                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight font-heading">
                  {config.headline}
                </h2>
              )}

              {config.subheadline && (
                <p className="text-base sm:text-lg font-medium" style={{ color: theme.subtext }}>
                  {config.subheadline}
                </p>
              )}

              {config.bio && (
                <div
                  className={`p-4 sm:p-5 ${roundnessClass} border backdrop-blur-md text-sm leading-relaxed`}
                  style={{
                    backgroundColor: `${theme.card}90`,
                    borderColor: theme.cardBorder,
                    color: theme.subtext,
                  }}
                >
                  <RichTextViewer content={config.bio} style={{ color: theme.subtext }} />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center sm:justify-start gap-2.5 sm:gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => executeCtaAction(config.ctaAction || "SCROLL_OFFERINGS", config.ctaUrl || "#offerings")}
                  className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-xs flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95 cursor-pointer text-center"
                  style={{ backgroundColor: accentColor }}
                >
                  <span>{config.ctaText || "Explore Offerings"}</span>
                  {renderCtaIcon(config.ctaAction || "SCROLL_OFFERINGS", <ArrowRight className="w-4 h-4" />)}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => executeCtaAction(config.secondaryCtaAction || "INQUIRY_MODAL", config.secondaryCtaUrl || "#inquiry")}
                  className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm border shadow-xs flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95 cursor-pointer text-center"
                  style={{
                    backgroundColor: theme.card,
                    borderColor: theme.cardBorder,
                    color: theme.text,
                  }}
                >
                  <span>{config.secondaryCtaText || "Explore Meetings"}</span>
                  {renderCtaIcon(config.secondaryCtaAction || "INQUIRY_MODAL", <Calendar className="w-4 h-4" />)}
                </Button>
              </div>

              {/* Social Proof Stats Counters */}
              {Array.isArray(config.stats) && config.stats.length > 0 && (
                <div className={statsGridClass}>
                  {config.stats.map((st, i) => (
                    <div
                      key={i}
                      className={`p-3.5 ${roundnessClass} border text-center transition-all duration-200`}
                      style={{
                        backgroundColor: `${theme.card}80`,
                        borderColor: theme.cardBorder,
                        boxShadow: `2px 2px 0px 0px ${effectiveGlow || "var(--comic-shadow-subtle)"}`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = `3.5px 3.5px 0px 0px ${effectiveGlow || "var(--comic-shadow)"}`;
                        e.currentTarget.style.borderColor = accentColor;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = `2px 2px 0px 0px ${effectiveGlow || "var(--comic-shadow-subtle)"}`;
                        e.currentTarget.style.borderColor = theme.cardBorder;
                      }}
                    >
                      <div className="text-lg sm:text-xl font-black tracking-tight font-heading" style={{ color: accentColor }}>
                        {st.value}
                      </div>
                      <div className="text-[11px] font-semibold mt-0.5 truncate" style={{ color: theme.subtext }}>
                        {st.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Featured Video Showcase Section (if enabled/configured) */}
        {config.featuredVideoUrl && (
          <section className="py-8 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto">
              <div
                className={`p-5 sm:p-8 ${roundnessClass} border relative overflow-hidden`}
                style={{
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                  boxShadow: `0 8px 30px -4px ${effectiveGlow}`,
                }}
              >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3" style={{ color: accentColor }}>
                  <Sparkles className="w-4 h-4" /> Creator Spotlight & Showreel
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-4 font-heading">Watch Introduction & Showcase</h3>
                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black/60 relative border border-white/10 shadow-inner">
                  {(() => {
                    const videoMeta = resolveVideoEmbedDetails(config.featuredVideoUrl);
                    if (!videoMeta) return null;
                    if (videoMeta.type === "iframe") {
                      return (
                        <iframe
                          src={videoMeta.src}
                          title="Featured Video"
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                          allowFullScreen
                        />
                      );
                    }
                    return (
                      <video
                        src={videoMeta.src}
                        controls
                        className="w-full h-full object-cover"
                        poster={config.bannerUrl || undefined}
                      />
                    );
                  })()}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Offerings Catalog Section */}
        <section id="offerings" className="py-8 sm:py-12 px-3 sm:px-6">
          <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6">
            {/* Header & Filter Nav */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-5 sm:pb-6" style={{ borderColor: theme.cardBorder }}>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: accentColor }}>
                  <Layers className="w-4 h-4" /> Catalog
                </div>
                <h3 className="text-xl sm:text-3xl font-extrabold tracking-tight font-heading">Available Offerings</h3>
                <p className="text-xs sm:text-sm" style={{ color: theme.subtext }}>
                  Filter by playlists, meetings, video assets, and digital resources.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.subtext }} />
                <input
                  type="text"
                  placeholder="Search offerings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm border shadow-xs transition-all focus:outline-none"
                  style={{
                    backgroundColor: theme.card,
                    borderColor: theme.cardBorder,
                    color: theme.text,
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-xs cursor-pointer hover:opacity-80"
                    style={{ color: theme.subtext }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x touch-pan-x">
              {[
                { id: "ALL", label: "All Offerings", count: categoryCounts.ALL },
                ...(sections.showPlaylists !== false && sections.showCourses !== false
                  ? [{ id: "PLAYLIST", label: "Playlists", count: categoryCounts.PLAYLIST }]
                  : []),
                ...(sections.showMeetings !== false
                  ? [{ id: "MEETING", label: "Meetings", count: categoryCounts.MEETING }]
                  : []),
                ...(sections.showVideos !== false
                  ? [{ id: "VIDEO", label: "Showcases", count: categoryCounts.VIDEO }]
                  : []),
                ...(sections.showProducts !== false
                  ? [{ id: "PRODUCT", label: "Resources", count: categoryCounts.PRODUCT }]
                  : []),
                ...(sections.showServices !== false
                  ? [{ id: "SERVICE", label: "Services", count: categoryCounts.SERVICE }]
                  : []),
              ].map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold shrink-0 transition-all duration-200 flex items-center gap-1.5 sm:gap-2 border cursor-pointer snap-start ${
                      isActive ? "scale-[1.02]" : "hover:opacity-90"
                    }`}
                    style={{
                      backgroundColor: isActive ? accentColor : theme.card,
                      borderColor: isActive ? accentColor : theme.cardBorder,
                      color: isActive ? "#ffffff" : theme.text,
                      boxShadow: isActive
                        ? `3px 3px 0px 0px ${effectiveGlow || "var(--comic-shadow)"}`
                        : `1.5px 1.5px 0px 0px ${effectiveGlow || "var(--comic-shadow-subtle)"}`,
                    }}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/25 text-white" : "bg-black/10 dark:bg-white/10"
                        }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Offerings Grid */}
            {filteredItems.length === 0 ? (
              <div
                className={`p-8 sm:p-12 text-center ${roundnessClass} border`}
                style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
              >
                <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-30" />
                <h4 className="text-sm sm:text-base font-bold font-heading">No offerings match your filter</h4>
                <p className="text-xs sm:text-sm mt-1" style={{ color: theme.subtext }}>
                  Try selecting a different category or clearing your search term.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory("ALL");
                    setSearchQuery("");
                  }}
                  className="mt-4 text-xs font-semibold shadow-xs"
                >
                  Reset Filters
                </Button>
              </div>
            ) : (
              <div className={offeringsGridClass}>
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex flex-col justify-between ${roundnessClass} border transition-all duration-300 overflow-hidden group min-w-0 offerings-card`}
                    style={{
                      backgroundColor: theme.card,
                      borderColor: item.isFeatured ? accentColor : theme.cardBorder,
                      boxShadow: item.isFeatured
                        ? `3.5px 3.5px 0px 0px ${effectiveGlow || "var(--comic-shadow)"}, 0 8px 24px -4px ${effectiveGlow}`
                        : `2.5px 2.5px 0px 0px ${effectiveGlow || "var(--comic-shadow-subtle)"}`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = `4.5px 4.5px 0px 0px ${effectiveGlow || "var(--comic-shadow)"}, 0 10px 28px -4px ${effectiveGlow}`;
                      e.currentTarget.style.borderColor = accentColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = item.isFeatured
                        ? `3.5px 3.5px 0px 0px ${effectiveGlow || "var(--comic-shadow)"}, 0 8px 24px -4px ${effectiveGlow}`
                        : `2.5px 2.5px 0px 0px ${effectiveGlow || "var(--comic-shadow-subtle)"}`;
                      e.currentTarget.style.borderColor = item.isFeatured ? accentColor : theme.cardBorder;
                    }}
                  >
                    {/* Card Media / Thumbnail */}
                    {item.coverImageUrl && (
                      <div className="w-full h-40 sm:h-48 relative overflow-hidden bg-black/40 shrink-0">
                        <img
                          src={item.coverImageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {item.badge && (
                          <div
                            className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-white shadow-xs backdrop-blur-md"
                            style={{ backgroundColor: accentColor }}
                          >
                            {item.badge}
                          </div>
                        )}
                        {item.meetingDuration && (
                          <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-bold bg-black/70 text-white backdrop-blur-md flex items-center gap-1 border border-white/10 shadow-xs">
                            <Clock className="w-3 h-3 text-sky-400" />
                            {item.meetingDuration}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Card Body */}
                    <div className="p-4 sm:p-5 md:p-6 flex-1 flex flex-col justify-between space-y-3 sm:space-y-4 min-w-0">
                      <div className="space-y-2 sm:space-y-2.5 min-w-0">
                        {/* Type & Badge Row if no cover image */}
                        {!item.coverImageUrl && (
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div
                              className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-lg border shadow-xs"
                              style={{
                                backgroundColor: `${accentColor}12`,
                                borderColor: `${accentColor}30`,
                                color: accentColor,
                              }}
                            >
                              {getCategoryIcon(item.type)}
                              <span>{getCategoryBadgeLabel(item.type)}</span>
                            </div>
                            {item.badge && (
                              <span
                                className="px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-white shadow-xs"
                                style={{ backgroundColor: accentColor }}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}

                        <h4 className="text-base sm:text-lg font-extrabold tracking-tight leading-snug break-words group-hover:text-primary transition-colors font-heading">
                          {item.title}
                        </h4>

                        {item.subtitle && (
                          <p className="text-xs font-semibold leading-relaxed break-words" style={{ color: accentColor }}>
                            {item.subtitle}
                          </p>
                        )}

                        {item.description && (
                          <RichTextViewer
                            content={item.description}
                            clamp={3}
                            className="text-xs sm:text-sm leading-relaxed line-clamp-3 break-words"
                            style={{ color: theme.subtext }}
                          />
                        )}

                        {/* Highlights List */}
                        {Array.isArray(item.highlights) && item.highlights.length > 0 && (
                          <div className="pt-2 space-y-1.5 border-t border-dashed" style={{ borderColor: theme.cardBorder }}>
                            {item.highlights.slice(0, 4).map((hl, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs leading-normal" style={{ color: theme.subtext }}>
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                                <span className="break-words line-clamp-2">{hl}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Price & Action */}
                      <div className="pt-3.5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3" style={{ borderColor: theme.cardBorder }}>
                        {/* 1. DYNAMIC CATALOG ITEM (PLAYLIST, MEETING, OR HOSTED VIDEO) */}
                        {(item.type === "PLAYLIST" || item.type === "COURSE" || item.type === "MEETING" || (item.type === "VIDEO" && !item.ctaUrl?.startsWith("http"))) ? (
                          <>
                            {/* Price / Status Column */}
                            <div className="flex sm:flex-col items-baseline sm:items-start justify-between sm:justify-start gap-1">
                              {item.userAccessState === "PURCHASED" ? (
                                <>
                                  <div className="text-[11px] font-medium" style={{ color: theme.subtext }}>Status</div>
                                  <div className="flex items-center gap-1.5 pt-0.5">
                                    <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>{item.type === "MEETING" ? "Seat Booked" : "Purchased"}</span>
                                    </span>
                                  </div>
                                </>
                              ) : item.userAccessState === "GRANTED" ? (
                                <>
                                  <div className="text-[11px] font-medium" style={{ color: theme.subtext }}>Access</div>
                                  <div className="flex items-center gap-1.5 pt-0.5">
                                    <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                      <span>{item.type === "MEETING" ? "Invite Granted" : "Access Granted"}</span>
                                    </span>
                                  </div>
                                </>
                              ) : item.shareAccessMode === "RESTRICTED" ? (
                                <>
                                  <div className="text-[11px] font-medium" style={{ color: theme.subtext }}>Access</div>
                                  <div className="flex items-center gap-1.5 pt-0.5">
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                                      <Lock className="w-3 h-3" />
                                      <span>Restricted Content</span>
                                    </span>
                                  </div>
                                </>
                              ) : item.shareAccessMode === "PURCHASABLE" ? (
                                <>
                                  <div className="text-[11px] font-medium" style={{ color: theme.subtext }}>
                                    {item.type === "MEETING" ? "Session Fee" : "Price"}
                                  </div>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-lg sm:text-xl font-black tracking-tight" style={{ color: accentColor }}>
                                      {item.price || "Free"}
                                    </span>
                                    <span className="text-[10px] sm:text-[11px] font-medium" style={{ color: theme.subtext }}>
                                      {item.pricePeriod || (item.type === "MEETING" ? "per seat" : "one-time")}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="text-[11px] font-medium" style={{ color: theme.subtext }}>
                                    {item.type === "MEETING" ? "Session Fee" : "Price"}
                                  </div>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-lg sm:text-xl font-black tracking-tight" style={{ color: accentColor }}>
                                      Free
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Action Button */}
                            <Button
                              onClick={() =>
                                executeCtaAction(
                                  "EXTERNAL_LINK",
                                  item.shareUrl || item.ctaUrl,
                                  item
                                )
                              }
                              className="w-full sm:w-auto text-xs font-bold rounded-xl py-2 sm:py-2.5 px-3.5 sm:px-4 text-white shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition-transform active:scale-95 text-center"
                              style={{ backgroundColor: accentColor }}
                            >
                              {item.userAccessState === "PURCHASED" || item.userAccessState === "GRANTED" ? (
                                item.type === "MEETING" ? (
                                  <>
                                    <VideoIcon className="w-3.5 h-3.5" />
                                    <span>Join Meeting</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    <span>Watch</span>
                                  </>
                                )
                              ) : item.shareAccessMode === "RESTRICTED" ? (
                                <>
                                  <span>{item.type === "MEETING" ? "Join / Request Access" : "View / Request Access"}</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </>
                              ) : item.shareAccessMode === "PURCHASABLE" ? (
                                item.type === "MEETING" ? (
                                  <>
                                    <span>{item.price === "Free" || item.price === "$0.00" ? "Book for Free" : "Book Seat"}</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </>
                                ) : (
                                  <>
                                    <span>{item.price === "Free" || item.price === "$0.00" ? "Buy for Free" : "Purchase"}</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </>
                                )
                              ) : (
                                item.type === "MEETING" ? (
                                  <>
                                    <VideoIcon className="w-3.5 h-3.5" />
                                    <span>Join Meeting</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    <span>Watch</span>
                                  </>
                                )
                              )}
                            </Button>
                          </>
                        ) : (
                          /* 2. CUSTOM OFFERING ITEMS (PRODUCT, SERVICE, EXTERNAL VIDEO) */
                          <>
                            <div className="flex sm:flex-col items-baseline sm:items-start justify-between sm:justify-start gap-1">
                              <div className="text-[11px] font-medium" style={{ color: theme.subtext }}>
                                {item.pricePeriod ? "Investment" : "Price"}
                              </div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-lg sm:text-xl font-black tracking-tight" style={{ color: accentColor }}>
                                  {item.price || "Free"}
                                </span>
                                {item.pricePeriod && (
                                  <span className="text-[10px] sm:text-[11px] font-medium" style={{ color: theme.subtext }}>
                                    {item.pricePeriod}
                                  </span>
                                )}
                              </div>
                            </div>

                            <Button
                              onClick={() =>
                                executeCtaAction(
                                  item.ctaAction || (item.type === "VIDEO" ? "FEATURED_VIDEO" : item.ctaUrl?.startsWith("http") ? "EXTERNAL_LINK" : "INQUIRY_MODAL"),
                                  item.ctaUrl,
                                  item
                                )
                              }
                              className="w-full sm:w-auto text-xs font-bold rounded-xl py-2 sm:py-2.5 px-3.5 sm:px-4 text-white shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition-transform active:scale-95 text-center"
                              style={{ backgroundColor: accentColor }}
                            >
                              <span>
                                {item.ctaText || (item.type === "VIDEO" ? "Watch" : item.ctaAction === "EXTERNAL_LINK" ? "Enroll / Buy" : "Inquire / Book")}
                              </span>
                              {item.ctaAction === "EXTERNAL_LINK" || (!item.ctaAction && item.ctaUrl?.startsWith("http") && item.type !== "VIDEO") ? (
                                <ExternalLink className="w-3.5 h-3.5" />
                              ) : item.ctaAction === "FEATURED_VIDEO" || item.type === "VIDEO" ? (
                                <Play className="w-3.5 h-3.5 fill-current" />
                              ) : (
                                <ArrowRight className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Testimonials Section */}
        {sections.showTestimonials !== false && Array.isArray(config.testimonials) && config.testimonials.length > 0 && (
          <section className="py-8 sm:py-12 px-3 sm:px-6 border-t" style={{ borderColor: theme.cardBorder }}>
            <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
              <div className="text-center max-w-xl mx-auto space-y-1.5">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: accentColor }}>
                  <Star className="w-4 h-4 fill-current" /> {config.testimonialsBadge || sections.testimonialsBadge || "Student & Client Reviews"}
                </div>
                <h3 className="text-xl sm:text-3xl font-black tracking-tight font-heading">{config.testimonialsTitle || sections.testimonialsTitle || "Trusted by Creators & Engineers"}</h3>
                <p className="text-xs sm:text-sm" style={{ color: theme.subtext }}>
                  {config.testimonialsSubtitle || sections.testimonialsSubtitle || sections.testimonialsDescription || "Read what students, founders, and attendees say about our sessions and programs."}
                </p>
              </div>

              <div className={testimonialsGridClass}>
                {config.testimonials.map((t, idx) => (
                  <div
                    key={idx}
                    className={`p-4 sm:p-6 ${roundnessClass} border flex flex-col justify-between space-y-3 sm:space-y-4 transition-all duration-200 min-w-0`}
                    style={{
                      backgroundColor: theme.card,
                      borderColor: theme.cardBorder,
                      boxShadow: `2.5px 2.5px 0px 0px ${effectiveGlow || "var(--comic-shadow-subtle)"}`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = `4.5px 4.5px 0px 0px ${effectiveGlow || "var(--comic-shadow)"}`;
                      e.currentTarget.style.borderColor = accentColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = `2.5px 2.5px 0px 0px ${effectiveGlow || "var(--comic-shadow-subtle)"}`;
                      e.currentTarget.style.borderColor = theme.cardBorder;
                    }}
                  >
                    <div className="space-y-2.5 sm:space-y-3 min-w-0">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: t.rating || 5 }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <p className="text-xs sm:text-sm italic leading-relaxed break-words" style={{ color: theme.subtext }}>
                        "{t.quote}"
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-3 border-t min-w-0" style={{ borderColor: theme.cardBorder }}>
                      <div
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 select-none shadow-xs border"
                        style={{
                          backgroundColor: `${accentColor}20`,
                          color: accentColor,
                          borderColor: `${accentColor}35`,
                        }}
                      >
                        {(() => {
                          const parts = (t.name || "").trim().split(/\s+/).filter(Boolean);
                          if (parts.length >= 2) {
                            return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
                          }
                          return (t.name || "U").slice(0, 2).toUpperCase();
                        })()}
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="font-bold text-xs sm:text-sm truncate">{t.name}</div>
                        <div className="text-[10px] sm:text-[11px] truncate" style={{ color: theme.subtext }}>
                          {t.role} {t.company ? `• ${t.company}` : ""}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ Accordion Section */}
        {sections.showFaq !== false && Array.isArray(config.faqs) && config.faqs.length > 0 && (
          <section className="py-12 px-4 sm:px-6 border-t" style={{ borderColor: theme.cardBorder }}>
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: accentColor }}>
                  <MessageSquare className="w-4 h-4" /> FAQ
                </div>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight font-heading">Frequently Asked Questions</h3>
                <p className="text-xs sm:text-sm" style={{ color: theme.subtext }}>
                  Everything you need to know about enrollments, meetings, and assets.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {config.faqs.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div
                      key={idx}
                      className={`${roundnessClass} border transition-all overflow-hidden`}
                      style={{
                        backgroundColor: theme.card,
                        borderColor: isOpen ? accentColor : theme.cardBorder,
                      }}
                    >
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-4 font-bold text-sm sm:text-base cursor-pointer"
                      >
                        <span>{faq.question}</span>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                        ) : (
                          <ChevronDown className="w-4 h-4 shrink-0" style={{ color: theme.subtext }} />
                        )}
                      </button>
                      {isOpen && (
                        <div
                          className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs sm:text-sm leading-relaxed border-t pt-3"
                          style={{
                            borderColor: theme.cardBorder,
                            color: theme.subtext,
                          }}
                        >
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Contact & Inquiries Lead Capture Section */}
        {sections.showContact !== false && (
          <section id="contact" className="py-8 sm:py-16 px-3 sm:px-6 border-t" style={{ borderColor: theme.cardBorder }}>
            <div className="max-w-3xl mx-auto">
              <div
                className={`p-4 sm:p-8 md:p-10 ${roundnessClass} border relative overflow-hidden`}
                style={{
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                  boxShadow: `0 8px 30px -4px ${effectiveGlow}`,
                }}
              >
                <div className="text-center max-w-xl mx-auto space-y-2 mb-8">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: accentColor }}>
                    <Mail className="w-4 h-4" /> Get in Touch
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight font-heading">Direct Message or Custom Request</h3>
                  <p className="text-xs sm:text-sm" style={{ color: theme.subtext }}>
                    Have questions about a playlist, workshop, or want to schedule a tailored session? Send a note directly.
                  </p>
                </div>

                {inquirySuccess ? (
                  <div
                    className="p-6 rounded-2xl text-center space-y-2 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 animate-in fade-in"
                  >
                    <CheckCircle2 className="w-10 h-10 mx-auto" />
                    <h4 className="font-bold text-base">Message Sent Successfully!</h4>
                    <p className="text-xs opacity-90">
                      Thank you for reaching out. The creator will review your request and get back to you shortly.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitInquiry} className="space-y-4">
                    {inquiryError && (
                      <div className="p-3 rounded-xl text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400">
                        {inquiryError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold" style={{ color: theme.text }}>
                          Your Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Jane Doe"
                          value={inquiryName}
                          onChange={(e) => setInquiryName(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none transition-all"
                          style={{
                            backgroundColor: `${theme.bg}90`,
                            borderColor: theme.cardBorder,
                            color: theme.text,
                          }}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold" style={{ color: theme.text }}>
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="jane@example.com"
                          value={inquiryEmail}
                          onChange={(e) => setInquiryEmail(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none transition-all"
                          style={{
                            backgroundColor: `${theme.bg}90`,
                            borderColor: theme.cardBorder,
                            color: theme.text,
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold" style={{ color: theme.text }}>
                        Preferred Date / Availability (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Weekdays 2-5 PM EST, or Next Monday"
                        value={inquiryPreferredTime}
                        onChange={(e) => setInquiryPreferredTime(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none transition-all"
                        style={{
                          backgroundColor: `${theme.bg}90`,
                          borderColor: theme.cardBorder,
                          color: theme.text,
                        }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold" style={{ color: theme.text }}>
                        Your Message / Project Details *
                      </label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Tell the creator about what you are looking to achieve..."
                        value={inquiryMessage}
                        onChange={(e) => setInquiryMessage(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none transition-all resize-none"
                        style={{
                          backgroundColor: `${theme.bg}90`,
                          borderColor: theme.cardBorder,
                          color: theme.text,
                        }}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submittingInquiry}
                      className="w-full py-3 rounded-xl font-bold text-sm text-white shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
                      style={{ backgroundColor: accentColor }}
                    >
                      <Send className="w-4 h-4" />
                      <span>{submittingInquiry ? "Sending..." : "Submit Inquiry"}</span>
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Public Footer */}
        <footer
          className="mt-auto py-8 px-4 sm:px-6 border-t text-center text-xs space-y-2"
          style={{
            backgroundColor: theme.bg,
            borderColor: theme.cardBorder,
            color: theme.subtext,
          }}
        >
          <div className="flex items-center justify-center gap-2 font-semibold">
            <span>Powered by</span>
            <Link href="/" className="font-extrabold flex items-center gap-1 hover:underline" style={{ color: accentColor }}>
              <Sparkles className="w-3.5 h-3.5" /> Taped
            </Link>
          </div>
          <p>© {new Date().getFullYear()} {org.name}. All rights reserved.</p>
        </footer>

        {/* Mobile Sticky Quick Action Bar */}
        <div
          className="sm:hidden fixed bottom-0 left-0 right-0 p-3 z-30 backdrop-blur-xl border-t flex items-center gap-2"
          style={{
            backgroundColor: `${theme.bg}ee`,
            borderColor: theme.cardBorder,
          }}
        >
          <a
            href="#offerings"
            className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-center border transition-all"
            style={{
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              color: theme.text,
            }}
          >
            All Offerings ({items.length})
          </a>
          <button
            onClick={() => handleOpenInquiry()}
            className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-white text-center shadow-xs transition-transform active:scale-95"
            style={{ backgroundColor: accentColor }}
          >
            {config.secondaryCtaText || "Explore Meetings"}
          </button>
        </div>
      </div>

      {/* Inquiry / Booking Modal Dialog */}
      <Dialog open={inquiryModalOpen} onOpenChange={setInquiryModalOpen}>
        <DialogContent
          className={`max-w-lg p-6 max-h-[90vh] flex flex-col ${roundnessClass} border shadow-2xl overflow-hidden`}
          style={{
            backgroundColor: theme.card,
            borderColor: theme.cardBorder,
            color: theme.text,
          }}
        >
          <DialogHeader className="shrink-0 pb-3 border-b" style={{ borderColor: theme.cardBorder }}>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5" style={{ color: accentColor }} />
              {selectedOffering ? `Inquire: ${selectedOffering.title}` : "Contact & Book Session"}
            </DialogTitle>
            <DialogDescription className="text-xs" style={{ color: theme.subtext }}>
              {selectedOffering?.price
                ? `Price: ${selectedOffering.price} ${selectedOffering.pricePeriod || ""} • ${selectedOffering.deliveryFormat || "Direct Delivery"}`
                : "Submit your details and preferred times to connect with the creator."}
            </DialogDescription>
          </DialogHeader>

          {inquirySuccess ? (
            <div className="flex-1 flex flex-col justify-between py-6">
              <div className="text-center space-y-2 text-emerald-400 my-auto">
                <CheckCircle2 className="w-12 h-12 mx-auto" />
                <h4 className="font-bold text-lg">Inquiry Sent!</h4>
                <p className="text-xs opacity-90">
                  The creator has received your message and will get back to you shortly at {inquiryEmail}.
                </p>
              </div>
              <DialogFooter className="pt-3 border-t shrink-0 mt-auto" style={{ borderColor: theme.cardBorder }}>
                <Button
                  type="button"
                  onClick={() => setInquiryModalOpen(false)}
                  className="w-full sm:w-auto text-xs font-bold px-5 py-2 rounded-xl text-white shadow-lg cursor-pointer"
                  style={{ backgroundColor: accentColor }}
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleSubmitInquiry} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 py-3 pr-1">
                {inquiryError && (
                  <div className="p-3 rounded-xl text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400">
                    {inquiryError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold">Your Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Full name"
                    value={inquiryName}
                    onChange={(e) => setInquiryName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm border focus:outline-none"
                    style={{
                      backgroundColor: `${theme.bg}90`,
                      borderColor: theme.cardBorder,
                      color: theme.text,
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="email@example.com"
                    value={inquiryEmail}
                    onChange={(e) => setInquiryEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm border focus:outline-none"
                    style={{
                      backgroundColor: `${theme.bg}90`,
                      borderColor: theme.cardBorder,
                      color: theme.text,
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold">Preferred Time / Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Next Tuesday morning, EST"
                    value={inquiryPreferredTime}
                    onChange={(e) => setInquiryPreferredTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm border focus:outline-none"
                    style={{
                      backgroundColor: `${theme.bg}90`,
                      borderColor: theme.cardBorder,
                      color: theme.text,
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold">Message *</label>
                  <textarea
                    required
                    rows={3}
                    value={inquiryMessage}
                    onChange={(e) => setInquiryMessage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm border focus:outline-none resize-none"
                    style={{
                      backgroundColor: `${theme.bg}90`,
                      borderColor: theme.cardBorder,
                      color: theme.text,
                    }}
                  />
                </div>
              </div>

              <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t shrink-0 mt-auto" style={{ borderColor: theme.cardBorder }}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setInquiryModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingInquiry}
                  className="text-xs font-bold px-4 py-2 rounded-xl text-white shadow-lg cursor-pointer"
                  style={{ backgroundColor: accentColor }}
                >
                  {submittingInquiry ? "Sending..." : "Submit Inquiry"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Video Player Modal */}
      <Dialog open={!!activeVideoModalUrl} onOpenChange={() => setActiveVideoModalUrl(null)}>
        <DialogContent
          className="max-w-4xl p-2 sm:p-4 rounded-3xl border shadow-2xl bg-black border-white/10"
        >
          <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black">
            {(() => {
              const videoMeta = resolveVideoEmbedDetails(activeVideoModalUrl);
              if (!videoMeta) return null;
              if (videoMeta.type === "iframe") {
                return (
                  <iframe
                    src={videoMeta.src}
                    title="Video Player"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                );
              }
              return (
                <video
                  src={videoMeta.src}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
