"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SubtitleItem } from "@/components/VideoSubtitlesManager";

type RawBlock = { kind: "raw"; key: string; content: string };
type CueBlock = {
  kind: "cue";
  key: string;
  identifier: string;
  start: string;
  end: string;
  settings: string;
  text: string;
};
type EditorBlock = RawBlock | CueBlock;

function parseTimestamp(value: string): number | null {
  const timestamp = value.trim().replace(",", ".");
  const full = timestamp.match(/^(\d+):([0-5]\d):([0-5]\d)(?:\.(\d{1,3}))?$/);
  const short = timestamp.match(/^(\d+):([0-5]\d)(?:\.(\d{1,3}))?$/);
  if (full) {
    const fraction = Number((full[4] || "").padEnd(3, "0"));
    return (Number(full[1]) * 3600 + Number(full[2]) * 60 + Number(full[3])) * 1000 + fraction;
  }
  if (short) {
    const fraction = Number((short[3] || "").padEnd(3, "0"));
    return (Number(short[1]) * 60 + Number(short[2])) * 1000 + fraction;
  }
  return null;
}

function formatTimestamp(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const fraction = milliseconds % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(fraction).padStart(3, "0")}`;
}

function parseVtt(content: string): EditorBlock[] {
  const normalized = content.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trimEnd();
  return normalized
    .split(/\n[\t ]*\n/)
    .filter((block) => block.trim())
    .map((block, index) => {
      const lines = block.split("\n");
      const timingIndex = lines.findIndex((line) => line.includes("-->"));
      const timing = timingIndex >= 0
        ? lines[timingIndex].match(/^\s*(\S+)\s+-->\s+(\S+)(.*)$/)
        : null;
      if (!timing || parseTimestamp(timing[1]) === null || parseTimestamp(timing[2]) === null) {
        return { kind: "raw", key: `raw-${index}`, content: block };
      }
      return {
        kind: "cue",
        key: `cue-${index}`,
        identifier: lines.slice(0, timingIndex).join("\n"),
        start: timing[1],
        end: timing[2],
        settings: timing[3].trim(),
        text: lines.slice(timingIndex + 1).join("\n"),
      };
    });
}

function serializeVtt(blocks: EditorBlock[]): string {
  const serialized = blocks.map((block) => {
    if (block.kind === "raw") return block.content;
    const timing = `${block.start} --> ${block.end}${block.settings ? ` ${block.settings}` : ""}`;
    return [...(block.identifier ? [block.identifier] : []), timing, block.text].join("\n");
  });
  if (!serialized.some((block) => block.trimStart().toUpperCase().startsWith("WEBVTT"))) {
    serialized.unshift("WEBVTT");
  }
  return `${serialized.join("\n\n").trimEnd()}\n`;
}

export default function SubtitleEditorDialog({
  videoId,
  subtitle,
  open,
  onOpenChange,
  onSaved,
}: {
  videoId: string;
  subtitle: SubtitleItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<unknown> | unknown;
}) {
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [initialContent, setInitialContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCueKey, setNewCueKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !subtitle) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      setBlocks([]);
      setInitialContent("");
      setNewCueKey(null);
      try {
        const response = await fetch(`/api/v1/videos/${videoId}/subtitles/${subtitle.id}`, { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || "Could not load this subtitle track.");
        if (cancelled) return;
        const parsed = parseVtt(String(data?.content || ""));
        setBlocks(parsed);
        setInitialContent(serializeVtt(parsed));
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Could not load this subtitle track.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [open, subtitle?.id, videoId]);

  const draft = useMemo(() => serializeVtt(blocks), [blocks]);
  const cueCount = blocks.filter((block): block is CueBlock => block.kind === "cue").length;
  const cueNumbers = useMemo(
    () => new Map<string, number>(blocks
      .filter((block): block is CueBlock => block.kind === "cue")
      .map((cue, index) => [cue.key, index + 1] as const)),
    [blocks]
  );
  const hasChanges = draft !== initialContent;

  const updateCue = (key: string, updates: Partial<CueBlock>) => {
    setBlocks((current) => current.map((block) =>
      block.kind === "cue" && block.key === key ? { ...block, ...updates } : block
    ));
  };

  const addCueAt = (cueIndex: number) => {
    const cues = blocks.filter((block): block is CueBlock => block.kind === "cue");
    const previousEnd = cueIndex > 0 ? parseTimestamp(cues[cueIndex - 1].end) ?? 0 : 0;
    const nextStart = cueIndex < cues.length ? parseTimestamp(cues[cueIndex].start) : null;
    let start = previousEnd;
    let end = start + 2000;
    if (nextStart !== null) {
      const gap = nextStart - start;
      if (gap > 0 && gap < 2000) end = nextStart;
      else if (gap <= 0) {
        // There is no free interval here; anchor at the next cue and let the
        // user adjust the new caption's timing without moving existing cues.
        start = nextStart;
        end = start + 2000;
      }
    }
    const key = `new-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newCue: CueBlock = {
      kind: "cue",
      key,
      identifier: "",
      start: formatTimestamp(start),
      end: formatTimestamp(end),
      settings: "",
      text: "",
    };
    const nextCueKey = cues[cueIndex]?.key;
    const insertionIndex = nextCueKey ? blocks.findIndex((block) => block.key === nextCueKey) : blocks.length;
    setBlocks((current) => [
      ...current.slice(0, insertionIndex),
      newCue,
      ...current.slice(insertionIndex),
    ]);
    setNewCueKey(key);
  };

  const handleSave = async () => {
    if (!subtitle || saving) return;
    setError(null);
    for (const [index, block] of blocks.entries()) {
      if (block.kind !== "cue") continue;
      const start = parseTimestamp(block.start);
      const end = parseTimestamp(block.end);
      if (start === null || end === null) {
        setError(`Cue ${index + 1}: enter time as HH:MM:SS.mmm or MM:SS.mmm.`);
        return;
      }
      if (start >= end) {
        setError(`Cue ${index + 1}: the end time must be after the start time.`);
        return;
      }
      if (!block.text.trim()) {
        setError(`Cue ${index + 1}: add the subtitle text or remove the cue.`);
        return;
      }
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/v1/videos/${videoId}/subtitles/${subtitle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Could not save subtitle changes.");
      setInitialContent(draft);
      await onSaved();
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || "Could not save subtitle changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-4 pr-12 sm:px-6">
          <DialogTitle className="flex items-center gap-2">
            <span>Edit subtitles</span>
            {subtitle && <span className="truncate text-muted-foreground">· {subtitle.label}</span>}
          </DialogTitle>
          <DialogDescription>
            Edit each caption and its timing. Use the insert controls to add a caption before or between cards; suggested times follow nearby captions.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div role="alert" className="mx-5 mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive sm:mx-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading subtitle cues…
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {cueCount} caption{cueCount === 1 ? "" : "s"} · Save changes when you&apos;re ready.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => addCueAt(cueCount)} disabled={Boolean(error)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> {cueCount === 0 ? "Add first caption" : "Add at end"}
              </Button>
            </div>

            {cueCount === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-5 py-10 text-center">
                <p className="text-sm font-medium">No caption cues found</p>
                <p className="mt-1 text-xs text-muted-foreground">Add a caption to start building this subtitle track.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-center py-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addCueAt(0)}
                    disabled={Boolean(error)}
                    className="h-7 gap-1.5 border border-dashed border-border/70 px-3 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add before first caption
                  </Button>
                </div>
                {blocks.filter((block): block is CueBlock => block.kind === "cue").map((block, cueIndex, cueList) => (
                  <div key={block.key} className="space-y-2">
                  <section className="rounded-xl border border-border bg-card p-3.5 sm:p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-xs font-semibold text-muted-foreground">Caption {cueNumbers.get(block.key)}</h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove caption"
                        title="Remove caption"
                        onClick={() => setBlocks((current) => current.filter((item) => item.key !== block.key))}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
                      <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                        Start time
                        <Input
                          value={block.start}
                          onChange={(event) => updateCue(block.key, { start: event.target.value })}
                          placeholder="00:00:01.000"
                          aria-label={`Caption ${cueNumbers.get(block.key)} start time`}
                          className="h-9 font-mono text-xs"
                        />
                      </label>
                      <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                        End time
                        <Input
                          value={block.end}
                          onChange={(event) => updateCue(block.key, { end: event.target.value })}
                          placeholder="00:00:03.000"
                          aria-label={`Caption ${cueNumbers.get(block.key)} end time`}
                          className="h-9 font-mono text-xs"
                        />
                      </label>
                    </div>
                    {newCueKey === block.key && (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Inserted at this position. Check the suggested times against nearby captions.
                      </p>
                    )}
                    <label className="mt-3 block space-y-1.5 text-xs font-medium text-muted-foreground">
                      Caption text
                      <Textarea
                        value={block.text}
                        onChange={(event) => updateCue(block.key, { text: event.target.value })}
                        placeholder="Type what viewers should see…"
                        aria-label={`Caption ${cueNumbers.get(block.key)} text`}
                        autoFocus={newCueKey === block.key}
                        rows={2}
                        className="min-h-16 resize-y text-sm"
                      />
                    </label>
                  </section>
                  {cueIndex < cueList.length - 1 && (
                    <div className="flex items-center gap-2 px-2 py-0.5">
                      <div className="h-px flex-1 bg-border/70" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addCueAt(cueIndex + 1)}
                        disabled={Boolean(error)}
                        className="h-7 gap-1.5 px-2.5 text-xs text-muted-foreground hover:bg-primary/5 hover:text-primary"
                        aria-label={`Insert caption between captions ${cueIndex + 1} and ${cueIndex + 2}`}
                      >
                        <Plus className="h-3.5 w-3.5" /> Insert between captions
                      </Button>
                      <div className="h-px flex-1 bg-border/70" />
                    </div>
                  )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="border-t border-border px-5 py-3 sm:px-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={loading || saving || Boolean(error) || !subtitle || !hasChanges} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
