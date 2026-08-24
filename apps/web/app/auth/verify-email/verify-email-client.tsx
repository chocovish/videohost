"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck, RefreshCw, KeyRound } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";

function VerifyOtpInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const emailParam = searchParams.get("email") || "";
  const callbackUrl = searchParams.get("callbackUrl") || searchParams.get("redirect") || "/dashboard";
  const loginLink = `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  const [email, setEmail] = useState(emailParam);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // 10 minutes total validity countdown timer
  const [timeLeft, setTimeLeft] = useState<number>(600); // 600 seconds = 10 mins
  // 60s cooldown for resend button
  const [resendCooldown, setResendCooldown] = useState<number>(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Update email if query param changes
  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer for 10 mins OTP validity
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric characters
    const numericChar = value.replace(/\D/g, "");
    if (!numericChar && value !== "") return;

    const newDigits = [...otpDigits];
    newDigits[index] = numericChar.slice(-1); // Take last digit if multiple entered
    setOtpDigits(newDigits);
    setErrorMessage("");

    // Auto-focus next input
    if (numericChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto verify if all 6 digits are filled
    const fullOtp = newDigits.join("");
    if (fullOtp.length === 6) {
      handleVerify(fullOtp);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const newDigits = ["", "", "", "", "", ""];
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setOtpDigits(newDigits);
    setErrorMessage("");

    const targetIndex = Math.min(pastedData.length, 5);
    inputRefs.current[targetIndex]?.focus();

    if (pastedData.length === 6) {
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join("");
    if (code.length < 6) {
      setErrorMessage("Please enter the complete 6-digit code.");
      return;
    }
    if (!email) {
      setErrorMessage("Email address is required.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");
    setResendStatus(null);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("success");
        setSuccessMessage(data.message || "Email verified successfully!");
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Invalid or expired verification code.");
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage("An error occurred during verification. Please try again.");
    }
  };

  const handleResend = async () => {
    if (!email || resending || resendCooldown > 0) return;
    setResending(true);
    setResendStatus(null);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResendStatus("A new 6-digit code has been sent! Check your inbox.");
        setTimeLeft(600); // Reset 10 min validity timer
        setResendCooldown(60); // Reset 60s cooldown
        setOtpDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        setErrorMessage(data.error || "Failed to resend verification code.");
      }
    } catch (err) {
      setErrorMessage("Network error while resending verification code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background relative overflow-hidden pb-8 selection:bg-primary/30">
      {/* Background ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-120 h-120 bg-primary opacity-20 blur-3xl rounded-full pointer-events-none" />

      {/* Header */}
      <PublicHeader />

      <main className="flex-1 flex items-center justify-center p-4 relative z-10 my-auto">
        <div className="w-full max-w-lg glass-card rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 border border-border">
          {/* Brand header */}
          <div className="flex flex-col items-center text-center mb-6">
            <Link href="/" className="mb-4 inline-block transform hover:scale-105 transition-transform">
              <Image
                src="/taped-in-logo.webp"
                alt="Taped"
                width={150}
                height={50}
                className="h-10 sm:h-11 w-auto object-contain mx-auto"
                priority
              />
            </Link>

            {status !== "success" ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center mb-3 text-primary shadow-inner">
                  <KeyRound className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Verify Your Account
                </h1>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
                  We sent a 6-digit OTP code to{" "}
                  <span className="font-semibold text-foreground break-all">
                    {email || "your email address"}
                  </span>
                </p>
              </>
            ) : null}
          </div>

          {/* Success State */}
          {status === "success" ? (
            <div className="text-center py-4 space-y-5 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Email Verified!</h2>
                <p className="text-sm text-muted-foreground mt-2">{successMessage}</p>
              </div>

              <div className="pt-3">
                <Link
                  href={loginLink}
                  className="w-full py-3.5 px-4 bg-primary hover:opacity-90 text-white font-semibold rounded-xl shadow-lg hover:shadow-primary/25 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>Sign In to Your Workspace</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ) : (
            /* OTP Form */
            <div className="space-y-6">
              {/* Error feedback */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium flex items-center gap-2.5 text-left animate-in fade-in">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div className="flex-1">{errorMessage}</div>
                </div>
              )}

              {/* Resend success feedback */}
              {resendStatus && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm font-medium flex items-center gap-2.5 text-left animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
                  <div className="flex-1">{resendStatus}</div>
                </div>
              )}

              {/* 6-Digit OTP Boxes */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    6-Digit Security Code
                  </label>
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <span className="text-muted-foreground">Expires in:</span>
                    <span
                      className={`font-mono font-bold ${
                        timeLeft < 120 ? "text-red-500 animate-pulse" : "text-primary"
                      }`}
                    >
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center gap-2 sm:gap-3">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      disabled={status === "loading"}
                      className="w-11 h-13 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold font-mono rounded-xl border-2 border-input bg-white/80 dark:bg-slate-900/80 focus:border-primary focus:ring-4 focus:ring-primary/20 focus:outline-hidden transition-all text-foreground shadow-xs disabled:opacity-50"
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>
              </div>

              {/* Verify Button */}
              <button
                type="button"
                onClick={() => handleVerify()}
                disabled={status === "loading" || otpDigits.join("").length < 6}
                className="w-full py-3.5 px-4 bg-primary hover:opacity-90 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer text-sm"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Verification</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              {/* Resend Section */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border-t border-border">
                <span className="text-muted-foreground">Didn't receive the code?</span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || resendCooldown > 0}
                  className="font-semibold text-primary hover:underline flex items-center gap-1.5 disabled:opacity-50 disabled:no-underline cursor-pointer"
                >
                  {resending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : resendCooldown > 0 ? (
                    <span>Resend code in {resendCooldown}s</span>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend 6-Digit Code</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2 text-center">
                <Link
                  href={loginLink}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                >
                  Already verified? <span className="text-primary hover:underline">Sign In</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function VerifyEmailClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      }
    >
      <VerifyOtpInner />
    </Suspense>
  );
}
