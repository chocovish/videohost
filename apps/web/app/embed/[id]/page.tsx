import { db } from "@videohost/db";
import { getPlaybackUrl, getPublicCdnUrl } from "@/lib/s3";
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

  const srcUrl = getPlaybackUrl(video);

  if (!srcUrl) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center text-white text-sm font-sans">
        Video playback URL unavailable.
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-black overflow-hidden m-0 p-0 flex items-center justify-center">
      <VideoPlayer src={srcUrl} poster={video.thumbnailKey ? getPublicCdnUrl(video.thumbnailKey) : undefined} className="w-full h-full rounded-none" />
    </div>
  );
}
