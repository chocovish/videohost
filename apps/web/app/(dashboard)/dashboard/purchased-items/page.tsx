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
  CalendarClock,
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
  DialogFooter,
} from "@/components/ui/dialog";
import VideoThumbnail from "@/components/VideoThumbnail";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/video-utils";
import RescheduleDialog from "@/components/appointments/RescheduleDialog";
import RescheduleStatusCard from "@/components/appointments/RescheduleStatusCard";

interface PlaylistVideoItem {
  id: string;
  title: string;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
}

interface PurchasedItem {
  id: string;
  contentType: "VIDEO" | "PLAYLIST" | "MEETING" | "APPOINTMENT";
  contentId: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  itemCount?: number | null;
  playlistVideos: PlaylistVideoItem[];
  appointmentInfo?: {
    id: string;
    offeringId?: string | null;
    offeringTitle: string;
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
    durationMinutes?: number;
    timezone?: string;
    status?: string;
    hostName?: string;
    hostImage?: string | null;
    hostEmail?: string | null;
    clientName?: string;
    clientEmail?: string;
    meetingId?: string | null;
    joinUrl?: string | null;
    rescheduleCount?: number;
    pendingReschedule?: {
      id: string;
      proposedStart: string;
      proposedEnd: string;
      timezone?: string;
      reason?: string | null;
      proposedByRole: "HOST" | "CLIENT";
      proposedByName?: string | null;
      createdAt?: string;
    } | null;
  } | null;
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
  totalAppointments?: number;
  totalSpentByCurrency: Record<string, number>;
}

