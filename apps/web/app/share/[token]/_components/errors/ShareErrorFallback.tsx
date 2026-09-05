"use client";

import { AlertTriangle } from "lucide-react";
import type { ShareErrorState } from "../types";

/** Catch-all for unknown errors / invalid / expired links. */
export function ShareErrorFallback({ error }: { error: ShareErrorState | null }) {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full p-8 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl text-center space-y-4">
        <div className="mx-auto w-11 h-11 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <h1 className="text-lg font-semibold">Link unavailable</h1>
        <p className="text-sm text-slate-500">
          {error?.message || "This share link is invalid or expired."}
        </p>
      </div>
    </div>
  );
}
