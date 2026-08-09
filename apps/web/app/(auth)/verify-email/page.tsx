import type { Metadata } from "next";
import VerifyEmailClient from "./verify-email-client";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Confirm your email address to activate your VideoHost organization account.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function VerifyEmailPage() {
  return <VerifyEmailClient />;
}
