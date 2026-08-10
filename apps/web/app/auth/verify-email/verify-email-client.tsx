"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Video, CheckCircle2, AlertCircle, Loader2, ArrowRight, Mail } from "lucide-react";

function VerifyEmailInner() {
  const searchParams = useSearchParams();

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [status, setStatus] = useState<"loading" | "success" | "error" | "sent">(
    token && email ? "loading" : "sent"
  );
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState("");
  const calledRef = useRef(false);

  useEffect(() => {
    if (token && email && !calledRef.current) {
      calledRef.current = true;
      verifyToken(token, email);
    }
  }, [token, email]);

  const verifyToken = async (tok: string, em: string) => {
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tok, email: em }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "Your email address has been verified!");
      } else {
        setStatus("error");
        setMessage(data.error || "Verification link is invalid or has expired.");
      }
    } catch (err) {
      setStatus("error");
      setMessage("An error occurred while verifying your email. Please try again.");
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setResendSuccess("");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setResendSuccess("A new verification link has been sent to your email!");
      } else {
        setMessage(data.error || "Failed to resend email");
      }
    } catch (err) {
      setMessage("Failed to resend verification email");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] p-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[hsl(var(--primary))] opacity-20 blur-3xl rounded-full pointer-events-none" />

      <div className="w-full max-w-md glass-card rounded-2xl p-8 shadow-2xl relative z-10 border border-[hsl(var(--border))] text-center">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--primary))] flex items-center justify-center text-white shadow-lg mb-4">
            <Video className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">Email Verification</h1>
        </div>

        {status === "loading" && (
          <div className="py-8 flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-[hsl(var(--primary))] animate-spin" />
            <p className="text-sm text-[hsl(var(--muted-foreground))] font-medium">Verifying your email address...</p>
          </div>
        )}

        {status === "sent" && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-lime-500/10 text-lime-600 flex items-center justify-center mx-auto mb-2 border border-lime-500/20">
              <Mail className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Check your inbox</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              We sent a verification link to <span className="font-semibold text-[hsl(var(--foreground))]">{email || "your email address"}</span>. Please click the link in the email to activate your account.
            </p>
            {resendSuccess ? (
              <div className="p-3 rounded-lg bg-lime-500/10 border border-lime-500/20 text-lime-600 text-sm font-medium">
                {resendSuccess}
              </div>
            ) : null}
            {email && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {resending ? "Sending..." : "Resend Verification Email"}
              </button>
            )}
            <div className="pt-4 border-t border-[hsl(var(--border))]">
              <Link href="/auth/login" className="text-sm font-semibold text-[hsl(var(--primary))] hover:underline flex items-center justify-center gap-1">
                Back to Sign In <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4 py-2">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Email Confirmed!</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">{message}</p>
            <div className="pt-4">
              <Link
                href="/auth/login"
                className="w-full py-3 px-4 bg-[hsl(var(--primary))] hover:opacity-90 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                Sign In to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4 py-2">
            <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center mx-auto mb-2 border border-red-500/20">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Verification Failed</h2>
            <p className="text-sm text-red-600 font-medium">{message}</p>

            {resendSuccess ? (
              <div className="p-3 rounded-lg bg-lime-500/10 border border-lime-500/20 text-lime-600 text-sm font-medium">
                {resendSuccess}
              </div>
            ) : null}

            {email && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="w-full py-2.5 px-4 bg-[hsl(var(--primary))] hover:opacity-90 text-white font-semibold rounded-lg text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {resending ? "Resending..." : "Request New Verification Link"}
              </button>
            )}

            <div className="pt-4 border-t border-[hsl(var(--border))]">
              <Link href="/auth/login" className="text-sm font-semibold text-[hsl(var(--primary))] hover:underline flex items-center justify-center gap-1">
                Return to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
          <Loader2 className="w-8 h-8 text-[hsl(var(--primary))] animate-spin" />
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
