"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Film,
  Search,
  Check,
  Loader2,
  RefreshCw,
  Clock,
  Play,
  AlertCircle,
  Video as VideoIcon,
  Link2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDuration } from "@/lib/video-utils";

export interface SelectedVideoPayload {
  id: string;
  title: string;
  embedUrl: string;
  thumbnailUrl?: string | null;
  description?: string | null;
  durationSeconds?: number | null;
  shareAccessMode?: "PUBLIC" | "RESTRICTED" | "PRIVATE" | "PURCHASABLE";
  price?: number | null;
  currency?: string | null;
}

interface VideoItem {
  id: string;
  title: string;
  description?: string;
  status: "UPLOADING" | "QUEUED" | "PROCESSING" | "READY" | "FAILED";
  durationSeconds?: number;
  thumbnailUrl?: string | null;
  playbackUrl?: string | null;
  shareAccessMode?: "PUBLIC" | "RESTRICTED" | "PRIVATE" | "PURCHASABLE";
  price?: number | null;
  currency?: string | null;
  createdAt: string;
  folderName?: string | null;
}

interface VideoPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVideo: (video: SelectedVideoPayload) => void;
  selectedEmbedUrl?: string | null;
  title?: string;
  description?: string;
}

export default function VideoPickerModal({
  isOpen,
  onClose,
  onSelectVideo,
  selectedEmbedUrl,
  title = "Select Video",
  description = "Choose an uploaded video from your library or specify an external video URL.",
}: VideoPickerModalProps) {
  const [activeTab, setActiveTab] = useState<"library" | "custom">("library");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

  // Custom URL tab state
  const [customUrl, setCustomUrl] = useState("");
  const [customTitle, setCustomTitle] = useState("");

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/v1/videos?folderId=all&limit=100");
      const data = await res.json();
      if (res.ok && data.data) {
        setVideos(data.data);
      } else {
        setError(data.error || "Failed to load uploaded videos.");
      }
    } catch (err: any) {
      console.error("Error fetching videos for picker:", err);
      setError("An error occurred while loading videos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVideos();
      // Try to match selected embed url to an existing video
      if (selectedEmbedUrl) {
        if (selectedEmbedUrl.includes("/embed/")) {
          const matchedId = selectedEmbedUrl.split("/embed/")[1]?.split("?")[0];
          if (matchedId) {
            const existing = videos.find((v) => v.id === matchedId);
            if (existing) setSelectedVideo(existing);
          }
        } else if (selectedEmbedUrl.startsWith("http")) {
          setCustomUrl(selectedEmbedUrl);
        }
      }
    }
  }, [isOpen]);

  // Sync selected video if videos load after open
  useEffect(() => {
    if (selectedEmbedUrl && videos.length > 0) {
      if (selectedEmbedUrl.includes("/embed/")) {
        const matchedId = selectedEmbedUrl.split("/embed/")[1]?.split("?")[0];
        if (matchedId) {
          const existing = videos.find((v) => v.id === matchedId);
          if (existing) setSelectedVideo(existing);
        }
      }
    }
  }, [videos, selectedEmbedUrl]);

  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      if (!search.trim()) return true;
      const query = search.toLowerCase();
      return (
        v.title.toLowerCase().includes(query) ||
        (v.description && v.description.toLowerCase().includes(query)) ||
        (v.folderName && v.folderName.toLowerCase().includes(query))
      );
    });
  }, [videos, search]);

  const handleConfirmLibrarySelect = () => {
    if (!selectedVideo) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const embedUrl = `/embed/${selectedVideo.id}`;
    onSelectVideo({
      id: selectedVideo.id,
      title: selectedVideo.title,
      embedUrl: embedUrl,
      thumbnailUrl: selectedVideo.thumbnailUrl,
      description: selectedVideo.description,
      durationSeconds: selectedVideo.durationSeconds,
      shareAccessMode: selectedVideo.shareAccessMode,
      price: selectedVideo.price,
      currency: selectedVideo.currency,
    });
    onClose();
  };

  const handleConfirmCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    onSelectVideo({
      id: `custom_${Date.now()}`,
      title: customTitle.trim() || "External Video",
      embedUrl: customUrl.trim(),
      thumbnailUrl: null,
      description: null,
      durationSeconds: null,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-3xl max-h-[88vh] flex flex-col p-4 sm:p-6 rounded-2xl sm:rounded-3xl gap-4 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" />
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">{description}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between gap-2 border-b pb-3">
            <TabsList className="bg-muted p-1 rounded-xl">
              <TabsTrigger value="library" className="rounded-lg text-xs font-bold gap-1.5 cursor-pointer">
                <VideoIcon className="w-3.5 h-3.5" />
                <span>Uploaded Videos ({videos.length})</span>
              </TabsTrigger>
              <TabsTrigger value="custom" className="rounded-lg text-xs font-bold gap-1.5 cursor-pointer">
                <Link2 className="w-3.5 h-3.5" />
                <span>YouTube / Video Link</span>
              </TabsTrigger>
            </TabsList>

            {activeTab === "library" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={fetchVideos}
                disabled={loading}
                className="h-8 px-2.5 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground"
                title="Refresh video list"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            )}
          </div>

          {/* TAB 1: LIBRARY VIDEOS */}
          <TabsContent value="library" className="flex-1 flex flex-col min-h-0 space-y-3 pt-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search videos by title or folder..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            {error && (
              <Alert variant="destructive" className="text-xs">
                <AlertCircle />
                <span className="text-xs">{error}</span>
              </Alert>
            )}

            {/* Video List / Grid */}
            <div className="flex-1 overflow-y-auto pr-1 min-h-[260px] max-h-[360px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                  <Loader2 className="w-7 h-7 animate-spin text-primary" />
                  <p className="text-xs font-semibold">Loading your video library...</p>
                </div>
              ) : filteredVideos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center space-y-2 border border-dashed rounded-2xl p-6 text-muted-foreground">
                  <Film className="w-10 h-10 opacity-30 mx-auto" />
                  <p className="text-xs font-semibold">
                    {search ? "No videos match your search query." : "No uploaded videos found in your account."}
                  </p>
                  <p className="text-xs max-w-sm">
                    {search ? "Try searching with a different keyword." : "Upload videos from the Uploaded Videos page to choose them here."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredVideos.map((video) => {
                    const isSelected = selectedVideo?.id === video.id;
                    const isReady = video.status === "READY";

                    return (
                      <div
                        key={video.id}
                        onClick={() => setSelectedVideo(video)}
                        onDoubleClick={() => {
                          setSelectedVideo(video);
                          const embedUrl = `/embed/${video.id}`;
                          onSelectVideo({
                            id: video.id,
                            title: video.title,
                            embedUrl: embedUrl,
                            thumbnailUrl: video.thumbnailUrl,
                            description: video.description,
                            durationSeconds: video.durationSeconds,
                          });
                          onClose();
                        }}
                        className={`group relative rounded-2xl border p-2.5 flex flex-col justify-between transition-all cursor-pointer select-none text-left ${
                          isSelected
                            ? "bg-primary/5 border-primary ring-2 ring-primary shadow-sm"
                            : "bg-card hover:border-primary/50 hover:bg-muted/30"
                        }`}
                      >
                        {/* Thumbnail Container */}
                        <div className="w-full aspect-video bg-black/40 rounded-xl overflow-hidden relative shrink-0">
                          {video.thumbnailUrl ? (
                            <img
                              src={video.thumbnailUrl}
                              alt={video.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                              <Film className="w-8 h-8" />
                            </div>
                          )}

                          {/* Duration Badge */}
                          {video.durationSeconds !== undefined && video.durationSeconds !== null && (
                            <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-xs font-mono font-bold bg-black/80 text-white backdrop-blur-xs flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {formatDuration(video.durationSeconds)}
                            </div>
                          )}

                          {/* Selection Checkmark Badge */}
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md animate-in zoom-in-50">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        {/* Title & Metadata */}
                        <div className="pt-2 space-y-1">
                          <h4 className="text-xs font-bold line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                            {video.title}
                          </h4>

                          <div className="flex items-center justify-between gap-1 text-xs text-muted-foreground">
                            <span
                              className={`font-semibold uppercase tracking-wider ${
                                video.status === "READY"
                                  ? "text-primary"
                                  : video.status === "FAILED"
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {video.status}
                            </span>
                            <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="pt-3 border-t border-border shrink-0 mt-auto flex flex-row items-center justify-between sm:justify-between gap-2">
              <div className="text-xs text-muted-foreground truncate">
                {selectedVideo ? (
                  <span>
                    Selected: <strong className="text-foreground">{selectedVideo.title}</strong>
                  </span>
                ) : (
                  <span>Click a video to select it.</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs">
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!selectedVideo}
                  onClick={handleConfirmLibrarySelect}
                  className="text-xs font-bold cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 mr-1" /> Select Video
                </Button>
              </div>
            </DialogFooter>
          </TabsContent>

          {/* TAB 2: YOUTUBE / VIDEO LINK */}
          <TabsContent value="custom" className="flex-1 min-h-0 flex flex-col pt-2">
            <form onSubmit={handleConfirmCustomUrl} className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-1 pr-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">YouTube Video URL or Direct Link *</label>
                  <Input
                    type="text"
                    required
                    placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste any YouTube link (will automatically play in the popup player) or direct video URL.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold">Optional Title</label>
                  <Input
                    type="text"
                    placeholder="e.g. Masterclass Showcase Video"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-border shrink-0 mt-auto">
                <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!customUrl.trim()}
                  className="text-xs font-bold cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 mr-1" /> Use YouTube / Video Link
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
