import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgePercent,
  Camera,
  CheckCircle2,
  Clapperboard,
  CreditCard,
  LayoutPanelTop,
  LockKeyhole,
  MonitorPlay,
  Palette,
  Ticket,
  UploadCloud,
  Video,
} from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { FAQ_DATA } from "@/components/landing/faqData";

export const metadata: Metadata = {
  title:
    "Taped — Private Video Hosting & Meetings. Share Only With Who You Choose",
  description:
    "Host videos and live meetings, then share selectively — only the exact people you invite by email can ever watch. Brand every viewer page with your logo, list your services and events on a dedicated offerings page, and monetize videos & meetings with commissions as low as 3.5%. 2GB free storage.",
  keywords: [
    "private video hosting",
    "share video specific users only",
    "email gated video sharing",
    "secure video hosting platform",
    "host online meetings recording",
    "custom branded video player page",
    "white label video share page",
    "creator offerings page events",
    "monetize videos lowest commission",
    "sell meeting passes",
    "screen recorder online no download",
    "free video hosting 2gb",
  ],
  alternates: {
    canonical: "https://taped.app",
  },
  openGraph: {
    title: "Taped — Private Video Hosting & Meetings. Share Only With Who You Choose",
    description:
      "Host videos and live meetings behind exact-email access control. Brand your viewer pages, showcase your offerings, and monetize with the lowest commission in the market.",
    url: "https://taped.app",
    siteName: "Taped",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Taped — Private Video Hosting & Meetings Platform",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Taped — Private Video Hosting & Meetings",
    description:
      "Host videos & meetings, share only with invited emails, brand every page, list your offerings, and sell access from just 3.5% commission.",
    images: ["/og-image.png"],
  },
};

const PILLARS = [
  {
    icon: Video,
    kicker: "Pillar 01",
    title: "Host your videos",
    description:
      "Upload files or record screen, camera and mic right in the browser. Every video is transcoded into adaptive multi-bitrate HLS and streamed fast, anywhere in the world.",
  },
  {
    icon: Camera,
    kicker: "Pillar 02",
    title: "Meet & record live",
    description:
      "Spin up HD WebRTC meeting rooms with screen sharing — no installs for guests. Record whole rooms or individual speakers straight into your library.",
  },
  {
    icon: LockKeyhole,
    kicker: "Pillar 03",
    title: "Share selectively",
    description:
      "This is our core promise: content locked to an exact list of email addresses. Viewers verify with a one-time passcode — if they're not on your list, they see nothing. Forwarded links never work.",
    highlight: true,
  },
];

const FEATURES = [
  {
    icon: UploadCloud,
    title: "Upload or record anything",
    description:
      "Drag in files up to 4K or capture your screen with a webcam bubble overlay — no installs, no extensions.",
  },
  {
    icon: MonitorPlay,
    title: "White-label viewer pages",
    description:
      "Customize the content view page to match your brand: add your logo, banner, theme presets, colors and a call-to-action button.",
  },
  {
    icon: LayoutPanelTop,
    title: "Dedicated offerings page",
    description:
      "A public storefront at your own URL where you list everything you offer — courses, services, products and upcoming events.",
  },
  {
    icon: Ticket,
    title: "Meeting passes",
    description:
      "Sell entry passes to your live rooms. Buyers get instant access; recordings land back in your library.",
  },
  {
    icon: BadgePercent,
    title: "Monetize it all",
    description:
      "Make any video or meeting purchasable in one click. Commissions start at 6.5% and drop to 3.5% — the lowest in the market.",
  },
  {
    icon: Clapperboard,
    title: "Playlists that sell as courses",
    description:
      "Prepare a playlist once — share it privately with selected emails, or price it and sell it as a polished course. Embed a continuous player anywhere.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Create",
    description:
      "Upload a file or hit record in-browser. Multi-bitrate HLS transcoding starts automatically.",
  },
  {
    number: "02",
    title: "Choose your audience",
    description:
      "Keep it private, share with selected email addresses only, or publish it to the world. You decide exactly who gets in.",
  },
  {
    number: "03",
    title: "Brand the experience",
    description:
      "Add your logo, banner and theme to the viewer page so it looks like you built it yourself.",
  },
  {
    number: "04",
    title: "Sell or share",
    description:
      "List offerings and upcoming events on your storefront, price videos & meeting passes, and sell with the lowest commission in the market.",
  },
];

