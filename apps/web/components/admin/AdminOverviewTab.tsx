"use client";

import React from "react";
import {
  Users,
  Building2,
  HardDrive,
  Wallet,
  Sparkles,
  ShieldCheck,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  DollarSign,
  Layers,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";

interface AdminOverviewTabProps {
  stats: any;
  loading: boolean;
  onNavigateTab: (tab: "payouts" | "users" | "organizations" | "plans") => void;
}

export function AdminOverviewTab({ stats, loading, onNavigateTab }: AdminOverviewTabProps) {
  if (loading && !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-zinc-900/60 border border-zinc-800" />
        ))}
      </div>
    );
  }

  const users = stats?.users || { total: 0, active: 0, blocked: 0 };
  const orgs = stats?.organizations || { total: 0 };
  const storage = stats?.storage || { totalBytes: 0, totalGb: 0, totalVideos: 0 };
  const payouts = stats?.payouts || {
    total: 0,
    pendingCount: 0,
    pendingAmount: 0,
    processingCount: 0,
    processingAmount: 0,
    completedCount: 0,
    completedAmount: 0,
  };
  const plans = stats?.plans || { total: 0, custom: 0 };
  const monetization = stats?.monetization || {
    totalPurchases: 0,
    grossSales: 0,
    platformCommission: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-lime-500/20 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 p-6 sm:p-8 shadow-[0_0_50px_rgba(132,204,22,0.05)]">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-64 w-64 rounded-full bg-lime-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-lime-500/10 px-3 py-1 text-xs font-semibold text-lime-400 border border-lime-500/20">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Administrator Portal Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Platform Overview & Command
            </h1>
            <p className="text-sm text-zinc-400 max-w-xl">
              Monitor creators, manage subscription tiers, enforce account moderation, review storage allocations, and process creator payout requests.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {payouts.pendingCount > 0 && (
              <Button
                onClick={() => onNavigateTab("payouts")}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs h-10 px-4 rounded-xl gap-2 shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all"
              >
                <Clock className="h-4 w-4" />
                <span>{payouts.pendingCount} Payouts Pending ({formatMoney(payouts.pendingAmount)})</span>
              </Button>
            )}
            <Button
              onClick={() => onNavigateTab("plans")}
              variant="outline"
              className="border-lime-500/30 bg-lime-500/10 hover:bg-lime-500/20 text-lime-400 hover:text-lime-300 font-semibold text-xs h-10 px-4 rounded-xl gap-2"
            >
              <Sparkles className="h-4 w-4" />
              <span>Create Custom Plan</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users Card */}
        <div
          onClick={() => onNavigateTab("users")}
          className="group cursor-pointer relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 hover:border-lime-500/40 hover:bg-zinc-900/80 transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Registered Users</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-105 transition-transform">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">{users.total}</span>
            <span className="text-xs text-emerald-400 font-medium">({users.active} active)</span>
          </div>
          {users.blocked > 0 && (
            <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
              <UserX className="h-3 w-3" />
              <span>{users.blocked} blocked user{users.blocked > 1 ? "s" : ""}</span>
            </div>
          )}
          <div className="mt-3 flex items-center text-xs text-zinc-500 group-hover:text-lime-400 transition-colors">
            <span>Manage users</span>
            <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
          </div>
        </div>

        {/* Organizations Card */}
        <div
          onClick={() => onNavigateTab("organizations")}
          className="group cursor-pointer relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 hover:border-lime-500/40 hover:bg-zinc-900/80 transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Workspaces / Orgs</span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:scale-105 transition-transform">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">{orgs.total}</span>
            <span className="text-xs text-zinc-400">organizations</span>
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            Custom plans & storage limits
          </p>
          <div className="mt-3 flex items-center text-xs text-zinc-500 group-hover:text-lime-400 transition-colors">
            <span>Manage organizations</span>
            <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
          </div>
        </div>

        {/* Platform Storage Card */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Storage Consumed</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <HardDrive className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {storage.totalGb >= 1000
                ? `${(storage.totalGb / 1024).toFixed(2)} TB`
                : `${storage.totalGb} GB`}
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            Across <span className="font-semibold text-zinc-200">{storage.totalVideos}</span> video files
          </p>
        </div>

        {/* Custom Plans Card */}
        <div
          onClick={() => onNavigateTab("plans")}
          className="group cursor-pointer relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 hover:border-lime-500/40 hover:bg-zinc-900/80 transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Subscription Plans</span>
            <div className="p-2.5 rounded-xl bg-lime-500/10 border border-lime-500/20 text-lime-400 group-hover:scale-105 transition-transform">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">{plans.total}</span>
            <span className="text-xs text-lime-400 font-medium">({plans.custom} custom)</span>
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            Custom storage & commission tiers
          </p>
          <div className="mt-3 flex items-center text-xs text-zinc-500 group-hover:text-lime-400 transition-colors">
            <span>View & add plans</span>
            <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
          </div>
        </div>
      </div>

      {/* Payouts & Monetization Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payouts Queue Box */}
        <div
          onClick={() => onNavigateTab("payouts")}
          className="group cursor-pointer rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 hover:border-amber-500/40 hover:bg-zinc-900/60 transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Creator Payout Requests</h3>
                <p className="text-xs text-zinc-400">Withdrawals queue & processing</p>
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-zinc-500 group-hover:text-amber-400 transition-colors" />
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/60 p-3.5 text-center">
              <span className="text-[11px] text-zinc-400 font-medium block">Pending</span>
              <span className="text-lg font-bold text-amber-400">{payouts.pendingCount}</span>
              <span className="text-[10px] text-zinc-500 block">{formatMoney(payouts.pendingAmount)}</span>
            </div>
            <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/60 p-3.5 text-center">
              <span className="text-[11px] text-zinc-400 font-medium block">Processing</span>
              <span className="text-lg font-bold text-blue-400">{payouts.processingCount}</span>
              <span className="text-[10px] text-zinc-500 block">{formatMoney(payouts.processingAmount)}</span>
            </div>
            <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/60 p-3.5 text-center">
              <span className="text-[11px] text-zinc-400 font-medium block">Completed</span>
              <span className="text-lg font-bold text-emerald-400">{payouts.completedCount}</span>
              <span className="text-[10px] text-zinc-500 block">{formatMoney(payouts.completedAmount)}</span>
            </div>
          </div>
        </div>

        {/* Monetization & Platform Revenue */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Content Sales & Platform Fees</h3>
                <p className="text-xs text-zinc-400">Platform revenue through creator transactions</p>
              </div>
            </div>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/60 p-3.5 text-center">
              <span className="text-[11px] text-zinc-400 font-medium block">Total Purchases</span>
              <span className="text-lg font-bold text-white">{monetization.totalPurchases}</span>
              <span className="text-[10px] text-zinc-500 block">completed sales</span>
            </div>
            <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/60 p-3.5 text-center">
              <span className="text-[11px] text-zinc-400 font-medium block">Gross Sales</span>
              <span className="text-lg font-bold text-zinc-100">{formatMoney(monetization.grossSales)}</span>
              <span className="text-[10px] text-zinc-500 block">volume</span>
            </div>
            <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/60 p-3.5 text-center">
              <span className="text-[11px] text-zinc-400 font-medium block">Platform Fee Earned</span>
              <span className="text-lg font-bold text-lime-400">{formatMoney(monetization.platformCommission)}</span>
              <span className="text-[10px] text-lime-500/80 block">net revenue</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
