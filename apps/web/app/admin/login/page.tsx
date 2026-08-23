"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, KeyRound, Eye, EyeOff, ArrowRight, Lock, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter the administrator password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid administrator password");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/admin");
        router.refresh();
      }, 500);
    } catch (err: any) {
      setError(err.message || "Failed to authenticate administrator");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-zinc-950 px-4 py-12 selection:bg-lime-500/30 selection:text-lime-300">
      {/* Background Ambient Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-lime-500/10 blur-[120px] opacity-75" />
        <div className="absolute left-1/3 top-1/4 h-[350px] w-[350px] rounded-full bg-emerald-500/10 blur-[100px] opacity-50" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Main Card */}
        <div className="relative rounded-3xl border border-zinc-800/80 bg-zinc-900/60 p-8 shadow-2xl backdrop-blur-2xl transition-all">
          {/* Top Shield Emblem */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-400/20 via-emerald-500/15 to-transparent border border-lime-500/30 text-lime-400 shadow-[0_0_30px_rgba(132,204,22,0.25)] mb-6">
            <Shield className="h-8 w-8" />
          </div>

          <div className="text-center space-y-1.5 mb-8">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-lime-500/10 px-3 py-0.5 text-xs font-semibold text-lime-400 border border-lime-500/20 mb-1">
              <KeyRound className="h-3.5 w-3.5" />
              <span>Root Security Zone</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Taped <span className="text-lime-400">Admin Area</span>
            </h1>
            <p className="text-xs text-zinc-400">
              Enter your master administrator password configured via environment variable (<code className="font-mono text-zinc-300 bg-zinc-800 px-1 py-0.5 rounded text-[11px]">ADMIN_PASSWORD</code>) to unlock full platform controls.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 flex items-center gap-2.5 rounded-2xl bg-red-950/40 border border-red-500/30 p-3.5 text-xs text-red-300 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-zinc-300 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Master Admin Password</span>
                </label>
              </div>

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password..."
                  className="h-12 bg-zinc-950/80 border-zinc-800 text-sm rounded-xl pl-4 pr-11 text-white placeholder:text-zinc-600 focus-visible:ring-lime-500 focus-visible:border-lime-500"
                  autoFocus
                  disabled={loading || success}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || success}
              className="w-full h-12 rounded-xl bg-lime-500 hover:bg-lime-400 text-zinc-950 font-bold text-sm shadow-[0_0_25px_rgba(132,204,22,0.3)] transition-all duration-200 gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
              ) : success ? (
                <span>Access Granted...</span>
              ) : (
                <>
                  <span>Authenticate & Enter</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer note */}
          <div className="mt-8 text-center border-t border-zinc-800/80 pt-4">
            <p className="text-[11px] text-zinc-500 font-mono">
              Protected by cryptographic HMAC-SHA256 Token Sessions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