export default function LandingPage() {
  const jsonLdApp = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Taped",
    url: "https://taped.app",
    description:
      "Private video hosting and meetings platform: upload or record in-browser, stream adaptive HLS, restrict access to specific users by verified email, customize branded viewer pages, run a dedicated offerings storefront, and monetize videos and meetings with commissions as low as 3.5%.",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web, All",
    browserRequirements: "Requires HTML5/WebRTC capable modern browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "2GB Free Forever Cloud Storage Tier",
    },
    featureList: [
      "Private Video Hosting with Adaptive Multi-Bitrate HLS Streaming",
      "In-Browser Screen & Webcam Recording Studio",
      "Selective Sharing Locked to Specific User Email Addresses with OTP Verification",
      "WebRTC Meeting Rooms with Whole-Room & Individual Recording",
      "White-Label Customizable Content View Pages with Logo, Banner, Themes & CTA",
      "Dedicated Public Offerings Page for Services, Courses & Upcoming Events",
      "Monetization: Sell Videos & Meeting Passes with Commissions as Low as 3.5%",
      "Developer REST APIs & Real-time Webhooks",
      "2GB Free Cloud Storage Included",
    ],
  };

  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_DATA.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />

      <PublicHeader currentPage="home" />

      <main className="w-full flex-1">
        {/* ── HERO ─────────────────────────────────────────────── */}
        <section className="border-b border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-14 sm:pb-20">
            <div className="grid lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-16 items-center">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary border border-primary/30 bg-primary/5 rounded-full px-3.5 py-1.5 mb-6">
                  <LockKeyhole className="w-3.5 h-3.5" />
                  Only who you invite can ever watch
                </p>

                <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.05]">
                  Host videos.
                  <br />
                  Meet live.
                  <br />
                  <span className="text-primary">Share on your terms.</span>
                </h1>

                <p className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl font-medium">
                  Taped hosts your videos and live meetings, then locks them down to{" "}
                  <strong className="text-foreground">the exact people you invite by email</strong>{" "}
                  — nobody else can access your content. Brand every viewer page with{" "}
                  <strong className="text-foreground">your logo</strong>, showcase your work on a{" "}
                  <strong className="text-foreground">dedicated offerings page</strong>, and{" "}
                  <strong className="text-foreground">monetize</strong> when you&apos;re ready.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/auth/register"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-primary text-primary-foreground font-extrabold text-base hover:opacity-90 active:scale-[0.98] transition-all"
                  >
                    Start free — 2GB included
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/record"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full border-2 border-border font-bold text-base hover:border-primary hover:text-primary transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    Open studio recorder
                  </Link>
                </div>

                <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs sm:text-sm font-semibold text-muted-foreground">
                  {[
                    "No credit card required",
                    "Email-verified viewers only",
                    "Commission from just 3.5%",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Flat product mock panel */}
              <div className="hidden lg:block">
                <div className="rounded-2xl border-2 border-border overflow-hidden bg-card">
                  <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="ml-3 text-[11px] font-mono font-bold text-muted-foreground">
                      taped.app/share/q4-strategy
                    </span>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="aspect-video rounded-xl bg-muted border-2 border-border flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <MonitorPlay className="w-8 h-8" />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Your video · Your branding
                      </span>
                    </div>
                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-4 py-3">
                      <div className="flex items-center gap-2.5 mb-2">
                        <LockKeyhole className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-bold">Shared with 3 specific people</span>
                      </div>
                      <ul className="space-y-1 pl-6 text-[11px] font-semibold text-muted-foreground">
                        <li>✓ maya@client.com — verified</li>
                        <li>✓ dev@partner.io — verified</li>
                        <li>✕ anyoneelse@anywhere.com — blocked</li>
                      </ul>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-border p-3 text-center">
                        <p className="text-lg font-black text-primary">6</p>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mt-0.5">
                          Courses live
                        </p>
                      </div>
                      <div className="rounded-xl border border-border p-3 text-center">
                        <p className="text-lg font-black text-primary">100%</p>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mt-0.5">
                          White-label pages
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS STRIP ──────────────────────────────────────── */}
        <section aria-label="Key platform stats" className="border-b border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
            {[
              { value: "2 GB", label: "Free storage forever" },
              { value: "3.5%", label: "Lowest sale commission" },
              { value: "OTP", label: "Email-verified viewing" },
              { value: "Zero", label: "Installs or extensions" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`py-8 sm:py-10 px-4 sm:px-6 text-center ${i > 1 ? "border-t md:border-t-0 border-border" : ""}`}
              >
                <p className="text-3xl sm:text-4xl font-black tracking-tight">{stat.value}</p>
                <p className="mt-1 text-xs sm:text-sm font-semibold text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── THREE PILLARS ────────────────────────────────────── */}
        <section className="border-b border-border" id="platform">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-widest text-primary mb-3">
                What Taped does best
              </p>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                Three pillars. One uncompromising platform.
              </h2>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-4">
              {PILLARS.map((pillar) => (
                <article
                  key={pillar.title}
                  className={`rounded-2xl border-2 p-6 ${pillar.highlight
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card"
                    }`}
                >
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center ${pillar.highlight ? "bg-primary" : "bg-primary/10"
                        }`}
                    >
                      <pillar.icon
                        className={`w-5 h-5 ${pillar.highlight ? "text-primary-foreground" : "text-primary"
                          }`}
                      />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {pillar.kicker}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold tracking-tight">{pillar.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed font-medium">
                    {pillar.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── BRANDED VIEWER EXPERIENCE ────────────────────────── */}
        <section className="border-b border-border bg-muted" id="branding">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-primary mb-3">
                  Your brand, front and center
                </p>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                  The viewer never sees us. Only you.
                </h2>
                <p className="mt-4 text-muted-foreground font-medium leading-relaxed">
                  Every video and playlist opens on a customizable content view page that carries
                  your identity end to end — not ours.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "Add your company logo to the viewer page header",
                    "Pick from premium theme presets or set your own accent color",
                    "Upload welcome banners and a profile avatar for creators & teams",
                    "Point a call-to-action button at your calendar, site or offer",
                    "Embeddable player keeps your branding on your own website too",
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Flat branding mockup */}
              <div className="rounded-2xl border-2 border-border bg-card overflow-hidden shadow-sm">
                <div className="aspect-video bg-muted flex items-center justify-center relative">
                  <div className="absolute top-3 left-3 rounded-md bg-background border border-border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <Palette className="w-3 h-3 text-primary" />
                    Your Logo Here
                  </div>
                  <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
                    <Clapperboard className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 h-1.5 rounded-full bg-border overflow-hidden">
                    <div className="h-full w-2/3 bg-primary" />
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <div className="h-3 w-3/4 rounded bg-border" />
                  <div className="h-3 w-1/2 rounded bg-border" />
                  <div className="flex items-center justify-between pt-2">
                    <div className="h-7 w-28 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-primary">
                      Book a demo
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Your domain feel
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── OFFERINGS STOREFRONT ─────────────────────────────── */}
        <section className="border-b border-border" id="offerings">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-widest text-primary mb-3">
                One link for everything you do
              </p>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                A dedicated page for your offerings & events.
              </h2>
              <p className="mt-4 text-muted-foreground font-medium leading-relaxed">
                Every account gets its own public offerings page — a polished storefront where
                your audience sees everything you offer today and every event coming up next,
                with inquiries just one click away.
              </p>
            </div>

            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: Clapperboard,
                  title: "Courses & playlists",
                  desc: "Package video series with highlights, pricing badges and cover art.",
                },
                {
                  icon: Camera,
                  title: "Services & sessions",
                  desc: "List 1:1 calls and consulting with duration, format and hourly rates.",
                },
                {
                  icon: Ticket,
                  title: "Upcoming events",
                  desc: "Publish webinars and live sessions with limited-seat badges.",
                },
                {
                  icon: CreditCard,
                  title: "Products",
                  desc: "Showcase digital downloads or physical goods alongside your media.",
                },
              ].map((card) => (
                <article
                  key={card.title}
                  className="rounded-2xl border-2 border-border p-6 bg-card transition-colors hover:border-primary/50"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                    <card.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-extrabold tracking-tight">{card.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed font-medium">
                    {card.desc}
                  </p>
                </article>
              ))}
            </div>

            <p className="mt-8 text-sm font-semibold text-muted-foreground">
              Plus testimonials, FAQs, social links, featured videos and inquiry forms — fully
              configurable, published under your own slug.{" "}
            </p>
          </div>
        </section>

        {/* ── MORE FEATURES ────────────────────────────────────── */}
        <section className="border-b border-border" id="features">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-widest text-primary mb-3">
                And everything around it
              </p>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                The details that make it complete.
              </h2>
            </div>

            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map((feature) => (
                <article
                  key={feature.title}
                  className="group rounded-2xl border-2 border-border p-6 bg-card transition-colors hover:border-primary/50"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary group-hover:[&>svg]:text-primary-foreground transition-colors">
                    <feature.icon className="w-5 h-5 text-primary transition-colors" />
                  </div>
                  <h3 className="text-lg font-extrabold tracking-tight">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed font-medium">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── MONETIZE ─────────────────────────────────────────── */}
        <section className="border-b border-border bg-muted" id="monetize">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
            <div className="max-w-2xl mx-auto text-center">
              <p className="text-xs font-black uppercase tracking-widest text-primary mb-3">
                Built-in monetization
              </p>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                Monetize your videos & meetings.
              </h2>
              <p className="mt-4 text-muted-foreground font-medium leading-relaxed">
                Flip the switch whenever you&apos;re ready. Price any video or sell passes to your
                live rooms — with the lowest commission in the market, guaranteed.
              </p>
            </div>

            {/* What you can sell */}
            <div className="mt-12 grid md:grid-cols-2 max-w-4xl mx-auto gap-4">
              {[
                {
                  icon: Clapperboard,
                  name: "Videos & courses",
                  tagline: "Masterclasses, demos, playlist-based courses",
                  points: [
                    "One-time pricing on any video — or an entire playlist as a course",
                    "Buyers get instant, email-gated access after payment",
                  ],
                },
                {
                  icon: Ticket,
                  name: "Meetings",
                  tagline: "Webinars, consults, live sessions",
                  points: [
                    "Sell entry passes to scheduled or instant rooms",
                    "Recordings save automatically to your library to resell",
                  ],
                },
              ].map((item) => (
                <article
                  key={item.name}
                  className="rounded-2xl border-2 border-border bg-card p-6 flex flex-col"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold tracking-tight">{item.name}</h3>
                      <p className="text-xs font-semibold text-muted-foreground">{item.tagline}</p>
                    </div>
                  </div>
                  <ul className="mt-5 space-y-2.5 flex-1">
                    {item.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-2 text-sm font-medium text-muted-foreground"
                      >
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            {/* Commission breakdown panel */}
            <div className="mt-4 rounded-2xl border-2 border-primary/40 bg-card overflow-hidden">
              <div className="grid md:grid-cols-[1fr_auto] items-stretch">
                <div className="p-6 sm:p-8">
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                    The lowest commission in the market. Period.
                  </h3>
                  <p className="mt-2 text-sm sm:text-base text-muted-foreground font-medium leading-relaxed max-w-lg">
                    While other platforms quietly take 10–30%, our platform fee starts at just{" "}
                    <strong className="text-foreground">6.5%</strong> and shrinks to{" "}
                    <strong className="text-primary">3.5%</strong> as you grow. No hidden listing
                    fees. No monthly minimums to sell.
                  </p>
                  <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs sm:text-sm font-semibold text-muted-foreground">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-primary" /> Secure checkout included
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-primary" /> Instant access for buyers
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-primary" /> Direct bank payouts
                    </li>
                  </ul>
                </div>
                <div className="border-t md:border-t-0 md:border-l border-border bg-primary text-primary-foreground p-6 sm:p-8 flex flex-col justify-center items-center text-center min-w-56">
                  <p className="text-xs font-black uppercase tracking-widest opacity-80">
                    Platform fee from
                  </p>
                  <p className="text-6xl font-black tracking-tighter leading-none my-2">3.5%</p>
                  <p className="text-xs font-semibold opacity-80">
                    The lowest platform fee anywhere
                  </p>
                  <Link
                    href="/pricing"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-extrabold underline underline-offset-4 hover:no-underline"
                  >
                    See all plans <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────── */}
        <section className="border-b border-border" id="how-it-works">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-widest text-primary mb-3">
                From idea to income
              </p>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                Four steps. That&apos;s the whole workflow.
              </h2>
            </div>

            <ol className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {STEPS.map((step) => (
                <li
                  key={step.number}
                  className="relative rounded-2xl border-2 border-border p-6 bg-card"
                >
                  <span
                    aria-hidden
                    className="absolute top-5 right-6 text-4xl font-black text-primary/15 select-none"
                  >
                    {step.number}
                  </span>
                  <h3 className="text-lg font-extrabold tracking-tight">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed font-medium">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────── */}
        <section className="border-b border-border" id="faq">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
            <div className="text-center mb-10">
              <p className="text-xs font-black uppercase tracking-widest text-primary mb-3">
                Answers, upfront
              </p>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                Frequently asked questions
              </h2>
            </div>

            <div className="divide-y divide-border border-y-2 border-border">
              {FAQ_DATA.map((faq) => (
                <details key={faq.question} className="group py-5">
                  <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-left font-extrabold text-base sm:text-lg tracking-tight marker:hidden [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <span
                      aria-hidden
                      className="shrink-0 w-7 h-7 rounded-full border-2 border-border flex items-center justify-center text-lg font-bold text-muted-foreground group-open:bg-primary group-open:border-primary group-open:text-primary-foreground transition-colors"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed font-medium pr-10">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────────── */}
        <section className="bg-primary text-primary-foreground">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight max-w-3xl mx-auto">
              Your content. Your audience. Nobody else gets in.
            </h2>
            <p className="mt-4 text-base sm:text-lg font-medium opacity-90 max-w-2xl mx-auto leading-relaxed">
              Start hosting privately today — 2GB free storage, branded viewer pages and your own
              offerings page, ready the moment you sign up.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/auth/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-background text-foreground font-extrabold text-base hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Create your free account
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/record"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border-2 border-primary-foreground/40 font-bold text-base hover:bg-primary-foreground/10 transition-all"
              >
                <Camera className="w-4 h-4" />
                Try the recorder first
              </Link>
            </div>
            <p className="mt-6 text-xs font-semibold opacity-75">
              Free forever plan · No credit card · Lowest commission in the market
            </p>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
