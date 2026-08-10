"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Share2,
  Film,
  Folder,
  Search,
  ExternalLink,
  Clock,
  Building2,
  Lock,
  Loader2,
  Sparkles,
  Play,
  X,
} from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";

interface SharedItem {
  id: string;
  shareUrl: string;
  type: "video" | "folder";
  title: string;
  description?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  organizationName: string;
  organizationLogo?: string;
  message?: string;
  requireLogin?: boolean;
  createdAt: string;
}

export default function SharedWithYouPage() {
  const [items, setItems] = useState<SharedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "video" | "folder">("all");

  useEffect(() => {
    async function fetchSharedItems() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/user/shared-with-me");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load shared items.");
        }
        setItems(data.items || []);
      } catch (err: any) {
        setError(err.message || "Failed to load shared items.");
      } finally {
        setLoading(false);
      }
    }

    fetchSharedItems();
  }, []);

  const formatDuration = (seconds?: number) => {
    if (!seconds || !isFinite(seconds) || isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const filteredItems = items.filter((item) => {
    const matchesType = filterType === "all" || item.type === filterType;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.organizationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
        <p className="text-sm font-semibold text-[hsl(var(--muted-foreground))]">
          Loading content shared with you...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-[hsl(var(--foreground))]">
              Shared with you
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/20">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Access videos and folder collections shared with your email address or account
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[hsl(var(--border))] shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="Search by title or organization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-[hsl(var(--input))] rounded-xl outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filterType === "all"
                ? "bg-white text-[hsl(var(--foreground))] shadow-xs"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => setFilterType("video")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              filterType === "video"
                ? "bg-white text-[hsl(var(--foreground))] shadow-xs"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            }`}
          >
            <Film className="w-3.5 h-3.5 text-[hsl(var(--primary))]" /> Videos
          </button>
          <button
            onClick={() => setFilterType("folder")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              filterType === "folder"
                ? "bg-white text-[hsl(var(--foreground))] shadow-xs"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            }`}
          >
            <Folder className="w-3.5 h-3.5 text-amber-500" /> Folders
          </button>
        </div>
      </div>

      {/* Content Grid */}
      {filteredItems.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-[hsl(var(--border))] space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] flex items-center justify-center mx-auto">
            <Share2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-[hsl(var(--foreground))]">No shared content found</h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-md mx-auto">
            {searchQuery
              ? "No items match your search query."
              : "When colleagues share videos or folders with you, they will appear right here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="glass-card bg-white border border-[hsl(var(--border))] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header Preview / Icon */}
                <div className="aspect-video bg-slate-900 relative overflow-hidden flex items-center justify-center">
                  {item.type === "video" ? (
                    item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <Film className="w-12 h-12 text-slate-600" />
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-amber-400">
                      <Folder className="w-14 h-14 fill-amber-500/20" />
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                        Folder Collection
                      </span>
                    </div>
                  )}

                  {item.durationSeconds && (
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 backdrop-blur-md text-[11px] font-bold text-slate-200 rounded-md flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[hsl(var(--primary))]" />
                      {formatDuration(item.durationSeconds)}
                    </span>
                  )}

                  {item.requireLogin && (
                    <span className="absolute top-2 left-2 px-2.5 py-1 bg-indigo-950/90 border border-indigo-500/30 text-[10px] font-extrabold text-indigo-300 rounded-full flex items-center gap-1 backdrop-blur-md">
                      <Lock className="w-3 h-3" /> Login Required
                    </span>
                  )}
                </div>

                {/* Info Container */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-700">
                      <Building2 className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                      {item.organizationName}
                    </span>
                    <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-[hsl(var(--foreground))] line-clamp-1 group-hover:text-[hsl(var(--primary))] transition-colors">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2 mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {item.message && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                      <p className="text-[11px] text-slate-600 italic line-clamp-2">
                        "{item.message}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="p-4 pt-0">
                <Link
                  href={item.shareUrl || `/share/${item.id}`}
                  target="_blank"
                  className="w-full py-2.5 px-4 bg-[hsl(var(--primary))] hover:opacity-90 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
                >
                  <span>Open {item.type === "video" ? "Video" : "Folder"}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
