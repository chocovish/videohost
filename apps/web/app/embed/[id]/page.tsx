import { db } from "@videohost/db";
import { getPlaybackUrl, getPresignedPlaybackUrl } from "@/lib/s3";
import VideoPlayer from "@/components/VideoPlayer";

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

  const srcUrl = await getPlaybackUrl(video);

  if (!srcUrl) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center text-white text-sm font-sans">
        Video playback URL unavailable.
      </div>
    );
  }

  const posterUrl = video.thumbnailKey ? await getPresignedPlaybackUrl(video.thumbnailKey) : undefined;

  return (
    <div className="w-screen h-screen bg-black overflow-hidden m-0 p-0 flex items-center justify-center">
      <VideoPlayer src={srcUrl} poster={posterUrl} className="w-full h-full rounded-none" />
    </div>
  );
}
