"use client";

import { useMemo } from "react";
import type { SharedContentClientProps } from "./_components/types";
import { buildShareTheme } from "./_components/share-theme";
import { useSharedContent } from "./_components/hooks/use-shared-content";
import { usePlaylistContext } from "./_components/hooks/use-playlist-context";
import { useCopyLink } from "./_components/hooks/use-copy-link";
import { useShareNavigation } from "./_components/hooks/use-share-navigation";
import { useBuyerCountry } from "./_components/hooks/use-buyer-country";
import { useCheckout } from "./_components/hooks/use-checkout";
import { PageBackground } from "./_components/ui/PageBackground";
import { ShareHeader } from "./_components/ui/ShareHeader";
import { BannerHeader } from "./_components/ui/BannerHeader";
import { ShareFooter } from "./_components/ui/ShareFooter";
import { CheckoutDialog } from "./_components/ui/CheckoutDialog";
import { ShareLoadingState, PrivateContentError } from "./_components/errors/PrivateContentError";
import { LoginRequiredError } from "./_components/errors/LoginRequiredError";
import { AccessDeniedError } from "./_components/errors/AccessDeniedError";
import { ShareErrorFallback } from "./_components/errors/ShareErrorFallback";
import { MeetingView } from "./_components/views/MeetingView";
import { VideoView } from "./_components/views/VideoView";
import { PlaylistView } from "./_components/views/PlaylistView";
import { PlaylistEpisodeView } from "./_components/views/PlaylistEpisodeView";
import { FolderView } from "./_components/views/FolderView";

// Preserve the previous public API: customize-share-page imports these types
// directly from this file.
export type {
  SharePageConfigData,
  SharedData,
  SharedContentClientProps,
  ShareErrorState,
  PriceInfo,
} from "./_components/types";

/**
 * Thin orchestrator for `/share/[token]`.
 *
 * All logic lives in `_components` now:
 * - hooks/          → fetching, navigation, checkout, OTP, access-request
 * - ui/             → header, banner, CTA, social, paywall, checkout dialog
 * - errors/         → private / login / denied / fallback states
 * - views/          → meeting / video / playlist / folder feature views
 *
 * This file only wires state → theme → views, so each feature can evolve
 * without touching the others.
 */
