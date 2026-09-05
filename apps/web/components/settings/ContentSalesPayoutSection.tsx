"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  Receipt,
  Wallet,
  Landmark,
  BadgePercent,
  TrendingUp,
  ArrowDownToLine,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Filter,
  Search,
  X,
  Loader2,
  Film,
  ListVideo,
  Users,
  Check,
  Copy,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  ChevronRight,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney, getCurrencySymbol } from "@/lib/utils";
import { PLAN_COMMISSION_RATES } from "@/lib/platform-fees";
import { OrganizationItem } from "./OrganizationSwitcherSection";

export interface PurchasesStats {
  totalGrossRevenue: number;
  totalPlatformFees: number;
  totalGatewayFees?: number;
  totalNetEarnings: number;
  availableBalance: number;
  totalWithdrawnOrPending: number;
  totalPurchasesCount: number;
  videoPurchasesCount: number;
  playlistPurchasesCount: number;
  meetingPurchasesCount?: number;
  activePlanName?: string;
  activeCommissionPercent?: number;
  gatewayFeePercent?: number;
  currency?: string;
}

export interface BankFormData {
  accountHolderName: string;
  accountNumber: string;
  routingNumber: string;
  bankName: string;
  swiftCode: string;
  accountType: string;
  country: string;
  currency: string;
}

interface ContentSalesPayoutSectionProps {
  purchases: any[];
  purchasesStats: PurchasesStats | null;
  bankAccount: any;
  withdrawals: any[];
  hasPendingWithdrawal: boolean;
  monetizationTab: "purchases" | "withdrawals" | "bank" | "tiers";
  setMonetizationTab: (tab: "purchases" | "withdrawals" | "bank" | "tiers") => void;
  purchaseFilterType: "ALL" | "VIDEO" | "PLAYLIST" | "MEETING";
  setPurchaseFilterType: (type: "ALL" | "VIDEO" | "PLAYLIST" | "MEETING") => void;
  purchaseSearchQuery: string;
  setPurchaseSearchQuery: (query: string) => void;
  copiedPaymentId: string | null;
  setCopiedPaymentId: (id: string | null) => void;
  withdrawalPresetPct: number | null;
  setWithdrawalPresetPct: (pct: number | null) => void;
  loadingMonetization: boolean;
  fetchMonetizationData: () => Promise<void>;
  bankFormData: BankFormData;
  setBankFormData: React.Dispatch<React.SetStateAction<BankFormData>>;
  activeCurrency: string;
  showAccountNumber: boolean;
  setShowAccountNumber: (show: boolean) => void;
  isSavingBank: boolean;
  bankSuccessMsg: string;
  bankErrorMsg: string;
  handleSaveBankAccount: (e: React.FormEvent) => Promise<void>;
  withdrawalAmount: string;
  setWithdrawalAmount: (amt: string) => void;
  isRequestingWithdrawal: boolean;
  withdrawalSuccessMsg: string;
  withdrawalErrorMsg: string;
  handleRequestWithdrawal: (e: React.FormEvent) => Promise<void>;
  activeOrg?: OrganizationItem;
}

