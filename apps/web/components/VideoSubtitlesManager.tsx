"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Captions, Check, Loader2, Pencil, RefreshCw, Sparkles, Star, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import SubtitleEditorDialog from "@/components/SubtitleEditorDialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SubtitleItem {
  id: string;
  label: string;
  language: string;
  src: string;
  isDefault: boolean;
  sizeBytes?: number;
  createdAt?: string;
}

interface PendingFile {
  key: string;
  file: File;
  label: string;
  /** ISO code from the list, "" = Auto, "__custom" = use customLanguage. */
  language: string;
  customLanguage: string;
}

const CUSTOM_LANGUAGE_VALUE = "__custom";
const AUTO_LANGUAGE_VALUE = "auto";

const TRANSCRIBE_POLL_INTERVAL_MS = 8000;
const TRANSCRIBE_POLL_MAX_ATTEMPTS = 38; // ~5 min per round
const TRANSCRIBE_POLL_MAX_ROUNDS = 3; // ~15 min total before parking on Refresh

/** Full language picker list (ISO 639-1), sorted alphabetically by name. */
const SUBTITLE_LANGUAGES = [
  { code: "af", label: "Afrikaans" },
  { code: "sq", label: "Albanian" },
  { code: "am", label: "Amharic" },
  { code: "ar", label: "Arabic" },
  { code: "hy", label: "Armenian" },
  { code: "az", label: "Azerbaijani" },
  { code: "eu", label: "Basque" },
  { code: "be", label: "Belarusian" },
  { code: "bn", label: "Bengali" },
  { code: "bs", label: "Bosnian" },
  { code: "bg", label: "Bulgarian" },
  { code: "my", label: "Burmese" },
  { code: "ca", label: "Catalan" },
  { code: "zh", label: "Chinese" },
  { code: "hr", label: "Croatian" },
  { code: "cs", label: "Czech" },
  { code: "da", label: "Danish" },
  { code: "nl", label: "Dutch" },
  { code: "en", label: "English" },
  { code: "et", label: "Estonian" },
  { code: "tl", label: "Filipino" },
  { code: "fi", label: "Finnish" },
  { code: "fr", label: "French" },
  { code: "gl", label: "Galician" },
  { code: "ka", label: "Georgian" },
  { code: "de", label: "German" },
  { code: "el", label: "Greek" },
  { code: "gu", label: "Gujarati" },
  { code: "ha", label: "Hausa" },
  { code: "he", label: "Hebrew" },
  { code: "hi", label: "Hindi" },
  { code: "hu", label: "Hungarian" },
  { code: "is", label: "Icelandic" },
  { code: "id", label: "Indonesian" },
  { code: "it", label: "Italian" },
  { code: "ja", label: "Japanese" },
  { code: "jv", label: "Javanese" },
  { code: "kn", label: "Kannada" },
  { code: "kk", label: "Kazakh" },
  { code: "km", label: "Khmer" },
  { code: "ko", label: "Korean" },
  { code: "lo", label: "Lao" },
  { code: "lv", label: "Latvian" },
  { code: "lt", label: "Lithuanian" },
  { code: "mk", label: "Macedonian" },
  { code: "ms", label: "Malay" },
  { code: "ml", label: "Malayalam" },
  { code: "mt", label: "Maltese" },
  { code: "mr", label: "Marathi" },
  { code: "mn", label: "Mongolian" },
  { code: "ne", label: "Nepali" },
  { code: "no", label: "Norwegian" },
  { code: "fa", label: "Persian" },
  { code: "pl", label: "Polish" },
  { code: "pt", label: "Portuguese" },
  { code: "pa", label: "Punjabi" },
  { code: "ro", label: "Romanian" },
  { code: "ru", label: "Russian" },
  { code: "sr", label: "Serbian" },
  { code: "si", label: "Sinhala" },
  { code: "sk", label: "Slovak" },
  { code: "sl", label: "Slovenian" },
  { code: "so", label: "Somali" },
  { code: "es", label: "Spanish" },
  { code: "sw", label: "Swahili" },
  { code: "sv", label: "Swedish" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "th", label: "Thai" },
  { code: "tr", label: "Turkish" },
  { code: "uk", label: "Ukrainian" },
  { code: "ur", label: "Urdu" },
  { code: "uz", label: "Uzbek" },
  { code: "vi", label: "Vietnamese" },
  { code: "cy", label: "Welsh" },
  { code: "yo", label: "Yoruba" },
  { code: "zu", label: "Zulu" },
];

