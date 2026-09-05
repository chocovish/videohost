"use client";

import { ShieldCheck } from "lucide-react";

interface SecureLinkBadgeProps {
  displayTitle: string;
  dividerBorder: string;
  faintText: string;
}

/** "Hosted by X / Secure link" strip at the bottom of detail cards. */
export function SecureLinkBadge({ displayTitle, dividerBorder, faintText }: SecureLinkBadgeProps) {
  return (
    <div className={`pt-4 border-t flex items-center justify-between text-xs ${dividerBorder} ${faintText}`}>
      <div className="flex items-center gap-1.5">
        <span>Hosted by</span>
        <span className="font-medium">{displayTitle}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Secure link</span>
      </div>
    </div>
  );
}
