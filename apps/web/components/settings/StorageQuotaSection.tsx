"use client";

import React from "react";
import { HardDrive } from "lucide-react";
import { formatBytes } from "@/lib/video-utils";

interface StorageQuotaSectionProps {
  usageInfo: {
    usedBytes: number;
    storageLimitBytes: number;
    storageLimitGb: number;
  } | null;
  customLimitInput: string;
  setCustomLimitInput: (val: string) => void;
  requestSubmitted: boolean;
  onCustomLimitRequest: (e: React.FormEvent) => void;
}

export function StorageQuotaSection({
  usageInfo,
  customLimitInput,
  setCustomLimitInput,
  requestSubmitted,
  onCustomLimitRequest,
}: StorageQuotaSectionProps) {
  return (
    <div className="glass-card rounded-2xl p-6 border border-border space-y-4">
      <div className="flex items-center gap-2">
        <HardDrive className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-base text-foreground">Storage Quota</h3>
      </div>

      <div className="p-4 rounded-xl bg-muted/60 space-y-2">
        <div className="flex justify-between text-xs font-semibold">
          <span>Plan Storage Limit</span>
          <span className="text-primary font-bold">
            {usageInfo ? `${usageInfo.storageLimitGb} GB Storage` : "2 GB Storage"}
          </span>
        </div>

        {usageInfo && (
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
              <span>Current Usage</span>
              <span className="font-semibold text-foreground">
                {formatBytes(usageInfo.usedBytes)} / {formatBytes(usageInfo.storageLimitBytes)}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((usageInfo.usedBytes / usageInfo.storageLimitBytes) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground pt-1">
          Adaptive HLS encoding and original video uploads consume total storage quota.
        </p>
      </div>

      {/* Custom Quota Override Request */}
      <div className="pt-2">
        <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2">
          Need a Custom Storage Limit?
        </h4>
        <form onSubmit={onCustomLimitRequest} className="space-y-3">
          <input
            type="text"
            placeholder="e.g. 50 GB storage"
            value={customLimitInput}
            onChange={(e) => setCustomLimitInput(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-input bg-white dark:bg-slate-900 text-sm outline-hidden"
          />
          <button
            type="submit"
            className="w-full py-2 bg-slate-900 text-white font-semibold text-xs rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Request Custom Storage Override
          </button>
        </form>

        {requestSubmitted && (
          <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs text-center font-medium">
            Request submitted to sales & support!
          </div>
        )}
      </div>
    </div>
  );
}
