import { db } from "@videohost/db";
import { getPublicCdnUrl } from "@/lib/s3";
import VideoPlayer from "@/components/VideoPlayer";

export default async function EmbedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await db.video.findUnique({
    where: { id },
  });

  if (!video || video.status !== "READY") {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center text-white text-sm font-sans">
        Video unavailable or still processing.
      </div>
    );
  }

  const hlsUrl = getPublicCdnUrl(`${video.organizationId}/${video.id}/hls/master.m3u8`);

  return (
    <div className="w-screen h-screen bg-black overflow-hidden m-0 p-0 flex items-center justify-center">
      <VideoPlayer src={hlsUrl} poster={video.thumbnailUrl || undefined} className="w-full h-full rounded-none" />
    </div>
  );
}
