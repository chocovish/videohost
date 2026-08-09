import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://videohost.app";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "VideoHost — Video Hosting & Adaptive HLS Transcoding Platform",
    template: "%s | VideoHost",
  },
  description:
    "High-performance video hosting and adaptive HLS transcoding platform powered by Cloudflare R2 zero-egress storage, BullMQ queue transcoding, and Video.js.",
  applicationName: "VideoHost",
  authors: [{ name: "VideoHost Team" }],
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
  creator: "VideoHost",
  publisher: "VideoHost",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "VideoHost — Video Hosting & Adaptive HLS Transcoding Platform",
    description:
      "Upload, transcode, and stream HLS videos anywhere with zero egress fees, automated FFmpeg pipelines, and customizable embeds.",
    url: "/",
    siteName: "VideoHost",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "VideoHost — Video Hosting & Adaptive HLS Transcoding Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VideoHost — Video Hosting & Adaptive HLS Transcoding Platform",
    description:
      "Upload, transcode, and stream HLS videos anywhere with zero egress fees, automated FFmpeg pipelines, and customizable embeds.",
    images: ["/og-image.png"],
    creator: "@videohost",
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
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="lime">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="antialiased selection:bg-[hsl(var(--primary))]/20 selection:text-[hsl(var(--primary))] min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

