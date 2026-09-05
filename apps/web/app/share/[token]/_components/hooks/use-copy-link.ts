"use client";

import { useCallback, useState } from "react";

/** Copy-current-URL affordance shared by header + detail cards. */
export function useCopyLink() {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(() => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  return { copied, handleCopyLink };
}
