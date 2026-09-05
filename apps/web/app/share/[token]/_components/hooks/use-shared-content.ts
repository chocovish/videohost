"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
 * When the server already rendered the payload (`initialData`/`initialError`
 * from `page.tsx`), the first paint uses it directly — no loader flash, no
 * duplicate fetch. Subsequent param changes still refetch client-side.
 */
export function useSharedContent(
  previewData?: SharedData,
  initialData?: SharedData | null,
  initialError?: ShareErrorState | null,
  initialQueryKey?: string
): UseSharedContentResult {
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

  const serverData = previewData || initialData || null;
  const [data, setData] = useState<SharedData | null>(serverData);
  const [loading, setLoading] = useState(!serverData && !initialError);
  const [errorState, setErrorState] = useState<ShareErrorState | null>(
    initialError || null
  );
  // URL the server rendered. The effect below never fetches while the URL
  // still matches it — this is a persistent comparison (not a one-shot
  // "skip first run" flag) so React StrictMode's double-effect in dev can't
  // defeat it and trigger the loader flash.
  // Any navigation (different token / subfolder / folder) refetches.
  const lastKeyRef = useRef<string | null>(
    !previewData && (initialData || initialError) && initialQueryKey
      ? initialQueryKey
      : null
  );

  const fetchSharedContent = useCallback(async () => {
    if (previewData) return;
    try {
      setLoading(true);
      setErrorState(null);

      const qp = new URLSearchParams();
      if (subfolderId) qp.set("subfolderId", subfolderId);
      if (folderIdParam) qp.set("folderId", folderIdParam);
      if (rootFolderIdParam) qp.set("rootFolderId", rootFolderIdParam);
      if (playlistIdParam) qp.set("playlistId", playlistIdParam);
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
          thumbnailUrl: result.thumbnailUrl ?? null,
          type: result.type,
          playlistId: result.playlistId ?? null,
          playlistTitle: result.playlistTitle ?? null,
          isLoggedIn: result.isLoggedIn,
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
  }, [previewData, token, subfolderId, folderIdParam, rootFolderIdParam, playlistIdParam]);

  useEffect(() => {
    if (previewData || !token) return;
    const currentKey = `${token}|${subfolderId || ""}|${folderIdParam || ""}|${rootFolderIdParam || ""}|${playlistIdParam || ""}`;
    // Already hold server (or fetched) data for exactly this URL — don't
    // replace first paint with the loader.
    if (lastKeyRef.current !== null && lastKeyRef.current === currentKey) return;
    // Claim the key BEFORE fetching so StrictMode's second effect pass sees
    // it and doesn't fire a duplicate request.
    lastKeyRef.current = currentKey;
    fetchSharedContent();
  }, [token, subfolderId, folderIdParam, rootFolderIdParam, playlistIdParam, previewData, fetchSharedContent]);

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
