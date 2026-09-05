"use client";

import { AlertCircle, CheckCircle2, Loader2, LogIn, Send, UserX } from "lucide-react";
import { signOut } from "next-auth/react";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import type { ShareErrorState } from "../types";
import { useAccessRequest } from "../hooks/use-access-request";

interface AccessDeniedErrorProps {
  token: string;
  subfolderId: string | null;
  error: ShareErrorState;
}

/** Signed-in visitor whose account lacks access: request access / switch account. */
export function AccessDeniedError({ token, subfolderId, error }: AccessDeniedErrorProps) {
  const callbackUrl = `/share/${token}${subfolderId ? `?subfolderId=${subfolderId}` : ""}`;

  const {
    requestAccessLoading,
    requestAccessSuccess,
    requestAccessMessage,
    requestAccessError,
    handleRequestAccess,
  } = useAccessRequest({ token, userEmail: error.userEmail });

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full p-8 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl space-y-6 text-center">
        <div className="mx-auto w-11 h-11 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
          <UserX className="w-5 h-5" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">No access</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Signed in as{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {error.userEmail}
            </span>
            , but this account doesn’t have access to{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              “{error.itemTitle || "this item"}”
            </span>
            .
          </p>
        </div>

        {error.itemDescription && (
          <div className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-left">
            <RichTextViewer
              content={error.itemDescription}
              className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed"
            />
          </div>
        )}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-3 text-left">
          <p className="text-[13px] font-medium">Need access?</p>
          <p className="text-[13px] text-slate-500 leading-relaxed">
            Send a request to the creator. You’ll be notified once approved.
          </p>

          {requestAccessSuccess ? (
            <div className="p-3 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[13px] font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{requestAccessMessage || "Request sent."}</span>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              {requestAccessError && (
                <div className="p-2.5 rounded-xl bg-red-500/[0.06] border border-red-500/20 text-red-600 dark:text-red-400 text-[13px] font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{requestAccessError}</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleRequestAccess}
                disabled={requestAccessLoading}
                className="w-full py-2.5 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 font-medium rounded-xl transition-all flex items-center justify-center gap-2 text-[13px] cursor-pointer disabled:opacity-50"
              >
                {requestAccessLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Request access</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="pt-1">
          <button
            onClick={() =>
              signOut({
                callbackUrl: `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`,
              })
            }
            className="w-full py-2.5 px-4 text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-all flex items-center justify-center gap-2 text-[13px] cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Use a different account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
