"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "next/navigation";
import PublicHeader from "@/components/PublicHeader";

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const modeParam = searchParams.get("mode") || searchParams.get("viewMode");
  const callbackUrl = searchParams.get("callbackUrl") || searchParams.get("redirect") || "/dashboard";
  const isViewerFlow = modeParam?.toLowerCase() === "viewer";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          callbackUrl,
          viewMode: isViewerFlow ? "VIEWER" : "CREATOR",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to register");
        setLoading(false);
        return;
      }

      if (data.requiresVerification) {
        router.push(`/auth/verify-email?sent=true&email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }

      // Auto sign in for social / verified
      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        router.push(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred during registration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background relative overflow-hidden pb-8 selection:bg-primary/30">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-120 h-120 bg-primary opacity-20 blur-3xl rounded-full pointer-events-none" />

      {/* Brand Header Navigation */}
      <PublicHeader currentPage="register" />

      <main className="flex-1 flex items-center justify-center p-4 relative z-10 my-auto">
        <div className="w-full max-w-lg glass-card rounded-2xl p-5 sm:p-8 shadow-2xl relative z-10 border border-border">
          <div className="flex flex-col items-center text-center mb-8">
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Create your Taped Account</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Get started instantly with 2GB free video cloud storage
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm font-medium text-center">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl })}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg border border-slate-200 shadow-xs transition-all flex items-center justify-center gap-3 text-sm mb-6 hover:shadow-sm"
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
            Sign up with Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/80 dark:bg-slate-900/80 px-2 text-muted-foreground font-medium backdrop-blur-xs">
                Or register with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-white/80 dark:bg-slate-800/80 focus:outline-hidden focus:ring-2 focus:ring-primary text-sm transition-all"
                placeholder="Alex Dev"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-white/80 dark:bg-slate-800/80 focus:outline-hidden focus:ring-2 focus:ring-primary text-sm transition-all"
                placeholder="alex@acme.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 rounded-lg border border-input bg-white/80 dark:bg-slate-800/80 focus:outline-hidden focus:ring-2 focus:ring-primary text-sm transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-primary hover:opacity-90 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Creating account..." : "Get Started Free (2GB Included)"}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href={`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="font-semibold text-primary hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

