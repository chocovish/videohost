"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Video, Code2, Settings, HardDrive, Palette, Sparkles, LogOut, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { THEMES } from "@videohost/ui";

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
  ];

  return (
    <aside className="w-64 border-r border-[hsl(var(--border))] bg-white/70 backdrop-blur-xl flex flex-col justify-between p-4 h-screen sticky top-0">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))] flex items-center justify-center text-white shadow-md">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-base tracking-tight text-[hsl(var(--foreground))]">VideoHost</h2>
            <p className="text-xs font-medium text-[hsl(var(--primary))] truncate max-w-[120px]">
              {organizationName}
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[hsl(var(--primary))] text-white shadow-sm font-semibold"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Widgets */}
      <div className="space-y-4 pt-4 border-t border-[hsl(var(--border))]">
        {/* Quota Progress Meter */}
        <div className="p-3.5 rounded-xl bg-[hsl(var(--muted))]/50 border border-[hsl(var(--border))] space-y-2">
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
              {percentage >= 100 ? "Quota limit reached!" : "Approaching 80% usage limit"}
            </p>
          )}
        </div>

        {/* Theme Token Selector */}
        <div className="p-2 rounded-xl border border-[hsl(var(--border))] bg-white/40 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[hsl(var(--muted-foreground))] px-1">
            <Palette className="w-3 h-3 text-[hsl(var(--primary))]" /> Color Palette
          </div>
          <div className="grid grid-cols-3 gap-1">
            {Object.values(THEMES).map((theme) => (
              <button
                key={theme.id}
                onClick={() => applyTheme(theme.id)}
                className={`py-1 px-1.5 rounded-md text-[10px] font-medium transition-all flex items-center justify-center gap-1 border ${
                  activeTheme === theme.id
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 text-[hsl(var(--foreground))]"
                    : "border-transparent hover:bg-black/5 text-[hsl(var(--muted-foreground))]"
                }`}
              >
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: theme.primaryColor }} />
                {theme.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
