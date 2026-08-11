import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
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

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; redirect?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const targetUrl = params?.callbackUrl || params?.redirect;

  if (session?.user && (session as any)?.organizationId) {
    redirect(targetUrl || "/dashboard");
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[hsl(var(--background))]" />}>
      <RegisterForm />
    </Suspense>
  );
}
