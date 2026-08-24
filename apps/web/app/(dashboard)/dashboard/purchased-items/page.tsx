"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Film,
  ListVideo,
  Search,
  ExternalLink,
  Clock,
  Building2,
  Receipt,
  Loader2,
  CheckCircle2,
  CreditCard,
  Sparkles,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  Copy,
  Check,
  RefreshCw,
  Ticket,
  Calendar,
  Video,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/video-utils";

interface PlaylistVideoItem {
  id: string;
  title: string;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
}

interface PurchasedItem {
  id: string;
  contentType: "VIDEO" | "PLAYLIST" | "MEETING";
  contentId: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  itemCount?: number | null;
  playlistVideos: PlaylistVideoItem[];
  meetingInfo?: {
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
    status?: string;
    isInstant?: boolean;
    recordOnStart?: boolean;
    hostName?: string;
    hostImage?: string | null;
    joinUrl?: string;
  };
  shareUrl: string;
  amount: number;
  currency: string;
  countryCode?: string | null;
  paymentMethod: string;
  paymentId?: string | null;
  status: string;
  purchasedAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
  };
}

interface PurchasesStats {
  totalPurchases: number;
  totalVideos: number;
  totalPlaylists: number;
  totalMeetings?: number;
  totalSpentByCurrency: Record<string, number>;
}

