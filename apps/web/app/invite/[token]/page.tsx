"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Building2, Check, AlertCircle, Loader2, UserPlus, LogIn, ArrowRight, UserCheck } from "lucide-react";

interface InviteInfo {
  id: string;
  email: string;
  role: string;
  isExpired: boolean;
  isAccepted: boolean;
  organizationName: string;
  organizationId: string;
  currentUserEmail?: string | null;
  isEmailMismatch?: boolean;
}

export default function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptedSuccess, setAcceptedSuccess] = useState(false);

  useEffect(() => {
    async function loadInvite() {
      try {
        const res = await fetch(`/api/organization/invite/accept?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Invalid or expired invitation link");
          return;
        }

        setInviteInfo(data.invitation);
      } catch (err: any) {
        setError("Failed to load invitation details. Please check your network connection.");
      } finally {
        setLoading(false);
      }
    }

    loadInvite();
  }, [token]);

  const handleAccept = async () => {
    setIsAccepting(true);
    setError("");

    try {
      const res = await fetch("/api/organization/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          // Not logged in, redirect to login with invite query
          router.push(`/auth/login?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(inviteInfo?.email || "")}`);
          return;
        }
        throw new Error(data.error || "Failed to accept invitation");
      }

      setAcceptedSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to accept invitation");
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#131c2e] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
        {/* Header Logo */}
        <Link href="/" className="inline-block transform hover:scale-105 transition-transform mb-2">
          <Image
            src="/taped-in-logo.webp"
            alt="Taped"
            width={140}
            height={44}
            className="h-9 w-auto object-contain mx-auto"
            priority
          />
        </Link>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-lime-400 animate-spin" />
            <p className="text-sm text-slate-400">Loading invitation details...</p>
          </div>
        ) : error && !inviteInfo ? (
          <div className="py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Invalid Invitation</h2>
            <p className="text-sm text-slate-400">{error}</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-slate-200 font-semibold text-sm rounded-xl hover:bg-slate-700 transition-all"
            >
              Return to Dashboard
            </Link>
          </div>
        ) : inviteInfo ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">You've Been Invited!</h2>
              <p className="text-sm text-slate-400">
                You were invited to join <strong className="text-lime-400 font-semibold">{inviteInfo.organizationName}</strong> as a{" "}
                <span className="uppercase text-xs font-bold px-2 py-0.5 rounded bg-lime-500/15 text-lime-400 border border-lime-500/20">
                  {inviteInfo.role}
                </span>
              </p>
            </div>

            {inviteInfo.isExpired ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm space-y-2">
                <AlertCircle className="w-5 h-5 mx-auto" />
                <p>This invitation link has expired. Please contact the organization admin to request a new invitation.</p>
              </div>
            ) : inviteInfo.isAccepted || acceptedSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm space-y-3">
                <Check className="w-6 h-6 mx-auto" />
                <p className="font-semibold">Invitation accepted successfully!</p>
                <p className="text-xs text-slate-400">Redirecting to your dashboard...</p>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-lime-500 text-slate-950 font-bold text-sm rounded-xl hover:bg-lime-400 transition-all shadow-lg shadow-lime-500/20"
                >
                  Go to Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {inviteInfo.isEmailMismatch && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs text-left space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Email Account Mismatch</span>
                    </div>
                    <p className="leading-relaxed">
                      You are currently signed in as <strong className="text-white">{inviteInfo.currentUserEmail}</strong>, but this invitation was sent to <strong className="text-white">{inviteInfo.email}</strong>.
                    </p>
                    <p className="text-[11px] text-amber-300/80">
                      Please sign in with <strong>{inviteInfo.email}</strong> to accept this invitation.
                    </p>
                  </div>
                )}

                {error && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-center gap-2 text-left">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={handleAccept}
                  disabled={isAccepting || inviteInfo.isEmailMismatch}
                  className="w-full py-3 bg-lime-500 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-lime-500/20 hover:bg-lime-400 transition-all disabled:opacity-50"
                >
                  {isAccepting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Accepting Invitation...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Accept Invitation & Join
                    </>
                  )}
                </button>

                <div className="pt-2 border-t border-slate-800 flex flex-col gap-2 text-xs text-slate-400">
                  <p>
                    {inviteInfo.isEmailMismatch ? (
                      <>Switch to account for <span className="text-slate-200 font-semibold">{inviteInfo.email}</span>:</>
                    ) : (
                      <>Not signed in as <span className="text-slate-200 font-semibold">{inviteInfo.email}</span>?</>
                    )}
                  </p>
                  <div className="flex justify-center gap-3 pt-1">
                    <Link
                      href={`/auth/login?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(inviteInfo.email)}`}
                      className="text-lime-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <LogIn className="w-3.5 h-3.5" /> Sign In as {inviteInfo.email}
                    </Link>
                    <span>&bull;</span>
                    <Link
                      href={`/auth/register?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(inviteInfo.email)}`}
                      className="text-lime-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Create Account
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
