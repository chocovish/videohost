import type { Metadata } from "next";
import RecordStudioView from "./RecordStudioView";

export const metadata: Metadata = {
  title: "Free Online Screen & Webcam Recorder — No Watermark | VideoHost",
  description:
    "Record your screen, webcam PIP overlay, and microphone directly in your browser. 100% free, private local processing, 4K UHD support, zero watermarks, and instant file downloads.",
  openGraph: {
    title: "Free Online Screen & Webcam Recorder — VideoHost",
    description:
      "Capture high-definition screen recordings with customizable webcam PIP, audio mixing, and instant WebM/MP4 downloads. No software installation required.",
    url: "/record",
    siteName: "VideoHost",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Free Online Screen Recorder by VideoHost",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Online Screen & Webcam Recorder — VideoHost",
    description:
      "Capture screen recordings with webcam overlay and mic audio directly in your browser. Download instantly for free.",
    images: ["/og-image.png"],
  },
};

export default function RecordPage() {
  return <RecordStudioView />;
}
