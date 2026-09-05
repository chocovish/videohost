"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SharedData } from "../types";

interface NavigationDeps {
  token: string;
  data: SharedData | null;
  previewData?: SharedData;
  folderIdParam: string | null;
  rootFolderIdParam: string | null;
}

/**
 * All share-page routing: folder drill-down, video deep-links, back
 * navigation, and the login-redirect-with-callback used by every paywall.
 * Preview mode disables navigation (customize page renders statically).
 */
export function useShareNavigation({
  token,
  data,
  previewData,
  folderIdParam,
  rootFolderIdParam,
}: NavigationDeps) {
  const router = useRouter();

  const goToLogin = useCallback(
    (next?: string) => {
      const callback =
        next ??
        (typeof window !== "undefined" ? window.location.href : `/share/${token}`);
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(callback)}`);
    },
    [router, token]
  );

  const handleSubfolderClick = useCallback(
    (folderId: string) => {
      if (previewData) return;
      router.push(`/share/${token}?subfolderId=${folderId}`);
    },
    [previewData, router, token]
  );

  const handleBackToRoot = useCallback(() => {
    if (previewData) return;
    router.push(`/share/${token}`);
  }, [previewData, router, token]);

  const handleVideoClick = useCallback(
    (videoId: string) => {
      if (previewData) return;
      const currentFid = data?.currentFolder?.id || token;
      const rootFid = data?.rootFolder?.id;
      const query = new URLSearchParams();
      if (currentFid) query.set("folderId", currentFid);
      if (rootFid && rootFid !== currentFid) query.set("rootFolderId", rootFid);
      const qStr = query.toString();
      router.push(`/share/${videoId}${qStr ? `?${qStr}` : ""}`);
    },
    [previewData, data?.currentFolder?.id, data?.rootFolder?.id, router, token]
  );

  const handleBackToFolder = useCallback(() => {
    if (previewData) return;
    if (rootFolderIdParam && folderIdParam && rootFolderIdParam !== folderIdParam) {
      router.push(`/share/${rootFolderIdParam}?subfolderId=${folderIdParam}`);
    } else if (folderIdParam) {
      router.push(`/share/${folderIdParam}`);
    } else if (data?.parentFolder?.id) {
      router.push(`/share/${data.parentFolder.id}`);
    } else {
      router.back();
    }
  }, [
    previewData,
    rootFolderIdParam,
    folderIdParam,
    data?.parentFolder?.id,
    router,
  ]);

  const handleJoinMeeting = useCallback(
    (meetingId: string) => {
      router.push(`/meet/${meetingId || token}`);
    },
    [router, token]
  );

  return {
    router,
    goToLogin,
    handleSubfolderClick,
    handleBackToRoot,
    handleVideoClick,
    handleBackToFolder,
    handleJoinMeeting,
  };
}
