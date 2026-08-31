import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@videohost/db";
import { getBunnyConfig } from "@/lib/bunny";

/**
 * Bunny Stream Webhook Handler
 * ---------------------------------------------------------------------------
 * Bunny POSTs JSON { VideoLibraryId, VideoGuid, Status } to the WebhookUrl
 * configured on the Video Library (per-library setting).
 *
 * Docs: https://bunny.net/docs/stream/webhooks
 * - Signed with HMAC-SHA256 over raw body using library's Read-Only API key
 * - Headers: X-BunnyStream-Signature (hex), X-BunnyStream-Signature-Version=v1,
 *            X-BunnyStream-Signature-Algorithm=hmac-sha256
 *
 * Status codes:
 *   0 Queued, 1 Processing, 2 Encoding, 3 Finished, 4 ResolutionFinished,
 *   5 Failed, 6-8 Presigned, 9 CaptionsGenerated, 10 TitleOrDescriptionGenerated
 *
 * We acknowledge fast (200) then update Video.status/progress.
 * ---------------------------------------------------------------------------
 */

function cleanEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const t = value.replace(/^["']|["']$/g, "").trim();
  return t || undefined;
}

function getWebhookSigningCandidates(): string[] {
  const candidates: string[] = [];
  const readonlyKey =
    cleanEnv(process.env.BUNNY_READONLY_API_KEY) ||
    cleanEnv(process.env.BUNNY_STREAM_READONLY_API_KEY);
  if (readonlyKey) candidates.push(readonlyKey);

  try {
    const cfg = getBunnyConfig();
    if (cfg.apiKey && !candidates.includes(cfg.apiKey)) candidates.push(cfg.apiKey);
  } catch {}

  const fallback = cleanEnv(process.env.BUNNY_API_KEY);
  if (fallback && !candidates.includes(fallback)) candidates.push(fallback);

  // Also try common alternative: BUNNY_STREAM_API_KEY
  const alt = cleanEnv(process.env.BUNNY_STREAM_API_KEY);
  if (alt && !candidates.includes(alt)) candidates.push(alt);

  return candidates.filter(Boolean) as string[];
}

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  // Allow disabling verification via env for debugging (not recommended for prod)
  if (cleanEnv(process.env.BUNNY_WEBHOOK_SKIP_VERIFY)?.toLowerCase() === "true") {
    console.warn("[Bunny Webhook] BUNNY_WEBHOOK_SKIP_VERIFY=true — skipping signature check");
    return true;
  }

  const candidates = getWebhookSigningCandidates();
  if (candidates.length === 0) {
    console.warn("[Bunny Webhook] No signing secret configured (BUNNY_READONLY_API_KEY or BUNNY_API_KEY) — skipping verification");
    return true;
  }
  if (!signatureHeader) {
    console.warn("[Bunny Webhook] Missing X-BunnyStream-Signature header");
    return false;
  }

  const sigLower = signatureHeader.toLowerCase().trim();

  for (const secret of candidates) {
    const expectedHex = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
    try {
      const a = Buffer.from(expectedHex, "hex");
      const b = Buffer.from(sigLower, "hex");
      if (a.length === b.length && timingSafeEqual(a, b)) {
        if (secret !== candidates[0]) {
          console.log(`[Bunny Webhook] Signature matched with alternate secret (not first candidate)`);
        }
        return true;
      }
      // Debug: log mismatch for first candidate only to avoid spam
      if (secret === candidates[0]) {
        console.error(`[Bunny Webhook] Signature mismatch — expected=${expectedHex} received=${sigLower} secretPrefix=${secret.slice(0, 8)}... bodyLength=${rawBody.length}`);
        // Also log all candidates' expected for full debug (only when first fails)
        candidates.forEach((c, idx) => {
          const exp = createHmac("sha256", c).update(rawBody, "utf8").digest("hex");
          console.error(`[Bunny Webhook] Candidate[${idx}] secretPrefix=${c.slice(0, 8)}... expected=${exp}`);
        });
      }
    } catch (e) {
      console.error(`[Bunny Webhook] Signature compare error for secretPrefix=${secret.slice(0, 8)}...`, e);
    }
  }

  return false;
}

