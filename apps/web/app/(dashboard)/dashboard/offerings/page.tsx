"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ListVideo,
  Sparkles,
  Save,
  RotateCcw,
  Check,
  Loader2,
  Share2,
  Copy,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Calendar,
  Video as VideoIcon,
  Film,
  Play,
  Package,
  Briefcase,
  Upload,
  ImageIcon,
  Smartphone,
  Tablet,
  Monitor,
  MessageSquare,
  Clock,
  Star,
  Users,
  Palette,
  Sliders,
  Mail,
  FileText,
  SlidersHorizontal,
} from "lucide-react";
import {
  OfferingsConfigData,
  OfferingItemData,
  getSocialPlatformMeta,
  resolveVideoEmbedDetails,
} from "@/app/offerings/[slug]/offerings-client";
import {
  DEFAULT_OFFERINGS_CONFIG,
  SUPPORTED_SOCIAL_PLATFORMS,
} from "@/lib/offerings-defaults";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import ImageCropperModal, { AspectRatioOption } from "@/components/ImageCropperModal";
import VideoPickerModal, { SelectedVideoPayload } from "@/components/VideoPickerModal";
import Link from "next/link";
import { formatDuration } from "@/lib/video-utils";
import { formatCurrencyPrice } from "@/lib/utils";