export default function PurchasedItemsPage() {
  const [items, setItems] = useState<PurchasedItem[]>([]);
  const [stats, setStats] = useState<PurchasesStats>({
    totalPurchases: 0,
    totalVideos: 0,
    totalPlaylists: 0,
    totalMeetings: 0,
    totalSpentByCurrency: {},
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "VIDEO" | "PLAYLIST" | "MEETING">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title" | "price">("newest");
  const [expandedPlaylists, setExpandedPlaylists] = useState<Record<string, boolean>>({});
  const [selectedReceipt, setSelectedReceipt] = useState<PurchasedItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchPurchasedItems = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const res = await fetch("/api/user/purchased-items");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load purchased items.");
      }
      setItems(data.purchases || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load purchased items.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPurchasedItems();
  }, []);

  const togglePlaylistExpand = (id: string) => {
    setExpandedPlaylists((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredItems = items
    .filter((item) => {
      const matchesType = filterType === "all" || item.contentType === filterType;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        item.title.toLowerCase().includes(query) ||
        item.organization.name.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query)) ||
        (item.paymentId && item.paymentId.toLowerCase().includes(query)) ||
        item.id.toLowerCase().includes(query);
      return matchesType && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.purchasedAt).getTime() - new Date(b.purchasedAt).getTime();
      }
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === "price") {
        return (b.amount || 0) - (a.amount || 0);
      }
      return 0;
    });

  const formatPrice = (amount: number, currency: string) => {
    const curr = currency.toUpperCase();
    if (curr === "INR") {
      return `₹${amount.toLocaleString("en-IN")}`;
    }
    if (curr === "EUR") {
      return `€${amount.toFixed(2)}`;
    }
    if (curr === "GBP") {
      return `£${amount.toFixed(2)}`;
    }
    return `$${amount.toFixed(2)} ${curr}`;
  };

  const formattedSpentSummary = Object.entries(stats.totalSpentByCurrency || {})
    .map(([curr, amount]) => formatPrice(amount, curr))
    .join(" + ") || "$0.00";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground">
          Loading your purchased library...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Purchased Items
            </h1>
            <Badge variant="lime" className="gap-1 font-bold">
              <Sparkles className="w-3 h-3 text-primary" />
              {items.length} Unlocked
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Access, stream, and review receipts for all videos and playlists unlocked under your account
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPurchasedItems(true)}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-primary")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Purchased</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{stats.totalPurchases}</span>
            <span className="text-xs text-muted-foreground font-medium">items unlocked</span>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Unlocked Videos</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{stats.totalVideos}</span>
            <span className="text-xs text-muted-foreground font-medium">single videos</span>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Playlists / Courses</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <ListVideo className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{stats.totalPlaylists}</span>
            <span className="text-xs text-muted-foreground font-medium">series / playlists</span>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Invested</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-foreground truncate">
              {formattedSpentSummary}
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by title, creator, payment ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border">
            <Button
              size="sm"
              variant={filterType === "all" ? "default" : "ghost"}
              onClick={() => setFilterType("all")}
              className="h-8 text-xs font-medium"
            >
              All Items
            </Button>
            <Button
              size="sm"
              variant={filterType === "VIDEO" ? "default" : "ghost"}
              onClick={() => setFilterType("VIDEO")}
              className="h-8 text-xs font-medium gap-1.5"
            >
              <Film className="w-3.5 h-3.5 text-blue-500" /> Videos
            </Button>
            <Button
              size="sm"
              variant={filterType === "PLAYLIST" ? "default" : "ghost"}
              onClick={() => setFilterType("PLAYLIST")}
              className="h-8 text-xs font-medium gap-1.5"
            >
              <ListVideo className="w-3.5 h-3.5 text-purple-500" /> Playlists
            </Button>
            <Button
              size="sm"
              variant={filterType === "MEETING" ? "default" : "ghost"}
              onClick={() => setFilterType("MEETING")}
              className="h-8 text-xs font-medium gap-1.5"
            >
              <Ticket className="w-3.5 h-3.5 text-amber-500" /> Meeting Passes
            </Button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 pl-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 hidden sm:inline" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-9 px-2.5 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option value="newest">Newest Purchased</option>
              <option value="oldest">Oldest Purchased</option>
              <option value="title">Title (A-Z)</option>
              <option value="price">Price (High to Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 px-4 bg-card/40 rounded-2xl border border-dashed border-border">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg text-foreground">
            {items.length === 0 ? "No purchases yet" : "No matching purchases found"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-6">
            {items.length === 0
              ? "When you buy premium videos, courses, or meeting entry passes from creators, they will be unlocked and listed here."
              : "Try adjusting your search query or filter criteria to find what you are looking for."}
          </p>
          {items.length === 0 && (
            <Link
              href="/dashboard/shared-with-me"
              className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
            >
              View Content Shared With Me
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const isPlaylist = item.contentType === "PLAYLIST";
            const isMeeting = item.contentType === "MEETING";
            const isExpanded = expandedPlaylists[item.id] || false;

            return (
              <div
                key={item.id}
                className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Thumbnail / Header Area */}
                  <div className="aspect-video bg-slate-950 relative overflow-hidden flex items-center justify-center">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : isMeeting ? (
                      <div className="flex flex-col items-center gap-2 text-amber-400 p-4 text-center">
                        <Ticket className="w-12 h-12" />
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Digital Entry Pass
                        </span>
                      </div>
                    ) : isPlaylist ? (
                      <div className="flex flex-col items-center gap-2 text-primary p-4 text-center">
                        <ListVideo className="w-12 h-12" />
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Playlist Collection
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-500">
                        <Film className="w-12 h-12" />
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Video Item
                        </span>
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                    {/* Type Badge (Top Left) */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <Badge
                        variant={isMeeting ? "outline" : isPlaylist ? "default" : "secondary"}
                        className={`gap-1 text-[10px] font-extrabold uppercase backdrop-blur-md shadow-xs ${
                          isMeeting ? "bg-amber-500/20 border-amber-500/40 text-amber-400" : ""
                        }`}
                      >
                        {isMeeting ? (
                          <>
                            <Ticket className="w-3 h-3" /> Meeting Pass
                          </>
                        ) : isPlaylist ? (
                          <>
                            <ListVideo className="w-3 h-3" /> Playlist
                          </>
                        ) : (
                          <>
                            <Film className="w-3 h-3" /> Video
                          </>
                        )}
                      </Badge>
                      <Badge className="bg-emerald-500/90 text-white font-black text-[10px] tracking-wider gap-1 border-0 shadow-xs">
                        <CheckCircle2 className="w-3 h-3 text-white" /> UNLOCKED
                      </Badge>
                    </div>

                    {/* Duration / Item Count / Meeting Start (Bottom Right) */}
                    <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
                      {isMeeting && item.meetingInfo?.scheduledStart ? (
                        <span className="px-2 py-0.5 bg-black/85 backdrop-blur-md text-[11px] font-bold text-slate-100 rounded-md flex items-center gap-1 border border-white/10">
                          <Calendar className="w-3 h-3 text-amber-400" />
                          {new Date(item.meetingInfo.scheduledStart).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      ) : item.durationSeconds ? (
                        <span className="px-2 py-0.5 bg-black/85 backdrop-blur-md text-[11px] font-bold text-slate-100 rounded-md flex items-center gap-1 border border-white/10">
                          <Clock className="w-3 h-3 text-primary" />
                          {formatDuration(item.durationSeconds)}
                        </span>
                      ) : null}

                      {isPlaylist && item.itemCount !== undefined && (
                        <span className="px-2 py-0.5 bg-primary/95 text-white text-[11px] font-black rounded-md flex items-center gap-1 shadow-xs">
                          <PlayCircle className="w-3 h-3" />
                          {item.itemCount} {item.itemCount === 1 ? "video" : "videos"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3">
                    {/* Organization & Purchase Date */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {item.organization.logoUrl ? (
                          <img
                            src={item.organization.logoUrl}
                            alt={item.organization.name}
                            className="w-4 h-4 rounded-xs object-cover shrink-0 border border-border"
                          />
                        ) : (
                          <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                        <span className="text-xs font-semibold text-foreground truncate">
                          {item.organization.name}
                        </span>
                      </div>

                      <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                        {new Date(item.purchasedAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    {/* Title and Description */}
                    <div>
                      <h3 className="font-bold text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      {item.description && (
                        <RichTextViewer
                          content={item.description}
                          clamp={2}
                          className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed"
                        />
                      )}
                    </div>

                    {/* Price Paid & Payment Badge */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground">
                          {formatPrice(item.amount, item.currency)}
                        </span>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono py-0 h-4.5">
                          {item.paymentMethod}
                        </Badge>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedReceipt(item)}
                        className="h-7 px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground gap-1"
                      >
                        <Receipt className="w-3 h-3 text-primary" /> Receipt
                      </Button>
                    </div>

                    {/* Playlist Items Dropdown Preview */}
                    {isPlaylist && item.playlistVideos.length > 0 && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => togglePlaylistExpand(item.id)}
                          className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground py-1 px-2 rounded-lg bg-muted/40 hover:bg-muted transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <ListVideo className="w-3.5 h-3.5 text-primary" />
                            {item.playlistVideos.length} Included Lessons
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {item.playlistVideos.map((video, idx) => (
                              <div
                                key={video.id}
                                className="flex items-center justify-between text-[11px] p-1.5 rounded-md bg-muted/30 border border-border/40"
                              >
                                <span className="font-medium truncate max-w-[200px] text-foreground">
                                  {idx + 1}. {video.title}
                                </span>
                                {video.durationSeconds && (
                                  <span className="text-muted-foreground font-mono shrink-0 ml-2">
                                    {formatDuration(video.durationSeconds)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="p-4 pt-0">
                  <Link
                    href={
                      isMeeting
                        ? item.meetingInfo?.joinUrl || `/meet/${item.contentId}`
                        : item.shareUrl || `/share/${item.contentId}`
                    }
                    target={isMeeting ? "_self" : "_blank"}
                    className={cn(
                      buttonVariants({ variant: "default" }),
                      "w-full gap-2 font-bold shadow-xs",
                      isMeeting ? "bg-amber-500 hover:bg-amber-400 text-slate-950" : ""
                    )}
                  >
                    {isMeeting ? (
                      <>
                        <Video className="w-4 h-4" />
                        <span>Join Live Meeting Room</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4" />
                        <span>Watch {isPlaylist ? "Playlist" : "Video"}</span>
                      </>
                    )}
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Transaction Receipt Modal */}
      <Dialog
        open={Boolean(selectedReceipt)}
        onOpenChange={(open) => {
          if (!open) setSelectedReceipt(null);
        }}
      >
        <DialogContent size="lg" className="sm:max-w-md">
          <DialogHeader variant="bordered">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle>Proof of Purchase</DialogTitle>
                <DialogDescription>
                  Official receipt for your unlocked content
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedReceipt && (
            <div className="space-y-4 py-2 text-sm">
              <div className="p-3.5 rounded-xl bg-muted/50 border border-border space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Item Purchased
                    </span>
                    <h4 className="font-bold text-foreground text-base">
                      {selectedReceipt.title}
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      Type: {selectedReceipt.contentType}
                    </span>
                  </div>
                  <Badge variant="lime" className="font-bold">
                    PAID & UNLOCKED
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Creator / Organization</span>
                    <span className="font-semibold text-foreground">
                      {selectedReceipt.organization.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Purchase Date</span>
                    <span className="font-semibold text-foreground">
                      {new Date(selectedReceipt.purchasedAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Amount Paid</span>
                    <span className="font-bold text-primary text-sm">
                      {formatPrice(selectedReceipt.amount, selectedReceipt.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Payment Method</span>
                    <span className="font-semibold text-foreground uppercase">
                      {selectedReceipt.paymentMethod}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transaction IDs with Copy Helper */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Order Reference ID
                    </span>
                    <span className="font-mono text-xs text-foreground truncate block">
                      {selectedReceipt.id}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopy(selectedReceipt.id, "orderId")}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                    title="Copy Order ID"
                  >
                    {copiedId === "orderId" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>

                {selectedReceipt.paymentId && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Gateway Payment ID
                      </span>
                      <span className="font-mono text-xs text-foreground truncate block">
                        {selectedReceipt.paymentId}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(selectedReceipt.paymentId!, "payId")}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                      title="Copy Payment ID"
                    >
                      {copiedId === "payId" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Action Buttons inside Receipt */}
              <div className="flex items-center gap-2 pt-2">
                <Link
                  href={
                    selectedReceipt.contentType === "MEETING"
                      ? selectedReceipt.meetingInfo?.joinUrl || `/meet/${selectedReceipt.contentId}`
                      : selectedReceipt.shareUrl || `/share/${selectedReceipt.contentId}`
                  }
                  target={selectedReceipt.contentType === "MEETING" ? "_self" : "_blank"}
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "w-full gap-2 font-bold",
                    selectedReceipt.contentType === "MEETING" ? "bg-amber-500 hover:bg-amber-400 text-slate-950" : ""
                  )}
                >
                  {selectedReceipt.contentType === "MEETING" ? (
                    <>
                      <Video className="w-4 h-4" />
                      <span>Enter Meeting Room</span>
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4" />
                      <span>Launch Content</span>
                    </>
                  )}
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