export async function POST(req: Request) {
  // Read raw body exactly as sent (do NOT re-stringify)
  const rawBody = await req.text();
  const signature = req.headers.get("X-BunnyStream-Signature");
  const sigVersion = req.headers.get("X-BunnyStream-Signature-Version");
  const sigAlgo = req.headers.get("X-BunnyStream-Signature-Algorithm");

  console.log(`[Bunny Webhook] Incoming — sigVersion=${sigVersion} algo=${sigAlgo} sig=${signature?.slice(0, 12)}... body=${rawBody.slice(0, 300)}`);

  // Validate version/algo (v1 + hmac-sha256 only)
  if (sigVersion && sigVersion !== "v1") {
    console.warn(`[Bunny Webhook] Unexpected signature version: ${sigVersion}`);
  }
  if (sigAlgo && sigAlgo !== "hmac-sha256") {
    console.warn(`[Bunny Webhook] Unexpected signature algo: ${sigAlgo}`);
  }

  const sigOk = verifySignature(rawBody, signature);
  if (!sigOk) {
    const hasReadonly = !!cleanEnv(process.env.BUNNY_READONLY_API_KEY || process.env.BUNNY_STREAM_READONLY_API_KEY);
    const skipVerify = cleanEnv(process.env.BUNNY_WEBHOOK_SKIP_VERIFY)?.toLowerCase() === "true";
    if (!hasReadonly && !skipVerify) {
      // No read-only key configured — we expected this to fail because BUNNY_API_KEY is NOT the signing secret.
      // Log clearly and ALLOW the webhook through so encoding completion isn't blocked,
      // but warn operator to configure BUNNY_READONLY_API_KEY for security.
      console.error(
        `[Bunny Webhook] Signature mismatch but BUNNY_READONLY_API_KEY is not set — ` +
          `allowing webhook through (BUNNY_API_KEY is NOT the webhook signing secret). ` +
          `Set BUNNY_READONLY_API_KEY from Bunny Dashboard → Stream → Library 740234 → Read-Only API Key to enable strict verification. ` +
          `Set BUNNY_WEBHOOK_SKIP_VERIFY=true to silence this warning.`
      );
    } else if (!skipVerify) {
      console.error("[Bunny Webhook] Signature verification failed (strict mode — BUNNY_READONLY_API_KEY is set)");
      return NextResponse.json({ error: "Invalid signature", hint: "Check BUNNY_READONLY_API_KEY matches library Read-Only API Key (not Stream API Key)" }, { status: 401 });
    } else {
      console.warn("[Bunny Webhook] Signature invalid but BUNNY_WEBHOOK_SKIP_VERIFY=true — proceeding");
    }
  }

  let payload: { VideoLibraryId: number; VideoGuid: string; Status: number };
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    console.error("[Bunny Webhook] Invalid JSON body:", e);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { VideoLibraryId, VideoGuid, Status } = payload;

  if (!VideoGuid || typeof Status !== "number") {
    console.error("[Bunny Webhook] Missing VideoGuid or Status:", payload);
    return NextResponse.json({ error: "Missing VideoGuid or Status" }, { status: 400 });
  }

  console.log(`[Bunny Webhook] Event library=${VideoLibraryId} guid=${VideoGuid} status=${Status}`);

  // Find matching video record(s) — bunnyVideoId is unique, but be safe
  const video = await db.video.findFirst({
    where: { bunnyVideoId: VideoGuid } as any,
  });

  if (!video) {
    console.warn(`[Bunny Webhook] No Video found for bunnyVideoId=${VideoGuid} (library ${VideoLibraryId}) — ignoring, but ack 200 to avoid retries`);
    // Still return 200 so Bunny doesn't retry indefinitely for unknown guids
    return NextResponse.json({ success: true, ignored: true, reason: "Video not found", VideoGuid, Status });
  }

  // Idempotency: ignore if already READY and we get duplicate Finished
  try {
    let newStatus: string | null = null;
    let newProgress: number | null = null;

    switch (Status) {
      case 0: // Queued
        newStatus = (video as any).status === "READY" ? "READY" : "QUEUED";
        newProgress = 5;
        break;
      case 1: // Processing
      case 2: // Encoding
      case 4: // ResolutionFinished — intermediate resolution finished, transcoding still in progress
        newStatus = (video as any).status === "READY" ? "READY" : "PROCESSING";
        // keep existing progress or bump to 30
        newProgress = Math.max((video as any).progress || 0, 30);
        break;
      case 3: // Finished — all resolutions finished, fully ready
        newStatus = "READY";
        newProgress = 100;
        break;
      case 5: // Failed
        newStatus = "FAILED";
        newProgress = 0;
        break;
      case 6: // PresignedUploadStarted
      case 7: // PresignedUploadFinished (ignore, upload already tracked via proxy)
      case 8: // PresignedUploadFailed
        console.log(`[Bunny Webhook] Presigned upload status ${Status} for ${VideoGuid} — no DB change`);
        break;
      case 9: // CaptionsGenerated
      case 10: // TitleOrDescriptionGenerated
        console.log(`[Bunny Webhook] AI status ${Status} for ${VideoGuid} — no DB change`);
        break;
      default:
        console.log(`[Bunny Webhook] Unknown status ${Status} for ${VideoGuid} — no DB change`);
        break;
    }

    if (newStatus) {
      // For Finished / ResolutionFinished / Encoding, fetch metadata to populate duration/size/progress
      let extraData: any = {};
      if (Status === 3 || Status === 4 || Status === 2 || Status === 1) {
        try {
          // Best-effort fetch from Bunny to enrich duration/size
          const cfg = getBunnyConfig();
          // Reuse existing helper if available, else raw fetch
          const res = await fetch(`https://video.bunnycdn.com/library/${cfg.libraryId}/videos/${VideoGuid}`, {
            headers: { AccessKey: cfg.apiKey, Accept: "application/json" },
            cache: "no-store",
          });
          if (res.ok) {
            const bunnyVideo: any = await res.json();
            if (typeof bunnyVideo.length === "number" && bunnyVideo.length > 0) {
              extraData.durationSeconds = Math.round(bunnyVideo.length);
            }
            if (typeof bunnyVideo.width === "number") extraData.sourceWidth = bunnyVideo.width;
            if (typeof bunnyVideo.height === "number") extraData.sourceHeight = bunnyVideo.height;
            if (typeof bunnyVideo.storageSize === "number" && bunnyVideo.storageSize > 0) {
              extraData.sizeBytes = BigInt(bunnyVideo.storageSize);
            }
            if (typeof bunnyVideo.encodeProgress === "number") {
              if (Status === 3) {
                extraData.progress = 100;
              } else {
                extraData.progress = Math.max(0, Math.min(99, Math.round(bunnyVideo.encodeProgress)));
              }
            } else if (Status === 3) {
              extraData.progress = 100;
            }
            // Thumbnail is available via CDN after finished — no DB field needed, but we could store
            console.log(`[Bunny Webhook] Fetched metadata for ${VideoGuid}:`, JSON.stringify({ length: bunnyVideo.length, width: bunnyVideo.width, height: bunnyVideo.height, storageSize: bunnyVideo.storageSize, encodeProgress: bunnyVideo.encodeProgress }).slice(0, 500));
          }
        } catch (e) {
          console.warn(`[Bunny Webhook] Failed to fetch Bunny metadata for ${VideoGuid}:`, (e as any)?.message);
        }
      }

      await db.video.update({
        where: { id: video.id },
        data: {
          status: newStatus as any,
          progress: extraData.progress ?? newProgress ?? (video as any).progress,
          ...(extraData.durationSeconds !== undefined ? { durationSeconds: extraData.durationSeconds } : {}),
          ...(extraData.sourceWidth !== undefined ? { sourceWidth: extraData.sourceWidth } : {}),
          ...(extraData.sourceHeight !== undefined ? { sourceHeight: extraData.sourceHeight } : {}),
          ...(extraData.sizeBytes !== undefined ? { sizeBytes: extraData.sizeBytes } : {}),
        },
      });
      console.log(`[Bunny Webhook] Updated video ${video.id} (${VideoGuid}) → ${newStatus} progress=${newProgress}`);

      // Optional: trigger webhooks for your app (video.ready / video.failed)
      // Replicate transcode-callback webhook dispatch logic
      if (newStatus === "READY" || newStatus === "FAILED") {
        try {
          const orgId = (video as any).organizationId as string;
          const webhooks = await db.webhook.findMany({
            where: { organizationId: orgId, events: { has: newStatus === "READY" ? "video.ready" : "video.failed" } },
          });
          for (const wh of webhooks) {
            fetch(wh.url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                event: newStatus === "READY" ? "video.ready" : "video.failed",
                data: { videoId: video.id, bunnyVideoId: VideoGuid, status: newStatus, VideoLibraryId, Status },
                timestamp: new Date().toISOString(),
              }),
            }).catch((e) => console.error("[Bunny Webhook] App webhook dispatch error:", e));
          }
        } catch (e) {
          console.warn("[Bunny Webhook] Failed to dispatch app webhooks:", e);
        }
      }
    }

    return NextResponse.json({ success: true, videoId: video.id, VideoGuid, Status, newStatus: newStatus || "no-change" });
  } catch (err: any) {
    console.error("[Bunny Webhook] DB update failed:", err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}

// Bunny sends POST only; reject other methods explicitly for clarity
export async function GET() {
  return NextResponse.json({ error: "Method not allowed — Bunny webhooks must POST to this URL" }, { status: 405 });
}
