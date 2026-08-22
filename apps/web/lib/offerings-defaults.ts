import { OfferingsConfigData } from "@/app/offerings/[slug]/offerings-client";

export interface SocialPlatformInfo {
  id: string;
  name: string;
  placeholder: string;
  defaultColor?: string;
}

export const SUPPORTED_SOCIAL_PLATFORMS: SocialPlatformInfo[] = [
  { id: "youtube", name: "YouTube", placeholder: "https://youtube.com/@channel", defaultColor: "#ef4444" },
  { id: "twitter", name: "Twitter / X", placeholder: "https://x.com/username", defaultColor: "#ffffff" },
  { id: "github", name: "GitHub", placeholder: "https://github.com/username", defaultColor: "#ffffff" },
  { id: "linkedin", name: "LinkedIn", placeholder: "https://linkedin.com/in/username", defaultColor: "#0ea5e9" },
  { id: "instagram", name: "Instagram", placeholder: "https://instagram.com/username", defaultColor: "#ec4899" },
  { id: "discord", name: "Discord", placeholder: "https://discord.gg/invite", defaultColor: "#818cf8" },
  { id: "twitch", name: "Twitch", placeholder: "https://twitch.tv/username", defaultColor: "#a855f7" },
  { id: "tiktok", name: "TikTok", placeholder: "https://tiktok.com/@username", defaultColor: "#22d3ee" },
  { id: "threads", name: "Threads", placeholder: "https://threads.net/@username", defaultColor: "#ffffff" },
  { id: "telegram", name: "Telegram", placeholder: "https://t.me/username", defaultColor: "#38bdf8" },
  { id: "facebook", name: "Facebook", placeholder: "https://facebook.com/username", defaultColor: "#3b82f6" },
  { id: "whatsapp", name: "WhatsApp", placeholder: "https://wa.me/1234567890", defaultColor: "#22c55e" },
  { id: "spotify", name: "Spotify / Podcast", placeholder: "https://open.spotify.com/...", defaultColor: "#1ed760" },
  { id: "reddit", name: "Reddit", placeholder: "https://reddit.com/r/community", defaultColor: "#f97316" },
  { id: "medium", name: "Medium", placeholder: "https://medium.com/@username", defaultColor: "#ffffff" },
  { id: "substack", name: "Substack / Newsletter", placeholder: "https://newsletter.substack.com", defaultColor: "#ea580c" },
  { id: "dribbble", name: "Dribbble", placeholder: "https://dribbble.com/designer", defaultColor: "#f43f5e" },
  { id: "patreon", name: "Patreon", placeholder: "https://patreon.com/creator", defaultColor: "#ff424d" },
  { id: "bluesky", name: "Bluesky", placeholder: "https://bsky.app/profile/username.bsky.social", defaultColor: "#0284c7" },
  { id: "email", name: "Email Address", placeholder: "creator@example.com", defaultColor: "#eab308" },
  { id: "website", name: "Website / Portfolio", placeholder: "https://mywebsite.com", defaultColor: "#84cc16" },
  { id: "custom", name: "Custom Link", placeholder: "https://...", defaultColor: "#84cc16" },
];

export const DEFAULT_OFFERINGS_CONFIG: OfferingsConfigData = {
  themePreset: "obsidian",
  accentColor: "#84cc16",
  backgroundStyle: "mesh-gradient",
  cardRoundness: "2xl",
  headline: "Master Your Craft & Scale Your Knowledge",
  subheadline: "Playlists, direct 1:1 mentorship, video masterclasses & consulting sessions.",
  bio: "Full-stack creator & engineer sharing production-grade workflows, system design playlists, and 1-on-1 strategy sessions.",
  showAvatar: true,
  avatarUrl: null,
  bannerUrl: null,
  ctaText: "Explore Offerings",
  ctaAction: "SCROLL_OFFERINGS",
  ctaUrl: "#offerings",
  secondaryCtaText: "Book 1:1 Session",
  secondaryCtaAction: "INQUIRY_MODAL",
  secondaryCtaUrl: "#meetings",
  socialLinks: {
    youtube: "https://youtube.com",
    twitter: "https://x.com",
    github: "https://github.com",
    linkedin: "https://linkedin.com",
    instagram: "",
    discord: "https://discord.gg",
    website: "https://example.com",
    email: "creator@example.com",
  },
  stats: [
    { label: "Active Students", value: "12,500+" },
    { label: "Average Rating", value: "4.9 ★" },
    { label: "1:1 Sessions", value: "500+" },
    { label: "Video Lessons", value: "140+" },
  ],
  sectionsConfig: {
    showPlaylists: true,
    showCourses: true,
    showMeetings: true,
    showVideos: true,
    showProducts: true,
    showServices: true,
    showTestimonials: true,
    showFaq: true,
    showContact: true,
  },
  testimonials: [
    {
      name: "Sarah Chen",
      role: "Senior Frontend Engineer",
      company: "Stripe",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      quote: "The playlist series broke down advanced architectural patterns into clear, practical mental models. Easily the highest ROI educational content I've invested in.",
      rating: 5,
    },
    {
      name: "Marcus Vance",
      role: "Founder & Tech Lead",
      company: "Vance Media",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
      quote: "The 1:1 mentorship session answered in 45 minutes what our team had been struggling with for three weeks. Invaluable real-world feedback.",
      rating: 5,
    },
    {
      name: "Elena Rostova",
      role: "Creative Director",
      company: "Studio Pulse",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80",
      quote: "Top-tier video production assets and clear actionable guides. Everything feels clean, professional, and directly applicable.",
      rating: 5,
    },
  ],
  faqs: [
    {
      question: "How do 1:1 mentorship sessions work?",
      answer: "Sessions are conducted live via high-definition video. You'll receive a calendar invite with the meeting link immediately upon booking or inquiry confirmation.",
    },
    {
      question: "Are playlists self-paced or cohort-based?",
      answer: "Most playlists offer instant lifetime access with all video modules, downloadable starter repositories, and private community discussion channels.",
    },
    {
      question: "What payment methods are supported?",
      answer: "We support major credit/debit cards, UPI, Apple Pay, Google Pay, and international currencies via secure checkout gateways.",
    },
    {
      question: "Can I request custom enterprise workshops or consulting?",
      answer: "Yes! Use the inquiry form at the bottom of the page to share your requirements and timeline, and we will get back to you within 24 hours.",
    },
  ],
  featuredVideoUrl: "",
  isPublished: true,
};
