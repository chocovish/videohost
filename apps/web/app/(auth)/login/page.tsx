"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Video, ArrowRight, Mail, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isUnverified, setIsUnverified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState("");
  const [resendError, setResendError] = useState("");

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setResendSuccess("");
    setResendError("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setResendSuccess("Verification email resent successfully! Please check your inbox.");
      } else {
        setResendError(data.error || "Failed to resend verification email.");
      }
    } catch (err) {
      setResendError("Failed to resend verification email.");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsUnverified(false);
    setResendSuccess("");
    setResendError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        if (
          res.error.includes("EMAIL_NOT_VERIFIED") ||
          (res as any).code === "EMAIL_NOT_VERIFIED" ||
          res.error === "EMAIL_NOT_VERIFIED" ||
          res.url?.includes("EMAIL_NOT_VERIFIED")
        ) {
          setError("Your email address is not verified yet. Please check your inbox for the confirmation link.");
          setIsUnverified(true);
        } else {
          setError("Invalid email or password");
        }
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] p-4 relative overflow-hidden">
      {/* Decorative gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[hsl(var(--primary))] opacity-20 blur-3xl rounded-full pointer-events-none" />

      <div className="w-full max-w-md glass-card rounded-2xl p-8 shadow-2xl relative z-10 border border-[hsl(var(--border))]">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--primary))] flex items-center justify-center text-white shadow-lg mb-4 transform hover:scale-105 transition-transform">
            <Video className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">Welcome back</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Sign in to your organization dashboard
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm font-medium space-y-3">
            <div className="flex items-start gap-2.5 text-left">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>

            {isUnverified && (
              <div className="pt-2.5 border-t border-red-500/20 text-left space-y-2">
                {resendSuccess ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-semibold border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>{resendSuccess}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {resending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending Verification Email...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>Resend Verification Email</span>
                      </>
                    )}
                  </button>
                )}

                {resendError && (
                  <div className="text-xs text-red-600 font-semibold text-center pt-1">
                    {resendError}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg border border-slate-200 shadow-sm transition-all flex items-center justify-center gap-3 text-sm mb-6 hover:shadow"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[hsl(var(--border))]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white/80 px-2 text-[hsl(var(--muted-foreground))] font-medium backdrop-blur-sm">
              Or continue with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
              Work Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-[hsl(var(--input))] bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] text-sm transition-all"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-[hsl(var(--input))] bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] text-sm transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-[hsl(var(--primary))] hover:opacity-90 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in to Dashboard"}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[hsl(var(--border))] text-center">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Don't have an account?{" "}
            <Link href="/register" className="font-semibold text-[hsl(var(--primary))] hover:underline">
              Create an organization
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

