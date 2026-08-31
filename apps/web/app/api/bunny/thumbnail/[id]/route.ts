import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";
import { uploadBunnyThumbnail, getBunnyConfig } from "@/lib/bunny";

async function resolveAuth(req: Request): Promise<{ orgId: string; userId?: string } | null> {
  const apiCtx = await authenticateRequest(req);
  if (apiCtx) return { orgId: apiCtx.orgId, userId: apiCtx.userId };
  const session = await auth();
  const orgId = (session as any)?.organizationId as string | undefined;
  const userId = (session as any)?.user?.id as string | undefined;
  if (session && orgId && userId) return { orgId, userId };
  return null;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: videoId } = await params;

  const authCtx = await resolveAuth(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const video = await db.video.findFirst({
    where: { id: videoId, organizationId: authCtx.orgId },
  });

  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });
  if ((video as any).storageType !== "bunny") {
    return NextResponse.json({ error: "Video is not a Bunny storage video" }, { status: 400 });
  }

  const bunnyVideoId = (video as any).bunnyVideoId as string | null;
  if (!bunnyVideoId) return NextResponse.json({ error: "Bunny video GUID missing" }, { status: 500 });

  const contentType = req.headers.get("content-type") || "image/webp";
  console.log(`[Bunny Proxy Thumbnail] Receiving thumbnail for video ${videoId} guid=${bunnyVideoId} ct=${contentType}`);

  try {
    const arrayBuffer = await req.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length === 0) {
      return NextResponse.json({ error: "Empty thumbnail file" }, { status: 400 });
    }

    // Bunny expects POST to /thumbnail with image binary
    const cfg = getBunnyConfig();
    const url = `https://video.bunnycdn.com/library/${cfg.libraryId}/videos/${bunnyVideoId}/thumbnail`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        AccessKey: cfg.apiKey,
        "Content-Type": contentType,
        "Content-Length": String(buffer.length),
      },
      body: buffer as any,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Bunny Proxy Thumbnail Error] ${res.status}: ${errText}`);
      return NextResponse.json({ error: `Bunny thumbnail failed (${res.status}): ${errText}` }, { status: 502 });
    }

    console.log(`[Bunny Proxy Thumbnail] Success for video ${videoId} guid=${bunnyVideoId}`);

    // Also optionally store a local S3 copy of thumbnail for fallback, but for Bunny we
    // just keep the guid; no need to store thumbnailKey separately.

    return NextResponse.json({ success: true, videoId, bunnyVideoId, bytes: buffer.length });
  } catch (err: any) {
    console.error("[Bunny Proxy Thumbnail Exception]", err);
    return NextResponse.json({ error: err?.message || "Thumbnail proxy failed" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return PUT(req, ctx);
}
