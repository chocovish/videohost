"use client";

import { useState } from "react";

interface UseAccessRequestDeps {
  token: string;
  userEmail?: string;
}

/**
 * "Request access" flow for signed-in users blocked by ACCESS_DENIED.
 * Self-contained so `AccessDeniedError` owns the whole flow.
 */
export function useAccessRequest({ token, userEmail }: UseAccessRequestDeps) {
  const [requestAccessLoading, setRequestAccessLoading] = useState(false);
  const [requestAccessSuccess, setRequestAccessSuccess] = useState(false);
  const [requestAccessMessage, setRequestAccessMessage] = useState("");
  const [requestAccessError, setRequestAccessError] = useState("");

  const handleRequestAccess = async () => {
    if (!token) return;
    try {
      setRequestAccessLoading(true);
      setRequestAccessError("");
      const res = await fetch(`/api/share/${token}/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
        }),
      });
      const resData = await res.json();
      if (res.ok) {
        setRequestAccessSuccess(true);
        setRequestAccessMessage(
          resData.message || "Access request submitted! The creator has been notified."
        );
      } else {
        setRequestAccessError(resData.error || "Failed to submit access request.");
      }
    } catch (e) {
      console.error("Access request error:", e);
      setRequestAccessError("Network error. Please try again.");
    } finally {
      setRequestAccessLoading(false);
    }
  };

  return {
    requestAccessLoading,
    requestAccessSuccess,
    requestAccessMessage,
    requestAccessError,
    handleRequestAccess,
  };
}