export default function PurchasedItemsPage() {
  const [items, setItems] = useState<PurchasedItem[]>([]);
  const [stats, setStats] = useState<PurchasesStats>({
    totalPurchases: 0,
    totalVideos: 0,
    totalPlaylists: 0,
    totalMeetings: 0,
    totalAppointments: 0,
    totalSpentByCurrency: {},
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "VIDEO" | "PLAYLIST" | "MEETING" | "APPOINTMENT">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title" | "price">("newest");
  const [expandedPlaylists, setExpandedPlaylists] = useState<Record<string, boolean>>({});
  const [selectedReceipt, setSelectedReceipt] = useState<PurchasedItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [reschedulingItem, setReschedulingItem] = useState<PurchasedItem | null>(null);
  const [needsActionOnly, setNeedsActionOnly] = useState(false);

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
      if (needsActionOnly) {
        const pending = item.appointmentInfo?.pendingReschedule;
        if (!pending || pending.proposedByRole !== "HOST") return false;
      }
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        item.title.toLowerCase().includes(query) ||
        item.organization.name.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query)) ||
        (item.paymentId && item.paymentId.toLowerCase().includes(query)) ||
        (item.appointmentInfo?.hostName && item.appointmentInfo.hostName.toLowerCase().includes(query)) ||
        (item.appointmentInfo?.offeringTitle && item.appointmentInfo.offeringTitle.toLowerCase().includes(query)) ||
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
    .join(" + ") || "₹0.00";

  const needsActionItems = items.filter(
    (i) => i.contentType === "APPOINTMENT" && i.appointmentInfo?.pendingReschedule?.proposedByRole === "HOST"
  );
  const pendingAnyItems = items.filter(
    (i) => i.contentType === "APPOINTMENT" && Boolean(i.appointmentInfo?.pendingReschedule)
  );

  const refreshAll = async (isManual = false) => {
    await fetchPurchasedItems(isManual);
    try {
      window.dispatchEvent(new Event("notifications-refresh"));
    } catch {}
  };

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
            <Badge variant="secondary" className="font-bold">
              <Sparkles className="w-3 h-3 text-primary" />
              {items.length} Unlocked
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Access, stream, and review receipts for all videos, playlists, and appointments unlocked under your account
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshAll(true)}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-primary")} />
            Refresh
          </Button>
        </div>
      </div>

      {pendingAnyItems.length > 0 && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-sky-500/30 bg-sky-500/[0.07]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
              <CalendarClock className="w-4 h-4 text-sky-600 dark:text-sky-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">
                {pendingAnyItems.length} appointment{pendingAnyItems.length === 1 ? "" : "s"} with pending reschedule
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {needsActionItems.length > 0
                  ? `${needsActionItems.length} need${needsActionItems.length === 1 ? "s" : ""} your approval — original slots stay booked until you respond.`
                  : "Awaiting host approval — your original slots stay booked."}
              </p>
            </div>
          </div>
          {needsActionItems.length > 0 && (
            <Button
              size="sm"
              variant={needsActionOnly ? "default" : "outline"}
              onClick={() => {
                setNeedsActionOnly((v) => !v);
                setFilterType("APPOINTMENT");
              }}
              className="cursor-pointer text-xs font-bold shrink-0"
            >
              {needsActionOnly ? "Show all" : `Review (${needsActionItems.length})`}
            </Button>
          )}
        </div>
      )}

      {/* Metrics Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
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
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
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
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
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
            <span className="text-xs font-semibold text-muted-foreground">1:1 Appointments</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{stats.totalAppointments || 0}</span>
            <span className="text-xs text-muted-foreground font-medium">sessions booked</span>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs relative overflow-hidden col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Invested</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
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
            placeholder="Search by title, creator, host, payment ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border flex-wrap">
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
              <Film className="w-3.5 h-3.5" /> Videos
            </Button>
            <Button
              size="sm"
              variant={filterType === "PLAYLIST" ? "default" : "ghost"}
              onClick={() => setFilterType("PLAYLIST")}
              className="h-8 text-xs font-medium gap-1.5"
            >
              <ListVideo className="w-3.5 h-3.5" /> Playlists
            </Button>
            <Button
              size="sm"
              variant={filterType === "MEETING" ? "default" : "ghost"}
              onClick={() => setFilterType("MEETING")}
              className="h-8 text-xs font-medium gap-1.5"
            >
              <Ticket className="w-3.5 h-3.5" /> Meeting Passes
            </Button>
            <Button
              size="sm"
              variant={filterType === "APPOINTMENT" ? "default" : "ghost"}
              onClick={() => setFilterType("APPOINTMENT")}
              className="h-8 text-xs font-medium gap-1.5"
            >
              <CalendarClock className="w-3.5 h-3.5" /> Appointments
            </Button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 pl-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 hidden sm:inline" />
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
              <SelectTrigger size="sm" className="w-44 text-xs font-medium cursor-pointer" aria-label="Sort purchases">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                <SelectItem value="newest">Newest Purchased</SelectItem>
                <SelectItem value="oldest">Oldest Purchased</SelectItem>
                <SelectItem value="title">Title (A-Z)</SelectItem>
                <SelectItem value="price">Price (High to Low)</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
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
            const isAppointment = item.contentType === "APPOINTMENT";
            const isPlaylist = item.contentType === "PLAYLIST";
            const isMeeting = item.contentType === "MEETING";
            const isExpanded = expandedPlaylists[item.id] || false;
            const pending = item.appointmentInfo?.pendingReschedule || null;
            const needsClientAction = Boolean(pending && pending.proposedByRole === "HOST");

            return (
              <div
                key={item.id}
                className={cn(
                  "bg-card glass-card card-hover border rounded-2xl overflow-hidden shadow-2xs hover:shadow-lg hover:border-primary/50 transition-all duration-300 flex flex-col justify-between group",
                  needsClientAction ? "border-sky-500/50" : "border-border/80"
                )}
              >
                <div>
                  {/* Thumbnail / Header Area */}
                  <div className="aspect-video bg-muted relative overflow-hidden flex items-center justify-center">
                    {isAppointment ? (
                      <div className="w-full h-full bg-gradient-to-br from-primary/15 via-background to-primary/5 flex flex-col items-center justify-center p-4 text-center relative group-hover:scale-105 transition-transform duration-300">
                        {item.thumbnailUrl ? (
                          <div className="relative">
                            <img
                              src={item.thumbnailUrl}
                              alt={item.title}
                              className="w-16 h-16 rounded-full object-cover border-2 border-primary shadow-md"
                            />
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                              <CalendarClock className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center border border-primary/30 shadow-md">
                            <CalendarClock className="w-8 h-8" />
                          </div>
                        )}
                        <span className="text-xs font-bold text-foreground mt-2 line-clamp-1">
                          {item.appointmentInfo?.hostName ? `1:1 with ${item.appointmentInfo.hostName}` : "1:1 Appointment"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {item.durationSeconds ? `${Math.round(item.durationSeconds / 60)} mins session` : "Consultation"}
                        </span>
                      </div>
                    ) : !isMeeting && !isPlaylist ? (
                      <VideoThumbnail
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : isMeeting ? (
                      <div className="flex flex-col items-center gap-2 text-primary p-4 text-center">
                        <Ticket className="w-12 h-12" />
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Digital Entry Pass
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-primary p-4 text-center">
                        <ListVideo className="w-12 h-12" />
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Playlist Collection
                        </span>
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                    {/* Type Badge (Top Left) */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <Badge
                        variant={isAppointment ? "default" : isMeeting ? "outline" : isPlaylist ? "default" : "secondary"}
                        className={`gap-1 text-xs font-extrabold uppercase backdrop-blur-md shadow-xs ${
                          isMeeting ? "text-muted-foreground" : ""
                        }`}
                      >
                        {isAppointment ? (
                          <>
                            <CalendarClock className="w-3 h-3" /> Appointment
                          </>
                        ) : isMeeting ? (
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
                      {isAppointment && item.appointmentInfo?.status === "CANCELLED" ? (
                        <Badge variant="destructive" className="font-bold text-xs tracking-wider gap-1">
                          CANCELLED
                        </Badge>
                      ) : needsClientAction ? (
                        <Badge variant="outline" className="font-bold text-xs tracking-wider gap-1 bg-sky-500/90 text-white border-sky-300 animate-pulse">
                          ACTION NEEDED
                        </Badge>
                      ) : pending ? (
                        <Badge variant="outline" className="font-bold text-xs tracking-wider gap-1 bg-black/70 text-sky-200 border-sky-500/50">
                          RESCHEDULE PENDING
                        </Badge>
                      ) : (
                        <Badge className="font-black text-xs tracking-wider gap-1 shadow-xs">
                          <CheckCircle2 className="w-3 h-3" /> UNLOCKED
                        </Badge>
                      )}
                    </div>

                    {/* Duration / Item Count / Meeting Start (Bottom Right) */}
                    <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
                      {isAppointment && item.appointmentInfo?.scheduledStart ? (
                        <span className="px-2 py-0.5 bg-black/85 backdrop-blur-md text-xs font-bold text-white rounded-md flex items-center gap-1 border border-white/10">
                          <CalendarClock className="w-3 h-3 text-primary" />
                          {new Date(item.appointmentInfo.scheduledStart).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      ) : isMeeting && item.meetingInfo?.scheduledStart ? (
                        <span className="px-2 py-0.5 bg-black/85 backdrop-blur-md text-xs font-bold text-white rounded-md flex items-center gap-1 border border-white/10">
                          <Calendar className="w-3 h-3 text-primary" />
                          {new Date(item.meetingInfo.scheduledStart).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      ) : item.durationSeconds ? (
                        <span className="px-2 py-0.5 bg-black/85 backdrop-blur-md text-xs font-bold text-white rounded-md flex items-center gap-1 border border-white/10">
                          <Clock className="w-3 h-3 text-primary" />
                          {formatDuration(item.durationSeconds)}
                        </span>
                      ) : null}

                      {isPlaylist && item.itemCount !== undefined && (
                        <span className="px-2 py-0.5 bg-primary/95 text-primary-foreground text-xs font-black rounded-md flex items-center gap-1 shadow-xs">
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

                      <span className="text-xs font-medium text-muted-foreground shrink-0">
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

                    {/* Appointment Scheduled Time Banner */}
                    {isAppointment && item.appointmentInfo && (
                      <div className="space-y-2">
                        <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/15 text-xs space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3 text-primary" />
                              {new Date(item.appointmentInfo.scheduledStart || "").toLocaleDateString(undefined, {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <span className="font-semibold text-foreground">
                              {new Date(item.appointmentInfo.scheduledStart || "").toLocaleTimeString(undefined, {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                              {" - "}
                              {new Date(item.appointmentInfo.scheduledEnd || "").toLocaleTimeString(undefined, {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>
                              Host: <strong className="text-foreground">{item.appointmentInfo.hostName}</strong>
                            </span>
                            <span>{item.appointmentInfo.timezone}</span>
                          </div>
                          {(item.appointmentInfo.rescheduleCount || 0) > 0 && (
                            <p className="text-[11px] text-muted-foreground">
                              Rescheduled ×{item.appointmentInfo.rescheduleCount} — video room link unchanged
                            </p>
                          )}
                        </div>
                        {item.appointmentInfo.pendingReschedule && (
                          <RescheduleStatusCard
                            appointmentId={item.appointmentInfo.id}
                            pending={item.appointmentInfo.pendingReschedule}
                            viewerRole="CLIENT"
                            compact
                            onChanged={() => refreshAll(false)}
                          />
                        )}
                      </div>
                    )}

                    {/* Price Paid & Payment Badge */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground">
                          {formatPrice(item.amount, item.currency)}
                        </span>
                        <Badge variant="outline" className="text-xs uppercase font-mono py-0 h-4.5">
                          {item.paymentMethod}
                        </Badge>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedReceipt(item)}
                        className="h-7 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground gap-1"
                      >
                        <Receipt className="w-3 h-3 text-primary" /> Receipt
                      </Button>
                    </div>

                    {/* Playlist Items Dropdown Preview */}
                    {isPlaylist && item.playlistVideos.length > 0 && (
                      <div className="pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePlaylistExpand(item.id)}
                          className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer bg-muted/40 hover:bg-muted rounded-lg"
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
                        </Button>

                        {isExpanded && (
                          <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {item.playlistVideos.map((video, idx) => (
                              <div
                                key={video.id}
                                className="flex items-center justify-between text-xs p-1.5 rounded-md bg-muted/30 border border-border/40"
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
                <div className="p-4 pt-0 space-y-2">
                  <Link
                    href={
                      isAppointment
                        ? item.appointmentInfo?.joinUrl || (item.appointmentInfo?.meetingId ? `/meet/${item.appointmentInfo.meetingId}` : `/dashboard/appointments`)
                        : isMeeting
                        ? item.meetingInfo?.joinUrl || `/meet/${item.contentId}`
                        : item.shareUrl || `/share/${item.contentId}`
                    }
                    target={isAppointment || isMeeting ? "_self" : "_blank"}
                    className={cn(
                      buttonVariants({ variant: "default" }),
                      "w-full gap-2 font-bold shadow-xs"
                    )}
                  >
                    {isAppointment ? (
                      <>
                        <Video className="w-4 h-4" />
                        <span>Join Video Room</span>
                      </>
                    ) : isMeeting ? (
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
                  {isAppointment &&
                    item.appointmentInfo?.status === "CONFIRMED" &&
                    !item.appointmentInfo?.pendingReschedule &&
                    item.appointmentInfo?.scheduledStart &&
                    item.appointmentInfo?.offeringId &&
                    new Date(item.appointmentInfo.scheduledStart).getTime() > Date.now() && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReschedulingItem(item)}
                        className="w-full gap-2 text-xs font-semibold cursor-pointer"
                        title="Propose a new time — host must approve"
                      >
                        <CalendarClock className="w-3.5 h-3.5" />
                        Request reschedule
                      </Button>
                    )}
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
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
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
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-2 pr-1 text-sm">
                <div className="p-3.5 rounded-xl bg-muted/50 border border-border space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Item Purchased
                      </span>
                      <h4 className="font-bold text-foreground text-base">
                        {selectedReceipt.title}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        Type: {selectedReceipt.contentType === "APPOINTMENT" ? "1:1 APPOINTMENT" : selectedReceipt.contentType}
                      </span>
                    </div>
                    <Badge variant="secondary" className="font-bold">
                      PAID & UNLOCKED
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border text-xs">
                    <div>
                      <span className="text-muted-foreground block text-xs">
                        {selectedReceipt.contentType === "APPOINTMENT" ? "Host" : "Creator / Organization"}
                      </span>
                      <span className="font-semibold text-foreground">
                        {selectedReceipt.contentType === "APPOINTMENT" && selectedReceipt.appointmentInfo?.hostName
                          ? selectedReceipt.appointmentInfo.hostName
                          : selectedReceipt.organization.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Purchase Date</span>
                      <span className="font-semibold text-foreground">
                        {new Date(selectedReceipt.purchasedAt).toLocaleString()}
                      </span>
                    </div>
                    {selectedReceipt.contentType === "APPOINTMENT" && selectedReceipt.appointmentInfo?.scheduledStart && (
                      <div className="col-span-2 p-2 rounded-lg bg-background border border-border/80 space-y-0.5">
                        <span className="text-muted-foreground block text-xs">Scheduled Session</span>
                        <span className="font-semibold text-foreground block">
                          {new Date(selectedReceipt.appointmentInfo.scheduledStart).toLocaleString(undefined, {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}{" "}
                          ({selectedReceipt.appointmentInfo.timezone})
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground block text-xs">Amount Paid</span>
                      <span className="font-bold text-primary text-sm">
                        {formatPrice(selectedReceipt.amount, selectedReceipt.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Payment Method</span>
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
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
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
                        <Check className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>

                  {selectedReceipt.paymentId && (
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border">
                      <div className="min-w-0">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
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
                          <Check className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Pinned Action Buttons inside DialogFooter */}
              <DialogFooter className="pt-3 border-t border-border shrink-0 mt-auto flex flex-col sm:flex-row items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedReceipt(null)}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
                <Link
                  href={
                    selectedReceipt.contentType === "APPOINTMENT"
                      ? selectedReceipt.appointmentInfo?.joinUrl || (selectedReceipt.appointmentInfo?.meetingId ? `/meet/${selectedReceipt.appointmentInfo.meetingId}` : `/dashboard/appointments`)
                      : selectedReceipt.contentType === "MEETING"
                      ? selectedReceipt.meetingInfo?.joinUrl || `/meet/${selectedReceipt.contentId}`
                      : selectedReceipt.shareUrl || `/share/${selectedReceipt.contentId}`
                  }
                  target={selectedReceipt.contentType === "APPOINTMENT" || selectedReceipt.contentType === "MEETING" ? "_self" : "_blank"}
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "w-full sm:w-auto flex-1 gap-2 font-bold"
                  )}
                >
                  {selectedReceipt.contentType === "APPOINTMENT" || selectedReceipt.contentType === "MEETING" ? (
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
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {reschedulingItem?.appointmentInfo?.offeringId && (
        <RescheduleDialog
          open={Boolean(reschedulingItem)}
          onOpenChange={(open) => {
            if (!open) setReschedulingItem(null);
          }}
          appointmentId={reschedulingItem.appointmentInfo.id}
          offeringId={reschedulingItem.appointmentInfo.offeringId || ""}
          currentStart={reschedulingItem.appointmentInfo.scheduledStart || ""}
          currentEnd={reschedulingItem.appointmentInfo.scheduledEnd || ""}
          defaultTimezone={reschedulingItem.appointmentInfo.timezone}
          onSuccess={() => {
            setReschedulingItem(null);
            refreshAll(false);
          }}
        />
      )}
    </div>
  );
}
