import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";
import { uploadBunnyVideoBinary, getBunnyConfig } from "@/lib/bunny";

/**
 * Bunny Proxy Upload
 * ---------------------------------------------------------------------------
 * Client PUTs raw video bytes to this endpoint (keeps Bunny API key secret).
 * We stream those bytes to Bunny Stream via PUT /library/{id}/videos/{guid}.
 *
 * Auth: accepts either NextAuth session (browser) or API key (service-to-service)
 * ---------------------------------------------------------------------------
 */

async function resolveAuth(req: Request): Promise<{ orgId: string; userId?: string } | null> {
  // Try API key first
  const apiCtx = await authenticateRequest(req);
  if (apiCtx) return { orgId: apiCtx.orgId, userId: apiCtx.userId };

  // Fallback to NextAuth session (browser)
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

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  if ((video as any).storageType !== "bunny") {
    return NextResponse.json({ error: "Video is not a Bunny storage video" }, { status: 400 });
  }

  const bunnyVideoId = (video as any).bunnyVideoId as string | null;
  if (!bunnyVideoId) {
    return NextResponse.json({ error: "Bunny video GUID missing" }, { status: 500 });
  }

  let contentType = req.headers.get("content-type") || "video/mp4";
  // Normalize some browser quirks
  if (!contentType.startsWith("video/") && !contentType.startsWith("application/octet-stream")) {
    contentType = "video/mp4";
  }

  console.log(`[Bunny Proxy Upload] Receiving upload for video ${videoId} (guid=${bunnyVideoId}, org=${authCtx.orgId}, contentType=${contentType})`);

  try {
    // Read raw body as ArrayBuffer – Next.js supports large uploads via streaming
    // For very large files (>10MB) Next config bodySizeLimit may need increase, but
    // we handle streaming via reader.
    const arrayBuffer = await req.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json({ error: "Empty video file" }, { status: 400 });
    }

    console.log(`[Bunny Proxy Upload] Forwarding ${buffer.length} bytes to Bunny (PUT /library/{id}/videos/${bunnyVideoId})`);

    const cfg = getBunnyConfig();

    // Bunny expects raw binary PUT
    const bunnyUrl = `https://video.bunnycdn.com/library/${cfg.libraryId}/videos/${bunnyVideoId}`;
    const bunnyRes = await fetch(bunnyUrl, {
      method: "PUT",
      headers: {
        AccessKey: cfg.apiKey,
        "Content-Type": contentType,
        "Content-Length": String(buffer.length),
      },
      body: buffer as any,
    });

    if (!bunnyRes.ok) {
      const errText = await bunnyRes.text();
      console.error(`[Bunny Proxy Upload Error] Bunny responded ${bunnyRes.status}: ${errText}`);
      return NextResponse.json(
        { error: `Bunny upload failed (${bunnyRes.status}): ${errText}` },
        { status: 502 }
      );
    }

    console.log(`[Bunny Proxy Upload] Success for video ${videoId} guid=${bunnyVideoId}`);

    // Optionally update sizeBytes if we have it
    try {
      await db.video.update({
        where: { id: videoId },
        data: { sizeBytes: BigInt(buffer.length) },
      });
    } catch (e) {
      console.warn("[Bunny Proxy Upload] Failed to update sizeBytes:", e);
    }

    return NextResponse.json({
      success: true,
      videoId,
      bunnyVideoId,
      bytesUploaded: buffer.length,
    });
  } catch (err: any) {
    console.error("[Bunny Proxy Upload Exception]", err);
    return NextResponse.json({ error: err?.message || "Bunny proxy upload failed" }, { status: 500 });
  }
}

// Also allow POST for clients that use POST instead of PUT
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return PUT(req, ctx);
}
