"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Video,
  Code2,
  Settings,
  Palette,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Eye,
  Share2,
  Loader2,
  HardDrive,
  Sparkles,
  Paintbrush,
  Users2,
  ListVideo,
  Layers,
  Sun,
  Moon,
  ShoppingBag,
  BadgeDollarSign,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSidebar } from "@/components/SidebarContext";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/video-utils";

interface SidebarProps {
  organizationName: string;
  organizationLogo?: string | null;
  usedBytes?: number;
  storageLimitBytes?: number;
  storageLimitGb?: number;
  usageMinutes?: number;
  minutesLimit?: number;
  currentTheme: string;
  initialViewMode?: string;
  onThemeChange?: (themeId: string) => void;
}

export default function Sidebar({
  organizationName,
  organizationLogo,
  usedBytes = 0,
  storageLimitBytes = 2 * 1024 * 1024 * 1024,
  storageLimitGb = 2,
  usageMinutes,
  minutesLimit,
  currentTheme,
  initialViewMode = "CREATOR",
  onThemeChange,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const { isMobileOpen, isCollapsed, closeMobile, toggleCollapse } = useSidebar();
  const [activeTheme, setActiveTheme] = useState(currentTheme || "lime");
  const [viewMode, setViewMode] = useState<"CREATOR" | "VIEWER">(
    ((session?.user as any)?.viewMode as "CREATOR" | "VIEWER") ||
    (initialViewMode as "CREATOR" | "VIEWER") ||
    "CREATOR"
  );
  const [isUpdatingMode, setIsUpdatingMode] = useState(false);

  const [currentUsedBytes, setCurrentUsedBytes] = useState(usedBytes);
  const [currentLimitBytes, setCurrentLimitBytes] = useState(storageLimitBytes);

  useEffect(() => {
    setCurrentUsedBytes(usedBytes);
    setCurrentLimitBytes(storageLimitBytes);
  }, [usedBytes, storageLimitBytes]);

  const refreshUsage = async () => {
    try {
      const res = await fetch("/api/v1/usage");
      if (res.ok) {
        const data = await res.json();
        if (data.usage) {
          setCurrentUsedBytes(data.usage.usedBytes);
          setCurrentLimitBytes(data.usage.storageLimitBytes);
        }
      }
    } catch (e) {
      console.error("Failed to refresh usage in sidebar:", e);
    }
  };

  useEffect(() => {
    const handleUsageUpdated = () => {
      refreshUsage();
    };

    window.addEventListener("usage-updated", handleUsageUpdated);
    window.addEventListener("video-uploaded", handleUsageUpdated);
    return () => {
      window.removeEventListener("usage-updated", handleUsageUpdated);
      window.removeEventListener("video-updated", handleUsageUpdated);
    };
  }, []);

  const isUnlimited = currentLimitBytes >= Number.MAX_SAFE_INTEGER - 1000;
  const percentage = isUnlimited ? 0 : Math.min(100, Math.round((currentUsedBytes / currentLimitBytes) * 100));

  useEffect(() => {
    if ((session?.user as any)?.viewMode) {
      setViewMode((session?.user as any).viewMode);
    }
  }, [session?.user]);

  const [themeMode, setThemeMode] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    const initialMode = saved || (isDark ? "dark" : "light");
    setThemeMode(initialMode);
    if (initialMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleThemeMode = (mode: "light" | "dark") => {
    setThemeMode(mode);
    localStorage.setItem("theme", mode);
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleModeSwitch = async (newMode: "CREATOR" | "VIEWER") => {
    if (newMode === viewMode || isUpdatingMode) return;
    setIsUpdatingMode(true);
    try {
      const res = await fetch("/api/user/mode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewMode: newMode }),
      });
      if (res.ok) {
        setViewMode(newMode);
        await updateSession({ viewMode: newMode });
        if (newMode === "VIEWER") {
          router.push("/dashboard/shared-with-me");
        } else {
          router.push("/dashboard/uploaded-videos");
        }
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to update view mode:", err);
    } finally {
      setIsUpdatingMode(false);
    }
  };

  interface NavSection {
    title?: string;
    items: {
      label: string;
      href: string;
      icon: React.ElementType;
    }[];
  }

  const creatorNavSections: NavSection[] = [
    {
      title: "Manage Contents",
      items: [
        { label: "Uploaded Videos", href: "/dashboard/uploaded-videos", icon: Video },
        { label: "Playlists", href: "/dashboard/playlists", icon: ListVideo },
        { label: "Meetings", href: "/dashboard/meetings", icon: Users2 },
      ],
    },
    {
      title: "Customizations",
      items: [
        { label: "Offerings Portfolio", href: "/dashboard/offerings", icon: Layers },
        { label: "Customize share page", href: "/dashboard/customize-share-page", icon: Paintbrush },
      ],
    },
    {
      title: "General",
      items: [
        { label: "Sales & Payouts", href: "/dashboard/sales-and-payouts", icon: BadgeDollarSign },
        { label: "Plans & Pricing", href: "/dashboard/pricing", icon: Sparkles },
        { label: "Developer API", href: "/dashboard/developer", icon: Code2 },
        { label: "Organization", href: "/dashboard/settings", icon: Settings },
      ],
    },
  ];

  const viewerNavSections: NavSection[] = [
    {
      title: "Library",
      items: [
        { label: "Shared with me", href: "/dashboard/shared-with-me", icon: Share2 },
        { label: "Purchased Items", href: "/dashboard/purchased-items", icon: ShoppingBag },
      ],
    },
  ];

  const navSections = viewMode === "VIEWER" ? viewerNavSections : creatorNavSections;

  const SidebarInner = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col justify-between h-full p-4 overflow-y-auto">
      <div className="space-y-5">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 px-1 py-1">
            {isCollapsed && !isMobile ? (
              <Link
                href="/dashboard"
                className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 border border-border flex items-center justify-center p-1.5 shadow-xs overflow-hidden shrink-0"
              >
                <Image
                  src="/taped-in-logo.webp"
                  alt="Taped"
                  width={36}
                  height={36}
                  className="w-full h-full object-contain"
                  priority
                />
              </Link>
            ) : (
              <div className="overflow-hidden transition-all duration-300">
                <Link href="/dashboard" className="block">
                  <Image
                    src="/taped-in-logo.webp"
                    alt="Taped"
                    width={130}
                    height={44}
                    className="h-8 w-auto object-contain"
                    priority
                  />
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline truncate max-w-[160px] mt-1 px-0.5"
                  title="Switch active organization or manage settings"
                >
                  {organizationLogo && (
                    <img
                      src={organizationLogo}
                      alt={organizationName}
                      className="w-3.5 h-3.5 rounded-xs object-cover shrink-0 border border-border"
                    />
                  )}
                  <span className="truncate">{organizationName}</span>
                </Link>
              </div>
            )}
          </div>

          {/* Close button for mobile drawer */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={closeMobile}
              className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-lg"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* View Mode Toggle Pill Switcher */}
        <div className="px-1">
          {(!isCollapsed || isMobile) && (
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5 px-0.5 flex items-center justify-between">
              <span>View Mode</span>
              {isUpdatingMode && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
            </div>
          )}
          <div
            className={`p-1 bg-slate-100/90 dark:bg-slate-800/90 border border-border rounded-xl flex items-center gap-1 ${isCollapsed && !isMobile ? "flex-col" : ""
              }`}
          >
            <button
              onClick={() => handleModeSwitch("CREATOR")}
              disabled={isUpdatingMode}
              title="Creator Mode: Manage uploads & library"
              className={`flex-1 w-full py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${viewMode === "CREATOR"
                  ? "bg-white dark:bg-slate-950 text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Video className="w-3.5 h-3.5 text-primary" />
              {(!isCollapsed || isMobile) && <span>Creator</span>}
            </button>
            <button
              onClick={() => handleModeSwitch("VIEWER")}
              disabled={isUpdatingMode}
              title="Viewer Mode: Access content shared with you"
              className={`flex-1 w-full py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${viewMode === "VIEWER"
                  ? "bg-white dark:bg-slate-950 text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Eye className="w-3.5 h-3.5 text-indigo-500" />
              {(!isCollapsed || isMobile) && <span>Viewer</span>}
            </button>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="space-y-4">
          {navSections.map((section, idx) => (
            <div key={section.title || idx} className="space-y-1">
              {section.title && (!isCollapsed || isMobile) && (
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/70 px-2 py-0.5">
                  {section.title}
                </div>
              )}
              {section.title && isCollapsed && !isMobile && idx > 0 && (
                <div className="w-8 h-[1px] bg-border/60 mx-auto my-2" />
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href)) ||
                    (item.href === "/dashboard/uploaded-videos" && pathname.startsWith("/dashboard/uploaded-videos"));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => {
                        if (isMobile) closeMobile();
                      }}
                      title={isCollapsed && !isMobile ? item.label : undefined}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${isCollapsed && !isMobile ? "justify-center px-2" : ""
                        } ${isActive
                          ? "bg-primary text-white shadow-xs font-semibold"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {(!isCollapsed || isMobile) && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer Widgets */}
      <div className="space-y-4 pt-4 border-t border-border">
        {/* Quota Progress Meter */}
        {viewMode === "CREATOR" && (
          <div
            className={`p-3.5 rounded-xl bg-muted/50 border border-border space-y-2 ${isCollapsed && !isMobile ? "p-2 text-center" : ""
              }`}
          >
            {!isCollapsed || isMobile ? (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-primary" /> Storage Quota
                  </span>
                  <span className="text-muted-foreground font-medium">
                    {isUnlimited ? `${formatBytes(currentUsedBytes)} / Unlimited` : `${formatBytes(currentUsedBytes)} / ${formatBytes(currentLimitBytes)}`}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500 rounded-full"
                    style={{ width: `${isUnlimited ? 0 : percentage}%` }}
                  />
                </div>
                {!isUnlimited && percentage >= 80 && (
                  <p className="text-[10px] text-amber-600 font-medium">
                    {percentage >= 100 ? "Storage limit reached!" : "Approaching 80% limit"}
                  </p>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-1" title={isUnlimited ? `Storage: ${formatBytes(currentUsedBytes)} / Unlimited` : `Storage: ${formatBytes(currentUsedBytes)} / ${formatBytes(currentLimitBytes)}`}>
                <HardDrive className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-bold text-foreground">{isUnlimited ? "∞" : `${percentage}%`}</span>
              </div>
            )}
          </div>
        )}

        {/* Theme Mode Toggle (Light / Dark) */}
        <div className="p-2 rounded-xl border border-border bg-white/40 dark:bg-slate-900/40 space-y-1.5">
          {(!isCollapsed || isMobile) && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground px-1">
              <Palette className="w-3 h-3 text-primary" /> Appearance
            </div>
          )}
          <div className={`grid ${isCollapsed && !isMobile ? "grid-cols-1" : "grid-cols-2"} gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg`}>
            <button
              onClick={() => toggleThemeMode("light")}
              title="Light Mode"
              className={`py-1 px-2 rounded-md text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                themeMode === "light"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              {(!isCollapsed || isMobile) && <span>Light</span>}
            </button>
            <button
              onClick={() => toggleThemeMode("dark")}
              title="Dark Mode"
              className={`py-1 px-2 rounded-md text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                themeMode === "dark"
                  ? "bg-slate-950 text-white shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              {(!isCollapsed || isMobile) && <span>Dark</span>}
            </button>
          </div>
        </div>

        {/* Desktop Collapse Toggle */}
        {!isMobile && (
          <Button
            variant="ghost"
            onClick={toggleCollapse}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-primary" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4 text-primary" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={closeMobile}
          />
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-border shadow-2xl z-50 animate-in slide-in-from-left duration-300 overflow-y-auto">
            <SidebarInner isMobile={true} />
          </aside>
        </div>
      )}

      {/* Desktop Sticky Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-border bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl h-full sticky top-0 transition-all duration-300 ease-in-out shrink-0 z-30 ${isCollapsed ? "w-20" : "w-64"
          }`}
      >
        <SidebarInner isMobile={false} />
      </aside>
    </>
  );
}
