import { db } from "@videohost/db";
import { getPlaybackUrl, getThumbnailPlaybackUrl } from "@/lib/s3";
import { getVideoSubtitleTracksSafe } from "@/lib/subtitles";
import EmbedPlayer from "./embed-player";

export default async function EmbedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await db.video.findUnique({
    where: { id },
    include: { renditions: true },
  });

  if (!video || video.status !== "READY") {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center text-white text-sm font-sans">
        Video unavailable or still processing.
      </div>
    );
  }

  const srcUrl = await getPlaybackUrl(video as any);

  if (!srcUrl) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center text-white text-sm font-sans">
        Video playback URL unavailable.
      </div>
    );
  }

  const posterUrl = (await getThumbnailPlaybackUrl(video as any)) || undefined;
  const subtitles = await getVideoSubtitleTracksSafe(id);

  return (
    <div className="w-screen h-screen bg-black overflow-hidden m-0 p-0 flex items-center justify-center">
      <EmbedPlayer videoId={video.id} src={srcUrl} poster={posterUrl} subtitles={subtitles} />
    </div>
  );
}
