"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Layers,
  Users,
  Building2,
  Wallet,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { AdminOverviewTab } from "@/components/admin/AdminOverviewTab";
import { AdminPayoutsTab } from "@/components/admin/AdminPayoutsTab";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";
import { AdminOrganizationsTab } from "@/components/admin/AdminOrganizationsTab";
import { AdminPlansTab } from "@/components/admin/AdminPlansTab";

export type AdminTab = "overview" | "payouts" | "users" | "organizations" | "plans";

export function AdminDashboardClient() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [stats, setStats] = useState<any | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchOverviewStats = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/overview");
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch admin overview stats:", err);
    } finally {
      setLoadingStats(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverviewStats();
  }, []);

  const pendingPayoutsCount = stats?.payouts?.pendingCount || 0;
  const blockedUsersCount = stats?.users?.blocked || 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-lime-500/30 selection:text-lime-300">
      {/* Top Navigation */}
      <AdminNavbar onRefresh={fetchOverviewStats} isRefreshing={isRefreshing} />

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-zinc-800/80">
          {[
            {
              id: "overview" as AdminTab,
              label: "Overview",
              icon: LayoutDashboard,
            },
            {
              id: "payouts" as AdminTab,
              label: "Payout Requests",
              icon: Wallet,
              badge: pendingPayoutsCount > 0 ? `${pendingPayoutsCount} pending` : null,
              badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
            },
            {
              id: "users" as AdminTab,
              label: "Users & Moderation",
              icon: Users,
              badge: blockedUsersCount > 0 ? `${blockedUsersCount} blocked` : null,
              badgeColor: "bg-red-500/20 text-red-300 border-red-500/30",
            },
            {
              id: "organizations" as AdminTab,
              label: "Organizations & Quotas",
              icon: Building2,
            },
            {
              id: "plans" as AdminTab,
              label: "Subscription & Custom Plans",
              icon: Layers,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap border ${
                  isActive
                    ? "bg-zinc-900 text-white border-lime-500/40 shadow-[0_0_20px_rgba(132,204,22,0.1)]"
                    : "bg-transparent text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-900/50"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-lime-400" : "text-zinc-500"}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${tab.badgeColor}`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        <div>
          {activeTab === "overview" && (
            <AdminOverviewTab
              stats={stats}
              loading={loadingStats}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === "payouts" && (
            <AdminPayoutsTab onRefreshOverview={fetchOverviewStats} />
          )}

          {activeTab === "users" && (
            <AdminUsersTab onRefreshOverview={fetchOverviewStats} />
          )}

          {activeTab === "organizations" && (
            <AdminOrganizationsTab onRefreshOverview={fetchOverviewStats} />
          )}

          {activeTab === "plans" && (
            <AdminPlansTab onRefreshOverview={fetchOverviewStats} />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-6 mt-12 text-center text-xs text-zinc-500 font-mono">
        Taped Video Infrastructure • Secure Master Admin Console
      </footer>
    </div>
  );
}