export function ContentSalesPayoutSection({
  purchases,
  purchasesStats,
  bankAccount,
  withdrawals,
  hasPendingWithdrawal,
  monetizationTab,
  setMonetizationTab,
  purchaseFilterType,
  setPurchaseFilterType,
  purchaseSearchQuery,
  setPurchaseSearchQuery,
  copiedPaymentId,
  setCopiedPaymentId,
  withdrawalPresetPct,
  setWithdrawalPresetPct,
  loadingMonetization,
  fetchMonetizationData,
  bankFormData,
  setBankFormData,
  activeCurrency,
  showAccountNumber,
  setShowAccountNumber,
  isSavingBank,
  bankSuccessMsg,
  bankErrorMsg,
  handleSaveBankAccount,
  withdrawalAmount,
  setWithdrawalAmount,
  isRequestingWithdrawal,
  withdrawalSuccessMsg,
  withdrawalErrorMsg,
  handleRequestWithdrawal,
  activeOrg,
}: ContentSalesPayoutSectionProps) {
  const router = useRouter();

  const currentActivePlan = (purchasesStats?.activePlanName || activeOrg?.planName || "free").toLowerCase();
  const currentCommissionPercent =
    purchasesStats?.activeCommissionPercent ??
    (PLAN_COMMISSION_RATES[currentActivePlan] ?? 6.5);

  const filteredPurchases = purchases.filter((p) => {
    if (purchaseFilterType !== "ALL" && p.contentType !== purchaseFilterType) {
      return false;
    }
    if (purchaseSearchQuery.trim()) {
      const q = purchaseSearchQuery.toLowerCase();
      const title = (p.video?.title || p.playlist?.title || p.meeting?.title || "").toLowerCase();
      const userName = (p.user?.name || "").toLowerCase();
      const userEmail = (p.user?.email || "").toLowerCase();
      const paymentId = (p.paymentId || "").toLowerCase();
      if (!title.includes(q) && !userName.includes(q) && !userEmail.includes(q) && !paymentId.includes(q)) {
        return false;
      }
    }
    return true;
  });

  const handleSetPresetAmount = (pct: number) => {
    setWithdrawalPresetPct(pct);
    const available = purchasesStats?.availableBalance || 0;
    if (available <= 0) return;
    const calc = Math.floor((available * (pct / 100)) * 100) / 100;
    setWithdrawalAmount(calc.toFixed(2));
  };

  const handleCopyRef = (id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(id);
      setCopiedPaymentId(id);
      setTimeout(() => setCopiedPaymentId(null), 2000);
    }
  };

  const remainingBalanceAfterWithdraw =
    withdrawalAmount && !isNaN(parseFloat(withdrawalAmount))
      ? Math.max(0, (purchasesStats?.availableBalance || 0) - parseFloat(withdrawalAmount))
      : purchasesStats?.availableBalance || 0;

  return (
    <div className="">
      {/* Section Header & Active Plan Platform Fee Pill */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b border-border/60">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-primary/15 text-primary border border-primary/20 shadow-xs shrink-0">
              <DollarSign className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-xl text-foreground tracking-tight flex items-center gap-2">
                Content Sales & Payout Center
              </h3>
              <p className="text-xs text-muted-foreground">
                Track sales revenues, automatic plan platform fees, real payment gateway charges & taxes (Razorpay & Cashfree), net creator earnings, bank direct deposit, and payouts.
              </p>
            </div>
          </div>

          {/* Plan Commission Benefit Highlight Banner */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary font-bold">
              <BadgePercent className="w-3.5 h-3.5" />
              <span>
                Active Plan: <span className="capitalize">{currentActivePlan}</span> ({currentCommissionPercent}% Platform Fee)
              </span>
            </div>

            {currentActivePlan === "free" && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border text-muted-foreground font-medium">
                <span>Upgrade to Basic (5.5%), Pro (4.0%), or Enterprise (3.5%) to reduce platform fees!</span>
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  onClick={() => router.push("/dashboard/pricing")}
                  className="h-auto p-0 font-bold underline gap-0.5 ml-1"
                >
                  Upgrade <ArrowUpRight className="w-3 h-3" />
                </Button>
              </div>
            )}

            {currentActivePlan === "basic" && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border text-muted-foreground font-medium">
                <span>Upgrade to Pro (4.0%) or Enterprise (3.5%) to lower your platform fee even further.</span>
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  onClick={() => router.push("/dashboard/pricing")}
                  className="h-auto p-0 font-bold underline gap-0.5 ml-1"
                >
                  Upgrade <ArrowUpRight className="w-3 h-3" />
                </Button>
              </div>
            )}

            {currentActivePlan === "pro" && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border text-muted-foreground font-medium">
                <span>Enterprise tier unlocks our lowest 3.5% creator platform fee rate.</span>
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  onClick={() => router.push("/dashboard/pricing")}
                  className="h-auto p-0 font-bold underline gap-0.5 ml-1"
                >
                  Explore Enterprise <ArrowUpRight className="w-3 h-3" />
                </Button>
              </div>
            )}

            {currentActivePlan === "enterprise" && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary font-bold">
                <Sparkles className="w-3 h-3 text-primary" />
                <span>Lowest Platform Fee Tier (3.5%) Unlocked across all content & meeting passes!</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs Pill Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/60 rounded-2xl border border-border self-start lg:self-center shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setMonetizationTab("purchases")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${monetizationTab === "purchases"
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Sales Ledger</span>
            <Badge variant="secondary" className="ml-0.5 font-mono">
              {purchases.length}
            </Badge>
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setMonetizationTab("withdrawals")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${monetizationTab === "withdrawals"
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Wallet className="w-3.5 h-3.5 text-primary" />
            <span>Payouts</span>
            {hasPendingWithdrawal && (
              <span className="w-2 h-2 rounded-full bg-primary" title="1 withdrawal in review" />
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setMonetizationTab("bank")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${monetizationTab === "bank"
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Landmark className="w-3.5 h-3.5 text-primary" />
            <span>Bank Account</span>
            {bankAccount ? (
              <span className="text-xs text-primary font-bold">✓</span>
            ) : (
              <Badge variant="secondary">Set up</Badge>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setMonetizationTab("tiers")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${monetizationTab === "tiers"
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <BadgePercent className="w-3.5 h-3.5 text-primary" />
            <span>Fee Tiers</span>
          </Button>
        </div>
      </div>

      {/* Available Balance & Payout Financial KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Available for Payout (Featured Hero Card) */}
        <div className="p-5 rounded-3xl bg-primary/10 border-2 border-primary/30 shadow-md space-y-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-primary/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform" />
          <span className="text-xs font-extrabold text-primary uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Wallet className="w-4 h-4" /> Available Payout Balance
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
          </span>
          <p className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
            {formatMoney(purchasesStats ? purchasesStats.availableBalance : 0, activeCurrency)}
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground font-mono">
              Ready to withdraw in {activeCurrency}
            </span>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => setMonetizationTab("withdrawals")}
              disabled={(purchasesStats?.availableBalance || 0) <= 0 || hasPendingWithdrawal}
              className="h-auto p-0 text-xs font-bold"
            >
              Withdraw <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Card 2: Pending & Paid Out */}
        <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-xs space-y-2 hover:border-border transition-colors">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ArrowDownToLine className="w-4 h-4 text-primary" /> Total Withdrawn / Pending
            </span>
            <Badge variant="outline" className="font-mono">
              {withdrawals.length} requests
            </Badge>
          </span>
          <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {formatMoney(purchasesStats ? purchasesStats.totalWithdrawnOrPending : 0, activeCurrency)}
          </p>
          <p className="text-xs text-muted-foreground truncate pt-1">
            {hasPendingWithdrawal ? (
              <span className="text-muted-foreground font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 animate-spin" /> 1 request under review
              </span>
            ) : (
              "No pending withdrawal requests"
            )}
          </p>
        </div>
      </div>

      {/* TAB 1: SALES LEDGER & TRANSACTION HISTORY */}
      {monetizationTab === "purchases" && (
        <div className="space-y-4 pt-1">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/60 p-3 rounded-2xl border border-border/60">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5" /> Type:
              </span>
              {(["ALL", "VIDEO", "PLAYLIST", "MEETING"] as const).map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={purchaseFilterType === type ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setPurchaseFilterType(type)}
                  className={`rounded-xl text-xs font-bold ${purchaseFilterType !== type ? "bg-muted/50 text-muted-foreground hover:text-foreground" : ""
                    }`}
                >
                  {type === "ALL" ? "All Orders" : type === "VIDEO" ? "Videos" : type === "PLAYLIST" ? "Playlists" : "Meetings"}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search buyer, title, or ref ID..."
                  value={purchaseSearchQuery}
                  onChange={(e) => setPurchaseSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs rounded-xl bg-background border-border"
                />
                {purchaseSearchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setPurchaseSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={fetchMonetizationData}
                disabled={loadingMonetization}
                title="Refresh Ledger"
                className="rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingMonetization ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {loadingMonetization ? (
            <div className="py-16 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" /> Loading sales transaction ledger...
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="py-14 text-center border border-dashed border-border/80 rounded-2xl space-y-3 p-6 bg-muted/10">
              <Receipt className="w-12 h-12 text-muted-foreground mx-auto opacity-40" />
              <div>
                <p className="text-sm font-bold text-foreground">
                  {purchases.length === 0 ? "No sales recorded yet" : "No orders matching search filter"}
                </p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                  {purchases.length === 0
                    ? "Set your videos, playlists, or meetings to 'Purchasable' mode to start selling. Platform fees and gateway fees will be automatically calculated and displayed here."
                    : "Try adjusting your search query or switching filters to view other transactions."}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border/80 rounded-2xl shadow-xs">
              <Table className="text-left text-xs">
                <TableHeader className="bg-muted/60 border-b border-border text-muted-foreground font-semibold uppercase text-xs tracking-wider">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="py-3 px-4">Item & Content</TableHead>
                    <TableHead className="py-3 px-4">Buyer Details</TableHead>
                    <TableHead className="py-3 px-4">Gross Sale</TableHead>
                    <TableHead className="py-3 px-4">Platform Fee</TableHead>
                    <TableHead className="py-3 px-4">Gateway Fee & Taxes</TableHead>
                    <TableHead className="py-3 px-4">Net Creator Take-Home</TableHead>
                    <TableHead className="py-3 px-4">Date</TableHead>
                    <TableHead className="py-3 px-4">Payment Reference</TableHead>
                    <TableHead className="py-3 px-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60 [&>tr]:border-border/60">
                  {filteredPurchases.map((purchase) => (
                    <TableRow key={purchase.id} className="hover:bg-muted/30 border-border/60">
                      {/* Item & Type */}
                      <TableCell className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 rounded-xl bg-muted/60 text-primary shrink-0 mt-0.5">
                            {purchase.contentType === "PLAYLIST" ? (
                              <ListVideo className="w-4 h-4" />
                            ) : purchase.contentType === "MEETING" ? (
                              <Users className="w-4 h-4" />
                            ) : (
                              <Film className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-foreground line-clamp-1 max-w-[200px]">
                              {purchase.video?.title ||
                                purchase.playlist?.title ||
                                purchase.meeting?.title ||
                                "Purchasable Content"}
                            </p>
                            <Badge variant="secondary" className="uppercase mt-0.5">
                              {purchase.contentType}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>

                      {/* Buyer */}
                      <TableCell className="py-3.5 px-4">
                        <div className="font-bold text-foreground">
                          {purchase.user?.name || "Guest Purchaser"}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">
                          {purchase.user?.email || "—"}
                        </div>
                        {purchase.countryCode && (
                          <Badge variant="outline" className="font-mono mt-0.5">
                            🌍 {purchase.countryCode}
                          </Badge>
                        )}
                      </TableCell>

                      {/* Gross Sale */}
                      <TableCell className="py-3.5 px-4">
                        <div className="font-extrabold text-foreground text-sm">
                          {formatMoney(purchase.amount, purchase.currency)}
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                          ({purchase.currency})
                        </span>
                      </TableCell>

                      {/* Platform Fee */}
                      <TableCell className="py-3.5 px-4">
                        <div className="font-bold text-muted-foreground">
                          -{formatMoney(purchase.commissionAmount || 0, purchase.currency)}
                        </div>
                        <span className="text-xs text-muted-foreground/80 font-mono">
                          {purchase.commissionPercent}% ({purchase.planSnapshot || "FREE"})
                        </span>
                      </TableCell>

                      {/* Gateway Fee & Taxes (Actual) */}
                      <TableCell className="py-3.5 px-4">
                        <div className="font-bold text-muted-foreground">
                          -{formatMoney(purchase.gatewayFeeAmount || 0, purchase.currency)}
                        </div>
                        <span className="text-xs text-muted-foreground/80 font-mono">
                          {purchase.gatewayFeePercent !== undefined && purchase.gatewayFeePercent !== null && purchase.gatewayFeePercent > 0
                            ? `${purchase.gatewayFeePercent.toFixed(2)}%`
                            : purchase.amount > 0 && purchase.gatewayFeeAmount
                              ? `${((purchase.gatewayFeeAmount / purchase.amount) * 100).toFixed(2)}%`
                              : "0.00%"} ({purchase.paymentMethod || "Gateway"})
                        </span>
                      </TableCell>

                      {/* Net Take-Home */}
                      <TableCell className="py-3.5 px-4">
                        <div className="font-black text-primary text-sm">
                          +{formatMoney(purchase.creatorEarnings || purchase.amount, purchase.currency)}
                        </div>
                        <span className="text-xs text-primary/80 font-mono">
                          Net to balance
                        </span>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                        <div className="font-medium text-foreground">
                          {new Date(purchase.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(purchase.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </TableCell>

                      {/* Payment Ref */}
                      <TableCell className="py-3.5 px-4">
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => handleCopyRef(purchase.paymentId || purchase.id)}
                          title="Click to copy payment reference ID"
                          className="font-mono text-muted-foreground hover:text-foreground group/ref"
                        >
                          <span>{(purchase.paymentId || purchase.id).slice(0, 12)}...</span>
                          {copiedPaymentId === (purchase.paymentId || purchase.id) ? (
                            <Check className="w-3 h-3 text-primary" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-50 group-hover/ref:opacity-100" />
                          )}
                        </Button>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3.5 px-4">
                        <Badge variant="secondary" className="uppercase">
                          {purchase.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAYOUTS & WITHDRAWAL CENTER */}
      {monetizationTab === "withdrawals" && (
        <div className="space-y-6 pt-1">
          {/* Hero Payout Request Module */}
          <div className="p-6 sm:p-7 rounded-3xl bg-card border border-border/80 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <ArrowDownToLine className="w-4 h-4 text-primary" /> Request Payout to Bank
                </h4>
                <p className="text-xs text-muted-foreground">
                  Withdraw available net sales revenue directly to your official connected bank account.
                </p>
              </div>

              {/* Linked Bank Preview Tag */}
              {bankAccount ? (
                <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-primary/10 border border-primary/20 text-xs text-foreground shrink-0">
                  <Landmark className="w-4 h-4 text-primary" />
                  <div>
                    <div className="font-bold flex items-center gap-1">
                      {bankAccount.bankName}{" "}
                      <span className="text-xs text-muted-foreground font-mono">
                        (••••{bankAccount.accountNumber?.slice(-4)})
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {bankAccount.currency || activeCurrency} &bull; {bankAccount.accountType || "Checking"}
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMonetizationTab("bank")}
                  className="rounded-2xl shrink-0"
                >
                  <AlertCircle className="w-3.5 h-3.5" /> Connect Bank Account First
                </Button>
              )}
            </div>

            {/* Strict Requirement Notice: Single pending withdrawal constraint */}
            {hasPendingWithdrawal && (
              <Alert>
                <Clock className="w-4 h-4 animate-spin shrink-0" />
                <AlertTitle>Active Withdrawal In Progress</AlertTitle>
                <AlertDescription className="text-xs">
                  You currently have a withdrawal request under review. Per financial safety policies, new withdrawals can be submitted once your current pending request is completed.
                </AlertDescription>
              </Alert>
            )}

            {!bankAccount && (
              <Alert>
                <Landmark className="w-5 h-5 shrink-0" />
                <AlertTitle>No payout bank account connected yet</AlertTitle>
                <AlertDescription className="text-xs">
                  Configure your direct deposit routing or IFSC details to initiate wire payouts.
                </AlertDescription>
                <div className="absolute top-2.5 right-3 flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setMonetizationTab("bank")}
                    className="shrink-0 font-bold text-xs"
                  >
                    Add Bank Account
                  </Button>
                </div>
              </Alert>
            )}

            {withdrawalSuccessMsg && (
              <Alert className="border-primary/25 text-primary [&>svg]:text-primary">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <AlertTitle className="text-xs font-bold">{withdrawalSuccessMsg}</AlertTitle>
              </Alert>
            )}

            {withdrawalErrorMsg && (
              <Alert variant="destructive" className="border-destructive/25 bg-destructive/10">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <AlertTitle className="text-xs font-bold">{withdrawalErrorMsg}</AlertTitle>
              </Alert>
            )}

            <form onSubmit={handleRequestWithdrawal} className="space-y-5">
              {/* Amount Input with Quick Preset Percentage Buttons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="withdraw-amt-input" className="text-xs font-bold text-foreground">
                    Withdrawal Amount ({getCurrencySymbol(activeCurrency)} {activeCurrency})
                  </Label>
                  <div className="text-xs text-muted-foreground">
                    Max Available:{" "}
                    <strong className="text-primary font-bold">
                      {formatMoney(purchasesStats ? purchasesStats.availableBalance : 0, activeCurrency)}
                    </strong>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm font-bold">
                      {getCurrencySymbol(activeCurrency)}
                    </span>
                    <Input
                      id="withdraw-amt-input"
                      type="number"
                      step="0.01"
                      min="1"
                      max={purchasesStats?.availableBalance || 0}
                      disabled={
                        hasPendingWithdrawal ||
                        !bankAccount ||
                        (purchasesStats?.availableBalance || 0) <= 0 ||
                        isRequestingWithdrawal
                      }
                      placeholder={`e.g. ${purchasesStats?.availableBalance ? purchasesStats.availableBalance.toFixed(2) : "50.00"
                        }`}
                      value={withdrawalAmount}
                      onChange={(e) => {
                        setWithdrawalAmount(e.target.value);
                        setWithdrawalPresetPct(null);
                      }}
                      className="pl-8 text-base font-black h-11 rounded-2xl bg-background border-border"
                    />
                  </div>

                  {/* Preset Quick Buttons */}
                  <div className="flex items-center gap-1.5">
                    {[25, 50, 75, 100].map((pct) => (
                      <Button
                        key={pct}
                        type="button"
                        variant={withdrawalPresetPct === pct ? "default" : "secondary"}
                        size="sm"
                        onClick={() => handleSetPresetAmount(pct)}
                        disabled={
                          hasPendingWithdrawal ||
                          !bankAccount ||
                          (purchasesStats?.availableBalance || 0) <= 0 ||
                          isRequestingWithdrawal
                        }
                        className={`rounded-xl text-xs font-black ${withdrawalPresetPct !== pct ? "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted" : ""
                          }`}
                      >
                        {pct === 100 ? "MAX" : `${pct}%`}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Calculation Preview Card */}
              {withdrawalAmount && parseFloat(withdrawalAmount) > 0 && (
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Amount Requested:</span>
                    <span className="font-bold text-foreground">
                      {formatMoney(parseFloat(withdrawalAmount), activeCurrency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Transfer Destination:</span>
                    <span className="font-bold text-foreground">
                      {bankAccount?.bankName || "Configured Bank"} (••••
                      {bankAccount?.accountNumber?.slice(-4) || "—"})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Estimated Processing Window:</span>
                    <span className="font-bold text-foreground">1-3 Business Days</span>
                  </div>
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between font-bold">
                    <span className="text-foreground">Remaining Available Balance:</span>
                    <span className="text-primary">
                      {formatMoney(remainingBalanceAfterWithdraw, activeCurrency)}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-1">
                <Button
                  type="submit"
                  variant="default"
                  disabled={
                    hasPendingWithdrawal ||
                    !bankAccount ||
                    !withdrawalAmount ||
                    parseFloat(withdrawalAmount) <= 0 ||
                    (purchasesStats && parseFloat(withdrawalAmount) > purchasesStats.availableBalance) ||
                    isRequestingWithdrawal
                  }
                  className="w-full sm:w-auto min-w-[200px] h-11 rounded-2xl text-xs shadow-md active:scale-95"
                >
                  {isRequestingWithdrawal ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting Request...
                    </>
                  ) : (
                    <>
                      <ArrowDownToLine className="w-4 h-4 mr-2" /> Submit Payout Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Withdrawal History Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Payout Withdrawal History ({withdrawals.length})
              </h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={fetchMonetizationData}
                disabled={loadingMonetization}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingMonetization ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>

            {withdrawals.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-border/80 rounded-2xl text-xs text-muted-foreground bg-muted/10">
                <Clock className="w-8 h-8 text-muted-foreground mx-auto opacity-40 mb-2" />
                <p className="font-semibold text-foreground">No withdrawal requests yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When you submit a payout request, processing status and bank transaction receipts will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-border/80 rounded-2xl shadow-xs">
                <Table className="text-left text-xs">
                  <TableHeader className="bg-muted/60 border-b border-border text-muted-foreground font-semibold uppercase text-xs tracking-wider">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="py-3 px-4">Requested Date</TableHead>
                      <TableHead className="py-3 px-4">Withdrawal Amount</TableHead>
                      <TableHead className="py-3 px-4">Bank Destination</TableHead>
                      <TableHead className="py-3 px-4">Status</TableHead>
                      <TableHead className="py-3 px-4">Processed Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/60 [&>tr]:border-border/60">
                    {withdrawals.map((w) => (
                      <TableRow key={w.id} className="hover:bg-muted/30 border-border/60">
                        <TableCell className="py-3.5 px-4 font-medium text-foreground whitespace-nowrap">
                          <div>{new Date(w.createdAt).toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(w.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-4 font-black text-foreground text-sm">
                          {formatMoney(w.amount, w.currency)}{" "}
                          <span className="text-xs text-muted-foreground font-normal font-mono">
                            ({w.currency})
                          </span>
                        </TableCell>

                        <TableCell className="py-3.5 px-4 text-muted-foreground">
                          {w.bankDetails?.bankName ? (
                            <div className="font-medium text-foreground">
                              {w.bankDetails.bankName}{" "}
                              <span className="text-xs text-muted-foreground font-mono">
                                &bull; ••••{w.bankDetails.accountNumber?.slice(-4)}
                              </span>
                            </div>
                          ) : (
                            "Saved Bank Account"
                          )}
                        </TableCell>

                        <TableCell className="py-3.5 px-4">
                          <Badge
                            variant={
                              w.status === "PENDING"
                                ? "secondary"
                                : w.status === "PROCESSING"
                                  ? "outline"
                                  : w.status === "COMPLETED" || w.status === "APPROVED"
                                    ? "default"
                                    : "destructive"
                            }
                            className="uppercase"
                          >
                            {w.status === "PENDING" && <Clock className="w-2.5 h-2.5 animate-spin" />}
                            {w.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-3.5 px-4 text-muted-foreground">
                          {w.processedAt ? (
                            <span className="font-medium text-foreground">
                              {new Date(w.processedAt).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Under Review</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BANK & DIRECT DEPOSIT SETTINGS */}
      {monetizationTab === "bank" && (
        <div className="space-y-6 max-w-3xl pt-1">
          <div className="space-y-1">
            <h4 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Landmark className="w-4 h-4 text-primary" /> Direct Deposit Bank Account
            </h4>
            <p className="text-xs text-muted-foreground">
              Enter your official verified bank details. Requested payout earnings will be directly wired to this account.
            </p>
          </div>

          {bankSuccessMsg && (
            <Alert className="border-primary/25 text-primary [&>svg]:text-primary">
              <Check className="w-4 h-4 shrink-0" />
              <AlertTitle className="text-xs font-bold">{bankSuccessMsg}</AlertTitle>
            </Alert>
          )}

          {bankErrorMsg && (
            <Alert variant="destructive" className="border-destructive/25 bg-destructive/10">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <AlertTitle className="text-xs font-bold">{bankErrorMsg}</AlertTitle>
            </Alert>
          )}

          <form onSubmit={handleSaveBankAccount} className="space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bank-holder-input" className="text-xs font-semibold">
                  Account Holder Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bank-holder-input"
                  required
                  placeholder="e.g. John Doe / Studio Corp LLC"
                  value={bankFormData.accountHolderName}
                  onChange={(e) => setBankFormData({ ...bankFormData, accountHolderName: e.target.value })}
                  className="h-10 rounded-xl bg-background border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bank-name-input" className="text-xs font-semibold">
                  Bank Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bank-name-input"
                  required
                  placeholder="e.g. JPMorgan Chase / HDFC Bank"
                  value={bankFormData.bankName}
                  onChange={(e) => setBankFormData({ ...bankFormData, bankName: e.target.value })}
                  className="h-10 rounded-xl bg-background border-border"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bank-acc-input" className="text-xs font-semibold">
                    Account / IBAN Number <span className="text-destructive">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setShowAccountNumber(!showAccountNumber)}
                    className="h-auto p-0 text-muted-foreground hover:text-foreground gap-1"
                  >
                    {showAccountNumber ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showAccountNumber ? "Hide" : "Show"}
                  </Button>
                </div>
                <Input
                  id="bank-acc-input"
                  required
                  type={showAccountNumber ? "text" : "password"}
                  placeholder="e.g. 123456789012"
                  value={bankFormData.accountNumber}
                  onChange={(e) => setBankFormData({ ...bankFormData, accountNumber: e.target.value })}
                  className="h-10 rounded-xl bg-background border-border font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bank-routing-input" className="text-xs font-semibold">
                  Routing / IFSC / Sort Code
                </Label>
                <Input
                  id="bank-routing-input"
                  placeholder="e.g. 021000021 / HDFC0001234"
                  value={bankFormData.routingNumber}
                  onChange={(e) => setBankFormData({ ...bankFormData, routingNumber: e.target.value })}
                  className="h-10 rounded-xl bg-background border-border font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bank-swift-input" className="text-xs font-semibold">
                  SWIFT / BIC Code (Optional for International)
                </Label>
                <Input
                  id="bank-swift-input"
                  placeholder="e.g. CHASUS33XXX"
                  value={bankFormData.swiftCode}
                  onChange={(e) => setBankFormData({ ...bankFormData, swiftCode: e.target.value })}
                  className="h-10 rounded-xl bg-background border-border font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bank-type-select" className="text-xs font-semibold">
                  Account Type
                </Label>
                <Select
                  value={bankFormData.accountType}
                  onValueChange={(val) => setBankFormData({ ...bankFormData, accountType: val || "CHECKING" })}
                >
                  <SelectTrigger
                    id="bank-type-select"
                    className="w-full h-10 rounded-xl bg-background border-border text-foreground text-xs font-medium"
                  >
                    <SelectValue placeholder="Select Account Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CHECKING">Checking / Current Account</SelectItem>
                    <SelectItem value="SAVINGS">Savings Account</SelectItem>
                    <SelectItem value="BUSINESS">Business Corporate Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bank-country-select" className="text-xs font-semibold">
                  Bank Country
                </Label>
                <Select
                  value={bankFormData.country}
                  onValueChange={(val) => {
                    const country = val || "US";
                    const countryCurrencyMap: Record<string, string> = {
                      US: "USD",
                      IN: "INR",
                      GB: "GBP",
                      DE: "EUR",
                      FR: "EUR",
                      CA: "CAD",
                      AU: "AUD",
                      SG: "SGD",
                      AE: "AED",
                    };
                    setBankFormData((prev) => ({
                      ...prev,
                      country,
                      currency: countryCurrencyMap[country] || prev.currency,
                    }));
                  }}
                >
                  <SelectTrigger
                    id="bank-country-select"
                    className="w-full h-10 rounded-xl bg-background border-border text-foreground text-xs font-medium"
                  >
                    <SelectValue placeholder="Select Country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">🇺🇸 United States</SelectItem>
                    <SelectItem value="IN">🇮🇳 India</SelectItem>
                    <SelectItem value="GB">🇬🇧 United Kingdom</SelectItem>
                    <SelectItem value="CA">🇨🇦 Canada</SelectItem>
                    <SelectItem value="DE">🇩🇪 Germany</SelectItem>
                    <SelectItem value="FR">🇫🇷 France</SelectItem>
                    <SelectItem value="AU">🇦🇺 Australia</SelectItem>
                    <SelectItem value="SG">🇸🇬 Singapore</SelectItem>
                    <SelectItem value="AE">🇦🇪 United Arab Emirates</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bank-currency-select" className="text-xs font-semibold">
                  Payout Currency
                </Label>
                <Select
                  value={bankFormData.currency}
                  onValueChange={(val) => setBankFormData({ ...bankFormData, currency: val || "USD" })}
                >
                  <SelectTrigger
                    id="bank-currency-select"
                    className="w-full h-10 rounded-xl bg-background border-border text-foreground text-xs font-medium"
                  >
                    <SelectValue placeholder="Select Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="CAD">CAD (CA$)</SelectItem>
                    <SelectItem value="AUD">AUD (AU$)</SelectItem>
                    <SelectItem value="SGD">SGD (SG$)</SelectItem>
                    <SelectItem value="AED">AED (AED)</SelectItem>
                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                    <SelectItem value="BRL">BRL (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={
                  isSavingBank ||
                  !bankFormData.accountHolderName.trim() ||
                  !bankFormData.accountNumber.trim() ||
                  !bankFormData.bankName.trim()
                }
                className="w-full sm:w-auto font-bold text-xs h-10 px-5 rounded-xl shadow-sm"
              >
                {isSavingBank ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving Bank Details...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" /> Save Direct Deposit Account
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: COMMISSION RATES & TIERS MATRIX */}
      {monetizationTab === "tiers" && (
        <div className="space-y-6 pt-1">
          <div className="space-y-1">
            <h4 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <BadgePercent className="w-4 h-4 text-primary" /> Platform Fee & Gateway Processing Tiers
            </h4>
            <p className="text-xs text-muted-foreground">
              Every content sale includes a plan-tiered platform fee plus real-time payment gateway processing charges & taxes taken by the payment provider (Razorpay / Cashfree). Creator net take-home earnings are credited automatically to your available balance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tier 1: Free */}
            <div
              className={`p-5 rounded-2xl border space-y-3 transition-all ${currentActivePlan === "free"
                  ? "bg-primary/10 border-primary shadow-md ring-2 ring-primary/20"
                  : "bg-card border-border/70"
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-foreground">Free Plan</span>
                {currentActivePlan === "free" && (
                  <Badge>Active Tier</Badge>
                )}
              </div>
              <div className="space-y-0.5">
                <div className="text-2xl font-black text-foreground">6.5%</div>
                <p className="text-xs font-semibold text-muted-foreground">
                  Platform Fee &bull; <span className="text-primary font-bold">+ Gateway Charges</span>
                </p>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/50">
                <li>&bull; 2GB cloud hosting</li>
                <li>&bull; Unlimited screen recording</li>
                <li>&bull; Monetize videos & playlists</li>
              </ul>
            </div>

            {/* Tier 2: Basic */}
            <div
              className={`p-5 rounded-2xl border space-y-3 transition-all ${currentActivePlan === "basic"
                  ? "bg-primary/10 border-primary shadow-md ring-2 ring-primary/20"
                  : "bg-card border-border/70"
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-foreground">Basic Plan</span>
                {currentActivePlan === "basic" && (
                  <Badge>Active Tier</Badge>
                )}
              </div>
              <div className="space-y-0.5">
                <div className="text-2xl font-black text-primary">5.5%</div>
                <p className="text-xs font-semibold text-muted-foreground">
                  Platform Fee &bull; <span className="text-primary font-bold">+ Gateway Charges</span>
                </p>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/50">
                <li>&bull; 50GB cloud storage</li>
                <li>&bull; Meeting recordings included</li>
                <li>&bull; Save 1.0% on platform fee</li>
              </ul>
            </div>

            {/* Tier 3: Pro */}
            <div
              className={`p-5 rounded-2xl border space-y-3 transition-all ${currentActivePlan === "pro"
                  ? "bg-primary/15 border-primary shadow-md ring-2 ring-primary/20"
                  : "bg-card border-border/70"
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-foreground">Pro Plan</span>
                {currentActivePlan === "pro" && (
                  <Badge>Active Tier</Badge>
                )}
              </div>
              <div className="space-y-0.5">
                <div className="text-2xl font-black text-primary">4.0%</div>
                <p className="text-xs font-semibold text-muted-foreground">
                  Platform Fee &bull; <span className="text-primary font-bold">+ Gateway Charges</span>
                </p>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/50">
                <li>&bull; 200GB cloud storage</li>
                <li>&bull; Adaptive bitrate HLS streaming</li>
                <li>&bull; Save 2.5% on platform fee</li>
              </ul>
            </div>

            {/* Tier 4: Enterprise */}
            <div
              className={`p-5 rounded-2xl border space-y-3 transition-all ${currentActivePlan === "enterprise"
                  ? "bg-primary/15 border-primary shadow-md ring-2 ring-primary/20"
                  : "bg-card border-border/70"
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-foreground">Enterprise</span>
                {currentActivePlan === "enterprise" ? (
                  <Badge>Active Tier</Badge>
                ) : (
                  <Badge variant="secondary">Lowest Rate</Badge>
                )}
              </div>
              <div className="space-y-0.5">
                <div className="text-2xl font-black text-primary">3.5%</div>
                <p className="text-xs font-semibold text-muted-foreground">
                  Lowest Fee &bull; <span className="text-primary font-bold">+ Gateway Charges</span>
                </p>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/50">
                <li>&bull; Unlimited cloud storage</li>
                <li>&bull; Up to 5 team workspaces</li>
                <li>&bull; Lowest 3.5% platform fee</li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <p className="font-bold text-foreground">Want to lower your platform fee rate?</p>
              <p className="text-muted-foreground">
                Upgrading your workspace subscription unlocks lower sales commission and increased cloud storage immediately.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => router.push("/dashboard/pricing")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs shrink-0"
            >
              View All Plans <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
