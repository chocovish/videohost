"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Landmark,
  Building2,
  User,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  ArrowDownToLine,
  FileText,
  CreditCard,
  Send,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/utils";

interface AdminPayoutsTabProps {
  onRefreshOverview: () => void;
}

export function AdminPayoutsTab({ onRefreshOverview }: AdminPayoutsTabProps) {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modals state
  const [selectedPayout, setSelectedPayout] = useState<any | null>(null);
  const [modalMode, setModalMode] = useState<"BANK_DETAILS" | "MARK_PROCESSING" | "MARK_COMPLETED" | "REJECT" | null>(null);

  // Form states
  const [transactionId, setTransactionId] = useState("");
  const [transactionProof, setTransactionProof] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/payouts?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setWithdrawals(data.withdrawals || []);
      }
    } catch (err) {
      console.error("Failed to fetch payouts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPayouts();
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const openActionModal = (payout: any, mode: "BANK_DETAILS" | "MARK_PROCESSING" | "MARK_COMPLETED" | "REJECT") => {
    setSelectedPayout(payout);
    setModalMode(mode);
    setTransactionId(payout.transactionId || "");
    setTransactionProof(payout.transactionProof || "");
    setAdminNotes(payout.adminNotes || "");
    setActionError("");
    setActionSuccess("");
  };

  const closeModal = () => {
    setSelectedPayout(null);
    setModalMode(null);
    setTransactionId("");
    setTransactionProof("");
    setAdminNotes("");
    setActionError("");
    setActionSuccess("");
  };

  const handleStatusUpdate = async (targetStatus: "PROCESSING" | "COMPLETED" | "REJECTED") => {
    if (!selectedPayout) return;
    setIsSubmitting(true);
    setActionError("");
    setActionSuccess("");

    if (targetStatus === "COMPLETED" && !transactionId.trim()) {
      setActionError("Please provide a Transaction ID / Reference Number (e.g. Bank UTR, Wire Reference).");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/payouts/${selectedPayout.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          transactionId: transactionId.trim() || undefined,
          transactionProof: transactionProof.trim() || undefined,
          adminNotes: adminNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update payout status");
      }

      setActionSuccess(data.message || "Payout request updated successfully");
      setTimeout(() => {
        closeModal();
        fetchPayouts();
        onRefreshOverview();
      }, 1000);
    } catch (err: any) {
      setActionError(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Wallet className="h-5 w-5 text-amber-400" />
            <span>Creator Payout Requests</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Review withdrawal requests, verify creator bank accounts, and record payment transaction references.
          </p>
        </div>

        <Button
          onClick={fetchPayouts}
          variant="outline"
          size="sm"
          disabled={loading}
          className="self-start sm:self-auto border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-white h-9 rounded-xl text-xs gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-lime-400" : ""}`} />
          <span>Refresh List</span>
        </Button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-900/70 p-1.5 rounded-2xl border border-zinc-800/80">
          {[
            { id: "ALL", label: "All Requests" },
            { id: "PENDING", label: "Pending" },
            { id: "PROCESSING", label: "Processing" },
            { id: "COMPLETED", label: "Completed" },
            { id: "REJECTED", label: "Rejected" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === tab.id
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by org, requester, or UTR..."
            className="pl-9 pr-20 h-10 bg-zinc-900/60 border-zinc-800 text-xs rounded-xl focus-visible:ring-lime-500"
          />
          <Button
            type="submit"
            size="sm"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-2.5 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
          >
            Search
          </Button>
        </form>
      </div>

      {/* Withdrawals Table / List */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-sm">
        {loading ? (
          <div className="p-12 text-center text-zinc-400 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-lime-400 mx-auto" />
            <p className="text-xs">Loading payout requests...</p>
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-400">
              <Wallet className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">No Payout Requests Found</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              {statusFilter !== "ALL"
                ? `There are currently no payout requests with status '${statusFilter}'.`
                : "No creator withdrawal requests have been submitted yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/60 border-b border-zinc-800/80 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Organization & Requester</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Bank Details</th>
                  <th className="py-3.5 px-4">Transaction Ref</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {withdrawals.map((item) => {
                  const bank = item.bankDetails || {};
                  const isPending = item.status === "PENDING";
                  const isProcessing = item.status === "PROCESSING";
                  const isCompleted = item.status === "COMPLETED";
                  const isRejected = item.status === "REJECTED";

                  return (
                    <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                      {/* Organization & Requester */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                            <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                            <span>{item.organization?.name || "Workspace"}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
                            <User className="h-3 w-3 text-zinc-500" />
                            <span>{item.requestedBy?.name || item.requestedBy?.email || "Unknown User"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4">
                        <span className="font-extrabold text-white text-sm">
                          {formatMoney(item.amount, item.currency)}
                        </span>
                        <span className="block text-[10px] text-zinc-500 uppercase">{item.currency}</span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock className="h-3 w-3" />
                            Pending Review
                          </span>
                        )}
                        {isProcessing && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
                            <RefreshCw className="h-3 w-3" />
                            Processing
                          </span>
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" />
                            Processed
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                            <XCircle className="h-3 w-3" />
                            Rejected
                          </span>
                        )}
                      </td>

                      {/* Bank Details Summary */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-zinc-200 text-xs truncate max-w-[160px]">
                            {bank.bankName || "Bank"}
                          </p>
                          <p className="text-[11px] text-zinc-400 font-mono">
                            {bank.accountNumber ? `•••• ${bank.accountNumber.slice(-4)}` : "No account #"}
                          </p>
                          <button
                            onClick={() => openActionModal(item, "BANK_DETAILS")}
                            className="text-[10px] text-lime-400 hover:text-lime-300 underline font-medium"
                          >
                            View Bank Details
                          </button>
                        </div>
                      </td>

                      {/* Transaction Ref */}
                      <td className="py-4 px-4">
                        {item.transactionId ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-xs font-mono font-bold text-emerald-400">
                              <span>{item.transactionId}</span>
                              <button
                                onClick={() => handleCopy(item.transactionId, `tx-${item.id}`)}
                                className="p-1 hover:text-white"
                                title="Copy UTR"
                              >
                                {copiedKey === `tx-${item.id}` ? (
                                  <Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3 w-3 text-zinc-500" />
                                )}
                              </button>
                            </div>
                            {item.adminNotes && (
                              <p className="text-[10px] text-zinc-400 truncate max-w-[140px] italic">
                                Note: {item.adminNotes}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-500 text-[11px] italic">— None yet —</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 text-[11px] text-zinc-400">
                        <div>Req: {new Date(item.createdAt).toLocaleDateString()}</div>
                        {item.processedAt && (
                          <div className="text-zinc-500 text-[10px]">
                            Done: {new Date(item.processedAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <Button
                              onClick={() => openActionModal(item, "MARK_PROCESSING")}
                              size="sm"
                              className="h-7 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold"
                            >
                              Process
                            </Button>
                          )}

                          {(isPending || isProcessing) && (
                            <Button
                              onClick={() => openActionModal(item, "MARK_COMPLETED")}
                              size="sm"
                              className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold"
                            >
                              Mark Processed
                            </Button>
                          )}

                          {(isPending || isProcessing) && (
                            <Button
                              onClick={() => openActionModal(item, "REJECT")}
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/40 text-[11px]"
                            >
                              Reject
                            </Button>
                          )}

                          {(isCompleted || isRejected) && (
                            <Button
                              onClick={() => openActionModal(item, "BANK_DETAILS")}
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 rounded-lg border-zinc-800 text-zinc-400 hover:text-zinc-200 text-[11px]"
                            >
                              Details
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog Modals */}
      {selectedPayout && (
        <Dialog open={!!modalMode} onOpenChange={(open) => !open && closeModal()}>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-lg max-h-[90vh] flex flex-col p-6 overflow-hidden">
            {/* 1. BANK DETAILS MODAL */}
            {modalMode === "BANK_DETAILS" && (
              <>
                <DialogHeader className="shrink-0 pb-3 border-b border-zinc-800">
                  <DialogTitle className="flex items-center gap-2 text-white">
                    <Landmark className="h-5 w-5 text-lime-400" />
                    <span>Beneficiary Bank Account Details</span>
                  </DialogTitle>
                  <DialogDescription className="text-zinc-400 text-xs">
                    Transfer funds to this account for organization{" "}
                    <span className="font-semibold text-zinc-200">
                      {selectedPayout.organization?.name}
                    </span>
                    .
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 py-3 pr-1">
                  <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-4 space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <span className="text-zinc-400">Payout Amount:</span>
                      <span className="text-base font-extrabold text-lime-400">
                        {formatMoney(selectedPayout.amount, selectedPayout.currency)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Account Holder:</span>
                      <div className="flex items-center gap-1 font-semibold text-white">
                        <span>{selectedPayout.bankDetails?.accountHolderName || "—"}</span>
                        {selectedPayout.bankDetails?.accountHolderName && (
                          <button
                            onClick={() =>
                              handleCopy(selectedPayout.bankDetails.accountHolderName, "holder")
                            }
                            className="p-1 hover:text-lime-400"
                          >
                            {copiedKey === "holder" ? <Check className="h-3 w-3 text-lime-400" /> : <Copy className="h-3 w-3 text-zinc-500" />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Bank Name:</span>
                      <span className="text-zinc-200">{selectedPayout.bankDetails?.bankName || "—"}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Account Number:</span>
                      <div className="flex items-center gap-1 font-bold text-white">
                        <span>{selectedPayout.bankDetails?.accountNumber || "—"}</span>
                        {selectedPayout.bankDetails?.accountNumber && (
                          <button
                            onClick={() =>
                              handleCopy(selectedPayout.bankDetails.accountNumber, "acc")
                            }
                            className="p-1 hover:text-lime-400"
                          >
                            {copiedKey === "acc" ? <Check className="h-3 w-3 text-lime-400" /> : <Copy className="h-3 w-3 text-zinc-500" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {selectedPayout.bankDetails?.routingNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Routing / IFSC Code:</span>
                        <div className="flex items-center gap-1 font-semibold text-zinc-200">
                          <span>{selectedPayout.bankDetails.routingNumber}</span>
                          <button
                            onClick={() =>
                              handleCopy(selectedPayout.bankDetails.routingNumber, "routing")
                            }
                            className="p-1 hover:text-lime-400"
                          >
                            {copiedKey === "routing" ? <Check className="h-3 w-3 text-lime-400" /> : <Copy className="h-3 w-3 text-zinc-500" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedPayout.bankDetails?.swiftCode && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">SWIFT / BIC Code:</span>
                        <span className="text-zinc-200">{selectedPayout.bankDetails.swiftCode}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Account Type:</span>
                      <span className="text-zinc-200">{selectedPayout.bankDetails?.accountType || "CHECKING"}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Country & Currency:</span>
                      <span className="text-zinc-200">
                        {selectedPayout.bankDetails?.country || "US"} ({selectedPayout.currency})
                      </span>
                    </div>
                  </div>

                  {selectedPayout.transactionId && (
                    <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/30 p-3.5 space-y-1">
                      <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                        Recorded Transaction Ref / UTR:
                      </span>
                      <p className="font-mono text-xs font-bold text-white">
                        {selectedPayout.transactionId}
                      </p>
                      {selectedPayout.adminNotes && (
                        <p className="text-xs text-zinc-400 italic">Note: {selectedPayout.adminNotes}</p>
                      )}
                    </div>
                  )}
                </div>

                <DialogFooter className="pt-3 border-t border-zinc-800 shrink-0 mt-auto flex items-center justify-between sm:justify-between">
                  <Button variant="ghost" onClick={closeModal} className="text-zinc-400 text-xs">
                    Close
                  </Button>
                  {(selectedPayout.status === "PENDING" || selectedPayout.status === "PROCESSING") && (
                    <Button
                      onClick={() => setModalMode("MARK_COMPLETED")}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Enter Transaction & Complete</span>
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}

            {/* 2. MARK AS PROCESSING MODAL */}
            {modalMode === "MARK_PROCESSING" && (
              <>
                <DialogHeader className="shrink-0 pb-3 border-b border-zinc-800">
                  <DialogTitle className="flex items-center gap-2 text-white">
                    <RefreshCw className="h-5 w-5 text-blue-400 animate-spin" />
                    <span>Mark Payout Request as Processing</span>
                  </DialogTitle>
                  <DialogDescription className="text-zinc-400 text-xs">
                    Confirm that bank transfer for{" "}
                    <span className="text-white font-semibold">
                      {formatMoney(selectedPayout.amount, selectedPayout.currency)}
                    </span>{" "}
                    is currently being executed.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-3 pr-1">
                  {actionError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{actionError}</span>
                    </div>
                  )}
                  {actionSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0" />
                      <span>{actionSuccess}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-300">Internal Admin Notes (Optional)</Label>
                    <Input
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="e.g. Sent wire to bank queue, awaiting clearance"
                      className="bg-zinc-900 border-zinc-800 text-xs"
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2 pt-3 border-t border-zinc-800 shrink-0 mt-auto">
                  <Button variant="ghost" onClick={closeModal} disabled={isSubmitting} className="text-zinc-400 text-xs">
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate("PROCESSING")}
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span>Set as Processing</span>
                  </Button>
                </DialogFooter>
              </>
            )}

            {/* 3. MARK AS COMPLETED (PROCESSED) MODAL */}
            {modalMode === "MARK_COMPLETED" && (
              <>
                <DialogHeader className="shrink-0 pb-3 border-b border-zinc-800">
                  <DialogTitle className="flex items-center gap-2 text-white">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <span>Mark Payout as Processed / Completed</span>
                  </DialogTitle>
                  <DialogDescription className="text-zinc-400 text-xs">
                    Enter the transaction confirmation reference or Bank UTR number for{" "}
                    <span className="text-white font-bold">
                      {formatMoney(selectedPayout.amount, selectedPayout.currency)}
                    </span>
                    .
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-3 pr-1">
                  {actionError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{actionError}</span>
                    </div>
                  )}
                  {actionSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0" />
                      <span>{actionSuccess}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-200 font-semibold flex items-center justify-between">
                      <span>Transaction ID / Bank UTR Reference *</span>
                      <span className="text-[10px] text-zinc-500">Required</span>
                    </Label>
                    <Input
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g. UTR1984209420, WIRE-983021, TX_89230"
                      className="bg-zinc-900 border-zinc-800 font-mono text-xs focus-visible:ring-emerald-500"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-300">Transaction Proof / Receipt Link (Optional)</Label>
                    <Input
                      value={transactionProof}
                      onChange={(e) => setTransactionProof(e.target.value)}
                      placeholder="e.g. https://... or Bank Receipt #1234"
                      className="bg-zinc-900 border-zinc-800 text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-300">Admin Notes / Remarks (Optional)</Label>
                    <Input
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="e.g. Completed via NEFT / Fedwire on Monday"
                      className="bg-zinc-900 border-zinc-800 text-xs"
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2 pt-3 border-t border-zinc-800 shrink-0 mt-auto">
                  <Button variant="ghost" onClick={closeModal} disabled={isSubmitting} className="text-zinc-400 text-xs">
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate("COMPLETED")}
                    disabled={isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-1.5 shadow-lg shadow-emerald-950/50"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    <span>Confirm & Mark Processed</span>
                  </Button>
                </DialogFooter>
              </>
            )}

            {/* 4. REJECT MODAL */}
            {modalMode === "REJECT" && (
              <>
                <DialogHeader className="shrink-0 pb-3 border-b border-zinc-800">
                  <DialogTitle className="flex items-center gap-2 text-red-400">
                    <XCircle className="h-5 w-5" />
                    <span>Reject Payout Request</span>
                  </DialogTitle>
                  <DialogDescription className="text-zinc-400 text-xs">
                    Reject the withdrawal request for{" "}
                    <span className="text-white font-semibold">
                      {formatMoney(selectedPayout.amount, selectedPayout.currency)}
                    </span>
                    . The creator will be notified.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-3 pr-1">
                  {actionError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{actionError}</span>
                    </div>
                  )}
                  {actionSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0" />
                      <span>{actionSuccess}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-300">Reason for Rejection *</Label>
                    <Input
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="e.g. Invalid bank routing number, please re-enter and re-submit"
                      className="bg-zinc-900 border-zinc-800 text-xs"
                      autoFocus
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2 pt-3 border-t border-zinc-800 shrink-0 mt-auto">
                  <Button variant="ghost" onClick={closeModal} disabled={isSubmitting} className="text-zinc-400 text-xs">
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate("REJECTED")}
                    disabled={isSubmitting}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-500 text-white text-xs gap-1.5"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    <span>Reject Payout Request</span>
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
