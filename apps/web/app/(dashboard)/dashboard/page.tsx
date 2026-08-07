"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Film, Play, Clock, Eye, RefreshCw, AlertTriangle, Shield, CheckCircle2 } from "lucide-react";
import UploadModal from "@/components/UploadModal";

interface VideoItem {
  id: string;
  title: string;
  description?: string;
  status: "UPLOADING" | "QUEUED" | "PROCESSING" | "READY" | "FAILED";
  durationSeconds?: number;
  thumbnailUrl?: string;
  visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
  createdAt: string;
}

export default function DashboardPage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/videos");
      const data = await res.json();
      if (res.ok && data.data) {
        setVideos(data.data);
      }
    } catch (err) {
      console.error("Error loading videos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
    // Auto-poll status if processing items exist
    const interval = setInterval(() => {
      fetchVideos();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const filteredVideos = videos.filter((v) => {
    const matchesSearch = v.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "READY":
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Ready
          </span>
        );
      case "PROCESSING":
      case "QUEUED":
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-600 flex items-center gap-1 animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" /> {status === "QUEUED" ? "Queued" : "Encoding"}
          </span>
        );
      case "UPLOADING":
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-600">Uploading</span>
        );
      case "FAILED":
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-500/10 text-red-600 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Transcode Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[hsl(var(--foreground))]">Video Assets</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Manage your organization's video library and adaptive HLS streams
          </p>
        </div>
        <button
          onClick={() => setIsUploadOpen(true)}
          className="px-4 py-2.5 bg-[hsl(var(--primary))] hover:opacity-90 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Upload Video
        </button>
      </div>

      {/* Controls Bar: Search & Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white/60 backdrop-blur-md p-3 rounded-2xl border border-[hsl(var(--border))] shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-[hsl(var(--input))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {["ALL", "READY", "PROCESSING", "FAILED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === st
                  ? "bg-[hsl(var(--primary))] text-white shadow-xs"
                  : "text-[hsl(var(--muted-foreground))] hover:bg-black/5"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Video Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-64 rounded-2xl bg-slate-200/60 animate-pulse" />
          ))}
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white/40 rounded-2xl border border-dashed border-[hsl(var(--border))]">
          <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] flex items-center justify-center mx-auto mb-4">
            <Film className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">No videos found</h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-sm mx-auto mt-1 mb-6">
            Upload your first video to start automated HLS encoding, thumbnails, and embedding.
          </p>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-4 py-2 bg-[hsl(var(--primary))] text-white font-semibold text-sm rounded-xl"
          >
            Upload Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <Link
              key={video.id}
              href={`/dashboard/videos/${video.id}`}
              className="group glass-card rounded-2xl overflow-hidden border border-[hsl(var(--border))] hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Thumbnail Container */}
                <div className="aspect-video bg-slate-900 relative overflow-hidden flex items-center justify-center">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-slate-500">
                      <Film className="w-10 h-10 mb-1" />
                      <span className="text-xs">No Preview</span>
                    </div>
                  )}

                  {/* Play Overlay */}
                  {video.status === "READY" && (
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 fill-white ml-0.5" />
                      </div>
                    </div>
                  )}

                  {/* Duration Badge */}
                  {video.durationSeconds && (
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs">
                      <Clock className="w-3 h-3" /> {formatDuration(video.durationSeconds)}
                    </span>
                  )}

                  {/* Visibility Tag */}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-semibold uppercase backdrop-blur-xs">
                    {video.visibility}
                  </span>
                </div>

                {/* Content */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-base text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors line-clamp-1">
                      {video.title}
                    </h3>
                  </div>
                  {video.description && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2">{video.description}</p>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-4 pt-0 border-t border-[hsl(var(--border))]/50 flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))] mt-2">
                <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                {getStatusBadge(video.status)}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={fetchVideos}
      />
    </div>
  );
}
