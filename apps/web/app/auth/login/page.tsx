import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your Taped organization dashboard to manage your video library, presigned uploads, API keys, and custom player embeds.",
  openGraph: {
    title: "Sign In | Taped",
    description:
      "Sign in to your Taped organization dashboard to manage your video library, presigned uploads, API keys, and custom player embeds.",
    url: "/auth/login",
    siteName: "Taped",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Sign In to Taped",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sign In | Taped",
    description:
      "Sign in to your Taped organization dashboard to manage your video library, presigned uploads, API keys, and custom player embeds.",
    images: ["/og-image.png"],
  },
};

export default async function LoginPage({
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
      <LoginForm />
    </Suspense>
  );
}
