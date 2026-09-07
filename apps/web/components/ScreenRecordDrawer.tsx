"use client";

import { useCallback, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  AlertCircle,
  Download,
  Folder,
  Layers,
  Loader2,
  RotateCcw,
  Scissors,
  UploadCloud,
  X,
} from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { formatBytes, formatDuration, processThumbnail } from "@/lib/video-utils";
import { uploadVideoFile } from "@/lib/upload-video";
import { ThumbnailSelector } from "@/components/ThumbnailSelector";
import RecordStudioView, { type RecorderContext } from "@/app/record/RecordStudioView";

interface ScreenRecordDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  currentFolderId?: string | null;
  folderPathName?: string;
}

export default function ScreenRecordDrawer({
  isOpen,
  onClose,
  onUploadSuccess,
  currentFolderId,
  folderPathName,
}: ScreenRecordDrawerProps) {
  const studioRef = useRef<RecorderContext | null>(null);
  const [description, setDescription] = useState("");
  const [requireHls, setRequireHls] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [checkingQuota, setCheckingQuota] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [selectedThumbnailIndex, setSelectedThumbnailIndex] = useState(0);
  const [customThumbBlob, setCustomThumbBlob] = useState<Blob | null>(null);
  const [customThumbUrl, setCustomThumbUrl] = useState<string | null>(null);
  const [compressingThumb, setCompressingThumb] = useState(false);

  const resetDashboardFields = useCallback(() => {
    setDescription("");
    setRequireHls(false);
    setUploading(false);
    setProgress(0);
    setStatusText("");
    setCheckingQuota(false);
    setIsQuotaExceeded(false);
    setShowConfirmClose(false);
    setSelectedThumbnailIndex(0);
    if (customThumbUrl) URL.revokeObjectURL(customThumbUrl);
    setCustomThumbBlob(null);
    setCustomThumbUrl(null);
    setCompressingThumb(false);
  }, [customThumbUrl]);

  const handleFullReset = useCallback(() => {
    studioRef.current?.resetAll();
    resetDashboardFields();
  }, [resetDashboardFields]);

  const handleAttemptClose = useCallback(() => {
    if (uploading) return;
    const recorder = studioRef.current;
    if (
      recorder &&
      (recorder.recordState === "recording" ||
        recorder.recordState === "paused" ||
        recorder.recordState === "countdown" ||
        (recorder.recordState === "recorded" && recorder.recordedFile))
    ) {
      setShowConfirmClose(true);
      return;
    }
    handleFullReset();
    onClose();
  }, [handleFullReset, onClose, uploading]);

  const handleCustomThumbChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedImage = event.target.files?.[0];
    if (!selectedImage) return;

    try {
      setCompressingThumb(true);
      const { blob, url } = await processThumbnail(selectedImage, {
        maxWidth: 1280,
        maxHeight: 720,
        quality: 0.82,
      });
      if (customThumbUrl) URL.revokeObjectURL(customThumbUrl);
      setSelectedThumbnailIndex(-1);
      setCustomThumbBlob(blob);
      setCustomThumbUrl(url);
    } catch (error) {
      console.error("Failed to compress selected thumbnail image:", error);
      studioRef.current?.setError("Failed to compress selected thumbnail image");
    } finally {
      setCompressingThumb(false);
    }
  };

  const handleRemoveCustomThumb = () => {
    if (customThumbUrl) URL.revokeObjectURL(customThumbUrl);
    setCustomThumbBlob(null);
    setCustomThumbUrl(null);
    setSelectedThumbnailIndex(0);
  };

  const handleSelectThumbnail = (index: number) => {
    const thumbnails = studioRef.current?.metadata?.thumbnails;
    if (!thumbnails?.[index]) return;
    setSelectedThumbnailIndex(index);
    if (customThumbUrl) URL.revokeObjectURL(customThumbUrl);
    setCustomThumbBlob(null);
    setCustomThumbUrl(null);
  };

  const handleUpload = async (event: FormEvent, recorder: RecorderContext) => {
    event.preventDefault();
    const file = recorder.recordedFile;
    const metadata = recorder.metadata;
    const title = recorder.title.trim();
    if (!file || !title || checkingQuota || isQuotaExceeded) return;

    recorder.setError("");
    setCheckingQuota(true);
    try {
      const usageResponse = await fetch("/api/v1/usage");
      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        if (usageData.usage) {
          const { usedBytes, storageLimitBytes, isLimitReached } = usageData.usage;
          const remainingBytes = Math.max(0, storageLimitBytes - usedBytes);
          if (isLimitReached || file.size > remainingBytes) {
            setIsQuotaExceeded(true);
            recorder.setError(
              `Cannot upload recording (${formatBytes(file.size)}). Your available storage quota is ${formatBytes(remainingBytes)} remaining out of ${formatBytes(storageLimitBytes)}.`
            );
            return;
          }
        }
      }
    } catch (error) {
      console.warn("Pre-upload quota check failed:", error);
    } finally {
      setCheckingQuota(false);
    }

    setUploading(true);
    recorder.setRecordState("uploading");
    const effectiveThumbnailBlob =
      customThumbBlob ||
      (selectedThumbnailIndex >= 0 && metadata?.thumbnails?.[selectedThumbnailIndex]
        ? metadata.thumbnails[selectedThumbnailIndex].blob
        : metadata?.thumbnailBlob);

    try {
      await uploadVideoFile({
        file,
        title,
        description: description.trim() || undefined,
        requireHls,
        currentFolderId,
        metadata: metadata
          ? { ...metadata, thumbnailBlob: effectiveThumbnailBlob }
          : null,
        onProgress: (percent, status) => {
          setProgress(percent);
          setStatusText(status);
        },
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("usage-updated"));
        window.dispatchEvent(new CustomEvent("video-uploaded"));
      }

      window.setTimeout(() => {
        handleFullReset();
        onUploadSuccess();
        onClose();
      }, 700);
    } catch (error: any) {
      console.error("Upload error:", error);
      recorder.setError(error?.message || "An error occurred during recording upload");
      setUploading(false);
      recorder.setRecordState("recorded");
    }
  };

  return (
    <>
      <Drawer
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) handleAttemptClose();
        }}
      >
        <DrawerContent className="h-[94dvh] max-h-[94dvh] w-full overflow-hidden p-0 sm:h-[96dvh] sm:max-h-[96dvh]">
          <div className="relative h-full min-h-0 w-full">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAttemptClose}
              disabled={uploading}
              className="absolute right-4 top-3 z-50 rounded-xl bg-background/70 backdrop-blur-md"
              title="Close recorder"
            >
              <X className="h-4 w-4" />
            </Button>

            <RecordStudioView
              embedded
              onContextChange={(context) => {
                studioRef.current = context;
              }}
              renderRecordedActions={(recorder) => (
                <div className="flex w-full flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="flex min-w-52 flex-1 items-center gap-2">
                      <Input
                        value={recorder.title}
                        onChange={(event) => recorder.setTitle(event.target.value)}
                        placeholder="Recording name"
                        aria-label="Recording name"
                        disabled={uploading}
                        className="h-10 rounded-2xl border-transparent bg-muted/60 font-semibold focus-visible:border-ring"
                      />
                    </div>
                    {recorder.metadata && (
                      <div className="hidden items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-[11px] font-bold text-muted-foreground lg:flex">
                        {formatDuration(recorder.metadata.durationSeconds)}
                        <span className="opacity-40">·</span>
                        {recorder.metadata.sourceWidth}×{recorder.metadata.sourceHeight}
                        <span className="opacity-40">·</span>
                        {formatBytes(recorder.recordedFile?.size || 0)}
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={recorder.toggleTrimmer}
                      disabled={uploading}
                      className="h-10 gap-1.5 rounded-2xl font-bold"
                    >
                      <Scissors className="h-4 w-4" />
                      {recorder.showTrimmer ? "Close trimmer" : recorder.isTrimmed ? "Re-trim" : "Trim"}
                    </Button>
                    {recorder.isTrimmed && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={recorder.revertToOriginalRecording}
                        disabled={uploading}
                        className="h-10 gap-1.5 rounded-2xl font-bold text-muted-foreground"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Revert
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        recorder.handleReRecord();
                        resetDashboardFields();
                      }}
                      disabled={uploading}
                      className="h-10 gap-1.5 rounded-2xl font-bold"
                    >
                      <RotateCcw className="h-4 w-4" />
                      New recording
                    </Button>
                    <Button
                      type="button"
                      onClick={() => recorder.handleDownload()}
                      disabled={uploading}
                      className="h-10 gap-2 rounded-full px-5 font-extrabold shadow-lg shadow-primary/25"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <span className="flex items-center gap-1 px-2 text-[11px] font-semibold text-muted-foreground">
                      <Folder className="h-3.5 w-3.5 text-primary" />
                      {folderPathName ? `Saving to ${folderPathName}` : "Saving to root drive"}
                    </span>
                  </div>

                  <form
                    onSubmit={(event) => void handleUpload(event, recorder)}
                    className="grid gap-3 border-t border-border/70 pt-3 lg:grid-cols-[1.1fr_1fr]"
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs font-bold">Description (Optional)</Label>
                        <RichTextEditor
                          value={description}
                          onChange={setDescription}
                          placeholder="Add brief details about this recording..."
                          disabled={uploading}
                          minHeight="54px"
                          maxHeight="90px"
                          showWordCount={false}
                          showCharacterCount={false}
                        />
                      </div>
                      <ThumbnailSelector
                        thumbnails={recorder.metadata?.thumbnails}
                        selectedThumbnailIndex={selectedThumbnailIndex}
                        onSelectThumbnail={handleSelectThumbnail}
                        customThumbUrl={customThumbUrl}
                        onCustomThumbChange={handleCustomThumbChange}
                        onRemoveCustomThumb={handleRemoveCustomThumb}
                        compressingThumb={compressingThumb}
                        disabled={uploading}
                        inputId="custom-thumbnail-studio-input"
                        className="space-y-2 p-2.5 sm:col-span-2"
                      />
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 p-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="rounded-lg bg-primary/15 p-1.5 text-primary">
                            <Layers className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <label htmlFor="studio-require-hls" className="block truncate text-xs font-bold">
                              HLS multi-bitrate ladder
                            </label>
                            <p className="text-xs text-muted-foreground">
                              {requireHls ? "Adaptive streaming enabled" : "Store the original video"}
                            </p>
                          </div>
                        </div>
                        <Switch
                          id="studio-require-hls"
                          checked={requireHls}
                          onCheckedChange={setRequireHls}
                          disabled={uploading}
                        />
                      </div>

                      {uploading && (
                        <div className="space-y-1.5 rounded-xl border border-primary/20 bg-primary/10 p-2.5">
                          <div className="flex justify-between text-xs font-bold text-primary">
                            <span>{statusText || "Uploading recording..."}</span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} />
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={uploading || !recorder.title.trim() || checkingQuota || isQuotaExceeded}
                        className="mt-auto h-11 w-full rounded-xl font-extrabold shadow-md"
                      >
                        {checkingQuota ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                        {uploading ? "Uploading..." : "Save recording to account"}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> Discard active recording?
            </DialogTitle>
            <DialogDescription>
              You have an active or unsaved recording session. Closing now will permanently discard it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 border-t border-border pt-3 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setShowConfirmClose(false)}>
              Keep recording
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                handleFullReset();
                onClose();
              }}
            >
              Discard & close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