function isKnownLanguageCode(code: string): boolean {
  return SUBTITLE_LANGUAGES.some((l) => l.code === code.toLowerCase());
}

function languageLabel(code: string): string {
  return SUBTITLE_LANGUAGES.find((l) => l.code === code.toLowerCase())?.label || code.toUpperCase();
}

function guessFromFileName(name: string): { label: string; language: string } {
  const base = name.replace(/\.vtt$/i, "").trim();
  // "English.en" / "English-en" / "en" patterns
  const parts = base.split(/[._-]+/).filter(Boolean);
  const last = (parts[parts.length - 1] || "").toLowerCase();
  const looksLikeLang = /^[a-z]{2,3}(-[a-z]{2,4})?$/i.test(last) && last.length <= 8;
  if (looksLikeLang && parts.length > 1) {
    return {
      language: last.toLowerCase(),
      label: parts.slice(0, -1).join(" ") || last.toUpperCase(),
    };
  }
  if (looksLikeLang && parts.length === 1) {
    const code = last.toLowerCase();
    return { language: code, label: languageLabel(code) };
  }
  return { language: "en", label: base.slice(0, 60) || "Subtitles" };
}

export default function VideoSubtitlesManager({
  videoId,
  isBunnyEmbed = false,
  onChange,
}: {
  videoId: string;
  isBunnyEmbed?: boolean;
  onChange?: (subtitles: SubtitleItem[]) => void;
}) {
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [editingSubtitle, setEditingSubtitle] = useState<SubtitleItem | null>(null);
  const [transcribeLang, setTranscribeLang] = useState("en");
  const [transcribing, setTranscribing] = useState(false);
  const [checkingTranscribeStatus, setCheckingTranscribeStatus] = useState(true);
  const [transcribeMsg, setTranscribeMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const transcribeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSubtitles = useCallback(async (): Promise<SubtitleItem[]> => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/videos/${videoId}/subtitles`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load subtitles.");
      const list: SubtitleItem[] = data.subtitles || [];
      setSubtitles(list);
      onChange?.(list);
      return list;
    } catch (e: any) {
      setError(e?.message || "Failed to load subtitles.");
      return [];
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  const stopTranscriptionPolling = useCallback(() => {
    if (transcribeTimerRef.current) clearInterval(transcribeTimerRef.current);
    transcribeTimerRef.current = null;
  }, []);

  /** Server-side check: is an auto-generated transcription queued/running? */
  const checkTranscriptionPending = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`/api/v1/videos/${videoId}/subtitles/transcribe`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      return res.ok ? Boolean(data?.pending) : false;
    } catch {
      return false;
    }
  }, [videoId]);

  const startTranscriptionPolling = useCallback(
    (before: number) => {
      stopTranscriptionPolling();
      let attempts = 0;
      let rounds = 0;
      transcribeTimerRef.current = setInterval(async () => {
        attempts++;
        try {
          const pollRes = await fetch(`/api/v1/videos/${videoId}/subtitles`, { cache: "no-store" });
          const pollData = await pollRes.json().catch(() => ({}));
          const list: SubtitleItem[] = pollRes.ok ? pollData.subtitles || [] : [];
          if (pollRes.ok && list.length > before) {
            setSubtitles(list);
            onChange?.(list);
            setTranscribeMsg("Auto-generated subtitle is ready.");
            setTranscribing(false);
            stopTranscriptionPolling();
            return;
          }
        } catch {
          // Keep polling through transient errors.
        }
        if (attempts >= TRANSCRIBE_POLL_MAX_ATTEMPTS) {
          attempts = 0;
          rounds++;
          if (rounds >= TRANSCRIBE_POLL_MAX_ROUNDS) {
            stopTranscriptionPolling();
            // Stay disabled — Refresh re-checks the server status as escape hatch.
            setTranscribeMsg(
              "Transcription is taking longer than expected. It is still running — use Refresh to check back."
            );
            return;
          }
          const stillPending = await checkTranscriptionPending();
          if (!stillPending) {
            stopTranscriptionPolling();
            await fetchSubtitles();
            setTranscribing(false);
            setTranscribeMsg("Transcription finished. Use Refresh to check for the new subtitle.");
            return;
          }
          setTranscribeMsg("Transcription still in progress…");
        }
      }, TRANSCRIBE_POLL_INTERVAL_MS);
    },
    [videoId, fetchSubtitles, checkTranscriptionPending, stopTranscriptionPolling]
  );

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const list = await fetchSubtitles();
      if (cancelled) return;
      const pending = await checkTranscriptionPending();
      if (cancelled) return;
      setCheckingTranscribeStatus(false);
      if (pending) {
        // A transcription is already running (e.g. started before reload) —
        // block the trigger and resume watching for the new track.
        setTranscribing(true);
        setTranscribeMsg(
          "An auto-generated transcription is already in progress. The subtitle will appear here when ready."
        );
        startTranscriptionPolling(list.length);
      }
    };
    init();
    return () => {
      cancelled = true;
      stopTranscriptionPolling();
    };
  }, [fetchSubtitles, checkTranscriptionPending, startTranscriptionPolling, stopTranscriptionPolling]);

  useEffect(() => {
    return () => {
      if (transcribeTimerRef.current) clearInterval(transcribeTimerRef.current);
    };
  }, []);

  const handleRefresh = async () => {
    const list = await fetchSubtitles();
    const pending = await checkTranscriptionPending();
    if (pending) {
      if (!transcribing) {
        setTranscribing(true);
        setTranscribeMsg(
          "An auto-generated transcription is already in progress. The subtitle will appear here when ready."
        );
      }
      startTranscriptionPolling(list.length);
    } else if (transcribing) {
      // Server says nothing is running anymore — re-enable the trigger.
      stopTranscriptionPolling();
      setTranscribing(false);
    }
  };

  const handleAutoGenerate = async () => {
    if (transcribing || uploading || checkingTranscribeStatus) return;
    stopTranscriptionPolling();
    setTranscribing(true);
    setTranscribeMsg(null);
    setError(null);
    try {
      const res = await fetch(`/api/v1/videos/${videoId}/subtitles/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: transcribeLang }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409 && (data?.pending || /already running/i.test(data?.error || ""))) {
          // Another transcription is already being made — don't start a
          // second one; block the trigger and watch for its result instead.
          setTranscribeMsg(
            "An auto-generated transcription is already in progress. The subtitle will appear here when ready."
          );
          const list = await fetchSubtitles();
          startTranscriptionPolling(list.length);
          return;
        }
        throw new Error(data?.error || "Failed to start transcription.");
      }
      const before = subtitles.length;
      setTranscribeMsg(data?.message || "Transcription started. The auto-generated subtitle will appear here when ready.");
      startTranscriptionPolling(before);
    } catch (e: any) {
      setError(e?.message || "Failed to start transcription.");
      setTranscribing(false);
    }
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next: PendingFile[] = [];
    for (const file of Array.from(files)) {
      if (!file.name.toLowerCase().endsWith(".vtt")) continue;
      const guessed = guessFromFileName(file.name);
      // Language is optional – keep the guess when it matches the list,
      // otherwise stash it as a custom code so nothing is lost.
      const known = isKnownLanguageCode(guessed.language);
      next.push({
        key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        label: guessed.label,
        language: known ? guessed.language : CUSTOM_LANGUAGE_VALUE,
        customLanguage: known ? "" : guessed.language,
      });
    }
    if (next.length === 0) {
      setError("Only WebVTT (.vtt) files are supported.");
      return;
    }
    setError(null);
    setPending((prev) => [...prev, ...next]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUploadAll = async () => {
    if (pending.length === 0 || uploading) return;
    setUploading(true);
    setError(null);
    try {
      for (let i = 0; i < pending.length; i++) {
        const item = pending[i];
        setUploadProgress(`Uploading ${i + 1} of ${pending.length}: ${item.file.name}`);
        // Name alone is enough: blank label falls back to the file name,
        // blank/Auto language falls back to "en" server-side.
        const effectiveLabel =
          item.label.trim() || item.file.name.replace(/\.vtt$/i, "").slice(0, 80) || "Subtitles";
        const effectiveLanguage =
          item.language === CUSTOM_LANGUAGE_VALUE
            ? item.customLanguage.trim()
            : item.language === AUTO_LANGUAGE_VALUE
              ? ""
              : item.language;
        const form = new FormData();
        form.append("file", item.file);
        form.append("label", effectiveLabel);
        form.append("language", effectiveLanguage);
        // First-ever track becomes default server-side automatically.
        const res = await fetch(`/api/v1/videos/${videoId}/subtitles`, {
          method: "POST",
          body: form,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || `Failed to upload ${item.file.name}.`);
        }
      }
      setPending([]);
      await fetchSubtitles();
      setUploadProgress(null);
    } catch (e: any) {
      setError(e?.message || "Upload failed.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async (subtitleId: string) => {
    if (actionId) return;
    setActionId(subtitleId);
    setError(null);
    try {
      const res = await fetch(`/api/v1/videos/${videoId}/subtitles/${subtitleId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to delete subtitle.");
      await fetchSubtitles();
    } catch (e: any) {
      setError(e?.message || "Failed to delete subtitle.");
    } finally {
      setActionId(null);
    }
  };

  const handleSetDefault = async (subtitleId: string) => {
    if (actionId) return;
    setActionId(subtitleId);
    setError(null);
    try {
      const res = await fetch(`/api/v1/videos/${videoId}/subtitles/${subtitleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to set default.");
      await fetchSubtitles();
    } catch (e: any) {
      setError(e?.message || "Failed to set default.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-4">
      <SubtitleEditorDialog
        videoId={videoId}
        subtitle={editingSubtitle}
        open={Boolean(editingSubtitle)}
        onOpenChange={(open) => { if (!open) setEditingSubtitle(null); }}
        onSaved={fetchSubtitles}
      />
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Captions className="w-4 h-4 text-primary" />
            Subtitles ({subtitles.length})
          </h3>
          <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
            Upload multiple WebVTT (.vtt) tracks – e.g. English, Hindi. Just giving each
            file a name is enough; language is auto-detected from the file name and can
            be changed below if needed. Use Edit on a track to adjust its caption text and
            timing. Viewers switch tracks (or turn them off) from the CC menu in the player.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" />
          Add subtitle files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".vtt,text/vtt"
          multiple
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
      </div>

      <div className="border border-border rounded-xl p-3 space-y-2.5 bg-muted/20">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
          <p className="text-xs font-semibold text-foreground">Auto-generate from audio</p>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Transcribes the video&apos;s dedicated audio rendition with AI and adds it as a
          subtitle track named &ldquo;Auto-generated (lang)&rdquo;. Requires a processed video
          with an audio rendition. Only one auto-generated transcription can run per video
          at a time.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={transcribeLang}
            onValueChange={(v) => setTranscribeLang(v || "en")}
            disabled={transcribing || checkingTranscribeStatus || uploading}
          >
            <SelectTrigger size="sm" className="w-[160px]">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {SUBTITLE_LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.label} ({l.code})
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleAutoGenerate}
            disabled={transcribing || uploading || checkingTranscribeStatus}
            className="gap-1.5"
            title={transcribing ? "A transcription is already in progress" : "Auto-generate subtitle"}
          >
            {transcribing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {transcribing ? "Transcribing…" : "Auto-generate subtitle"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRefresh()}
            disabled={loading}
            className="gap-1.5 h-8"
            title="Refresh subtitle list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
        {transcribeMsg && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            {transcribing && <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />}
            <span>{transcribeMsg}</span>
          </p>
        )}
      </div>

      {isBunnyEmbed && (
        <Alert className="text-xs">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle className="text-xs font-semibold">Bunny iframe embed limitation</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed">
            This video plays through Bunny&apos;s iframe embed, which renders Bunny&apos;s own
            player – custom subtitle tracks only appear when playback uses the HLS/direct player
            (share page, dashboard preview, or embed once a CDN hostname is configured).
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="text-xs">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle className="text-xs font-semibold">Subtitles error</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {pending.length > 0 && (
        <div className="border border-border rounded-xl p-3 space-y-3 bg-muted/20">
          <p className="text-xs font-semibold text-foreground">
            Ready to upload ({pending.length})
          </p>
          <div className="space-y-2">
            {pending.map((p) => (
              <div key={p.key} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_170px_auto] gap-2 items-start text-xs">
                <span className="font-mono truncate text-muted-foreground pt-2" title={p.file.name}>
                  {p.file.name}
                </span>
                <Input
                  value={p.label}
                  onChange={(e) =>
                    setPending((prev) => prev.map((x) => (x.key === p.key ? { ...x, label: e.target.value } : x)))
                  }
                  placeholder="Name e.g. English"
                  className="h-8 text-xs"
                  maxLength={80}
                />
                <div className="space-y-1.5">
                  <Select
                    value={p.language}
                    onValueChange={(v) =>
                      setPending((prev) =>
                        prev.map((x) =>
                          x.key === p.key ? { ...x, language: v ?? AUTO_LANGUAGE_VALUE } : x
                        )
                      )
                    }>
                    <SelectTrigger size="sm">
                      <SelectValue placeholder="Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                      <SelectItem value={AUTO_LANGUAGE_VALUE}>Auto</SelectItem>
                      {SUBTITLE_LANGUAGES.map((l) => (
                        <SelectItem key={l.code} value={l.code}>
                          {l.label} ({l.code})
                        </SelectItem>
                      ))}
                      <SelectItem value={CUSTOM_LANGUAGE_VALUE}>Custom code…</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {p.language === CUSTOM_LANGUAGE_VALUE && (
                    <Input
                      value={p.customLanguage}
                      onChange={(e) =>
                        setPending((prev) =>
                          prev.map((x) => (x.key === p.key ? { ...x, customLanguage: e.target.value } : x))
                        )
                      }
                      placeholder="Code e.g. en-US"
                      className="h-8 text-xs font-mono"
                      maxLength={12}
                    />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPending((prev) => prev.filter((x) => x.key !== p.key))}
                  disabled={uploading}
                  className="text-destructive hover:bg-destructive/10 h-8"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleUploadAll} disabled={uploading || pending.length === 0} className="gap-1.5">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {uploading ? uploadProgress || "Uploading…" : `Upload ${pending.length} file${pending.length !== 1 ? "s" : ""}`}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPending([])} disabled={uploading}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span>Loading subtitles…</span>
        </div>
      ) : subtitles.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-border rounded-xl space-y-2 p-6 bg-muted/20">
          <Captions className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
          <p className="text-sm font-semibold text-foreground">No subtitles yet</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Upload .vtt files to let viewers pick a language from the player&apos;s CC menu.
            You can upload several at once.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
          {subtitles.map((s) => (
            <div key={s.id} className="py-3 px-3 sm:px-4 flex items-center justify-between gap-3 text-sm bg-card">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Captions className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground text-sm truncate">{s.label}</span>
                    <Badge variant="outline" className="font-mono text-[11px]">
                      {s.language}
                    </Badge>
                    {s.isDefault && (
                      <Badge className="gap-1 text-[11px]">
                        <Star className="w-3 h-3" /> Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {s.sizeBytes ? `${(s.sizeBytes / 1024).toFixed(1)} KB` : ""} · WebVTT
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingSubtitle(s)}
                  disabled={Boolean(actionId) || uploading}
                  className="gap-1 text-xs h-8"
                  title="Edit subtitle captions and timings"
                  aria-label={`Edit ${s.label} subtitles`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
                {!s.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefault(s.id)}
                    disabled={actionId === s.id}
                    className="gap-1 text-xs h-8"
                    title="Show this track by default"
                  >
                    {actionId === s.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Star className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">Set default</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(s.id)}
                  disabled={actionId === s.id}
                  className="text-destructive hover:bg-destructive/10 h-8"
                  title="Delete subtitle track"
                >
                  {actionId === s.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
