import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import { Plus_Jakarta_Sans, Fredoka } from "next/font/google";
import { cn } from "@/lib/utils";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { getImpersonationSession } from "@/lib/admin-auth";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

const fontHeading = Fredoka({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700"],
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://taped.app";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Taped — Video Hosting & Adaptive HLS Transcoding Platform",
    template: "%s | Taped",
  },
  description:
    "High-performance video hosting and adaptive HLS transcoding platform powered by Cloudflare R2 zero-egress storage, BullMQ queue transcoding, and Video.js.",
  applicationName: "Taped",
  authors: [{ name: "Taped Team" }],
  generator: "Next.js",
  keywords: [
    "video hosting",
    "HLS streaming",
    "adaptive bitrate",
    "video transcoding",
    "Cloudflare R2",
    "BullMQ",
    "FFmpeg",
    "video player",
    "developer API",
    "Video.js",
  ],
  referrer: "origin-when-cross-origin",
  creator: "Taped",
  publisher: "Taped",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Taped — Video Hosting & Adaptive HLS Transcoding Platform",
    description:
      "Upload, transcode, and stream HLS videos anywhere with zero egress fees, automated FFmpeg pipelines, and customizable embeds.",
    url: "/",
    siteName: "Taped",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Taped — Video Hosting & Adaptive HLS Transcoding Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Taped — Video Hosting & Adaptive HLS Transcoding Platform",
    description:
      "Upload, transcode, and stream HLS videos anywhere with zero egress fees, automated FFmpeg pipelines, and customizable embeds.",
    images: ["/og-image.png"],
    creator: "@taped",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const impersonation = await getImpersonationSession();

  return (
    <html lang="en" className={cn("font-sans", fontSans.variable, fontHeading.variable)}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="antialiased selection:bg-primary/20 selection:text-primary min-h-screen">
        <Providers>
          <ImpersonationBanner initialImpersonation={impersonation} />
          {children}
        </Providers>
      </body>
    </html>
  );
}


