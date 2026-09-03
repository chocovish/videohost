import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";
import {
  SUBTITLE_MAX_BYTES,
  getSubtitlePlaybackUrl,
  getSubtitleS3Key,
  listVideoSubtitles,
  normalizeSubtitleLabel,
  normalizeSubtitleLanguage,
  uploadSubtitleBuffer,
  validateVttContent,
} from "@/lib/subtitles";

const MAX_SUBTITLES_PER_VIDEO = 20;

async function getOwnedVideo(videoId: string, orgId: string) {
  return db.video.findFirst({ where: { id: videoId, organizationId: orgId } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authCtx = await authenticateRequest(_req);
  if (!authCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const video = await getOwnedVideo(id, authCtx.orgId);
  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  const subtitles = await listVideoSubtitles(id);

  const data = await Promise.all(
    subtitles.map(async (s) => ({
      id: s.id,
      label: s.label,
      language: s.language,
      isDefault: s.isDefault,
      sizeBytes: s.sizeBytes,
      createdAt: s.createdAt,
      src: await getSubtitlePlaybackUrl(s.storageKey),
    }))
  );

  return NextResponse.json({ subtitles: data });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authCtx = await authenticateRequest(req);
  if (!authCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const video = await getOwnedVideo(id, authCtx.orgId);
  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  const existingCount = await db.videoSubtitle.count({ where: { videoId: id } });
  if (existingCount >= MAX_SUBTITLES_PER_VIDEO) {
    return NextResponse.json(
      { error: `Subtitle limit reached (max ${MAX_SUBTITLES_PER_VIDEO} per video). Delete one to add another.` },
      { status: 400 }
    );
  }

  let file: File | null = null;
  let label: string | null = null;
  let language: string | null = null;
  let isDefault = false;

  const contentType = req.headers.get("content-type") || "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const f = form.get("file");
      if (f instanceof File) file = f;
      else if (typeof f === "string") {
        return NextResponse.json({ error: "Invalid file upload." }, { status: 400 });
      }
      const l = form.get("label");
      const lang = form.get("language");
      const def = form.get("isDefault");
      if (typeof l === "string") label = l;
      if (typeof lang === "string") language = lang;
      isDefault = def === "true" || def === "1" || def === "on";
    } else {
      return NextResponse.json(
        { error: "Send subtitle as multipart/form-data with a .vtt file field named 'file'." },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json({ error: "Failed to parse upload." }, { status: 400 });
  }

  if (!file) return NextResponse.json({ error: "Subtitle file is required (WebVTT .vtt)." }, { status: 400 });

  const fileName = (file.name || "subtitles.vtt").toLowerCase();
  if (!fileName.endsWith(".vtt")) {
    return NextResponse.json({ error: "Only WebVTT (.vtt) subtitle files are supported." }, { status: 400 });
  }
  if (file.size <= 0) return NextResponse.json({ error: "Subtitle file is empty." }, { status: 400 });
  if (file.size > SUBTITLE_MAX_BYTES) {
    return NextResponse.json({ error: "Subtitle file too large (max 5MB)." }, { status: 400 });
  }

  let text = "";
  try {
    text = await file.text();
  } catch {
    return NextResponse.json({ error: "Could not read subtitle file." }, { status: 400 });
  }
  const validation = validateVttContent(text);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  const normalizedLanguage = normalizeSubtitleLanguage(language || fileName.split(".").slice(-2, -1)[0]);
  const normalizedLabel = normalizeSubtitleLabel(label, normalizedLanguage);

  // Prevent exact duplicates (same language + label)
  const duplicate = await db.videoSubtitle.findUnique({
    where: { videoId_language_label: { videoId: id, language: normalizedLanguage, label: normalizedLabel } },
  });
  if (duplicate) {
    return NextResponse.json(
      { error: `A subtitle track "${normalizedLabel} (${normalizedLanguage})" already exists.` },
      { status: 409 }
    );
  }

  // First track uploaded becomes default automatically
  if (existingCount === 0) isDefault = true;

  const created = await db.videoSubtitle.create({
    data: {
      videoId: id,
      label: normalizedLabel,
      language: normalizedLanguage,
      storageKey: "pending",
      sizeBytes: file.size,
      isDefault,
    },
  });

  const storageKey = getSubtitleS3Key(video.organizationId, id, created.id, normalizedLanguage);
  try {
    await uploadSubtitleBuffer(storageKey, Buffer.from(text, "utf-8"));
  } catch (e) {
    await db.videoSubtitle.delete({ where: { id: created.id } }).catch(() => {});
    console.error("[Subtitles Upload Error]", e);
    return NextResponse.json({ error: "Failed to store subtitle file." }, { status: 500 });
  }

  if (isDefault) {
    await db.videoSubtitle.updateMany({
      where: { videoId: id, id: { not: created.id } },
      data: { isDefault: false },
    });
  }

  const updated = await db.videoSubtitle.update({
    where: { id: created.id },
    data: { storageKey },
  });

  return NextResponse.json(
    {
      subtitle: {
        id: updated.id,
        label: updated.label,
        language: updated.language,
        isDefault: updated.isDefault,
        sizeBytes: updated.sizeBytes,
        createdAt: updated.createdAt,
        src: await getSubtitlePlaybackUrl(updated.storageKey),
      },
    },
    { status: 201 }
  );
}
