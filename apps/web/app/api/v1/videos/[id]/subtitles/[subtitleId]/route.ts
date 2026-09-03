import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";
import { deleteSubtitleFile, normalizeSubtitleLabel, normalizeSubtitleLanguage } from "@/lib/subtitles";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; subtitleId: string }> }
) {
  const { id, subtitleId } = await params;
  const authCtx = await authenticateRequest(req);
  if (!authCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const video = await db.video.findFirst({ where: { id, organizationId: authCtx.orgId } });
  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  const subtitle = await db.videoSubtitle.findFirst({ where: { id: subtitleId, videoId: id } });
  if (!subtitle) return NextResponse.json({ error: "Subtitle not found" }, { status: 404 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const dataToUpdate: { label?: string; language?: string; isDefault?: boolean } = {};
  if (body.label !== undefined) {
    const next = normalizeSubtitleLabel(String(body.label || ""), body.language ?? subtitle.language);
    if (!next) return NextResponse.json({ error: "Label cannot be empty." }, { status: 400 });
    dataToUpdate.label = next;
  }
  if (body.language !== undefined) {
    dataToUpdate.language = normalizeSubtitleLanguage(String(body.language || ""));
  }
  if (body.isDefault !== undefined) {
    dataToUpdate.isDefault = Boolean(body.isDefault);
  }

  if (Object.keys(dataToUpdate).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  // Guard duplicate (language + label) on rename
  const nextLanguage = dataToUpdate.language ?? subtitle.language;
  const nextLabel = dataToUpdate.label ?? subtitle.label;
  const clash = await db.videoSubtitle.findFirst({
    where: { videoId: id, language: nextLanguage, label: nextLabel, id: { not: subtitleId } },
  });
  if (clash) {
    return NextResponse.json(
      { error: `Another subtitle track "${nextLabel} (${nextLanguage})" already exists.` },
      { status: 409 }
    );
  }

  if (dataToUpdate.isDefault === true) {
    await db.videoSubtitle.updateMany({
      where: { videoId: id, id: { not: subtitleId } },
      data: { isDefault: false },
    });
  }

  const updated = await db.videoSubtitle.update({ where: { id: subtitleId }, data: dataToUpdate });
  return NextResponse.json({
    subtitle: {
      id: updated.id,
      label: updated.label,
      language: updated.language,
      isDefault: updated.isDefault,
      sizeBytes: updated.sizeBytes,
      createdAt: updated.createdAt,
    },
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; subtitleId: string }> }
) {
  const { id, subtitleId } = await params;
  const authCtx = await authenticateRequest(req);
  if (!authCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const video = await db.video.findFirst({ where: { id, organizationId: authCtx.orgId } });
  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  const subtitle = await db.videoSubtitle.findFirst({ where: { id: subtitleId, videoId: id } });
  if (!subtitle) return NextResponse.json({ error: "Subtitle not found" }, { status: 404 });

  await deleteSubtitleFile(subtitle.storageKey).catch((e) =>
    console.warn("[Subtitles Delete] S3 cleanup failed:", e)
  );
  await db.videoSubtitle.delete({ where: { id: subtitleId } });

  // If the deleted track was default, promote the oldest remaining track
  const remaining = await db.videoSubtitle.findFirst({
    where: { videoId: id },
    orderBy: { createdAt: "asc" },
  });
  if (subtitle.isDefault && remaining && !remaining.isDefault) {
    await db.videoSubtitle.update({ where: { id: remaining.id }, data: { isDefault: true } });
  }

  return NextResponse.json({ success: true });
}
