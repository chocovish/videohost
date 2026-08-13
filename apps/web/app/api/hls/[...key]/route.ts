import { NextResponse } from "next/server";
import { s3, BUCKET_NAME, getPresignedPlaybackUrl } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import path from "path";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key: keyParts } = await params;
    if (!keyParts || keyParts.length === 0) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    let objectKey = keyParts.join("/");

    // 1. If requesting an HLS master playlist without .m3u8 extension (ends with "master"), append ".m3u8" back
    if (objectKey.endsWith("master")) {
      objectKey = `${objectKey}.m3u8`;
    }

    // 2. If requesting an HLS playlist (.m3u8): fetch from private bucket, rewrite URLs, return playlist
    if (objectKey.endsWith(".m3u8")) {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: objectKey,
      });

      let response;
      try {
        response = await s3.send(command);
      } catch (err: any) {
        if (err.name === "NoSuchKey" || err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
          return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
        }
        throw err;
      }

      const originalText = await response.Body?.transformToString();
      if (!originalText) {
        return NextResponse.json({ error: "Empty playlist" }, { status: 500 });
      }

      // Base directory of the playlist key, e.g. "org1/vid1/hls/"
      const lastSlashIndex = objectKey.lastIndexOf("/");
      const dirPath = lastSlashIndex !== -1 ? objectKey.substring(0, lastSlashIndex + 1) : "";

      const lines = originalText.split(/\r?\n/);
      const rewrittenLines = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;

        // Handle tags/comments starting with '#'
        if (trimmed.startsWith("#")) {
          return line.replace(/URI="([^"]+)"/g, (match, uri) => {
            if (uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("data:")) {
              return match;
            }
            const targetKey = path.posix.normalize(dirPath + uri);
            return `URI="/api/hls/${targetKey}"`;
          });
        }

        // Standard non-comment line (relative URI to sub-playlist or segment)
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
          return line;
        }

        // Normalize relative path against playlist base directory
        const targetKey = path.posix.normalize(dirPath + trimmed);
        return `/api/hls/${targetKey}`;
      });

      const rewrittenContent = rewrittenLines.join("\n");

      return new Response(rewrittenContent, {
        status: 200,
        headers: {
          "Content-Type": "application/x-mpegURL",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        },
      });
    }

    // 2. Segment / Media file request (.ts, .m4s, .mp4, .vtt, etc.): issue 302 redirect to presigned GET URL
    const presignedUrl = await getPresignedPlaybackUrl(objectKey, 300); // 5 minutes validity

    return NextResponse.redirect(presignedUrl, {
      status: 302,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("[HLS Proxy Route Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process HLS stream" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
