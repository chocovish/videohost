"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import type { ShareErrorState } from "../types";
import { useOtpAuth } from "../hooks/use-otp-auth";

interface LoginRequiredErrorProps {
  token: string;
  subfolderId: string | null;
  error: ShareErrorState;
  onAuthenticated: () => Promise<void>;
}

/**
 * Signed-out visitor hitting a restricted link: sign in / register /
 * 24h email-code pass. Owns the OTP flow via `useOtpAuth`.
 */
export function LoginRequiredError({
  token,
  subfolderId,
  error,
  onAuthenticated,
}: LoginRequiredErrorProps) {
  const router = useRouter();
  const callbackUrl = `/share/${token}${subfolderId ? `?subfolderId=${subfolderId}` : ""}`;

  const {
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
  } = useOtpAuth({ token, onAuthenticated });

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full p-6 sm:p-8 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl space-y-6">
        {authViewMode === "options" ? (
          <>
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-11 h-11 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>

              {error.organizationName && (
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {error.organizationName}
                </p>
              )}

              <h1 className="text-xl font-semibold tracking-tight">Sign in required</h1>

              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  “{error.itemTitle || "This content"}”
                </span>{" "}
                is restricted. Sign in or use a one-time code to continue.
              </p>

              {error.itemDescription && (
                <div className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-left">
                  <RichTextViewer
                    content={error.itemDescription}
                    className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                onClick={() =>
                  router.push(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
                }
                className="w-full py-2.5 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 font-medium rounded-xl transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                Sign in to access
              </button>

              <button
                onClick={() =>
                  router.push(
                    `/auth/register?mode=viewer&callbackUrl=${encodeURIComponent(callbackUrl)}`
                  )
                }
                className="w-full py-2.5 px-4 bg-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-900 dark:text-slate-100 font-medium rounded-xl border border-slate-200 dark:border-white/10 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Create free account
              </button>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-white/10" />
                </div>
                <div className="relative flex justify-center text-[11px] font-medium text-slate-400">
                  <span className="bg-white dark:bg-[#111114] px-2">or</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setAuthViewMode("otp");
                  resetOtpMessages();
                }}
                className="w-full py-2.5 px-4 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-all flex items-center justify-center gap-2 text-[13px] cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Continue with email code</span>
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setAuthViewMode("options");
                  resetOtpMessages();
                }}
                className="text-[13px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>

              <span className="text-[11px] font-medium text-slate-500">24h pass</span>
            </div>

            <div className="text-left space-y-1.5">
              <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                Email code
              </h2>
              <p className="text-[13px] text-slate-500 leading-relaxed">
                We’ll send a 6-digit code for 24-hour access in this browser.
              </p>
            </div>

            {otpError && (
              <div className="p-3 rounded-xl bg-red-500/[0.06] border border-red-500/20 text-red-600 dark:text-red-400 text-[13px] font-medium flex items-start gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{otpError}</span>
              </div>
            )}

            {otpSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[13px] font-medium flex items-start gap-2 text-left">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{otpSuccess}</span>
              </div>
            )}

            {otpStep === "request" ? (
              <form onSubmit={handleSendOtp} className="space-y-3 text-left">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/20 text-sm placeholder:text-slate-400 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={otpLoading}
                  className="w-full py-2.5 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 font-medium rounded-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                >
                  {otpLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending…</span>
                    </>
                  ) : (
                    <>
                      <span>Send code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3 text-left">
                <div className="flex items-center justify-between text-[13px] text-slate-500">
                  <span>
                    Sent to{" "}
                    <span className="text-slate-900 dark:text-slate-100 font-medium">
                      {otpEmail}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep("request");
                      setOtpCode("");
                      resetOtpMessages();
                    }}
                    className="font-medium hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    6-digit code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-center font-mono text-xl font-semibold tracking-[6px] placeholder:text-slate-300 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={otpLoading || otpCode.length < 6}
                  className="w-full py-2.5 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 font-medium rounded-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                >
                  {otpLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying…</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Verify & continue</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpLoading}
                    className="text-[13px] text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium hover:underline cursor-pointer disabled:opacity-50"
                  >
                    Resend code
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-3 border-t border-slate-200 dark:border-white/10">
          <ShieldCheck className="w-4 h-4" />
          <span>Secured sharing</span>
        </div>
      </div>
    </div>
  );
}
