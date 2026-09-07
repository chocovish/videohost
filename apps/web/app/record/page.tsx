import type { Metadata } from "next";
import RecordStudioView from "./RecordStudioView";
import { getBaseUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Free Online Screen & Webcam Recorder — No Watermark | Taped",
  description:
    "Record your screen, webcam PIP overlay, and microphone directly in your browser. 100% free, private local processing, 4K UHD support, zero watermarks, and instant file downloads.",
  keywords: [
    "free online screen recorder",
    "online webcam recorder",
    "screen and camera recorder",
    "screen recorder no download",
    "screen recorder no watermark",
    "record screen with audio",
    "4K screen recorder online",
    "browser video recorder",
  ],
  alternates: {
    canonical: "https://taped.in/record",
  },
  openGraph: {
    title: "Free Online Screen & Webcam Recorder — Taped",
    description:
      "Capture high-definition screen recordings with customizable webcam PIP, audio mixing, and instant WebM/MP4 downloads. No software installation required.",
    url: "https://taped.in/record",
    siteName: "Taped",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Free Online Screen Recorder by Taped",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Online Screen & Webcam Recorder — Taped",
    description:
      "Capture screen recordings with webcam overlay and mic audio directly in your browser. Download instantly for free.",
    images: ["/og-image.png"],
  },
};

export default function RecordPage() {
  const baseUrl = getBaseUrl();
  const pageUrl = `${baseUrl}/record`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Taped Free Online Screen & Webcam Recorder",
    url: pageUrl,
    description:
      "A free browser-based screen and webcam recorder for capturing your screen, camera, microphone, and high-quality video without downloads or watermarks.",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires a modern browser with screen capture and media device support.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Screen, window, and browser tab recording",
      "Webcam picture-in-picture overlay",
      "Microphone and system audio capture",
      "Up to 4K and 60 FPS recording",
      "Local browser processing and instant downloads",
      "Built-in video trimming",
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <RecordStudioView />
    </>
  );
}
