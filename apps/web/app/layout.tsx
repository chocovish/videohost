import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VideoHost — Video Hosting & Adaptive HLS Transcoding Platform",
  description: "A Mux-style video hosting platform for web dashboard users and developer REST APIs built with Next.js, Auth.js, Cloudflare R2, BullMQ, and Video.js.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="lime">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="antialiased selection:bg-[hsl(var(--primary))]/20 selection:text-[hsl(var(--primary))] min-h-screen">
        {children}
      </body>
    </html>
  );
}
