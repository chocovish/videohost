"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import type { ShareErrorState, SharedData } from "../types";

interface UseSharedContentResult {
  token: string;
  subfolderId: string | null;
  folderIdParam: string | null;
  rootFolderIdParam: string | null;
  /** `?playlistId=` — present when a video is opened from a playlist. */
  playlistIdParam: string | null;
  data: SharedData | null;
  setData: React.Dispatch<React.SetStateAction<SharedData | null>>;
  loading: boolean;
  errorState: ShareErrorState | null;
  setErrorState: React.Dispatch<React.SetStateAction<ShareErrorState | null>>;
  fetchSharedContent: () => Promise<void>;
}

/**
 * Owns share-page fetching: route params, query params, loading + error state.
 * Preview mode (`previewData` set by customize-share-page) skips fetching.
 */
export function useSharedContent(previewData?: SharedData): UseSharedContentResult {
  const params = useParams();
  const searchParams = useSearchParams();

  const token = params?.token as string;
  const subfolderId = searchParams?.get("subfolderId");
  const folderIdParam =
    searchParams?.get("folderId") ||
    searchParams?.get("fromFolder") ||
    searchParams?.get("fromFolderId");
  const rootFolderIdParam = searchParams?.get("rootFolderId");
  const playlistIdParam =
    searchParams?.get("playlistId") || searchParams?.get("playlist");

  const [data, setData] = useState<SharedData | null>(previewData || null);
  const [loading, setLoading] = useState(!previewData);
  const [errorState, setErrorState] = useState<ShareErrorState | null>(null);

  const fetchSharedContent = useCallback(async () => {
    if (previewData) return;
    try {
      setLoading(true);
      setErrorState(null);

      const qp = new URLSearchParams();
      if (subfolderId) qp.set("subfolderId", subfolderId);
      if (folderIdParam) qp.set("folderId", folderIdParam);
      if (rootFolderIdParam) qp.set("rootFolderId", rootFolderIdParam);
      const qStr = qp.toString();

      const url = qStr ? `/api/share/${token}?${qStr}` : `/api/share/${token}`;

      const res = await fetch(url);
      const result = await res.json();

      if (!res.ok) {
        setErrorState({
          code: result.error || "UNKNOWN_ERROR",
          message: result.message,
          userEmail: result.userEmail,
          organizationName: result.organization?.name,
          itemTitle: result.itemTitle,
          itemDescription: result.itemDescription,
          type: result.type,
        });
        return;
      }

      setData(result);
    } catch (err: unknown) {
      setErrorState({
        code: "FETCH_FAILED",
        message: err instanceof Error ? err.message : "Failed to load shared content.",
      });
    } finally {
      setLoading(false);
    }
  }, [previewData, token, subfolderId, folderIdParam, rootFolderIdParam]);

  useEffect(() => {
    if (!previewData && token) {
      fetchSharedContent();
    }
  }, [token, subfolderId, folderIdParam, rootFolderIdParam, previewData, fetchSharedContent]);

  return {
    token,
    subfolderId,
    folderIdParam,
    rootFolderIdParam,
    playlistIdParam,
    data,
    setData,
    loading,
    errorState,
    setErrorState,
    fetchSharedContent,
  };
}
