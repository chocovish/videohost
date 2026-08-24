import type { Metadata } from "next";
import ForgotPasswordClient from "../forgot-password/forgot-password-client";

export const metadata: Metadata = {
  title: "Reset Password | Taped",
  description: "Reset your Taped organization account password.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResetPasswordPage() {
  return <ForgotPasswordClient />;
}
