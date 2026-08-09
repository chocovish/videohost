"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSidebar } from "@/components/SidebarContext";

interface NavbarProps {
  userEmail: string;
  userName?: string;
  role: string;
  organizationName: string;
}

export default function Navbar({ userEmail, userName, role, organizationName }: NavbarProps) {
  const { toggleMobile, toggleCollapse, isCollapsed } = useSidebar();

  return (
    <header className="h-16 border-b border-[hsl(var(--border))] bg-white/50 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 w-full">
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          onClick={toggleMobile}
          className="p-2 -ml-1 text-[hsl(var(--foreground))] hover:bg-black/5 rounded-xl transition-colors md:hidden shrink-0"
          title="Open Menu"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5 text-[hsl(var(--primary))]" />
        </button>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={toggleCollapse}
          className="p-2 -ml-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-black/5 rounded-xl transition-colors hidden md:flex shrink-0"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label="Toggle Sidebar"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-5 h-5 text-[hsl(var(--primary))]" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>

        <div className="flex items-center gap-2 min-w-0 truncate">
          <h1 className="font-semibold text-base sm:text-lg text-[hsl(var(--foreground))] truncate max-w-[140px] sm:max-w-xs">
            {organizationName}
          </h1>
          <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] uppercase tracking-wider shrink-0">
            {role}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]/80 transition-colors text-sm"
          title="Profile Settings"
        >
          <div className="w-7 h-7 rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center font-bold text-xs shrink-0">
            {userName ? userName.charAt(0).toUpperCase() : userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="text-left hidden sm:block max-w-[120px] md:max-w-[160px] truncate">
            <p className="text-xs font-semibold text-[hsl(var(--foreground))] truncate">{userName || "User"}</p>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">{userEmail}</p>
          </div>
        </Link>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="p-2 text-[hsl(var(--muted-foreground))] hover:text-red-600 hover:bg-red-500/10 rounded-xl transition-colors"
          title="Sign Out"
          aria-label="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
