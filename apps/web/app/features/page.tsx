import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { FEATURES } from "@/lib/features";
import { getBaseUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Features — Host, Share, Record, Meet & Monetize | Taped",
  description:
    "Explore Taped features: host videos with adaptive HLS, share selectively by email, sell any content from 3.5%, record screen with camera bubble, host meetings & record, build playlists & courses, publish an offerings page, and brand every viewer page.",
  keywords: [
    "Taped features",
    "private video hosting features",
    "selective video sharing",
    "sell videos online",
    "screen recorder with camera bubble",
    "host online meetings",
    "video playlists courses",
    "offerings page",
    "white label video pages",
  ],
  alternates: {
    canonical: "https://taped.in/features",
  },
  openGraph: {
    title: "Taped Features — Host, Share, Record, Meet & Monetize",
    description:
      "One platform for private video hosting, email-gated sharing, monetization from 3.5%, studio recording, meetings, courses, offerings storefront & white-label branding.",
    url: "https://taped.in/features",
    siteName: "Taped",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Taped platform features overview",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Taped Features — Host, Share, Record, Meet & Monetize",
    description:
      "Host videos, share with exact emails, sell content from 3.5%, record screen + camera, meet live, build courses, publish offerings & brand every page.",
    images: ["/og-image.png"],
  },
};

export default function FeaturesOverviewPage() {
  const baseUrl = getBaseUrl();
  const jsonLdItemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Taped Platform Features",
    description:
      "Core Taped features: private video hosting, selective sharing, monetization, screen recording, meetings, playlists/courses, offerings page, branded viewer pages.",
    url: `${baseUrl}/features`,
    numberOfItems: FEATURES.length,
    itemListElement: FEATURES.map((f, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: f.title,
      description: f.tagline,
      url: `${baseUrl}/features/${f.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdItemList) }}
      />
      <PublicHeader currentPage="features" />

      <main className="w-full flex-1">
        {/* Hero */}
        <section className="border-b-2 border-border bg-comic-dots">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-12 sm:pb-16">
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary border-2 border-primary/40 bg-primary/10 rounded-full px-4 py-1.5 mb-5">
              <Sparkles className="w-3.5 h-3.5" />
              8 core features · one platform
            </p>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.05] font-heading max-w-3xl">
              Everything you need to host, share & sell video.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl font-medium">
              Taped combines private{" "}
              <Link href="/features/host-videos" className="text-foreground font-bold underline underline-offset-4 decoration-primary/50 hover:decoration-primary">
                video hosting
              </Link>
              ,{" "}
              <Link href="/features/selective-video-sharing" className="text-foreground font-bold underline underline-offset-4 decoration-primary/50 hover:decoration-primary">
                selective sharing
              </Link>
              ,{" "}
              <Link href="/features/monetize-content" className="text-foreground font-bold underline underline-offset-4 decoration-primary/50 hover:decoration-primary">
                monetization
              </Link>
              ,{" "}
              <Link href="/features/screen-recorder" className="text-foreground font-bold underline underline-offset-4 decoration-primary/50 hover:decoration-primary">
                screen recording
              </Link>
              ,{" "}
              <Link href="/features/online-meetings" className="text-foreground font-bold underline underline-offset-4 decoration-primary/50 hover:decoration-primary">
                live meetings
              </Link>
              ,{" "}
              <Link href="/features/playlists-courses" className="text-foreground font-bold underline underline-offset-4 decoration-primary/50 hover:decoration-primary">
                playlists & courses
              </Link>
              , a{" "}
              <Link href="/features/offerings-page" className="text-foreground font-bold underline underline-offset-4 decoration-primary/50 hover:decoration-primary">
                customizable offerings page
              </Link>
              , and{" "}
              <Link href="/features/branded-pages" className="text-foreground font-bold underline underline-offset-4 decoration-primary/50 hover:decoration-primary">
                white-label branding
              </Link>{" "}
              — with email-verified access on every viewer page.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3.5">
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-extrabold text-base border-2 border-foreground/20 shadow-[4px_4px_0px_0px_var(--comic-shadow)] hover:shadow-[5.5px_5.5px_0px_0px_var(--comic-shadow)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
              >
                Start free — 2GB included
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/record"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border-2 border-border bg-card text-foreground font-extrabold text-base shadow-[3px_3px_0px_0px_var(--comic-shadow-subtle)] hover:border-foreground transition-all"
              >
                Try the free recorder
              </Link>
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section className="border-b-2 border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
            <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-5">
              {FEATURES.map((feature, idx) => (
                <Link
                  key={feature.slug}
                  href={`/features/${feature.slug}`}
                  className="group rounded-3xl border-2 border-border p-7 bg-card transition-all duration-200 shadow-[4px_4px_0px_0px_var(--comic-shadow-subtle)] hover:shadow-[6px_6px_0px_0px_var(--comic-shadow)] hover:border-foreground flex flex-col"
                >
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-primary/15 border-2 border-primary/30 flex items-center justify-center group-hover:bg-primary group-hover:[&>svg]:text-primary-foreground transition-all shadow-[2px_2px_0px_0px_var(--comic-shadow-subtle)]">
                      <feature.icon className="w-6 h-6 text-primary transition-colors" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border border-border rounded-full px-2.5 py-1">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-heading group-hover:text-primary transition-colors">
                    {feature.title}
                  </h2>
                  <p className="mt-2 text-sm font-bold text-primary">{feature.tagline}</p>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed font-medium line-clamp-3">
                    {feature.description}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-extrabold text-foreground group-hover:text-primary transition-colors">
                    Explore {feature.navLabel}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              ))}
            </div>

            <div className="mt-10 rounded-3xl border-2 border-border bg-muted/40 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5 justify-between">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm sm:text-base font-semibold text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Not sure where to start?</strong> Upload or
                  record a video, lock it to exact emails, brand the viewer page — then sell it when
                  you&apos;re ready. The whole workflow takes minutes.
                </p>
              </div>
              <Link
                href="/pricing"
                className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border-2 border-border bg-card font-extrabold text-sm shadow-[3px_3px_0px_0px_var(--comic-shadow-subtle)] hover:border-foreground transition-all"
              >
                Compare plans <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-primary text-primary-foreground">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 text-center">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight font-heading max-w-3xl mx-auto">
              Your content. Your audience. Nobody else gets in.
            </h2>
            <p className="mt-4 text-base sm:text-lg font-semibold opacity-90 max-w-2xl mx-auto">
              Start hosting privately today — 2GB free, branded pages and your offerings storefront
              ready the moment you sign up.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/auth/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-card text-foreground font-extrabold text-base border-2 border-foreground/20 shadow-[3px_3px_0px_0px_var(--comic-shadow-subtle)] transition-all"
              >
                Create your free account <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border-2 border-primary-foreground/40 bg-primary-foreground/10 font-bold text-base hover:bg-primary-foreground/20 transition-all"
              >
                Talk to us
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
