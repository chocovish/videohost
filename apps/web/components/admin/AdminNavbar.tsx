"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, ShieldAlert, LogOut, RefreshCw, LayoutDashboard, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminNavbarProps {
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function AdminNavbar({ onRefresh, isRefreshing }: AdminNavbarProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
      router.push("/admin/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Branding */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-lime-400/20 via-emerald-500/20 to-lime-600/10 border border-lime-500/30 text-lime-400 shadow-[0_0_20px_rgba(132,204,22,0.2)]">
            <Shield className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base">
                Taped <span className="text-lime-400">Admin</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-lime-500/10 px-2 py-0.5 text-[10px] font-semibold text-lime-400 border border-lime-500/25">
                <Sparkles className="h-2.5 w-2.5" />
                Control Center
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              Root Authority • ENV Protected
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-9 px-3 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 text-xs gap-1.5 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-lime-400" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 text-xs transition-colors"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">User Dashboard</span>
            <ExternalLink className="h-3 w-3 text-zinc-500" />
          </Link>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="h-9 px-3 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 hover:text-red-100 text-xs gap-1.5 shadow-sm transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isLoggingOut ? "Logging out..." : "Log Out"}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
