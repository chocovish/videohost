"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CalendarClock, CheckCircle2, XCircle, Loader2, Undo2 } from "lucide-react";

export interface PendingReschedule {
  id: string;
  proposedStart: string;
  proposedEnd: string;
  timezone?: string;
  reason?: string | null;
  proposedByRole: "HOST" | "CLIENT";
  proposedByName?: string | null;
  createdAt?: string;
}

interface RescheduleStatusCardProps {
  appointmentId: string;
  pending: PendingReschedule;
  viewerRole: "HOST" | "CLIENT" | null;
  compact?: boolean;
  onChanged?: () => void;
}

function formatProposed(startIso: string, endIso: string, tz?: string) {
  try {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const datePart = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: tz || "UTC",
    }).format(start);
    const timePart = `${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz || "UTC" }).format(start)} – ${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz || "UTC" }).format(end)}`;
    return `${datePart} • ${timePart}${tz ? ` (${tz})` : ""}`;
  } catch {
    return `${new Date(startIso).toLocaleString()}`;
  }
}

export default function RescheduleStatusCard({ appointmentId, pending, viewerRole, compact, onChanged }: RescheduleStatusCardProps) {
  const [isWorking, setIsWorking] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | "cancel" | null>(null);

  const isProposerSide = viewerRole != null && viewerRole === pending.proposedByRole;
  const proposerLabel = pending.proposedByRole === "HOST" ? "Host" : "Client";

  const handleDecision = async () => {
    if (!confirmAction) return;
    const actionMap = { approve: "approve", reject: "reject", cancel: "cancel" } as const;
    try {
      setIsWorking(true);
      const res = await fetch(`/api/appointments/${appointmentId}/reschedule/${pending.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionMap[confirmAction] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Action failed");
      setConfirmAction(null);
      onChanged?.();
    } catch (err: any) {
      alert(err.message || "Action failed");
    } finally {
      setIsWorking(false);
    }
  };

  const dialogCopy = {
    approve: {
      title: "Approve new time?",
      description: `The appointment will move to ${formatProposed(pending.proposedStart, pending.proposedEnd, pending.timezone)}. Both parties get a confirmation email and the video room stays the same.`,
      confirmText: "Approve new time",
      variant: "success" as const,
    },
    reject: {
      title: "Decline reschedule?",
      description: "The appointment stays at its original time. The other party will be notified.",
      confirmText: "Decline request",
      variant: "danger" as const,
    },
    cancel: {
      title: "Withdraw request?",
      description: "The pending proposal will be withdrawn and the original time stays booked.",
      confirmText: "Withdraw request",
      variant: "default" as const,
    },
  }[confirmAction ?? "approve"];

  return (
    <>
      <div
        className={`rounded-xl border border-sky-500/25 bg-sky-500/[0.07] ${compact ? "p-2.5" : "p-3"} text-xs space-y-2`}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 font-bold text-sky-600 dark:text-sky-300">
            <CalendarClock className="w-3.5 h-3.5" />
            Reschedule pending approval
          </span>
          <Badge variant="outline" className="text-[10px] font-bold border-sky-500/40 text-sky-600 dark:text-sky-300">
            Awaiting {isProposerSide ? (pending.proposedByRole === "HOST" ? "client" : "host") : "your"} response
          </Badge>
        </div>

        <div className="space-y-1">
          <p className="font-semibold text-foreground">
            Proposed: {formatProposed(pending.proposedStart, pending.proposedEnd, pending.timezone)}
          </p>
          <p className="text-muted-foreground">
            Proposed by {isProposerSide ? "you" : `${proposerLabel.toLowerCase()}${pending.proposedByName ? ` (${pending.proposedByName})` : ""}`}
            {pending.createdAt ? ` • ${new Date(pending.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}
          </p>
          {pending.reason && (
            <p className="italic text-muted-foreground/90 border-l-2 border-sky-500/40 pl-2">“{pending.reason}”</p>
          )}
          {!isProposerSide && (
            <p className="text-muted-foreground">Original slot stays booked until you respond.</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-0.5">
          {isProposerSide ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmAction("cancel")}
              disabled={isWorking}
              className="h-7 text-xs gap-1 cursor-pointer"
            >
              {isWorking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
              Withdraw request
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                onClick={() => setConfirmAction("approve")}
                disabled={isWorking}
                className="h-7 text-xs gap-1 cursor-pointer"
              >
                {isWorking ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmAction("reject")}
                disabled={isWorking}
                className="h-7 text-xs gap-1 cursor-pointer text-muted-foreground hover:text-destructive"
              >
                <XCircle className="w-3 h-3" />
                Decline
              </Button>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        title={dialogCopy.title}
        description={dialogCopy.description}
        variant={dialogCopy.variant}
        confirmText={dialogCopy.confirmText}
        isLoading={isWorking}
        onConfirm={handleDecision}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
}
