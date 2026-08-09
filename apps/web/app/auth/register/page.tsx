import type { Metadata } from "next";
import { Suspense } from "react";
import RegisterForm from "./register-form";

export const metadata: Metadata = {
  title: "Create an Account",
  description:
    "Create your VideoHost organization account and get 200 free video storage minutes with zero-egress Cloudflare R2 storage and developer API access.",
  openGraph: {
    title: "Create a VideoHost Account | 200 Free Video Mins",
    description:
      "Create your VideoHost organization account and get 200 free video storage minutes with zero-egress Cloudflare R2 storage and developer API access.",
    url: "/auth/register",
    siteName: "VideoHost",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Create your VideoHost Account",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Create a VideoHost Account | 200 Free Video Mins",
    description:
      "Create your VideoHost organization account and get 200 free video storage minutes with zero-egress Cloudflare R2 storage and developer API access.",
    images: ["/og-image.png"],
  },
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[hsl(var(--background))]" />}>
      <RegisterForm />
    </Suspense>
  );
}
