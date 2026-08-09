import type { Metadata } from "next";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your VideoHost organization dashboard to manage your video library, presigned uploads, API keys, and custom player embeds.",
  openGraph: {
    title: "Sign In | VideoHost",
    description:
      "Sign in to your VideoHost organization dashboard to manage your video library, presigned uploads, API keys, and custom player embeds.",
    url: "/login",
    siteName: "VideoHost",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Sign In to VideoHost",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sign In | VideoHost",
    description:
      "Sign in to your VideoHost organization dashboard to manage your video library, presigned uploads, API keys, and custom player embeds.",
    images: ["/og-image.png"],
  },
};

export default function LoginPage() {
  return <LoginForm />;
}