export interface PlaylistItemSummary {
  id: string;
  title: string;
  description: string | null;
  shareAccessMode: "PUBLIC" | "RESTRICTED" | "PRIVATE" | "PURCHASABLE";
  price?: number | null;
  currency?: string | null;
  itemCount: number;
  totalDurationSeconds: number;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

const THEME_PRESET_OPTIONS = [
  { id: "obsidian", name: "Obsidian Dark", accent: "#84cc16", bg: "#030712", card: "#0b1329" },
  { id: "aurora", name: "Aurora Glow", accent: "#6366f1", bg: "#070b19", card: "#0f172a" },
  { id: "sunset", name: "Sunset Velvet", accent: "#f97316", bg: "#0f0714", card: "#1e0e24" },
  { id: "minimal-light", name: "Minimal Light", accent: "#2563eb", bg: "#f8fafc", card: "#ffffff" },
  { id: "cyberpunk", name: "Neon Cyberpunk", accent: "#06b6d4", bg: "#070312", card: "#130724" },
  { id: "rose-gold", name: "Rose Gold", accent: "#f43f5e", bg: "#0d070b", card: "#1b0f17" },
  { id: "emerald", name: "Forest Emerald", accent: "#10b981", bg: "#03140d", card: "#082218" },
  { id: "midnight", name: "Midnight Sky", accent: "#38bdf8", bg: "#020617", card: "#091124" },
];

const QUICK_ACCENTS = ["#84cc16", "#6366f1", "#f97316", "#2563eb", "#06b6d4", "#f43f5e", "#10b981", "#38bdf8", "#eab308", "#a855f7"];

export default function OfferingsDashboardPage() {
  const [activeTab, setActiveTab] = useState<"catalog" | "customizer" | "inquiries">("catalog");

  // Config and items state
  const [config, setConfig] = useState<OfferingsConfigData>(DEFAULT_OFFERINGS_CONFIG);
  const [items, setItems] = useState<OfferingItemData[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistItemSummary[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Customizer Live Preview device mode & iframe ref
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Deferred image uploads for config (base64)
  const [newAvatarData, setNewAvatarData] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [newBannerData, setNewBannerData] = useState<string | null>(null);
  const [removeBanner, setRemoveBanner] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Image Cropper State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropAspectRatio, setCropAspectRatio] = useState<AspectRatioOption>("1:1");
  const [cropTargetType, setCropTargetType] = useState<"avatar" | "banner" | "itemCover">("avatar");
  const [cropTitle, setCropTitle] = useState("Crop Image");
  const [cropDescription, setCropDescription] = useState("");
  const [cropAllowRatioChange, setCropAllowRatioChange] = useState(false);

  // Send real-time configuration to preview iframe
  const sendPreviewUpdate = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: "OFFERINGS_PREVIEW_UPDATE",
          config: {
            ...config,
            avatarUrl: newAvatarData || (removeAvatar ? null : config.avatarUrl),
            bannerUrl: newBannerData || (removeBanner ? null : config.bannerUrl),
          },
          items,
        },
        "*"
      );
    }
  }, [config, items, newAvatarData, removeAvatar, newBannerData, removeBanner]);

  useEffect(() => {
    sendPreviewUpdate();
  }, [config, items, newAvatarData, removeAvatar, newBannerData, removeBanner, sendPreviewUpdate]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "OFFERINGS_PREVIEW_FRAME_READY") {
        sendPreviewUpdate();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [sendPreviewUpdate]);

  // Item Modal State (Create / Edit)
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OfferingItemData | null>(null);
  const [itemFormType, setItemFormType] = useState<string>("PLAYLIST");
  const [itemFormTitle, setItemFormTitle] = useState("");
  const [itemFormSubtitle, setItemFormSubtitle] = useState("");
  const [itemFormDescription, setItemFormDescription] = useState("");
  const [itemFormPrice, setItemFormPrice] = useState("");
  const [itemFormPricePeriod, setItemFormPricePeriod] = useState("");
  const [itemFormBadge, setItemFormBadge] = useState("");
  const [itemFormCtaText, setItemFormCtaText] = useState("Learn More");
  const [itemFormCtaAction, setItemFormCtaAction] = useState<string>("INQUIRY_MODAL");
  const [itemFormCtaUrl, setItemFormCtaUrl] = useState("");
  const [itemFormHighlights, setItemFormHighlights] = useState<string>("");
  const [itemFormDuration, setItemFormDuration] = useState("");
  const [itemFormDelivery, setItemFormDelivery] = useState("");
  const [itemFormIsFeatured, setItemFormIsFeatured] = useState(false);
  const [itemFormIsPublished, setItemFormIsPublished] = useState(true);
  const [itemFormCoverData, setItemFormCoverData] = useState<string | null>(null);
  const [itemFormRemoveCover, setItemFormRemoveCover] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const itemCoverInputRef = useRef<HTMLInputElement>(null);

  // Video Picker Modal State
  const [videoPickerOpen, setVideoPickerOpen] = useState(false);
  const [videoPickerTarget, setVideoPickerTarget] = useState<"itemForm" | "primaryCta" | "secondaryCta" | "featuredVideo">("itemForm");

  // In-Dashboard Video Preview Modal State
  const [previewVideoModalUrl, setPreviewVideoModalUrl] = useState<string | null>(null);

  const handleSelectPlaylist = (playlist: PlaylistItemSummary) => {
    setSelectedPlaylistId(playlist.id);
    setItemFormTitle(playlist.title);
    setItemFormSubtitle("");
    setItemFormDescription(playlist.description || "");
    setItemFormCoverData(playlist.thumbnailUrl || null);
    setItemFormRemoveCover(false);
    setItemFormCtaUrl(`/share/${playlist.id}`);
    setItemFormCtaAction("EXTERNAL_LINK");
    setItemFormDelivery(
      `${playlist.itemCount} Video Modules • ${playlist.totalDurationSeconds > 0 ? formatDuration(playlist.totalDurationSeconds) : "Self-paced Series"}`
    );

    if (playlist.shareAccessMode === "PURCHASABLE") {
      setItemFormPrice(formatCurrencyPrice(playlist.price, playlist.currency || "USD"));
      setItemFormPricePeriod("one-time");
      setItemFormCtaText("Purchase");
    } else if (playlist.shareAccessMode === "RESTRICTED") {
      setItemFormPrice("Restricted");
      setItemFormPricePeriod("");
      setItemFormCtaText("View / Request Access");
    } else {
      setItemFormPrice("Free");
      setItemFormPricePeriod("");
      setItemFormCtaText("Watch");
    }
  };

  const handleVideoSelected = (video: SelectedVideoPayload) => {
    if (videoPickerTarget === "itemForm") {
      const isCustomUrl = video.id.startsWith("custom_");
      const targetUrl = isCustomUrl ? video.embedUrl : `/share/${video.id}`;
      setItemFormCtaUrl(targetUrl);
      setItemFormCtaAction(isCustomUrl ? "FEATURED_VIDEO" : "EXTERNAL_LINK");
      setItemFormTitle(video.title || "Video Showcase");
      setItemFormDescription(video.description || "");
      setItemFormCoverData(video.thumbnailUrl || null);
      setItemFormRemoveCover(false);
      setItemFormDelivery("Self-paced HD Video");

      if (video.shareAccessMode === "PURCHASABLE") {
        setItemFormPrice(formatCurrencyPrice(video.price, video.currency || "USD"));
        setItemFormPricePeriod("one-time");
        setItemFormCtaText("Purchase");
      } else if (video.shareAccessMode === "RESTRICTED") {
        setItemFormPrice("Restricted");
        setItemFormPricePeriod("");
        setItemFormCtaText("View / Request Access");
      } else {
        setItemFormPrice("Free");
        setItemFormPricePeriod("");
        setItemFormCtaText("Watch");
      }
    } else if (videoPickerTarget === "primaryCta") {
      setConfig((prev) => ({
        ...prev,
        ctaUrl: video.embedUrl,
        ctaAction: "FEATURED_VIDEO",
        ctaText: (!prev.ctaText || prev.ctaText === "Explore Offerings") ? "Watch Video" : prev.ctaText,
      }));
    } else if (videoPickerTarget === "secondaryCta") {
      setConfig((prev) => ({
        ...prev,
        secondaryCtaUrl: video.embedUrl,
        secondaryCtaAction: "FEATURED_VIDEO",
        secondaryCtaText: (!prev.secondaryCtaText || prev.secondaryCtaText === "Book 1:1 Session" || prev.secondaryCtaText === "Book 1:1 Call") ? "Watch Showcase" : prev.secondaryCtaText,
      }));
    } else if (videoPickerTarget === "featuredVideo") {
      setConfig((prev) => ({
        ...prev,
        featuredVideoUrl: video.embedUrl,
      }));
    }
  };

  // Delete Item State
  const [deleteItemTarget, setDeleteItemTarget] = useState<OfferingItemData | null>(null);

  // Reset Config Confirm State
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [cfgRes, itemsRes, inqRes, playlistsRes] = await Promise.all([
        fetch("/api/organization/offerings-config"),
        fetch("/api/organization/offerings/items"),
        fetch("/api/organization/offerings/inquiries"),
        fetch("/api/playlists"),
      ]);

      if (cfgRes.ok) {
        const cfgData = await cfgRes.json();
        if (cfgData.config) {
          setConfig((prev) => ({
            ...prev,
            ...cfgData.config,
          }));
        }
      }

      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        if (itemsData.items) {
          setItems(itemsData.items);
        }
      }

      if (inqRes.ok) {
        const inqData = await inqRes.json();
        if (inqData.inquiries) {
          setInquiries(inqData.inquiries);
        }
      }

      if (playlistsRes.ok) {
        const plData = await playlistsRes.json();
        if (plData.playlists) {
          setPlaylists(plData.playlists);
        }
      }
    } catch (err) {
      console.error("Failed to load offerings dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPublicLink = () => {
    if (typeof window !== "undefined" && config.orgSlug) {
      const url = `${window.location.origin}/offerings/${config.orgSlug}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Avatar file selection with 1:1 crop modal
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Avatar image size must be under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const res = event.target?.result as string;
      setCropImageSrc(res);
      setCropAspectRatio("1:1");
      setCropTargetType("avatar");
      setCropTitle("Crop Creator Avatar / Logo");
      setCropDescription("Position and zoom your avatar to a 1:1 square ratio (Recommended: 400×400px or 512×512px).");
      setCropAllowRatioChange(false);
      setCropModalOpen(true);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  // Banner file selection with 3:1 / 16:9 crop modal
  const handleBannerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Banner image size must be under 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const res = event.target?.result as string;
      setCropImageSrc(res);
      setCropAspectRatio("3:1");
      setCropTargetType("banner");
      setCropTitle("Crop Cover Banner");
      setCropDescription("Position and zoom your header banner (Recommended: 3:1 ratio 1200×400px or 16:9 1920×640px).");
      setCropAllowRatioChange(true);
      setCropModalOpen(true);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  // Offering Item cover file selection with 16:9 crop modal
  const handleItemCoverFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert("Offering cover image size must be under 8MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const res = event.target?.result as string;
      setCropImageSrc(res);
      setCropAspectRatio("16:9");
      setCropTargetType("itemCover");
      setCropTitle("Crop Offering Cover Image");
      setCropDescription("Position and zoom your playlist/offering card cover (Recommended: 16:9 ratio 1280×720px).");
      setCropAllowRatioChange(false);
      setCropModalOpen(true);
      if (itemCoverInputRef.current) itemCoverInputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  // Handle Crop Complete from Modal
  const handleCropComplete = (croppedBase64: string) => {
    if (cropTargetType === "avatar") {
      setNewAvatarData(croppedBase64);
      setRemoveAvatar(false);
      setConfig((prev) => ({ ...prev, avatarUrl: croppedBase64 }));
    } else if (cropTargetType === "banner") {
      setNewBannerData(croppedBase64);
      setRemoveBanner(false);
      setConfig((prev) => ({ ...prev, bannerUrl: croppedBase64 }));
    } else if (cropTargetType === "itemCover") {
      setItemFormCoverData(croppedBase64);
      setItemFormRemoveCover(false);
    }
  };

  // Save Customizer Settings
  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      setSaveSuccess(false);

      const payload = {
        ...config,
        newAvatarData,
        removeAvatar,
        newBannerData,
        removeBanner,
      };

      const res = await fetch("/api/organization/offerings-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig((prev) => ({
            ...prev,
            ...data.config,
          }));
        }
        setNewAvatarData(null);
        setRemoveAvatar(false);
        setNewBannerData(null);
        setRemoveBanner(false);

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert("Failed to save customization. Please try again.");
      }
    } catch (e) {
      console.error("Save config error:", e);
      alert("An error occurred while saving customization.");
    } finally {
      setSaving(false);
    }
  };

  // Reset to Defaults
  const handleExecuteReset = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/organization/offerings-config", {
        method: "DELETE",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig((prev) => ({
            ...prev,
            ...data.config,
          }));
        }
        setNewAvatarData(null);
        setNewBannerData(null);
        setResetConfirmOpen(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error("Reset error:", e);
    } finally {
      setSaving(false);
    }
  };

  // Seed Starter Offerings
  const handleSeedDefaults = async () => {
    try {
      setSeeding(true);
      const res = await fetch("/api/organization/offerings/seed-defaults", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        await fetchInitialData();
        alert(data.message || `Successfully seeded ${data.seededCount} starter offerings!`);
      } else {
        alert(data.error || "Failed to seed starter offerings.");
      }
    } catch (e) {
      console.error("Seed error:", e);
      alert("Error seeding starter offerings.");
    } finally {
      setSeeding(false);
    }
  };

  // Open Create/Edit Item Modal
  const handleOpenItemModal = (item?: OfferingItemData) => {
    if (item) {
      setEditingItem(item);
      const type = item.type === "COURSE" ? "PLAYLIST" : item.type;
      setItemFormType(type);
      setItemFormTitle(item.title);
      setItemFormSubtitle(item.subtitle || "");
      setItemFormDescription(item.description || "");
      setItemFormPrice(item.price || "");
      setItemFormPricePeriod(item.pricePeriod || "");
      setItemFormBadge(item.badge || "");
      setItemFormCtaText(item.ctaText || (type === "VIDEO" ? "Watch Video" : type === "PLAYLIST" ? "Explore Playlist" : "Learn More"));
      setItemFormCtaAction(item.ctaAction || (type === "VIDEO" ? "FEATURED_VIDEO" : item.ctaUrl?.startsWith("http") ? "EXTERNAL_LINK" : "INQUIRY_MODAL"));
      setItemFormCtaUrl(item.ctaUrl || "");
      setItemFormHighlights((item.highlights || []).join("\n"));
      setItemFormDuration(item.meetingDuration || "");
      setItemFormDelivery(item.deliveryFormat || (type === "VIDEO" ? "Self-paced HD Video" : type === "PLAYLIST" ? "Self-paced Series" : ""));
      setItemFormIsFeatured(item.isFeatured || false);
      setItemFormIsPublished(item.isPublished !== false);
      setItemFormCoverData(item.coverImageUrl || null);

      if (type === "PLAYLIST") {
        const matched = playlists.find(
          (p) => (item.ctaUrl && item.ctaUrl.includes(p.id)) || p.title.toLowerCase() === item.title.toLowerCase()
        );
        if (matched) {
          setSelectedPlaylistId(matched.id);
        } else {
          setSelectedPlaylistId("");
        }
      } else {
        setSelectedPlaylistId("");
      }
    } else {
      setEditingItem(null);
      setItemFormType("PLAYLIST");
      setItemFormSubtitle("");
      setItemFormPrice("$99");
      setItemFormPricePeriod("one-time");
      setItemFormBadge("Popular");
      setItemFormCtaText("Explore Playlist");
      setItemFormCtaAction("INQUIRY_MODAL");
      setItemFormHighlights("Full Lifetime Access\nDownloadable Source Code\nPrivate Community Access");
      setItemFormDuration("");
      setItemFormIsFeatured(false);
      setItemFormIsPublished(true);

      if (playlists.length > 0) {
        const firstPl = playlists[0];
        handleSelectPlaylist(firstPl);
      } else {
        setSelectedPlaylistId("");
        setItemFormTitle("");
        setItemFormDescription("");
        setItemFormCoverData(null);
        setItemFormCtaUrl("");
        setItemFormDelivery("Self-paced Series");
        setItemFormPrice("Free");
        setItemFormPricePeriod("");
      }
    }
    setItemFormRemoveCover(false);
    setItemModalOpen(true);
  };

  // Save Item (Create or Update)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();

    const isPlaylist = itemFormType === "PLAYLIST" || itemFormType === "COURSE";
    const isVideo = itemFormType === "VIDEO";

    if (isPlaylist) {
      if (!itemFormTitle.trim()) {
        alert("Please select a playlist for this offering.");
        return;
      }
    } else if (isVideo) {
      if (!itemFormCtaUrl.trim() && !itemFormTitle.trim()) {
        alert("Please select or specify a video for this video offering.");
        return;
      }
      if (!itemFormTitle.trim()) {
        alert("Offering title is required.");
        return;
      }
    } else {
      if (!itemFormTitle.trim()) {
        alert("Offering title is required.");
        return;
      }
    }

    try {
      setSavingItem(true);
      const highlightsArray = itemFormHighlights
        .split("\n")
        .map((h) => h.trim())
        .filter(Boolean);

      const payload = {
        type: itemFormType,
        title: itemFormTitle.trim(),
        subtitle: (isPlaylist || isVideo) ? null : (itemFormSubtitle.trim() || null),
        description: itemFormDescription.trim() || null,
        price: itemFormPrice.trim() || null,
        pricePeriod: itemFormPricePeriod.trim() || null,
        badge: itemFormBadge.trim() || null,
        ctaText: isPlaylist
          ? (itemFormPrice === "Restricted" ? "View / Request Access" : itemFormPrice && itemFormPrice !== "Free" ? "Purchase" : "Watch")
          : isVideo
            ? (itemFormPrice === "Restricted" ? "View / Request Access" : itemFormPrice && itemFormPrice !== "Free" ? "Purchase" : "Watch")
            : (itemFormCtaText.trim() || "Learn More"),
        ctaAction: isPlaylist
          ? "EXTERNAL_LINK"
          : isVideo
            ? (itemFormCtaUrl.startsWith("http") ? "FEATURED_VIDEO" : "EXTERNAL_LINK")
            : itemFormCtaAction,
        ctaUrl: itemFormCtaUrl.trim() || null,
        highlights: highlightsArray,
        meetingDuration: itemFormType === "MEETING" ? (itemFormDuration.trim() || null) : null,
        deliveryFormat: itemFormDelivery.trim() || (isVideo ? "Self-paced HD Video" : isPlaylist ? "Self-paced Series" : null),
        isFeatured: itemFormIsFeatured,
        isPublished: itemFormIsPublished,
        coverImageData: itemFormCoverData?.startsWith("data:") ? itemFormCoverData : undefined,
        coverImageKey: itemFormCoverData && !itemFormCoverData.startsWith("data:") ? itemFormCoverData : undefined,
        removeCoverImage: itemFormRemoveCover,
      };

      let res;
      if (editingItem) {
        res = await fetch(`/api/organization/offerings/items/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/organization/offerings/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setItemModalOpen(false);
        // Refresh items
        const updatedRes = await fetch("/api/organization/offerings/items");
        if (updatedRes.ok) {
          const updatedData = await updatedRes.json();
          setItems(updatedData.items || []);
        }
      } else {
        alert("Failed to save offering item.");
      }
    } catch (err) {
      console.error("Save item error:", err);
      alert("An error occurred while saving offering.");
    } finally {
      setSavingItem(false);
    }
  };

  // Delete Item
  const handleConfirmDeleteItem = async () => {
    if (!deleteItemTarget) return;
    try {
      const res = await fetch(`/api/organization/offerings/items/${deleteItemTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setItems((prev) => prev.filter((it) => it.id !== deleteItemTarget.id));
        setDeleteItemTarget(null);
      } else {
        alert("Failed to delete item.");
      }
    } catch (e) {
      console.error("Delete item error:", e);
    }
  };

  // Toggle publish item
  const handleTogglePublish = async (item: OfferingItemData) => {
    try {
      const newStatus = !item.isPublished;
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, isPublished: newStatus } : it)));
      await fetch(`/api/organization/offerings/items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: newStatus }),
      });
    } catch (e) {
      console.error("Toggle publish error:", e);
    }
  };

  // Update Inquiry Status
  const handleUpdateInquiryStatus = async (inquiryId: string, status: string) => {
    try {
      setInquiries((prev) => prev.map((iq) => (iq.id === inquiryId ? { ...iq, status } : iq)));
      await fetch(`/api/organization/offerings/inquiries/${inquiryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch (e) {
      console.error("Inquiry status update error:", e);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-semibold text-muted-foreground">Loading Offerings Portfolio Hub...</p>
      </div>
    );
  }

  const publicUrl = typeof window !== "undefined" && config.orgSlug ? `${window.location.origin}/offerings/${config.orgSlug}` : `/offerings/${config.orgSlug || "org"}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner with Public Share Link & Actions */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-700/60 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-lime-400">
            <Sparkles className="w-4 h-4" /> Creator Portfolio & Offerings Page
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Offerings & Landing Hub</h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Showcase what your organization provides—playlists, 1:1 mentorship calls, video assets, and digital products—on your custom public link.
          </p>

          {/* Public Link Bar */}
          <div className="flex items-center gap-2 pt-2">
            <div className="px-3 py-1.5 rounded-lg bg-black/60 border border-slate-700 text-xs font-mono text-lime-300 truncate max-w-xs sm:max-w-md">
              {publicUrl}
            </div>
            <button
              onClick={handleCopyPublicLink}
              title="Copy public link"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 transition-all cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-lime-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <a
              href={`/offerings/${config.orgSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-lime-500 hover:bg-lime-400 text-black font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Open Live Page</span>
            </a>
          </div>
        </div>

        {/* Quick Stats Widget */}
        <div className="grid grid-cols-3 gap-2 bg-black/40 p-3.5 rounded-xl border border-slate-700/80 shrink-0 text-center">
          <div className="px-2">
            <div className="text-lg font-black text-lime-400">{items.length}</div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Offerings</div>
          </div>
          <div className="px-2 border-x border-slate-700">
            <div className="text-lg font-black text-sky-400">{inquiries.length}</div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Inquiries</div>
          </div>
          <div className="px-2">
            <div className="text-lg font-black text-indigo-400">
              {items.filter((i) => i.isPublished).length}
            </div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Active</div>
          </div>
        </div>
      </div>

      {/* Main Workspace Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <TabsList className="bg-muted p-1 rounded-xl">
            <TabsTrigger value="catalog" className="rounded-lg text-xs font-bold gap-1.5 cursor-pointer">
              <Package className="w-3.5 h-3.5" />
              <span>Offerings Catalog ({items.length})</span>
            </TabsTrigger>
            <TabsTrigger value="customizer" className="rounded-lg text-xs font-bold gap-1.5 cursor-pointer">
              <Palette className="w-3.5 h-3.5" />
              <span>Live Page Customizer</span>
            </TabsTrigger>
            <TabsTrigger value="inquiries" className="rounded-lg text-xs font-bold gap-1.5 cursor-pointer">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Inquiries & Leads ({inquiries.length})</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {activeTab === "catalog" && (
              <>
                {items.length === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={seeding}
                    onClick={handleSeedDefaults}
                    className="text-xs font-bold gap-1.5 cursor-pointer border-dashed"
                  >
                    {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-lime-500" />}
                    <span>Seed Sample Offerings</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => handleOpenItemModal()}
                  className="text-xs font-bold gap-1.5 bg-primary text-white shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Offering</span>
                </Button>
              </>
            )}

            {activeTab === "customizer" && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setResetConfirmOpen(true)}
                  className="text-xs font-semibold gap-1 text-slate-500 hover:text-red-500 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Defaults</span>
                </Button>
                <Button
                  size="sm"
                  disabled={saving}
                  onClick={handleSaveConfig}
                  className="text-xs font-bold gap-1.5 bg-lime-600 hover:bg-lime-500 text-white shadow-md cursor-pointer"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{saving ? "Saving..." : saveSuccess ? "Saved!" : "Save Customization"}</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* TAB 1: OFFERINGS CATALOG */}
        <TabsContent value="catalog" className="space-y-6">
          {items.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-4">
              <Package className="w-16 h-16 mx-auto text-muted-foreground opacity-40" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold">No offerings added yet</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Start listing what you provide—playlists, 1:1 sessions, video masterclasses, or resources—or seed sample offerings in 1 click.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={seeding}
                  onClick={handleSeedDefaults}
                  className="text-xs font-bold gap-1.5 cursor-pointer"
                >
                  {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-lime-500" />}
                  <span>Seed Starter Catalog</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleOpenItemModal()}
                  className="text-xs font-bold gap-1.5 bg-primary text-white cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Offering</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    {item.coverImageUrl && (
                      <div className="w-full h-40 relative bg-black/20 overflow-hidden">
                        <img src={item.coverImageUrl} alt={item.title} className="w-full h-full object-cover" />
                        {item.badge && (
                          <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-primary text-white shadow-md">
                            {item.badge}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-muted text-foreground">
                          {(item.type === "PLAYLIST" || item.type === "COURSE") && <ListVideo className="w-3.5 h-3.5 text-emerald-500" />}
                          {item.type === "MEETING" && <Calendar className="w-3.5 h-3.5 text-sky-500" />}
                          {item.type === "VIDEO" && <VideoIcon className="w-3.5 h-3.5 text-indigo-500" />}
                          {item.type === "PRODUCT" && <Package className="w-3.5 h-3.5 text-amber-500" />}
                          {item.type === "SERVICE" && <Briefcase className="w-3.5 h-3.5 text-purple-500" />}
                          <span>{item.type === "COURSE" ? "PLAYLIST" : item.type}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-extrabold uppercase ${item.isPublished ? "text-emerald-500" : "text-muted-foreground"}`}>
                            {item.isPublished ? "Published" : "Draft"}
                          </span>
                          <Switch
                            checked={item.isPublished}
                            onCheckedChange={() => handleTogglePublish(item)}
                          />
                        </div>
                      </div>

                      <div>
                        <h4 className="font-extrabold text-base line-clamp-1">{item.title}</h4>
                        {item.subtitle && (
                          <p className="text-xs text-primary font-medium line-clamp-1">{item.subtitle}</p>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                      )}

                      <div className="flex items-baseline gap-1 pt-1">
                        <span className="text-lg font-black text-foreground">{item.price || "Free"}</span>
                        {item.pricePeriod && (
                          <span className="text-[11px] text-muted-foreground">{item.pricePeriod}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenItemModal(item)}
                      className="text-xs font-bold gap-1 text-primary cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteItemTarget(item)}
                      className="text-xs font-bold gap-1 text-red-500 hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: LIVE SPLIT-SCREEN CUSTOMIZER */}
        <TabsContent value="customizer" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Controls Column (5 cols) */}
            <div className="lg:col-span-5 space-y-6 bg-card border border-border p-6 rounded-2xl shadow-sm">
              <div className="space-y-1">
                <h3 className="font-extrabold text-lg flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  <span>Portfolio Styling & Layout</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Changes reflect instantly in the interactive live preview on the right.
                </p>
              </div>

              {/* Theme Preset Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-primary" /> Theme Preset
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {THEME_PRESET_OPTIONS.map((theme) => {
                    const isSelected = (config.themePreset || "obsidian") === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            themePreset: theme.id,
                            accentColor: theme.accent,
                          }))
                        }
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected ? "ring-2 ring-primary border-primary font-bold shadow-xs" : "hover:border-slate-400"
                        }`}
                        style={{ backgroundColor: theme.bg, color: "#ffffff" }}
                      >
                        <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: theme.accent }} />
                        <span className="text-xs truncate">{theme.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accent Color Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">Custom Accent Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {QUICK_ACCENTS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, accentColor: hex }))}
                      className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer ${
                        config.accentColor === hex ? "scale-110 ring-2 ring-offset-2 ring-primary" : ""
                      }`}
                      style={{ backgroundColor: hex, borderColor: "#ffffff" }}
                    />
                  ))}
                  <input
                    type="color"
                    value={config.accentColor || "#84cc16"}
                    onChange={(e) => setConfig((prev) => ({ ...prev, accentColor: e.target.value }))}
                    className="w-8 h-8 rounded-full border cursor-pointer"
                  />
                </div>
              </div>

              {/* Background Style */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">Background Style</label>
                <Select
                  value={config.backgroundStyle || "mesh-gradient"}
                  onValueChange={(val) => setConfig((prev) => ({ ...prev, backgroundStyle: val || undefined }))}
                >
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue placeholder="Select background style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mesh-gradient">Mesh Glow Gradient (Modern)</SelectItem>
                    <SelectItem value="obsidian-aura">Ambient Top Aura</SelectItem>
                    <SelectItem value="minimal-grid">Subtle Grid Pattern</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Card Roundness */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">Card Corner Style</label>
                <Select
                  value={config.cardRoundness || "2xl"}
                  onValueChange={(val) => setConfig((prev) => ({ ...prev, cardRoundness: val || undefined }))}
                >
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue placeholder="Card Roundness" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xl">Subtle Rounded (xl)</SelectItem>
                    <SelectItem value="2xl">Standard Modern (2xl)</SelectItem>
                    <SelectItem value="3xl">Ultra Pill Soft (3xl)</SelectItem>
                    <SelectItem value="square">Clean Sharp (Square)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Banner & Avatar Uploads */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="text-xs font-bold text-foreground">Media & Branding</div>

                {/* Banner Upload */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                    <div>
                      <span>Cover Banner</span>
                      <span className="ml-1.5 text-[10px] text-lime-600 dark:text-lime-400 font-mono">3:1 / 16:9</span>
                    </div>
                    {config.bannerUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setRemoveBanner(true);
                          setNewBannerData(null);
                          setConfig((prev) => ({ ...prev, bannerUrl: null }));
                        }}
                        className="text-red-500 text-[10px] font-bold hover:underline cursor-pointer"
                      >
                        Remove Banner
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={bannerInputRef}
                    accept="image/*"
                    onChange={handleBannerFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => bannerInputRef.current?.click()}
                    className="w-full text-xs font-bold gap-1.5 cursor-pointer rounded-xl"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>{config.bannerUrl ? "Change Banner Image (Crop)" : "Upload Banner Image (3:1)"}</span>
                  </Button>
                  <p className="text-[10px] text-muted-foreground">
                    Recommended: <strong>1200×400px</strong> (3:1 panorama) or 1920×640px. Opens cropper.
                  </p>
                </div>

                {/* Avatar Upload */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                    <div>
                      <span>Creator Avatar / Logo</span>
                      <span className="ml-1.5 text-[10px] text-lime-600 dark:text-lime-400 font-mono">1:1 Square</span>
                    </div>
                    {config.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setRemoveAvatar(true);
                          setNewAvatarData(null);
                          setConfig((prev) => ({ ...prev, avatarUrl: null }));
                        }}
                        className="text-red-500 text-[10px] font-bold hover:underline cursor-pointer"
                      >
                        Remove Avatar
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={avatarInputRef}
                    accept="image/*"
                    onChange={handleAvatarFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => avatarInputRef.current?.click()}
                    className="w-full text-xs font-bold gap-1.5 cursor-pointer rounded-xl"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{config.avatarUrl ? "Change Avatar Image (Crop)" : "Upload Avatar Image (1:1)"}</span>
                  </Button>
                  <p className="text-[10px] text-muted-foreground">
                    Recommended: <strong>400×400px</strong> or 512×512px (1:1 square). Opens cropper.
                  </p>
                </div>
              </div>

              {/* Hero Headlines & Bio */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="text-xs font-bold text-foreground">Hero Copy & Bio</div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Main Headline</label>
                  <input
                    type="text"
                    value={config.headline || ""}
                    onChange={(e) => setConfig((prev) => ({ ...prev, headline: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-xs border bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Subheadline / Tagline</label>
                  <input
                    type="text"
                    value={config.subheadline || ""}
                    onChange={(e) => setConfig((prev) => ({ ...prev, subheadline: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-xs border bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">About / Bio</label>
                  <textarea
                    rows={3}
                    value={config.bio || ""}
                    onChange={(e) => setConfig((prev) => ({ ...prev, bio: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-xs border bg-background resize-none"
                  />
                </div>
              </div>

              {/* Featured Showcase Video */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-primary" />
                    <span>Featured Showcase Video</span>
                  </div>
                  {config.featuredVideoUrl && (
                    <button
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, featuredVideoUrl: null }))}
                      className="text-red-500 text-[10px] font-bold hover:underline cursor-pointer"
                    >
                      Remove Video
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Display a prominent video showcase / showreel section directly above your offerings catalog.
                </p>

                {config.featuredVideoUrl ? (
                  <div className="p-3 bg-muted/40 rounded-xl border border-border flex items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Film className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">
                          {config.featuredVideoUrl.includes("/embed/")
                            ? "Platform Uploaded Video"
                            : config.featuredVideoUrl.includes("youtube.com") || config.featuredVideoUrl.includes("youtu.be")
                            ? "YouTube Video Link"
                            : "External Video"}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground truncate max-w-[160px] sm:max-w-xs">
                          {config.featuredVideoUrl}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setPreviewVideoModalUrl(config.featuredVideoUrl || null)}
                        className="h-7 px-2 text-xs font-bold gap-1 cursor-pointer"
                        title="Preview Video"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Preview</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setVideoPickerTarget("featuredVideo");
                          setVideoPickerOpen(true);
                        }}
                        className="h-7 px-2 text-xs font-semibold cursor-pointer"
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setVideoPickerTarget("featuredVideo");
                      setVideoPickerOpen(true);
                    }}
                    className="w-full text-xs font-bold gap-1.5 rounded-xl cursor-pointer"
                  >
                    <Film className="w-3.5 h-3.5 text-primary" />
                    <span>Choose from Uploaded Videos or YouTube</span>
                  </Button>
                )}
              </div>

              {/* Action Buttons Customization */}
              <div className="space-y-4 pt-2 border-t border-border">
                <div className="text-xs font-bold text-foreground">Call to Action Buttons</div>

                {/* Primary Button */}
                <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" /> Primary CTA Button
                    </span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Button Text</label>
                    <input
                      type="text"
                      placeholder="e.g. Explore Offerings"
                      value={config.ctaText || ""}
                      onChange={(e) => setConfig((prev) => ({ ...prev, ctaText: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-xl text-xs border bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Click Action</label>
                    <Select
                      value={config.ctaAction || "SCROLL_OFFERINGS"}
                      onValueChange={(val) => setConfig((prev) => ({ ...prev, ctaAction: val }))}
                    >
                      <SelectTrigger className="rounded-xl text-xs h-8">
                        <SelectValue placeholder="Select Action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SCROLL_OFFERINGS">Scroll to Offerings Catalog (#offerings)</SelectItem>
                        <SelectItem value="INQUIRY_MODAL">Open Inquiry & Booking Modal</SelectItem>
                        <SelectItem value="CONTACT_SECTION">Scroll to Contact Form (#contact)</SelectItem>
                        <SelectItem value="FEATURED_VIDEO">Play Featured Video Modal</SelectItem>
                        <SelectItem value="EXTERNAL_LINK">Open Custom Link / External URL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {config.ctaAction === "EXTERNAL_LINK" && (
                    <div className="space-y-1 animate-in fade-in">
                      <label className="text-[11px] font-semibold text-muted-foreground">Destination URL</label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={config.ctaUrl || ""}
                        onChange={(e) => setConfig((prev) => ({ ...prev, ctaUrl: e.target.value }))}
                        className="w-full px-3 py-1.5 rounded-xl text-xs border bg-background font-mono"
                      />
                    </div>
                  )}
                  {config.ctaAction === "FEATURED_VIDEO" && (
                    <div className="space-y-2 pt-1 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-muted-foreground">Selected Video</label>
                        {config.ctaUrl && (
                          <button
                            type="button"
                            onClick={() => setConfig((prev) => ({ ...prev, ctaUrl: "" }))}
                            className="text-red-500 text-[10px] font-bold hover:underline cursor-pointer"
                          >
                            Remove Video
                          </button>
                        )}
                      </div>

                      {config.ctaUrl ? (
                        <div className="p-2.5 bg-background rounded-xl border border-border flex items-center justify-between gap-2 shadow-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <Film className="w-3 h-3" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[11px] font-bold truncate">
                                {config.ctaUrl.includes("/embed/")
                                  ? "Platform Uploaded Video"
                                  : config.ctaUrl.includes("youtube.com") || config.ctaUrl.includes("youtu.be")
                                  ? "YouTube Video Link"
                                  : "External Video"}
                              </div>
                              <div className="text-[9px] font-mono text-muted-foreground truncate max-w-[140px] sm:max-w-xs">
                                {config.ctaUrl}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => setPreviewVideoModalUrl(config.ctaUrl || null)}
                              className="h-6 px-2 text-[10px] font-bold gap-1 cursor-pointer"
                              title="Preview Video Popup"
                            >
                              <Play className="w-2.5 h-2.5 fill-current" />
                              <span>Preview</span>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setVideoPickerTarget("primaryCta");
                                setVideoPickerOpen(true);
                              }}
                              className="h-6 px-2 text-[10px] font-semibold cursor-pointer"
                            >
                              Change
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setVideoPickerTarget("primaryCta");
                            setVideoPickerOpen(true);
                          }}
                          className="w-full text-xs font-bold gap-1 rounded-xl text-primary border-primary/30 hover:bg-primary/10 cursor-pointer py-2"
                        >
                          <Film className="w-3.5 h-3.5" />
                          <span>Choose from Uploaded Videos or YouTube</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Secondary Button */}
                <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" /> Secondary CTA Button
                    </span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Button Text</label>
                    <input
                      type="text"
                      placeholder="e.g. Book 1:1 Session"
                      value={config.secondaryCtaText || ""}
                      onChange={(e) => setConfig((prev) => ({ ...prev, secondaryCtaText: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-xl text-xs border bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Click Action</label>
                    <Select
                      value={config.secondaryCtaAction || "INQUIRY_MODAL"}
                      onValueChange={(val) => setConfig((prev) => ({ ...prev, secondaryCtaAction: val }))}
                    >
                      <SelectTrigger className="rounded-xl text-xs h-8">
                        <SelectValue placeholder="Select Action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INQUIRY_MODAL">Open Inquiry & Booking Modal</SelectItem>
                        <SelectItem value="SCROLL_OFFERINGS">Scroll to Offerings Catalog (#offerings)</SelectItem>
                        <SelectItem value="CONTACT_SECTION">Scroll to Contact Form (#contact)</SelectItem>
                        <SelectItem value="FEATURED_VIDEO">Play Featured Video Modal</SelectItem>
                        <SelectItem value="EXTERNAL_LINK">Open Custom Link / External URL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {config.secondaryCtaAction === "EXTERNAL_LINK" && (
                    <div className="space-y-1 animate-in fade-in">
                      <label className="text-[11px] font-semibold text-muted-foreground">Destination URL</label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={config.secondaryCtaUrl || ""}
                        onChange={(e) => setConfig((prev) => ({ ...prev, secondaryCtaUrl: e.target.value }))}
                        className="w-full px-3 py-1.5 rounded-xl text-xs border bg-background font-mono"
                      />
                    </div>
                  )}
                  {config.secondaryCtaAction === "FEATURED_VIDEO" && (
                    <div className="space-y-2 pt-1 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-muted-foreground">Selected Video</label>
                        {config.secondaryCtaUrl && (
                          <button
                            type="button"
                            onClick={() => setConfig((prev) => ({ ...prev, secondaryCtaUrl: "" }))}
                            className="text-red-500 text-[10px] font-bold hover:underline cursor-pointer"
                          >
                            Remove Video
                          </button>
                        )}
                      </div>

                      {config.secondaryCtaUrl ? (
                        <div className="p-2.5 bg-background rounded-xl border border-border flex items-center justify-between gap-2 shadow-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <Film className="w-3 h-3" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[11px] font-bold truncate">
                                {config.secondaryCtaUrl.includes("/embed/")
                                  ? "Platform Uploaded Video"
                                  : config.secondaryCtaUrl.includes("youtube.com") || config.secondaryCtaUrl.includes("youtu.be")
                                  ? "YouTube Video Link"
                                  : "External Video"}
                              </div>
                              <div className="text-[9px] font-mono text-muted-foreground truncate max-w-[140px] sm:max-w-xs">
                                {config.secondaryCtaUrl}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => setPreviewVideoModalUrl(config.secondaryCtaUrl || null)}
                              className="h-6 px-2 text-[10px] font-bold gap-1 cursor-pointer"
                              title="Preview Video Popup"
                            >
                              <Play className="w-2.5 h-2.5 fill-current" />
                              <span>Preview</span>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setVideoPickerTarget("secondaryCta");
                                setVideoPickerOpen(true);
                              }}
                              className="h-6 px-2 text-[10px] font-semibold cursor-pointer"
                            >
                              Change
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setVideoPickerTarget("secondaryCta");
                            setVideoPickerOpen(true);
                          }}
                          className="w-full text-xs font-bold gap-1 rounded-xl text-primary border-primary/30 hover:bg-primary/10 cursor-pointer py-2"
                        >
                          <Film className="w-3.5 h-3.5" />
                          <span>Choose from Uploaded Videos or YouTube</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Social Buttons / Links Customization */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-primary" />
                    <span>Social Buttons</span>
                    {Object.keys(config.socialLinks || {}).length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {Object.keys(config.socialLinks || {}).length}
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const activeKeys = Object.keys(config.socialLinks || {});
                      const nextUnused = SUPPORTED_SOCIAL_PLATFORMS.find(
                        (p) => !activeKeys.includes(p.id) && !activeKeys.some((k) => k.startsWith(`${p.id}_`))
                      );
                      const newKey = nextUnused ? nextUnused.id : `custom_${Date.now()}`;
                      setConfig((prev) => ({
                        ...prev,
                        socialLinks: {
                          ...(prev.socialLinks || {}),
                          [newKey]: "",
                        },
                      }));
                    }}
                    className="h-7 px-2 text-[11px] font-bold gap-1 rounded-xl cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Button
                  </Button>
                </div>

                {/* Social Buttons List */}
                {Object.keys(config.socialLinks || {}).length === 0 ? (
                  <div className="p-4 text-center border border-dashed rounded-xl space-y-2 text-muted-foreground">
                    <p className="text-xs">No social buttons added yet.</p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setConfig((prev) => ({
                          ...prev,
                          socialLinks: {
                            youtube: "https://youtube.com",
                            twitter: "https://x.com",
                            github: "https://github.com",
                            website: "https://example.com",
                          },
                        }));
                      }}
                      className="h-7 px-2.5 text-[11px] font-semibold rounded-lg cursor-pointer"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Standard Social Buttons
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(config.socialLinks || {}).map(([platformKey, url], idx) => {
                      const platformMeta = getSocialPlatformMeta(platformKey);
                      const basePlatformId = platformKey.includes("_") ? platformKey.split("_")[0] : platformKey;
                      const matchedPlatform = SUPPORTED_SOCIAL_PLATFORMS.find((p) => p.id === basePlatformId);
                      const placeholder = matchedPlatform?.placeholder || "https://...";
                      const PIcon = platformMeta.icon;

                      return (
                        <div
                          key={platformKey + "_" + idx}
                          className="p-2 bg-muted/40 rounded-xl border border-border/70 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 group transition-all"
                        >
                          {/* Platform Selector */}
                          <div className="w-full sm:w-44 shrink-0">
                            <Select
                              value={SUPPORTED_SOCIAL_PLATFORMS.some((p) => p.id === basePlatformId) ? basePlatformId : "custom"}
                              onValueChange={(newPlatformId) => {
                                if (!newPlatformId || newPlatformId === platformKey) return;
                                const platformStr = String(newPlatformId);
                                setConfig((prev) => {
                                  const currentSocials: Record<string, string | undefined> = { ...(prev.socialLinks || {}) };
                                  const existingVal = currentSocials[platformKey] || "";
                                  delete currentSocials[platformKey];
                                  
                                  let targetKey = platformStr;
                                  if (currentSocials[targetKey] !== undefined) {
                                    targetKey = `${platformStr}_${Date.now()}`;
                                  }
                                  currentSocials[targetKey] = existingVal;
                                  return { ...prev, socialLinks: currentSocials };
                                });
                              }}
                            >
                              <SelectTrigger className="rounded-lg text-xs h-8 bg-background border">
                                <SelectValue placeholder="Platform" />
                              </SelectTrigger>
                              <SelectContent className="max-h-64">
                                {SUPPORTED_SOCIAL_PLATFORMS.map((platform) => {
                                  const pMeta = getSocialPlatformMeta(platform.id);
                                  const ItemIcon = pMeta.icon;
                                  return (
                                    <SelectItem
                                      key={platform.id}
                                      value={platform.id}
                                      className="text-xs"
                                    >
                                      <div className="flex items-center gap-2">
                                        <ItemIcon
                                          className="w-3.5 h-3.5 shrink-0"
                                          style={{
                                            color:
                                              pMeta.color === "currentColor"
                                                ? undefined
                                                : pMeta.color,
                                          }}
                                        />
                                        <span>{platform.name}</span>
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Link / URL Input */}
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              placeholder={placeholder}
                              value={url || ""}
                              onChange={(e) => {
                                const newVal = e.target.value;
                                setConfig((prev) => ({
                                  ...prev,
                                  socialLinks: {
                                    ...(prev.socialLinks || {}),
                                    [platformKey]: newVal,
                                  },
                                }));
                              }}
                              className="w-full px-3 py-1.5 rounded-lg text-xs border bg-background font-mono sm:font-sans"
                            />
                          </div>

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setConfig((prev) => {
                                const currentSocials = { ...(prev.socialLinks || {}) };
                                delete currentSocials[platformKey];
                                return { ...prev, socialLinks: currentSocials };
                              });
                            }}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10 p-1.5 rounded-lg text-xs cursor-pointer shrink-0 self-end sm:self-center transition-colors"
                            title={`Remove ${platformMeta.label}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Quick Add Suggestions Chips */}
                {(() => {
                  const activeKeys = Object.keys(config.socialLinks || {});
                  const unadded = SUPPORTED_SOCIAL_PLATFORMS.filter(
                    (p) => !activeKeys.includes(p.id) && !activeKeys.some((k) => k.startsWith(`${p.id}_`))
                  );
                  if (unadded.length === 0) return null;

                  return (
                    <div className="pt-1.5 space-y-1">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Quick Add Platforms
                      </div>
                      <div className="flex items-center flex-wrap gap-1">
                        {unadded.slice(0, 8).map((platform) => {
                          const pMeta = getSocialPlatformMeta(platform.id);
                          const ChipIcon = pMeta.icon;
                          return (
                            <button
                              key={platform.id}
                              type="button"
                              onClick={() => {
                                setConfig((prev) => ({
                                  ...prev,
                                  socialLinks: {
                                    ...(prev.socialLinks || {}),
                                    [platform.id]: "",
                                  },
                                }));
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted/60 hover:bg-primary/10 hover:text-primary border border-border/80 hover:border-primary/30 transition-all cursor-pointer"
                            >
                              <ChipIcon
                                className="w-3 h-3"
                                style={{
                                  color:
                                    pMeta.color === "currentColor"
                                      ? undefined
                                      : pMeta.color,
                                }}
                              />
                              <span>+{platform.name.split(" ")[0]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Highlight Metric Counters */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" /> Highlight Metric Counters
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newStats = [
                        ...(config.stats || []),
                        { label: "New Metric", value: "100+" },
                      ];
                      setConfig((prev) => ({ ...prev, stats: newStats }));
                    }}
                    className="h-7 px-2 text-[11px] font-bold gap-1 rounded-xl cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Metric
                  </Button>
                </div>

                <div className="space-y-2">
                  {(config.stats || []).map((st, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Value (e.g. 12,000+)"
                        value={st.value}
                        onChange={(e) => {
                          const list = [...(config.stats || [])];
                          list[idx] = { ...list[idx], value: e.target.value };
                          setConfig((prev) => ({ ...prev, stats: list }));
                        }}
                        className="w-28 px-2.5 py-1.5 rounded-lg text-xs font-bold border bg-background"
                      />
                      <input
                        type="text"
                        placeholder="Label (e.g. Students)"
                        value={st.label}
                        onChange={(e) => {
                          const list = [...(config.stats || [])];
                          list[idx] = { ...list[idx], label: e.target.value };
                          setConfig((prev) => ({ ...prev, stats: list }));
                        }}
                        className="flex-1 px-2.5 py-1.5 rounded-lg text-xs border bg-background"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const list = (config.stats || []).filter((_, i) => i !== idx);
                          setConfig((prev) => ({ ...prev, stats: list }));
                        }}
                        className="text-red-500 hover:text-red-600 p-1.5 rounded-md text-xs cursor-pointer"
                        title="Delete Metric"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Testimonials & Reviews Builder */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-primary" /> Testimonials & Client Reviews
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newTestimonials = [
                        ...(config.testimonials || []),
                        {
                          name: "Student Name",
                          role: "Developer / Creator",
                          company: "Company / Studio",
                          quote: "Write a high-impact review or student testimonial here.",
                          rating: 5,
                        },
                      ];
                      setConfig((prev) => ({ ...prev, testimonials: newTestimonials }));
                    }}
                    className="h-7 px-2 text-[11px] font-bold gap-1 rounded-xl cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Review
                  </Button>
                </div>

                {(!config.testimonials || config.testimonials.length === 0) ? (
                  <div className="p-3 text-center border border-dashed rounded-xl text-xs text-muted-foreground">
                    No testimonials added yet. Click &quot;Add Review&quot; to showcase social proof.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {config.testimonials.map((t, idx) => (
                      <div key={idx} className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Review #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const newTestimonials = (config.testimonials || []).filter((_, i) => i !== idx);
                              setConfig((prev) => ({ ...prev, testimonials: newTestimonials }));
                            }}
                            className="text-red-500 hover:text-red-600 p-1 rounded-md text-xs cursor-pointer"
                            title="Delete Review"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Name"
                            value={t.name}
                            onChange={(e) => {
                              const list = [...(config.testimonials || [])];
                              list[idx] = { ...list[idx], name: e.target.value };
                              setConfig((prev) => ({ ...prev, testimonials: list }));
                            }}
                            className="w-full px-2.5 py-1 rounded-lg text-xs font-semibold border bg-background"
                          />
                          <input
                            type="text"
                            placeholder="Role / Title"
                            value={t.role}
                            onChange={(e) => {
                              const list = [...(config.testimonials || [])];
                              list[idx] = { ...list[idx], role: e.target.value };
                              setConfig((prev) => ({ ...prev, testimonials: list }));
                            }}
                            className="w-full px-2.5 py-1 rounded-lg text-xs border bg-background"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Company (optional)"
                            value={t.company || ""}
                            onChange={(e) => {
                              const list = [...(config.testimonials || [])];
                              list[idx] = { ...list[idx], company: e.target.value };
                              setConfig((prev) => ({ ...prev, testimonials: list }));
                            }}
                            className="w-full px-2.5 py-1 rounded-lg text-xs border bg-background"
                          />
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-muted-foreground">Rating:</span>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => {
                                    const list = [...(config.testimonials || [])];
                                    list[idx] = { ...list[idx], rating: star };
                                    setConfig((prev) => ({ ...prev, testimonials: list }));
                                  }}
                                  className={`p-0.5 cursor-pointer ${(t.rating || 5) >= star ? "text-amber-400" : "text-muted-foreground/30"}`}
                                >
                                  ★
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <textarea
                          rows={2}
                          placeholder="Testimonial quote text..."
                          value={t.quote}
                          onChange={(e) => {
                            const list = [...(config.testimonials || [])];
                            list[idx] = { ...list[idx], quote: e.target.value };
                            setConfig((prev) => ({ ...prev, testimonials: list }));
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs border bg-background resize-none"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* FAQ Section Builder */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-primary" /> Frequently Asked Questions (FAQ)
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newFaqs = [
                        ...(config.faqs || []),
                        { question: "New Question?", answer: "Provide a clear and concise answer here." },
                      ];
                      setConfig((prev) => ({ ...prev, faqs: newFaqs }));
                    }}
                    className="h-7 px-2 text-[11px] font-bold gap-1 rounded-xl cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add FAQ
                  </Button>
                </div>

                {(!config.faqs || config.faqs.length === 0) ? (
                  <div className="p-3 text-center border border-dashed rounded-xl text-xs text-muted-foreground">
                    No FAQs added yet. Click &quot;Add FAQ&quot; to answer questions for your students & clients.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {config.faqs.map((faq, idx) => (
                      <div key={idx} className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-2 relative group">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Question #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const newFaqs = (config.faqs || []).filter((_, i) => i !== idx);
                              setConfig((prev) => ({ ...prev, faqs: newFaqs }));
                            }}
                            className="text-red-500 hover:text-red-600 p-1 rounded-md text-xs cursor-pointer"
                            title="Delete FAQ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. How do 1:1 sessions work?"
                          value={faq.question}
                          onChange={(e) => {
                            const newFaqs = [...(config.faqs || [])];
                            newFaqs[idx] = { ...newFaqs[idx], question: e.target.value };
                            setConfig((prev) => ({ ...prev, faqs: newFaqs }));
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold border bg-background"
                        />
                        <textarea
                          rows={2}
                          placeholder="e.g. Sessions are conducted live via video..."
                          value={faq.answer}
                          onChange={(e) => {
                            const newFaqs = [...(config.faqs || [])];
                            newFaqs[idx] = { ...newFaqs[idx], answer: e.target.value };
                            setConfig((prev) => ({ ...prev, faqs: newFaqs }));
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs border bg-background resize-none leading-relaxed"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section Visibility Toggles */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="text-xs font-bold text-foreground">Section Visibility</div>
                <div className="space-y-2">
                  {[
                    { key: "showPlaylists", altKey: "showCourses", label: "Show Playlists & Series" },
                    { key: "showMeetings", label: "Show 1:1 Mentorship Calls" },
                    { key: "showVideos", label: "Show Video Showcases" },
                    { key: "showProducts", label: "Show Digital Products" },
                    { key: "showTestimonials", label: "Show Testimonials & Reviews" },
                    { key: "showFaq", label: "Show FAQ Section" },
                    { key: "showContact", label: "Show Direct Inquiry Form" },
                  ].map((sec) => (
                    <div key={sec.key} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{sec.label}</span>
                      <Switch
                        checked={
                          config.sectionsConfig
                            ? sec.altKey
                              ? (config.sectionsConfig as any)[sec.key] !== false && (config.sectionsConfig as any)[sec.altKey] !== false
                              : (config.sectionsConfig as any)[sec.key] !== false
                            : true
                        }
                        onCheckedChange={(checked) =>
                          setConfig((prev) => ({
                            ...prev,
                            sectionsConfig: {
                              ...prev.sectionsConfig,
                              [sec.key]: checked,
                              ...(sec.altKey ? { [sec.altKey]: checked } : {}),
                            },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Live Device Preview Column (7 cols) */}
            <div className="lg:col-span-7 sticky top-20 space-y-3">
              {/* Device Toolbar */}
              <div className="p-3 bg-card border border-border rounded-2xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      previewDevice === "desktop" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Desktop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("tablet")}
                    className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      previewDevice === "tablet" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                    }`}
                  >
                    <Tablet className="w-3.5 h-3.5" />
                    <span>Tablet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      previewDevice === "mobile" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-muted-foreground hidden sm:inline">
                    Live Preview
                  </span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              </div>

              {/* Device Mockup Frame */}
              <div
                className={`mx-auto border border-border rounded-3xl overflow-hidden shadow-2xl bg-black transition-all duration-300 ${
                  previewDevice === "mobile"
                    ? "max-w-[390px] h-[780px] border-4 border-slate-700 ring-8 ring-black/40"
                    : previewDevice === "tablet"
                    ? "max-w-[700px] h-[780px] border-4 border-slate-700 ring-8 ring-black/40"
                    : "w-full h-[780px]"
                }`}
              >
                <iframe
                  ref={iframeRef}
                  src={`/offerings/${config.orgSlug || "preview"}?preview=true`}
                  className="w-full h-full border-0 bg-transparent"
                  title="Live Offerings Preview"
                  onLoad={() => sendPreviewUpdate()}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: INQUIRIES & LEADS INBOX */}
        <TabsContent value="inquiries" className="space-y-6">
          {inquiries.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-3">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground opacity-40" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold">No inquiries received yet</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  When potential clients or students fill out your 1:1 booking form or message you, their inquiries will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {inquiries.map((inq) => (
                <div
                  key={inq.id}
                  className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-4 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm">{inq.name}</span>
                        <span className="text-xs text-muted-foreground">({inq.email})</span>
                      </div>
                      {inq.offeringTitle && (
                        <div className="text-xs font-semibold text-primary">
                          Offering: {inq.offeringTitle}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(inq.createdAt).toLocaleDateString()}
                      </span>
                      <Select
                        value={inq.status}
                        onValueChange={(val) => handleUpdateInquiryStatus(inq.id, val)}
                      >
                        <SelectTrigger
                          className={`h-8 rounded-lg text-xs font-bold ${
                            inq.status === "RESOLVED"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                              : inq.status === "CONTACTED"
                              ? "bg-sky-500/10 text-sky-500 border-sky-500/30"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                          }`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="CONTACTED">Contacted</SelectItem>
                          <SelectItem value="RESOLVED">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm text-foreground bg-muted/40 p-3.5 rounded-xl whitespace-pre-line leading-relaxed">
                    {inq.message}
                  </div>

                  {inq.preferredTime && (
                    <div className="text-xs flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>Preferred Availability: <strong>{inq.preferredTime}</strong></span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <a
                      href={`mailto:${inq.email}?subject=Regarding your inquiry on ${config.headline || "our offerings"}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-white flex items-center gap-1.5 hover:opacity-90 cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Reply via Email</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* CREATE / EDIT OFFERING MODAL */}
      <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6 rounded-2xl sm:rounded-3xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                <Package className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="truncate">{editingItem ? "Edit Offering" : "Add New Offering"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingItem
                ? "Update your offering details, pricing, media, and action buttons."
                : "List what you provide—playlist, 1:1 call, video asset, or digital resource."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveItem} className="space-y-4 pt-1 min-w-0">
            {/* Offering Type Selector Header */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3 min-w-0">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Package className="w-3 h-3" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Offering Type
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Category
                </span>
              </div>

              <div className="space-y-1 min-w-0">
                <Select
                  value={itemFormType === "COURSE" ? "PLAYLIST" : itemFormType}
                  onValueChange={(val) => {
                    const nextType = val || "PLAYLIST";
                    setItemFormType(nextType);
                    if (nextType === "PLAYLIST") {
                      setItemFormCtaAction("INQUIRY_MODAL");
                      if (!itemFormCtaText || itemFormCtaText === "Learn More" || itemFormCtaText === "Watch Video" || itemFormCtaText === "Book 1:1 Call") {
                        setItemFormCtaText("Explore Playlist");
                      }
                      const curPl = playlists.find((p) => p.id === selectedPlaylistId) || playlists[0];
                      if (curPl) {
                        handleSelectPlaylist(curPl);
                      }
                    } else if (nextType === "VIDEO") {
                      setItemFormCtaAction("FEATURED_VIDEO");
                      if (!itemFormCtaText || itemFormCtaText === "Learn More" || itemFormCtaText === "Enroll Now" || itemFormCtaText === "Explore Playlist" || itemFormCtaText === "Book 1:1 Call") {
                        setItemFormCtaText("Watch Video");
                      }
                      setItemFormDelivery("Self-paced HD Video");
                      if (!itemFormCtaUrl || itemFormCtaAction !== "FEATURED_VIDEO") {
                        setVideoPickerTarget("itemForm");
                        setVideoPickerOpen(true);
                      }
                    } else if (nextType === "MEETING") {
                      if (!itemFormCtaText || itemFormCtaText === "Learn More" || itemFormCtaText === "Explore Playlist" || itemFormCtaText === "Watch Video") {
                        setItemFormCtaText("Book 1:1 Call");
                      }
                      if (!itemFormDelivery || itemFormDelivery.includes("HD Video") || itemFormDelivery.includes("Series")) {
                        setItemFormDelivery("Live 1:1 Video Session");
                      }
                      if (!itemFormDuration) {
                        setItemFormDuration("45 mins");
                      }
                    } else if (nextType === "PRODUCT") {
                      if (!itemFormCtaText || itemFormCtaText === "Learn More" || itemFormCtaText === "Watch Video" || itemFormCtaText === "Book 1:1 Call") {
                        setItemFormCtaText("Get Resource");
                      }
                      if (!itemFormDelivery || itemFormDelivery.includes("HD Video") || itemFormDelivery.includes("Live")) {
                        setItemFormDelivery("Instant Digital Download");
                      }
                    } else if (nextType === "SERVICE") {
                      if (!itemFormCtaText || itemFormCtaText === "Learn More" || itemFormCtaText === "Watch Video" || itemFormCtaText === "Book 1:1 Call") {
                        setItemFormCtaText("Request Proposal");
                      }
                      if (!itemFormDelivery || itemFormDelivery.includes("HD Video") || itemFormDelivery.includes("Live")) {
                        setItemFormDelivery("Custom Project Delivery");
                      }
                    }
                  }}
                >
                  <SelectTrigger className="rounded-xl text-xs h-10 bg-background w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLAYLIST">
                      <div className="flex items-center gap-2">
                        <ListVideo className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="font-semibold">Playlist / Series</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="MEETING">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-sky-500 shrink-0" />
                        <span className="font-semibold">1:1 Mentorship</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="VIDEO">
                      <div className="flex items-center gap-2">
                        <VideoIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="font-semibold">Video Showcase</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="PRODUCT">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="font-semibold">Digital Resource</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="SERVICE">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-purple-500 shrink-0" />
                        <span className="font-semibold">Custom Service</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 1. PLAYLIST OFFERING: Linked Playlist Selection & Auto-Synced Info */}
            {/* ========================================================================= */}
            {(itemFormType === "PLAYLIST" || itemFormType === "COURSE") && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3.5 min-w-0">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                      <ListVideo className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Selected Playlist
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Auto-Synced
                  </span>
                </div>

                {playlists.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed text-center space-y-2 bg-background">
                    <ListVideo className="w-8 h-8 mx-auto text-muted-foreground opacity-40" />
                    <p className="text-xs font-bold">No playlists found in your account</p>
                    <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                      Create your playlist first in the Playlists dashboard to list it as an offering.
                    </p>
                    <div className="pt-1">
                      <Link
                        href="/dashboard/playlists"
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                      >
                        <span>Go to Playlists Management &rarr;</span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1 min-w-0">
                      <label className="text-xs font-bold text-foreground flex items-center justify-between">
                        <span>Choose Playlist *</span>
                        <Link
                          href="/dashboard/playlists"
                          target="_blank"
                          className="text-[10px] text-primary hover:underline font-semibold"
                        >
                          Manage Playlists
                        </Link>
                      </label>
                      <Select
                        value={selectedPlaylistId || (playlists.find((p) => p.title === itemFormTitle)?.id || "")}
                        onValueChange={(val) => {
                          const matched = playlists.find((p) => p.id === val);
                          if (matched) {
                            handleSelectPlaylist(matched);
                          }
                        }}
                      >
                        <SelectTrigger className="rounded-xl text-xs h-10 bg-background w-full">
                          <SelectValue placeholder="Select a Playlist from your library..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          {playlists.map((pl) => (
                            <SelectItem key={pl.id} value={pl.id} className="text-xs py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <ListVideo className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span className="font-bold truncate max-w-[280px] sm:max-w-md">{pl.title}</span>
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                  ({pl.itemCount} {pl.itemCount === 1 ? "video" : "videos"})
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Synced Playlist Information Box */}
                    {itemFormTitle && (
                      <div className="p-3 bg-background rounded-xl border border-border flex flex-col sm:flex-row gap-3 items-start sm:items-center shadow-xs animate-in fade-in">
                        <div className="w-full sm:w-36 aspect-video bg-black/40 rounded-lg overflow-hidden relative shrink-0 border border-border/80">
                          {itemFormCoverData ? (
                            <img
                              src={itemFormCoverData}
                              alt={itemFormTitle}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/40 bg-muted/40">
                              <ListVideo className="w-8 h-8" />
                            </div>
                          )}
                          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-black/80 text-white">
                            {itemFormDelivery || "Playlist"}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-xs sm:text-sm text-foreground truncate max-w-full">
                              {itemFormTitle}
                            </span>
                          </div>
                          {itemFormDescription && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                              {itemFormDescription}
                            </p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap pt-0.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              Price: {itemFormPrice || "Free"} {itemFormPricePeriod ? `(${itemFormPricePeriod})` : ""}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              • Synced from playlist access settings
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* 2. VIDEO OFFERING: Selected Video & Auto-Synced Info */}
            {/* ========================================================================= */}
            {itemFormType === "VIDEO" && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3.5 min-w-0">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                      <Film className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Selected Video
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Auto-Synced
                  </span>
                </div>

                {itemFormCtaUrl || itemFormTitle ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-background rounded-xl border border-border flex flex-col sm:flex-row gap-3 items-start sm:items-center shadow-xs animate-in fade-in">
                      <div className="w-full sm:w-36 aspect-video bg-black/40 rounded-lg overflow-hidden relative shrink-0 border border-border/80">
                        {itemFormCoverData ? (
                          <img
                            src={itemFormCoverData}
                            alt={itemFormTitle}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/40 bg-muted/40">
                            <Film className="w-8 h-8" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center">
                            <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-extrabold text-xs sm:text-sm text-foreground truncate">
                            {itemFormTitle || "Video Showcase"}
                          </h4>
                        </div>
                        {itemFormDescription && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {itemFormDescription}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                            Price: {itemFormPrice || "Free"} {itemFormPricePeriod ? `(${itemFormPricePeriod})` : ""}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            • Synced from video access settings
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto pt-1 sm:pt-0">
                        {itemFormCtaUrl && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setPreviewVideoModalUrl(itemFormCtaUrl)}
                            className="h-8 px-2.5 text-xs font-bold gap-1 cursor-pointer"
                            title="Preview Video"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Preview</span>
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setVideoPickerTarget("itemForm");
                            setVideoPickerOpen(true);
                          }}
                          className="h-8 px-2.5 text-xs font-semibold cursor-pointer"
                        >
                          Change
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      onClick={() => {
                        setVideoPickerTarget("itemForm");
                        setVideoPickerOpen(true);
                      }}
                      className="w-full text-xs font-bold gap-1.5 bg-primary text-white cursor-pointer rounded-xl py-3 shadow-sm"
                    >
                      <Film className="w-4 h-4" />
                      <span>Choose Video from Uploaded Library or YouTube Link</span>
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center">
                      The title, description, thumbnail, and access price will be automatically loaded from your selected video.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* OFFERING DETAILS: Offering Settings (Shared for Playlist & Video) */}
            {/* ========================================================================= */}
            {(itemFormType === "PLAYLIST" || itemFormType === "COURSE" || itemFormType === "VIDEO") && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3.5 min-w-0">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <SlidersHorizontal className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Offering Settings & Highlights
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Customization
                  </span>
                </div>

                {/* Optional Highlights (for Playlist) */}
                {(itemFormType === "PLAYLIST" || itemFormType === "COURSE") && (
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <ListVideo className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>Key Highlights & Syllabus (Optional)</span>
                      </label>
                      <span className="text-[10px] text-muted-foreground">1 bullet per line</span>
                    </div>
                    <textarea
                      rows={3}
                      placeholder={"Full Lifetime Access\nDownloadable Source Code\nPrivate Community Access"}
                      value={itemFormHighlights}
                      onChange={(e) => setItemFormHighlights(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs border bg-background resize-none font-mono focus:ring-1 focus:ring-primary focus:outline-none min-w-0 leading-relaxed"
                    />
                  </div>
                )}

                {/* Badge Label & Auto CTA Notice */}
                <div className="space-y-3 min-w-0">
                  <div className="space-y-1 min-w-0">
                    <label className="text-[11px] font-semibold text-muted-foreground">Badge Label (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Popular, Bestseller, New"
                      value={itemFormBadge}
                      onChange={(e) => setItemFormBadge(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs border bg-background focus:ring-1 focus:ring-primary focus:outline-none min-w-0"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-background border border-border/70 flex items-center justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-[11px] font-bold text-foreground">Call-to-Action Action & Button</div>
                      <div className="text-[10px] text-muted-foreground">
                        Automatically determined for visitors based on content pricing & access mode (Purchase, View / Request Access, or View).
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 shrink-0">
                      Auto-Calculated
                    </span>
                  </div>
                </div>

                {/* Featured Switch */}
                <div className="pt-1">
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-background border border-border/70">
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">Featured Offering</div>
                      <p className="text-[10px] text-muted-foreground">Highlight prominently with an accent glow on your public page.</p>
                    </div>
                    <Switch
                      checked={itemFormIsFeatured}
                      onCheckedChange={setItemFormIsFeatured}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 3. CUSTOM OFFERING DETAILS (For MEETING, PRODUCT, and SERVICE) */}
            {/* ========================================================================= */}
            {itemFormType !== "PLAYLIST" && itemFormType !== "COURSE" && itemFormType !== "VIDEO" && (
              <>
                {/* Basic Info */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3.5 min-w-0">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FileText className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Basic Information
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Core Info
                    </span>
                  </div>

                  {/* Title */}
                  <div className="space-y-1 min-w-0">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1">
                      <span>Offering Title</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={itemFormType === "MEETING" ? "e.g. 1:1 Architecture & Career Mentorship Call" : "e.g. Production Streaming Starter Kit"}
                      value={itemFormTitle}
                      onChange={(e) => setItemFormTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border bg-background focus:ring-1 focus:ring-primary focus:outline-none min-w-0"
                    />
                  </div>

                  {/* Subtitle / Short Tagline */}
                  <div className="space-y-1 min-w-0">
                    <label className="text-xs font-bold text-foreground">Subtitle / Short Tagline</label>
                    <input
                      type="text"
                      placeholder="e.g. Direct 45-minute live consultation & architecture review"
                      value={itemFormSubtitle}
                      onChange={(e) => setItemFormSubtitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs border bg-background focus:ring-1 focus:ring-primary focus:outline-none min-w-0"
                    />
                  </div>

                  {/* Description / Summary */}
                  <div className="space-y-1 min-w-0">
                    <label className="text-xs font-bold text-foreground">Description / Overview</label>
                    <textarea
                      rows={3}
                      placeholder="Describe what students or clients will learn or receive in this offering..."
                      value={itemFormDescription}
                      onChange={(e) => setItemFormDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs border bg-background resize-none focus:ring-1 focus:ring-primary focus:outline-none min-w-0 leading-relaxed"
                    />
                  </div>

                  {/* Pricing & Frequency */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                    <div className="space-y-1 min-w-0">
                      <label className="text-xs font-bold text-foreground">Price</label>
                      <input
                        type="text"
                        placeholder="e.g. $120, Free, Custom"
                        value={itemFormPrice}
                        onChange={(e) => setItemFormPrice(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs border bg-background focus:ring-1 focus:ring-primary focus:outline-none min-w-0"
                      />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <label className="text-xs font-bold text-foreground">Price Period / Billing Unit</label>
                      <input
                        type="text"
                        placeholder={itemFormType === "MEETING" ? "e.g. / 45 mins" : "e.g. one-time, / project"}
                        value={itemFormPricePeriod}
                        onChange={(e) => setItemFormPricePeriod(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs border bg-background focus:ring-1 focus:ring-primary focus:outline-none min-w-0"
                      />
                    </div>
                  </div>

                  {/* Format & Duration */}
                  <div className={`grid grid-cols-1 ${itemFormType === "MEETING" ? "sm:grid-cols-2" : "sm:grid-cols-1"} gap-3 min-w-0`}>
                    <div className="space-y-1 min-w-0">
                      <label className="text-xs font-bold text-foreground">Delivery Format</label>
                      <input
                        type="text"
                        placeholder="e.g. Live 1:1 Video Meeting, Instant Download"
                        value={itemFormDelivery}
                        onChange={(e) => setItemFormDelivery(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs border bg-background focus:ring-1 focus:ring-primary focus:outline-none min-w-0"
                      />
                    </div>

                    {itemFormType === "MEETING" && (
                      <div className="space-y-1 min-w-0">
                        <label className="text-xs font-bold text-foreground">Meeting Duration</label>
                        <input
                          type="text"
                          placeholder="e.g. 45 mins, 60 mins"
                          value={itemFormDuration}
                          onChange={(e) => setItemFormDuration(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-xs border bg-background focus:ring-1 focus:ring-primary focus:outline-none min-w-0"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Advanced & Media Settings */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3.5 min-w-0">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <SlidersHorizontal className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Advanced & Media Settings
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Media & Actions
                    </span>
                  </div>

                  {/* Cover Image with 16:9 Crop */}
                  <div className="p-3 rounded-xl bg-background border border-border/70 space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ImageIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                        <label className="text-xs font-bold text-foreground">Card Cover Image {itemFormType === "MEETING" ? "(Optional)" : ""}</label>
                        <span className="text-[10px] text-lime-600 dark:text-lime-400 font-mono font-semibold">16:9 (1280×720px)</span>
                      </div>
                      {itemFormCoverData && (
                        <button
                          type="button"
                          onClick={() => {
                            setItemFormCoverData(null);
                            setItemFormRemoveCover(true);
                          }}
                          className="text-red-500 hover:text-red-600 text-[11px] font-bold hover:underline cursor-pointer"
                        >
                          Remove Image
                        </button>
                      )}
                    </div>

                    <input
                      type="file"
                      ref={itemCoverInputRef}
                      accept="image/*"
                      onChange={handleItemCoverFileSelect}
                      className="hidden"
                    />

                    {itemFormCoverData ? (
                      <div className="space-y-2">
                        <div className="w-full aspect-video rounded-xl overflow-hidden border border-border bg-black/20 relative group max-h-48">
                          <img
                            src={itemFormCoverData}
                            alt="Offering Cover"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => itemCoverInputRef.current?.click()}
                              className="h-7 px-3 text-xs font-bold cursor-pointer"
                            >
                              Change
                            </Button>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => itemCoverInputRef.current?.click()}
                          className="w-full text-xs font-bold gap-1.5 rounded-xl cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Change Cover Image (Crop)</span>
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => itemCoverInputRef.current?.click()}
                        className="w-full text-xs font-bold gap-1.5 rounded-xl border-dashed py-4 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-primary" />
                        <span>Upload Offering Cover (16:9 Ratio)</span>
                      </Button>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      Recommended: <strong>1280×720px (16:9)</strong>. Opens image cropper automatically.
                    </p>
                  </div>

                  {/* Key Highlights / Curriculum */}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <ListVideo className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>Key Highlights & Deliverables</span>
                      </label>
                      <span className="text-[10px] text-muted-foreground">1 bullet per line</span>
                    </div>
                    <textarea
                      rows={3}
                      placeholder={itemFormType === "MEETING" ? "45-Minute Live Video Session\nRecording Included\nFollow-up QA Email Support" : "Instant GitHub & ZIP Download\nCommercial License Included"}
                      value={itemFormHighlights}
                      onChange={(e) => setItemFormHighlights(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs border bg-background resize-none font-mono focus:ring-1 focus:ring-primary focus:outline-none min-w-0 leading-relaxed"
                    />
                  </div>

                  {/* Call to Action Button Configuration */}
                  <div className="p-3 bg-background rounded-xl border border-border/70 space-y-2.5 min-w-0">
                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Call-to-Action (CTA) Button</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                      <div className="space-y-1 min-w-0">
                        <label className="text-[11px] font-semibold text-muted-foreground">Button Label</label>
                        <input
                          type="text"
                          placeholder={itemFormType === "MEETING" ? "e.g. Book 1:1 Session" : "e.g. Get Resource"}
                          value={itemFormCtaText}
                          onChange={(e) => setItemFormCtaText(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-xs border bg-background focus:ring-1 focus:ring-primary focus:outline-none min-w-0"
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <label className="text-[11px] font-semibold text-muted-foreground">Button Action</label>
                        <Select
                          value={itemFormCtaAction}
                          onValueChange={(val) => setItemFormCtaAction(val || "INQUIRY_MODAL")}
                        >
                          <SelectTrigger className="rounded-xl text-xs h-9 bg-background w-full">
                            <SelectValue placeholder="Select Action" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INQUIRY_MODAL">Open Inquiry & Booking Modal</SelectItem>
                            <SelectItem value="EXTERNAL_LINK">Open Custom Checkout / External URL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Destination URL if External Link */}
                    {itemFormCtaAction === "EXTERNAL_LINK" && (
                      <div className="space-y-1 animate-in fade-in min-w-0">
                        <label className="text-[11px] font-semibold text-muted-foreground">Destination Link / Checkout URL</label>
                        <input
                          type="text"
                          placeholder="https://checkout.stripe.com/... or https://..."
                          value={itemFormCtaUrl}
                          onChange={(e) => setItemFormCtaUrl(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-xs border bg-background font-mono focus:ring-1 focus:ring-primary focus:outline-none min-w-0"
                        />
                      </div>
                    )}
                  </div>

                  {/* Badge Label & Featured Settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0 pt-0.5">
                    <div className="space-y-1 min-w-0">
                      <label className="text-xs font-bold text-foreground">Badge Label (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Popular, New, Limited Seats"
                        value={itemFormBadge}
                        onChange={(e) => setItemFormBadge(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs border bg-background focus:ring-1 focus:ring-primary focus:outline-none min-w-0"
                      />
                    </div>

                    <div className="space-y-1 min-w-0 flex flex-col justify-end">
                      <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-background border border-border/70 h-[38px]">
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">Featured Offering</div>
                        </div>
                        <Switch
                          checked={itemFormIsFeatured}
                          onCheckedChange={setItemFormIsFeatured}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Modal Footer Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-border min-w-0">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <span className="text-xs text-muted-foreground">
                  Status: <strong className={itemFormIsPublished ? "text-emerald-500" : "text-amber-500"}>{itemFormIsPublished ? "Published" : "Draft"}</strong>
                </span>
                <Switch
                  checked={itemFormIsPublished}
                  onCheckedChange={setItemFormIsPublished}
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setItemModalOpen(false)}
                  className="text-xs flex-1 sm:flex-none cursor-pointer h-9 px-4 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingItem}
                  className="text-xs font-bold px-5 h-9 rounded-xl bg-primary text-white flex-1 sm:flex-none shadow-md cursor-pointer"
                >
                  {savingItem ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </span>
                  ) : editingItem ? (
                    "Update Offering"
                  ) : (
                    "Create Offering"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog
        open={!!deleteItemTarget}
        onOpenChange={(open) => !open && setDeleteItemTarget(null)}
        title="Delete Offering"
        description={`Are you sure you want to delete "${deleteItemTarget?.title}"? This action cannot be undone.`}
        confirmText="Delete Offering"
        variant="danger"
        onConfirm={handleConfirmDeleteItem}
      />

      {/* RESET DEFAULTS CONFIRMATION DIALOG */}
      <ConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Reset Customization to Defaults"
        description="Are you sure you want to reset all portfolio themes, colors, and layout customizations to their default state?"
        confirmText="Reset to Defaults"
        variant="danger"
        onConfirm={handleExecuteReset}
      />

      {/* IMAGE CROPPER MODAL */}
      <ImageCropperModal
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        imageSrc={cropImageSrc}
        aspectRatio={cropAspectRatio}
        title={cropTitle}
        description={cropDescription}
        allowRatioChange={cropAllowRatioChange}
        onCropComplete={handleCropComplete}
      />

      {/* VIDEO PICKER MODAL */}
      <VideoPickerModal
        isOpen={videoPickerOpen}
        onClose={() => setVideoPickerOpen(false)}
        onSelectVideo={handleVideoSelected}
        selectedEmbedUrl={
          videoPickerTarget === "itemForm"
            ? itemFormCtaUrl
            : videoPickerTarget === "primaryCta"
            ? config.ctaUrl
            : videoPickerTarget === "secondaryCta"
            ? config.secondaryCtaUrl
            : config.featuredVideoUrl
        }
      />

      {/* IN-DASHBOARD VIDEO PREVIEW MODAL */}
      <Dialog open={!!previewVideoModalUrl} onOpenChange={() => setPreviewVideoModalUrl(null)}>
        <DialogContent className="max-w-4xl p-2 sm:p-4 rounded-3xl border shadow-2xl bg-black border-white/10">
          <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black">
            {(() => {
              const videoMeta = resolveVideoEmbedDetails(previewVideoModalUrl);
              if (!videoMeta) return null;
              if (videoMeta.type === "iframe") {
                return (
                  <iframe
                    src={videoMeta.src}
                    title="Video Preview Player"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                );
              }
              return (
                <video
                  src={videoMeta.src}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
