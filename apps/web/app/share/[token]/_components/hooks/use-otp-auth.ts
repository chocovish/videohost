"use client";

import { useState } from "react";

interface UseOtpAuthDeps {
  token: string;
  onAuthenticated: () => Promise<void>;
}

/**
 * One-time email-code (OTP) auth for restricted links.
 * Self-contained so `LoginRequiredError` owns the whole flow.
 */
export function useOtpAuth({ token, onAuthenticated }: UseOtpAuthDeps) {
  const [authViewMode, setAuthViewMode] = useState<"options" | "otp">("options");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");

  const resetOtpMessages = () => {
    setOtpError("");
    setOtpSuccess("");
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otpEmail) return;
    setOtpLoading(true);
    setOtpError("");
    setOtpSuccess("");

    try {
      const res = await fetch("/api/share/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email: otpEmail }),
      });

      const resData = await res.json();
      if (!res.ok) {
        setOtpError(resData.message || resData.error || "Failed to send code.");
      } else {
        setOtpStep("verify");
        setOtpSuccess(resData.message || "A 6-digit access code has been sent to your email.");
      }
    } catch {
      setOtpError("An error occurred while sending the code. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otpCode || !otpEmail) return;
    setOtpLoading(true);
    setOtpError("");
    setOtpSuccess("");

    try {
      const res = await fetch("/api/share/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email: otpEmail, code: otpCode }),
      });

      const resData = await res.json();
      if (!res.ok) {
        setOtpError(resData.message || resData.error || "Invalid access code.");
      } else {
        setOtpSuccess("Access granted! Loading content...");
        await onAuthenticated();
      }
    } catch {
      setOtpError("An error occurred while verifying the code. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  return {
    authViewMode,
    setAuthViewMode,
    otpEmail,
    setOtpEmail,
    otpCode,
    setOtpCode,
    otpStep,
    setOtpStep,
    otpLoading,
    otpError,
    otpSuccess,
    resetOtpMessages,
    handleSendOtp,
    handleVerifyOtp,
  };
}
