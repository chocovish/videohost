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

    const objectKey = keyParts.join("/");

    // 1. Manifest requests (.m3u8 / .mpd): fetch from private bucket, rewrite if needed, return manifest
    if (objectKey.endsWith(".m3u8") || objectKey.endsWith(".mpd")) {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: objectKey,
      });

      let response;
      try {
        response = await s3.send(command);
      } catch (err: any) {
        if (err.name === "NoSuchKey" || err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
          return NextResponse.json({ error: "Manifest not found" }, { status: 404 });
        }
        throw err;
      }

      let content = await response.Body?.transformToString();
      if (!content) {
        return NextResponse.json({ error: "Empty manifest" }, { status: 500 });
      }

      // Base directory of the manifest key, e.g. "org1/vid1/hls/"
      const lastSlashIndex = objectKey.lastIndexOf("/");
      const dirPath = lastSlashIndex !== -1 ? objectKey.substring(0, lastSlashIndex + 1) : "";

      if (objectKey.endsWith(".m3u8")) {
        // HLS playlists need their URIs rewritten to route through this proxy
        const lines = content.split(/\r?\n/);
        content = lines
          .map((line) => {
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
          })
          .join("\n");
      }
      // .mpd manifests reference segments with relative URLs, which the
      // browser resolves against this proxied URL — no rewriting needed.

      return new Response(content, {
        status: 200,
        headers: {
          "Content-Type": objectKey.endsWith(".mpd") ? "application/dash+xml" : "application/vnd.apple.mpegurl",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Expose-Headers": "Content-Range, Accept-Ranges, Content-Length, ETag",
        },
      });
    }

    // 2. Segment / Media file request (.ts, .m4s, .mp4, .vtt, etc.): issue 307 redirect to presigned GET URL
    const presignedUrl = await getPresignedPlaybackUrl(objectKey, 300); // 5 minutes validity

    return NextResponse.redirect(presignedUrl, {
      status: 307,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Expose-Headers": "Content-Range, Accept-Ranges, Content-Length, ETag",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("[Streaming Proxy Route Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process stream" },
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
      "Access-Control-Expose-Headers": "*",
    },
  });
}
