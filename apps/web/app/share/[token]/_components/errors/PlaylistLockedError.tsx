"use client";

import { ArrowLeft, ListVideo, Lock, LogIn } from "lucide-react";
import VideoThumbnail from "@/components/VideoThumbnail";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import type { ShareErrorState } from "../types";

interface PlaylistLockedErrorProps {
  error: ShareErrorState;
  onBackToPlaylist: () => void;
  onSignIn: () => void;
}

/**
 * Episode opened from a playlist share page (`?playlistId=`) without access
 * to that playlist (private / restricted / unpaid). The server withholds the
 * playable content, so this screen shows the episode artwork and routes the
 * viewer back to the playlist offer (or sign-in) instead of the player.
 */
export function PlaylistLockedError({
  error,
  onBackToPlaylist,
  onSignIn,
}: PlaylistLockedErrorProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
      <Card className="w-full max-w-md">
        {error.thumbnailUrl ? (
          <div className="aspect-video w-full overflow-hidden bg-black">
            <VideoThumbnail
              src={error.thumbnailUrl}
              alt={error.itemTitle || "Locked episode"}
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}

        <CardHeader className="items-center text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Lock className="size-5" />
          </div>
          <CardTitle className="text-xl">
            {error.itemTitle || "This episode"} is locked
          </CardTitle>
          <CardDescription>
            {error.playlistTitle ? (
              <>
                This episode is part of “{error.playlistTitle}”. Get access to
                the playlist to watch it.
              </>
            ) : (
              "Get access to the playlist to watch this episode."
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {error.itemDescription && (
            <div className="rounded-xl border bg-muted/50 p-3.5 text-left">
              <RichTextViewer
                content={error.itemDescription}
                className="text-[13px] leading-relaxed text-muted-foreground"
              />
            </div>
          )}

          {error.playlistId ? (
            <Button
              type="button"
              onClick={onBackToPlaylist}
              className="w-full"
            >
              <ListVideo />
              <span>View playlist offer</span>
            </Button>
          ) : null}
          {error.isLoggedIn === true ? null : (
            <Button
              type="button"
              variant="outline"
              onClick={onSignIn}
              className="w-full"
            >
              <LogIn />
              <span>Sign in</span>
            </Button>
          )}
          {error.playlistId ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => window.history.back()}
              className="w-full"
            >
              <ArrowLeft />
              <span>Go back</span>
            </Button>
          ) : null}
        </CardContent>

        <CardFooter className="justify-center text-xs text-muted-foreground">
          <span>Protected by Taped</span>
        </CardFooter>
      </Card>
    </div>
  );
}
