import type { Metadata } from "next";
import PricingView from "@/components/PricingView";

export const metadata: Metadata = {
  title: "Plans & Subscription — Taped Dashboard",
  description: "Manage your active workspace subscription plan and view storage entitlements.",
};

export default function DashboardPricingPage() {
  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Plans & Pricing
        </h1>
        <p className="text-sm text-muted-foreground">
          Upgrade your workspace plan to unlock 200GB+ storage, adaptive bitrate HLS encoding, multi-org support, and team invites.
        </p>
      </div>

      <PricingView isEmbedded={true} />
    </div>
  );
}
