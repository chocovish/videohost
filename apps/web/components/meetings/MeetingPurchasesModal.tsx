"use client";

import React, { useState, useEffect } from "react";
import {
  Receipt,
  DollarSign,
  ShoppingBag,
  Ticket,
  Loader2,
  RefreshCw,
  Calendar,
  ExternalLink,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatMoney } from "@/lib/utils";

export interface MeetingPurchasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: {
    id: string;
    title: string;
    description?: string | null;
    shareAccessMode?: "PUBLIC" | "RESTRICTED" | "PRIVATE" | "PURCHASABLE";
    price?: number | null;
    currency?: string | null;
    status?: string;
    scheduledStart?: string | null;
  } | null;
}

interface PurchaseUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface MeetingPurchaseItem {
  id: string;
  meetingId: string;
  organizationId: string;
  userId: string;
  amount: number;
  currency: string;
  countryCode: string | null;
  paymentMethod: string | null;
  paymentId: string | null;
  status: string;
  createdAt: string;
  user?: PurchaseUser | null;
}

interface PurchasesStats {
  totalRevenue: number;
  salesCount: number;
  basePrice?: number | null;
  currency?: string;
  shareAccessMode?: string;
}

export default function MeetingPurchasesModal({
  isOpen,
  onClose,
  meeting,
}: MeetingPurchasesModalProps) {
  const [purchases, setPurchases] = useState<MeetingPurchaseItem[]>([]);
  const [purchasesStats, setPurchasesStats] = useState<PurchasesStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPurchases = async (isManualRefresh = false) => {
    if (!meeting?.id) return;
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/meetings/${meeting.id}/purchases`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load purchases");
      }
      const data = await res.json();
      setPurchases(data.purchases || []);
      setPurchasesStats(data.stats || null);
    } catch (err: any) {
      console.error("Failed to fetch meeting purchases:", err);
      setError(err.message || "Failed to load meeting purchases");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen && meeting?.id) {
      fetchPurchases();
    } else {
      setPurchases([]);
      setPurchasesStats(null);
      setError(null);
    }
  }, [isOpen, meeting?.id]);

  if (!meeting) return null;

  const currentCurrency = meeting.currency || purchasesStats?.currency || "USD";
  const currentAccessMode = purchasesStats?.shareAccessMode || meeting.shareAccessMode || "PUBLIC";
  const currentPrice = purchasesStats?.basePrice !== undefined ? purchasesStats.basePrice : meeting.price;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="2xl" className="max-w-4xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader className="space-y-2 pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-amber-500" />
                  Meeting Purchases
                </DialogTitle>
                <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
                  ID: {meeting.id}
                </Badge>
                {currentAccessMode === "PURCHASABLE" && (
                  <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-500 font-bold text-[10px]">
                    Paid Pass
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs text-muted-foreground line-clamp-1">
                Transaction history and buyer details for <strong className="text-foreground">{meeting.title}</strong>
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchPurchases(true)}
                disabled={loading || refreshing}
                className="h-8 text-xs gap-1.5 cursor-pointer"
                title="Refresh purchases"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="space-y-6 pt-2">
          {/* Stats Header Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Total Revenue */}
            <div className="p-4 rounded-xl bg-card border border-border space-y-1.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-primary" /> Total Meeting Revenue
              </span>
              <p className="text-2xl font-black text-foreground">
                {formatMoney(purchasesStats ? purchasesStats.totalRevenue : 0, currentCurrency)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {purchasesStats?.salesCount || 0} direct purchase{purchasesStats?.salesCount !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Card 2: Share Mode & Price */}
            <div className="p-4 rounded-xl bg-card border border-border space-y-1.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-lime-500" /> Share Mode & Price
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="uppercase text-[10px] font-bold">
                  {currentAccessMode}
                </Badge>
                {currentAccessMode === "PURCHASABLE" && (
                  <span className="font-bold text-sm text-foreground">
                    {formatMoney(currentPrice, currentCurrency)}{" "}
                    <span className="text-xs text-muted-foreground font-normal">({currentCurrency})</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {currentAccessMode === "PURCHASABLE"
                  ? "Paid pass entry enabled"
                  : "Free / restricted sharing"}
              </p>
            </div>

            {/* Card 3: Total Buyers */}
            <div className="p-4 rounded-xl bg-card border border-border space-y-1.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-primary" /> Total Buyers
              </span>
              <p className="text-2xl font-black text-foreground">
                {purchases.length}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Active meeting passes
              </p>
            </div>
          </div>

          {/* Buyers & Transactions Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Pass Holders & Transactions ({purchases.length})
              </h3>
            </div>

            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2.5 text-muted-foreground">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
                <p className="text-xs font-medium">Loading meeting purchases...</p>
              </div>
            ) : error ? (
              <div className="py-10 text-center border border-destructive/30 rounded-xl p-6 bg-destructive/5 space-y-2">
                <p className="text-sm font-semibold text-destructive">{error}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fetchPurchases()}
                  className="text-xs cursor-pointer"
                >
                  Retry
                </Button>
              </div>
            ) : purchases.length === 0 ? (
              <div className="py-14 text-center border border-dashed border-border rounded-xl space-y-2.5 p-6 bg-muted/20">
                <ShoppingBag className="w-9 h-9 text-muted-foreground mx-auto opacity-40" />
                <p className="text-sm font-semibold text-foreground">No purchases yet</p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  When attendees purchase access to this meeting pass, their details and transaction IDs will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-3 px-4">Buyer</th>
                      <th className="py-3 px-4">Amount Paid</th>
                      <th className="py-3 px-4">Country</th>
                      <th className="py-3 px-4">Purchased On</th>
                      <th className="py-3 px-4">Payment ID</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {purchases.map((p) => {
                      const userInitial = (p.user?.name || p.user?.email || "U")[0]?.toUpperCase();
                      return (
                        <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="w-7 h-7">
                                {p.user?.image && <AvatarImage src={p.user.image} alt={p.user.name || "Buyer"} />}
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                                  {userInitial}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-foreground">
                                  {p.user?.name || "Buyer"}
                                </div>
                                <div className="text-[11px] text-muted-foreground font-mono">
                                  {p.user?.email || "—"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-bold text-foreground">
                            {formatMoney(p.amount, p.currency)}{" "}
                            <span className="text-[10px] text-muted-foreground font-normal font-mono">
                              ({p.currency})
                            </span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground font-mono">
                            {p.countryCode || "GLOBAL"}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {new Date(p.createdAt).toLocaleDateString()}{" "}
                            <span className="text-[11px] text-muted-foreground/80">
                              {new Date(p.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                            {p.paymentId || "—"}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.status === "COMPLETED"
                                  ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                                  : p.status === "PENDING"
                                  ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                                  : "bg-muted text-muted-foreground border border-border"
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