export default function SharedContentClient({
  overrideConfig,
  previewData,
}: SharedContentClientProps) {
  const {
    token,
    subfolderId,
    folderIdParam,
    rootFolderIdParam,
    playlistIdParam,
    data,
    loading,
    errorState,
    setErrorState,
    fetchSharedContent,
  } = useSharedContent(previewData);

  const { copied, handleCopyLink } = useCopyLink();
  const { selectedBuyerCountry, setSelectedBuyerCountry } = useBuyerCountry(
    data?.detectedCountryCode
  );
  const navigation = useShareNavigation({
    token,
    data,
    previewData,
    folderIdParam,
    rootFolderIdParam,
  });

  const theme = useMemo(
    () => (data ? buildShareTheme(data, overrideConfig) : null),
    [data, overrideConfig]
  );

  const checkout = useCheckout({
    data,
    token,
    selectedBuyerCountry,
    accentHex: theme?.accentHex ?? "#84cc16",
    fetchSharedContent,
  });

  // Playlist queue for episode pages (`/share/:videoId?playlistId=`).
  // Hook is always called (rules of hooks); it no-ops without a param.
  const { playlistData, loading: playlistLoading } = usePlaylistContext(
    playlistIdParam,
    data
  );

  if (loading) {
    return <ShareLoadingState />;
  }

  // 1. PRIVATE CONTENT ACCESS BLOCKED
  if (errorState?.code === "PRIVATE_CONTENT") {
    return <PrivateContentError error={errorState} />;
  }

  // 2. AUTHENTICATION REQUIRED (NOT LOGGED IN)
  if (errorState?.code === "LOGIN_REQUIRED") {
    return (
      <LoginRequiredError
        token={token}
        subfolderId={subfolderId}
        error={errorState}
        onAuthenticated={async () => {
          setErrorState(null);
          await fetchSharedContent();
        }}
      />
    );
  }

  // 3. LOGGED IN BUT ACCESS DENIED
  if (errorState?.code === "ACCESS_DENIED") {
    return <AccessDeniedError token={token} subfolderId={subfolderId} error={errorState} />;
  }

  // 4. UNHANDLED ERROR / LINK NOT FOUND
  if (errorState || !data || !theme) {
    return <ShareErrorFallback error={errorState} />;
  }

  const isVideo = data.type === "video";
  const isPlaylist = data.type === "playlist";
  const isMeeting = data.type === "meeting";

  // Dedicated episode page: video token + `?playlistId=` queue available.
  // Falls back to the plain single-video view when the playlist id is
  // missing, still loading, or failed to resolve (backwards compatible).
  const isPlaylistEpisode =
    isVideo && !!playlistIdParam && (!!playlistData || playlistLoading);

  const handleSignIn = () => navigation.goToLogin();
  const handleOpenCheckout = () => checkout.setIsCheckoutOpen(true);
  const handleCloseCheckout = () => checkout.setIsCheckoutOpen(false);

  return (
    <div className={`min-h-screen flex flex-col font-sans antialiased relative ${theme.bgClass}`}>
      <PageBackground theme={theme} />
      <ShareHeader data={data} theme={theme} copied={copied} onCopyLink={handleCopyLink} />

      {/* Main Content */}
      <main
        className={`flex-1 w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 relative z-10 ${
          isPlaylist || isPlaylistEpisode ? "max-w-6xl" : "max-w-5xl"
        }`}
      >
        <BannerHeader theme={theme} />

        {/* MEETING SHARE & ENTRY PASS VIEW */}
        {isMeeting && data.meeting && (
          <MeetingView
            data={data}
            theme={theme}
            priceInfo={checkout.priceInfo}
            selectedCountry={selectedBuyerCountry}
            onCountryChange={setSelectedBuyerCountry}
            isCheckingOut={checkout.isCheckingOut}
            onSignIn={handleSignIn}
            onPurchase={checkout.handleExecuteCheckout}
            copied={copied}
            onCopyLink={handleCopyLink}
            onJoinMeeting={navigation.handleJoinMeeting}
          />
        )}

        {/* PLAYLIST EPISODE VIEW — `/share/:videoId?playlistId=:playlistId` */}
        {isPlaylistEpisode && data.video && (
          <PlaylistEpisodeView
            data={data}
            playlistData={playlistData}
            playlistLoading={playlistLoading}
            theme={theme}
            priceInfo={checkout.priceInfo}
            copied={copied}
            onCopyLink={handleCopyLink}
            selectedCountry={selectedBuyerCountry}
            onCountryChange={setSelectedBuyerCountry}
            isCheckingOut={checkout.isCheckingOut}
            onSignIn={handleSignIn}
            onFreeClaim={checkout.handleExecuteCheckout}
            onOpenCheckout={handleOpenCheckout}
            onOpenVideo={(videoId) =>
              playlistIdParam && navigation.openPlaylistVideo(videoId, playlistIdParam)
            }
            onBackToPlaylist={() =>
              playlistIdParam && navigation.goToPlaylist(playlistIdParam)
            }
          />
        )}

        {/* SINGLE VIDEO SHARE VIEW */}
        {isVideo && data.video && !isPlaylistEpisode && (
          <VideoView
            data={data}
            theme={theme}
            priceInfo={checkout.priceInfo}
            copied={copied}
            onCopyLink={handleCopyLink}
            selectedCountry={selectedBuyerCountry}
            onCountryChange={setSelectedBuyerCountry}
            isCheckingOut={checkout.isCheckingOut}
            onSignIn={handleSignIn}
            onFreeClaim={checkout.handleExecuteCheckout}
            onOpenCheckout={handleOpenCheckout}
            onBackToFolder={navigation.handleBackToFolder}
          />
        )}

        {/* PLAYLIST OVERVIEW — details + episode list, routes to episode pages */}
        {isPlaylist && data.playlist && (
          <PlaylistView
            data={data}
            theme={theme}
            priceInfo={checkout.priceInfo}
            copied={copied}
            onCopyLink={handleCopyLink}
            selectedCountry={selectedBuyerCountry}
            onCountryChange={setSelectedBuyerCountry}
            isCheckingOut={checkout.isCheckingOut}
            onSignIn={handleSignIn}
            onFreeClaim={checkout.handleExecuteCheckout}
            onOpenCheckout={handleOpenCheckout}
            onVideoClick={(videoId) =>
              data.playlist && navigation.openPlaylistVideo(videoId, data.playlist.id)
            }
          />
        )}

        {/* FOLDER SHARE VIEW */}
        {!isVideo && data.currentFolder && (
          <FolderView
            data={data}
            theme={theme}
            subfolderId={subfolderId}
            onSubfolderClick={navigation.handleSubfolderClick}
            onBackToRoot={navigation.handleBackToRoot}
            onVideoClick={navigation.handleVideoClick}
          />
        )}
      </main>

      {/* VISITOR CONTENT CHECKOUT MODAL */}
      <CheckoutDialog
        data={data}
        theme={theme}
        priceInfo={checkout.priceInfo}
        open={checkout.isCheckoutOpen}
        onClose={handleCloseCheckout}
        isCheckingOut={checkout.isCheckingOut}
        error={checkout.checkoutError}
        success={checkout.checkoutSuccess}
        onConfirm={checkout.handleExecuteCheckout}
      />

      {/* Footer Text */}
      <ShareFooter theme={theme} />
    </div>
  );
}
