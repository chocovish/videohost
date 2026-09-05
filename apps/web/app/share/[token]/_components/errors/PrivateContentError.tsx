"use client";

import { ShieldAlert, ShieldCheck } from "lucide-react";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import type { ShareErrorState } from "../types";

/** Slim loading splash shown while the share payload is fetching. */
export function ShareLoadingState() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#09090b] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-[3px] border-slate-200 dark:border-white/10 border-t-slate-900 dark:border-t-white rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading…</p>
      </div>
    </div>
  );
}

/** Owner set the link to Private — link sharing is disabled. */
export function PrivateContentError({ error }: { error: ShareErrorState }) {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full p-8 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl space-y-6 text-center">
        <div className="mx-auto w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <ShieldAlert className="w-5 h-5" />
        </div>

        {error.organizationName && (
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {error.organizationName}
          </p>
        )}

        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">Private link</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            The owner of{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              “{error.itemTitle || "this item"}”
            </span>{" "}
            has set access to Private. Link sharing is currently disabled.
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

        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-4 border-t border-slate-200 dark:border-white/10">
          <ShieldCheck className="w-4 h-4" />
          <span>Protected by Taped</span>
        </div>
      </div>
    </div>
  );
}
