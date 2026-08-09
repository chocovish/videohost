"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Video,
  Code2,
  Settings,
  User,
  HardDrive,
  Palette,
  X,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useState, useEffect } from "react";
import { THEMES } from "@videohost/ui";
import { useSidebar } from "@/components/SidebarContext";

interface SidebarProps {
  organizationName: string;
  usageMinutes: number;
  minutesLimit: number;
  currentTheme: string;
  onThemeChange?: (themeId: string) => void;
}

export default function Sidebar({
  organizationName,
  usageMinutes,
  minutesLimit,
  currentTheme,
  onThemeChange,
}: SidebarProps) {
  const pathname = usePathname();
  const { isMobileOpen, isCollapsed, closeMobile, toggleCollapse } = useSidebar();
  const [activeTheme, setActiveTheme] = useState(currentTheme || "lime");
  const percentage = Math.min(100, Math.round((usageMinutes / minutesLimit) * 100));

  const applyTheme = (themeId: string) => {
    setActiveTheme(themeId);
    document.documentElement.setAttribute("data-theme", themeId);
    if (onThemeChange) onThemeChange(themeId);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", activeTheme);
  }, [activeTheme]);

  const navItems = [
    { label: "Videos", href: "/dashboard", icon: Video },
    { label: "Developer API", href: "/dashboard/developer", icon: Code2 },
    { label: "Organization", href: "/dashboard/settings", icon: Settings },
    { label: "Profile", href: "/dashboard/profile", icon: User },
  ];

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col justify-between h-full p-4">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 px-1 py-1">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))] flex items-center justify-center text-white shadow-md shrink-0">
              <Video className="w-6 h-6" />
            </div>
            {(!isCollapsed || isMobile) && (
              <div className="overflow-hidden transition-all duration-300">
                <h2 className="font-bold text-base tracking-tight text-[hsl(var(--foreground))] whitespace-nowrap">
                  VideoHost
                </h2>
                <p className="text-xs font-medium text-[hsl(var(--primary))] truncate max-w-[130px]">
                  {organizationName}
                </p>
              </div>
            )}
          </div>

          {/* Close button for mobile drawer */}
          {isMobile && (
            <button
              onClick={closeMobile}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (isMobile) closeMobile();
                }}
                title={isCollapsed && !isMobile ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isCollapsed && !isMobile ? "justify-center px-2" : ""
                } ${
                  isActive
                    ? "bg-[hsl(var(--primary))] text-white shadow-sm font-semibold"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {(!isCollapsed || isMobile) && (
                  <span className="truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Widgets */}
      <div className="space-y-4 pt-4 border-t border-[hsl(var(--border))]">
        {/* Quota Progress Meter */}
        <div
          className={`p-3.5 rounded-xl bg-[hsl(var(--muted))]/50 border border-[hsl(var(--border))] space-y-2 ${
            isCollapsed && !isMobile ? "p-2 text-center" : ""
          }`}
        >
          {(!isCollapsed || isMobile) ? (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-[hsl(var(--primary))]" /> Storage Quota
                </span>
                <span className="text-[hsl(var(--muted-foreground))] font-medium">
                  {usageMinutes} / {minutesLimit}m
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-black/10 overflow-hidden">
                <div
                  className="h-full bg-[hsl(var(--primary))] transition-all duration-500 rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              {percentage >= 80 && (
                <p className="text-[10px] text-amber-600 font-medium">
                  {percentage >= 100 ? "Quota limit reached!" : "Approaching 80% limit"}
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-1" title={`Storage: ${usageMinutes}/${minutesLimit}m`}>
              <HardDrive className="w-4 h-4 text-[hsl(var(--primary))]" />
              <span className="text-[10px] font-bold text-[hsl(var(--foreground))]">{percentage}%</span>
            </div>
          )}
        </div>

        {/* Theme Token Selector */}
        <div className="p-2 rounded-xl border border-[hsl(var(--border))] bg-white/40 space-y-1.5">
          {(!isCollapsed || isMobile) && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[hsl(var(--muted-foreground))] px-1">
              <Palette className="w-3 h-3 text-[hsl(var(--primary))]" /> Color Palette
            </div>
          )}
          <div className={`grid ${isCollapsed && !isMobile ? "grid-cols-1" : "grid-cols-3"} gap-1`}>
            {Object.values(THEMES).map((theme) => (
              <button
                key={theme.id}
                onClick={() => applyTheme(theme.id)}
                title={theme.name}
                className={`py-1 px-1.5 rounded-md text-[10px] font-medium transition-all flex items-center justify-center gap-1 border ${
                  activeTheme === theme.id
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 text-[hsl(var(--foreground))]"
                    : "border-transparent hover:bg-black/5 text-[hsl(var(--muted-foreground))]"
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: theme.primaryColor }}
                />
                {(!isCollapsed || isMobile) && <span>{theme.name.split(" ")[0]}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Collapse Toggle */}
        {!isMobile && (
          <button
            onClick={toggleCollapse}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-lg transition-colors border border-transparent hover:border-[hsl(var(--border))]"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-[hsl(var(--primary))]" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4 text-[hsl(var(--primary))]" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer (Slide-out Overlay) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop blur overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={closeMobile}
          />

          {/* Off-canvas sidebar sheet */}
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white border-r border-[hsl(var(--border))] shadow-2xl z-50 animate-in slide-in-from-left duration-300 overflow-y-auto">
            <SidebarContent isMobile={true} />
          </aside>
        </div>
      )}

      {/* Desktop Sticky Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-[hsl(var(--border))] bg-white/70 backdrop-blur-xl h-screen sticky top-0 transition-all duration-300 ease-in-out shrink-0 z-30 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        <SidebarContent isMobile={false} />
      </aside>
    </>
  );
}
