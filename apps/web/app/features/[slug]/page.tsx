import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ListOrdered,
} from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import {
  FEATURES,
  getFeatureBySlug,
  getFeatureSlugs,
  getRelatedFeatures,
} from "@/lib/features";
import { getBaseUrl } from "@/lib/utils";

export function generateStaticParams() {
  return getFeatureSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const feature = getFeatureBySlug(slug);
  if (!feature) return {};
  const canonical = `https://taped.in/features/${feature.slug}`;
  return {
    title: feature.seoTitle,
    description: feature.seoDescription,
    keywords: feature.keywords,
    alternates: { canonical },
    openGraph: {
      title: feature.seoTitle,
      description: feature.seoDescription,
      url: canonical,
      siteName: "Taped",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: `Taped — ${feature.title}`,
        },
      ],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: feature.seoTitle,
      description: feature.seoDescription,
      images: ["/og-image.png"],
    },
  };
}

export default async function FeatureDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const feature = getFeatureBySlug(slug);
  if (!feature) notFound();

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/features/${feature.slug}`;
  const related = getRelatedFeatures(feature.slug, 3);
  const Icon = feature.icon;

  const jsonLdArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: feature.seoTitle,
    description: feature.seoDescription,
    image: `${baseUrl}/og-image.png`,
    author: { "@type": "Organization", name: "Taped", url: baseUrl },
    publisher: { "@type": "Organization", name: "Taped", url: baseUrl },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: feature.faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "Features", item: `${baseUrl}/features` },
      { "@type": "ListItem", position: 3, name: feature.title, item: url },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />

      <PublicHeader currentPage="features" />

      <main className="w-full flex-1">
        {/* Breadcrumb + hero */}
        <section className="border-b-2 border-border bg-comic-dots">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-12 sm:pb-16">
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-bold text-muted-foreground">
                <li>
                  <Link href="/" className="hover:text-primary transition-colors">
                    Home
                  </Link>
                </li>
                <li aria-hidden>
                  <ChevronRight className="w-3.5 h-3.5" />
                </li>
                <li>
                  <Link href="/features" className="hover:text-primary transition-colors">
                    Features
                  </Link>
                </li>
                <li aria-hidden>
                  <ChevronRight className="w-3.5 h-3.5" />
                </li>
                <li aria-current="page" className="text-foreground">
                  {feature.title}
                </li>
              </ol>
            </nav>

            <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 lg:gap-14 items-center">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary border-2 border-primary/40 bg-primary/10 rounded-full px-4 py-1.5 mb-5">
                  <Icon className="w-3.5 h-3.5" />
                  Taped feature
                </p>
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.08] font-heading">
                  {feature.title}
                </h1>
                <p className="mt-4 text-lg sm:text-xl font-bold text-primary leading-snug">
                  {feature.tagline}
                </p>
                <p className="mt-4 text-base text-muted-foreground leading-relaxed font-medium">
                  {feature.description}
                </p>
                <div className="mt-7 flex flex-col sm:flex-row gap-3.5">
                  <Link
                    href="/auth/register"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-primary text-primary-foreground font-extrabold text-sm sm:text-base border-2 border-foreground/20 shadow-[4px_4px_0px_0px_var(--comic-shadow)] hover:shadow-[5.5px_5.5px_0px_0px_var(--comic-shadow)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                  >
                    Start free — 2GB included
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl border-2 border-border bg-card font-extrabold text-sm sm:text-base shadow-[3px_3px_0px_0px_var(--comic-shadow-subtle)] hover:border-foreground transition-all"
                  >
                    See pricing
                  </Link>
                </div>
              </div>

              {/* At-a-glance card */}
              <aside className="rounded-3xl border-2 border-border bg-card overflow-hidden shadow-[8px_8px_0px_0px_var(--comic-shadow)]">
                <div className="px-6 py-4 border-b-2 border-border bg-muted/60 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center border-2 border-foreground/15 shadow-[2px_2px_0px_0px_var(--comic-shadow-subtle)]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      At a glance
                    </p>
                    <p className="text-sm font-extrabold">{feature.navLabel}</p>
                  </div>
                </div>
                <ul className="p-6 space-y-3">
                  {feature.benefits.slice(0, 4).map((b) => (
                    <li key={b.title} className="flex items-start gap-2.5 text-sm font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>
                        <strong className="font-bold">{b.title}:</strong>{" "}
                        <span className="text-muted-foreground font-medium">{b.description}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="border-b-2 border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
            <p className="text-xs font-black uppercase tracking-widest text-primary mb-3">
              Why it matters
            </p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight font-heading max-w-2xl">
              What {feature.navLabel.toLowerCase()} gives you
            </h2>
            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {feature.benefits.map((benefit) => (
                <article
                  key={benefit.title}
                  className="rounded-3xl border-2 border-border p-6 bg-card shadow-[3.5px_3.5px_0px_0px_var(--comic-shadow-subtle)] hover:shadow-[5.5px_5.5px_0px_0px_var(--comic-shadow)] hover:border-foreground transition-all"
                >
                  <CheckCircle2 className="w-6 h-6 text-primary mb-4" />
                  <h3 className="text-base font-bold font-heading">{benefit.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed font-medium">
                    {benefit.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How to use */}
        <section className="border-b-2 border-border bg-muted/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
            <p className="text-xs font-black uppercase tracking-widest text-primary mb-3">
              <ListOrdered className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              How to use it
            </p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight font-heading max-w-2xl">
              Get started in minutes
            </h2>
            <ol className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {feature.steps.map((step, i) => (
                <li
                  key={step.title}
                  className="relative rounded-3xl border-2 border-border p-6 bg-card shadow-[4px_4px_0px_0px_var(--comic-shadow-subtle)]"
                >
                  <span
                    aria-hidden
                    className="absolute top-5 right-6 text-4xl font-black text-primary/20 font-heading select-none"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-base font-bold font-heading pr-10">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed font-medium">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b-2 border-border">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
            <div className="text-center mb-10">
              <p className="text-xs font-black uppercase tracking-widest text-primary mb-3">
                Answers, upfront
              </p>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight font-heading">
                {feature.title} — FAQs
              </h2>
            </div>
            <div className="divide-y-2 divide-border border-y-2 border-border">
              {feature.faqs.map((faq) => (
                <details key={faq.question} className="group py-5">
                  <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-left font-bold text-base tracking-tight font-heading marker:hidden [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <span
                      aria-hidden
                      className="shrink-0 w-8 h-8 rounded-xl border-2 border-border flex items-center justify-center text-lg font-extrabold text-muted-foreground group-open:bg-primary group-open:border-primary group-open:text-primary-foreground transition-colors"
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

        {/* Related + explore all */}
        <section className="border-b-2 border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
            <div className="flex items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-primary mb-3">
                  Keep exploring
                </p>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight font-heading">
                  Related features
                </h2>
              </div>
              <Link
                href="/features"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-extrabold text-primary hover:underline underline-offset-4"
              >
                <ArrowLeft className="w-4 h-4" /> All features
              </Link>
            </div>
            <div className="grid sm:grid-cols-3 gap-5">
              {related.map((rel) => (
                <Link
                  key={rel.slug}
                  href={`/features/${rel.slug}`}
                  className="group rounded-3xl border-2 border-border p-6 bg-card shadow-[3.5px_3.5px_0px_0px_var(--comic-shadow-subtle)] hover:shadow-[5.5px_5.5px_0px_0px_var(--comic-shadow)] hover:border-foreground transition-all"
                >
                  <div className="w-11 h-11 rounded-2xl bg-primary/15 border-2 border-primary/30 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:[&>svg]:text-primary-foreground transition-all">
                    <rel.icon className="w-5 h-5 text-primary transition-colors" />
                  </div>
                  <h3 className="font-bold font-heading group-hover:text-primary transition-colors">
                    {rel.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground font-medium line-clamp-2">
                    {rel.tagline}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-extrabold group-hover:text-primary transition-colors">
                    Learn more <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              ))}
            </div>
            <div className="mt-8 sm:hidden">
              <Link
                href="/features"
                className="inline-flex items-center gap-1.5 text-sm font-extrabold text-primary hover:underline underline-offset-4"
              >
                <ArrowLeft className="w-4 h-4" /> All features
              </Link>
            </div>

            {/* All-features quick links (SEO internal linking) */}
            <nav aria-label="All Taped features" className="mt-10 rounded-3xl border-2 border-border bg-muted/40 p-6">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">
                All Taped features
              </p>
              <ul className="flex flex-wrap gap-2">
                {FEATURES.map((f) => (
                  <li key={f.slug}>
                    <Link
                      href={`/features/${f.slug}`}
                      aria-current={f.slug === feature.slug ? "page" : undefined}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                        f.slug === feature.slug
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border hover:border-foreground"
                      }`}
                    >
                      <f.icon className="w-3.5 h-3.5" />
                      {f.navLabel}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-primary text-primary-foreground">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 text-center">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight font-heading max-w-3xl mx-auto">
              Try {feature.navLabel.toLowerCase()} free today.
            </h2>
            <p className="mt-4 text-base sm:text-lg font-semibold opacity-90 max-w-2xl mx-auto">
              2GB free storage · No credit card · Email-verified viewers · Cancel anytime.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/auth/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-card text-foreground font-extrabold text-base border-2 border-foreground/20 shadow-[3px_3px_0px_0px_var(--comic-shadow-subtle)] transition-all"
              >
                Create your free account <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/features"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border-2 border-primary-foreground/40 bg-primary-foreground/10 font-bold text-base hover:bg-primary-foreground/20 transition-all"
              >
                Explore all features
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
