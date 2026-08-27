"use client";

import React from "react";
import { HardDrive } from "lucide-react";
import { formatBytes } from "@/lib/video-utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const usagePercentage = usageInfo
    ? Math.min(100, Math.round((usageInfo.usedBytes / usageInfo.storageLimitBytes) * 100))
    : 0;

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
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>Current Usage</span>
              <span className="font-semibold text-foreground">
                {formatBytes(usageInfo.usedBytes)} / {formatBytes(usageInfo.storageLimitBytes)}
              </span>
            </div>
            <Progress value={usagePercentage} className="w-full" />
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
          <Input
            type="text"
            placeholder="e.g. 50 GB storage"
            value={customLimitInput}
            onChange={(e) => setCustomLimitInput(e.target.value)}
            className="rounded-xl"
          />
          <Button
            type="submit"
            variant="default"
            className="w-full"
          >
            Request Custom Storage Override
          </Button>
        </form>

        {requestSubmitted && (
          <Alert className="mt-3 border-primary/25 text-primary [&>svg]:text-primary">
            <AlertDescription className="text-xs text-center text-primary font-medium">
              Request submitted to sales & support!
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
