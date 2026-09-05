"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Share2,
  Film,
  Folder,
  ListVideo,
  Search,
  ExternalLink,
  Clock,
  Building2,
  Lock,
  Loader2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/video-utils";
import VideoThumbnail from "@/components/VideoThumbnail";

interface SharedItem {
  id: string;
  shareUrl: string;
  type: "video" | "folder" | "playlist";
  title: string;
  description?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  itemCount?: number;
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
  const [filterType, setFilterType] = useState<"all" | "video" | "folder" | "playlist">("all");

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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-semibold text-muted-foreground">
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
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Shared with you
            </h1>
            <Badge variant="secondary">
              {items.length} {items.length === 1 ? "item" : "items"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Access videos, playlists, and folder collections shared with your email address or account
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by title or organization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl flex-wrap">
          <Button
            size="sm"
            variant={filterType === "all" ? "default" : "ghost"}
            onClick={() => setFilterType("all")}
          >
            All Items
          </Button>
          <Button
            size="sm"
            variant={filterType === "video" ? "default" : "ghost"}
            onClick={() => setFilterType("video")}
            className="gap-1.5"
          >
            <Film className="w-3.5 h-3.5" /> Videos
          </Button>
          <Button
            size="sm"
            variant={filterType === "playlist" ? "default" : "ghost"}
            onClick={() => setFilterType("playlist")}
            className="gap-1.5"
          >
            <ListVideo className="w-3.5 h-3.5" /> Playlists
          </Button>
          <Button
            size="sm"
            variant={filterType === "folder" ? "default" : "ghost"}
            onClick={() => setFilterType("folder")}
            className="gap-1.5"
          >
            <Folder className="w-3.5 h-3.5" /> Folders
          </Button>
        </div>
      </div>

      {/* Content Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 px-4 bg-card/40 rounded-2xl border border-dashed border-border">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <Share2 className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg text-foreground">No shared content found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
            {searchQuery
              ? "No items match your search query."
              : "When colleagues share videos, playlists, or folders with you, they will appear right here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-card glass-card card-hover border border-border rounded-2xl overflow-hidden shadow-2xs hover:shadow-lg hover:border-primary/50 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Header Preview / Icon */}
                <div className="aspect-video bg-muted relative overflow-hidden flex items-center justify-center">
                  {item.type === "video" ? (
                    <VideoThumbnail
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : item.type === "playlist" ? (
                    item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-primary">
                        <ListVideo className="w-12 h-12" />
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">
                          Playlist Collection
                        </span>
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-primary">
                      <Folder className="w-14 h-14 fill-primary/20" />
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        Folder Collection
                      </span>
                    </div>
                  )}

                  {item.durationSeconds && (
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 backdrop-blur-md text-xs font-bold text-white rounded-md flex items-center gap-1">
                      <Clock className="w-3 h-3 text-primary" />
                      {formatDuration(item.durationSeconds)}
                    </span>
                  )}

                  {item.type === "playlist" && item.itemCount !== undefined && (
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-black rounded-md flex items-center gap-1">
                      <Film className="w-3 h-3" />
                      {item.itemCount} {item.itemCount === 1 ? "video" : "videos"}
                    </span>
                  )}

                  {item.requireLogin && (
                    <Badge variant="destructive" className="absolute top-2 left-2 gap-1 uppercase">
                      <Lock className="w-3 h-3" /> Login Required
                    </Badge>
                  )}
                </div>

                {/* Info Container */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                      {item.organizationName}
                    </Badge>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    {item.description && (
                      <RichTextViewer
                        content={item.description}
                        clamp={2}
                        className="text-xs text-muted-foreground line-clamp-2 mt-1"
                      />
                    )}
                  </div>

                  {item.message && (
                    <div className="p-2.5 bg-muted/60 border border-border rounded-xl">
                      <p className="text-xs text-muted-foreground italic line-clamp-2">
                        &ldquo;{item.message}&rdquo;
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
                  className={cn(buttonVariants({ variant: "default" }), "w-full gap-2")}
                >
                  <span>
                    Open {item.type === "video" ? "Video" : item.type === "playlist" ? "Playlist" : "Folder"}
                  </span>
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
