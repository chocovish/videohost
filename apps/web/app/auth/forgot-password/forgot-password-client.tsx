"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowLeft,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import PublicHeader from "@/components/PublicHeader";

function ForgotPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialEmail = searchParams.get("email") || "";
  const initialCode = searchParams.get("code") || searchParams.get("otp") || "";

  const [step, setStep] = useState<"request" | "reset" | "success">(
    initialEmail && initialCode ? "reset" : "request"
  );
  const [email, setEmail] = useState(initialEmail);
  const [otpDigits, setOtpDigits] = useState<string[]>(
    initialCode.length === 6 ? initialCode.split("") : ["", "", "", "", "", ""]
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // 10 minutes OTP countdown timer
  const [timeLeft, setTimeLeft] = useState<number>(600);
  // 60s resend cooldown
  const [resendCooldown, setResendCooldown] = useState<number>(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step === "reset") {
      inputRefs.current[0]?.focus();
    }
  }, [step]);

  // Countdown timer for OTP
  useEffect(() => {
    if (step !== "reset" || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, timeLeft]);

  // Resend cooldown timer
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
    const numericChar = value.replace(/\D/g, "");
    if (!numericChar && value !== "") return;

    const newDigits = [...otpDigits];
    newDigits[index] = numericChar.slice(-1);
    setOtpDigits(newDigits);
    setErrorMessage("");

    if (numericChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
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
  };

  // Step 1: Send OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setResendStatus(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        setStep("reset");
        setTimeLeft(600);
        setResendCooldown(60);
      } else {
        setErrorMessage(data.error || "Failed to send password reset email.");
      }
    } catch (err) {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (!email || resending || resendCooldown > 0) return;
    setResending(true);
    setResendStatus(null);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        setResendStatus("A new 6-digit reset code has been sent to your email!");
        setTimeLeft(600);
        setResendCooldown(60);
        setOtpDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        setErrorMessage(data.error || "Failed to resend reset code.");
      }
    } catch (err) {
      setErrorMessage("Failed to resend password reset code.");
    } finally {
      setResending(false);
    }
  };

  // Step 2: Reset Password with OTP
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpDigits.join("");

    if (fullOtp.length < 6) {
      setErrorMessage("Please enter the complete 6-digit reset code.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp: fullOtp,
          newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStep("success");
        setSuccessMessage(data.message || "Your password has been reset successfully!");
      } else {
        setErrorMessage(data.error || "Invalid or expired reset code.");
      }
    } catch (err) {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "", color: "" };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 1, label: "Weak", color: "bg-red-500" };
    if (score <= 3) return { score: 2, label: "Medium", color: "bg-amber-500" };
    return { score: 3, label: "Strong", color: "bg-emerald-500" };
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background relative overflow-hidden pb-8 selection:bg-primary/30">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-120 h-120 bg-primary opacity-20 blur-3xl rounded-full pointer-events-none" />

      {/* Header */}
      <PublicHeader />

      <main className="flex-1 flex items-center justify-center p-4 relative z-10 my-auto">
        <div className="w-full max-w-lg glass-card rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 border border-border">
          {/* Logo & Header */}
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

            {step === "request" && (
              <>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center mb-3 text-primary shadow-inner">
                  <Lock className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Reset your password
                </h1>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
                  Enter your registered work email and we'll send you a 6-digit OTP code valid for 10 minutes.
                </p>
              </>
            )}

            {step === "reset" && (
              <>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center mb-3 text-primary shadow-inner">
                  <KeyRound className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Set New Password
                </h1>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
                  Enter the 6-digit OTP code sent to{" "}
                  <span className="font-semibold text-foreground break-all">{email}</span> and your new password.
                </p>
              </>
            )}
          </div>

          {/* Feedback messages */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium flex items-center gap-2.5 text-left animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {resendStatus && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm font-medium flex items-center gap-2.5 text-left animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
              <div className="flex-1">{resendStatus}</div>
            </div>
          )}

          {/* STEP 1: Request Reset Code */}
          {step === "request" && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">Work Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full mt-2 min-h-[44px] font-semibold text-sm group bg-primary text-white shadow-md hover:opacity-90 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>Sending Reset Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send 6-Digit Reset Code</span>
                    <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>

              <div className="pt-4 border-t border-border text-center">
                <Link
                  href="/auth/login"
                  className="text-sm font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}

          {/* STEP 2: Enter OTP & New Password */}
          {step === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {/* 6-Digit OTP */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    6-Digit Security Code
                  </Label>
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
                      disabled={loading}
                      className="w-11 h-13 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold font-mono rounded-xl border-2 border-input bg-white/80 dark:bg-slate-900/80 focus:border-primary focus:ring-4 focus:ring-primary/20 focus:outline-hidden transition-all text-foreground shadow-xs disabled:opacity-50"
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="pt-1.5 space-y-1">
                    <div className="flex gap-1.5 h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${strength.color} ${
                          strength.score >= 1 ? "w-1/3" : "w-0"
                        }`}
                      />
                      <div
                        className={`h-full transition-all duration-300 ${strength.color} ${
                          strength.score >= 2 ? "w-1/3" : "w-0"
                        }`}
                      />
                      <div
                        className={`h-full transition-all duration-300 ${strength.color} ${
                          strength.score >= 3 ? "w-1/3" : "w-0"
                        }`}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                      <span>Must be at least 6 characters</span>
                      <span className="font-semibold">{strength.label}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || otpDigits.join("").length < 6 || !newPassword || !confirmPassword}
                className="w-full mt-2 min-h-[44px] font-semibold text-sm group bg-primary text-white shadow-md hover:opacity-90 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <>
                    <span>Update Password & Continue</span>
                    <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>

              {/* Resend Code & Back actions */}
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border-t border-border">
                <button
                  type="button"
                  onClick={() => setStep("request")}
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Email</span>
                </button>

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
                      <span>Resend Code</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Success State */}
          {step === "success" && (
            <div className="text-center py-4 space-y-5 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Password Reset Complete!</h2>
                <p className="text-sm text-muted-foreground mt-2">{successMessage}</p>
              </div>

              <div className="pt-3">
                <Link
                  href={`/auth/login?reset=true&email=${encodeURIComponent(email)}`}
                  className="w-full py-3.5 px-4 bg-primary hover:opacity-90 text-white font-semibold rounded-xl shadow-lg hover:shadow-primary/25 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>Sign In with New Password</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ForgotPasswordClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      }
    >
      <ForgotPasswordInner />
    </Suspense>
  );
}
