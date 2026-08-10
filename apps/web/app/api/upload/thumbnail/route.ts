import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPresignedUploadUrl, getPublicCdnUrl } from "@/lib/s3";
import { db } from "@videohost/db";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id || !(session as any).organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (session as any).organizationId as string;
    const { videoId } = await req.json();

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const video = await db.video.findFirst({
      where: { id: videoId, organizationId: orgId },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const thumbnailKey = `${orgId}/${video.id}/thumbnail.jpg`;
    const thumbnailUrl = getPublicCdnUrl(thumbnailKey);

    await db.video.update({
      where: { id: videoId },
      data: { thumbnailUrl },
    });

    const uploadUrl = await getPresignedUploadUrl(thumbnailKey, "image/jpeg");

    return NextResponse.json({ uploadUrl, thumbnailUrl });
  } catch (error: any) {
    console.error("Thumbnail upload route error:", error);
    return NextResponse.json({ error: "Failed to generate thumbnail upload URL" }, { status: 500 });
  }
}
