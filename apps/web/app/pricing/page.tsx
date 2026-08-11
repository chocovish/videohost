import type { Metadata } from "next";
import PublicHeader from "@/components/PublicHeader";
import PricingView from "@/components/PricingView";

export const metadata: Metadata = {
  title: "Pricing Plans — VideoHost",
  description:
    "Compare VideoHost plans: Free (2GB storage & email-restricted sharing), Pro (200GB storage & adaptive bitrate streaming), and Enterprise (Unlimited storage & multi-organizations).",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] relative overflow-hidden flex flex-col justify-between selection:bg-[hsl(var(--primary))]/30">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] sm:w-[50rem] h-[36rem] sm:h-[50rem] bg-[hsl(var(--primary))] opacity-15 blur-3xl rounded-full pointer-events-none" />

      <PublicHeader currentPage="home" />

      <main className="flex-1 py-8 sm:py-12 relative z-10">
        <PricingView isEmbedded={false} />
      </main>

      <footer className="border-t border-[hsl(var(--border))] py-8 text-center text-xs text-[hsl(var(--muted-foreground))]">
        <p>© {new Date().getFullYear()} VideoHost. Simple, secure video hosting and streaming.</p>
      </footer>
    </div>
  );
}
