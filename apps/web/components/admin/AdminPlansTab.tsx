"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Plus,
  Sparkles,
  RefreshCw,
  HardDrive,
  Clock,
  Tv,
  Users as UsersIcon,
  BadgePercent,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
  Edit3,
  Building2,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/utils";

interface AdminPlansTabProps {
  onRefreshOverview: () => void;
}

export function AdminPlansTab({ onRefreshOverview }: AdminPlansTabProps) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [storageLimitGb, setStorageLimitGb] = useState("50");
  const [minutesLimit, setMinutesLimit] = useState("2000");
  const [maxResolution, setMaxResolution] = useState("1080p");
  const [seatLimit, setSeatLimit] = useState("5");
  const [priceMonthlyCents, setPriceMonthlyCents] = useState("0");
  const [commissionPercent, setCommissionPercent] = useState("4.0");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/plans");
      const data = await res.json();
      if (data.success) {
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error("Failed to fetch plans:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openCreateModal = () => {
    setEditingPlan(null);
    setName("");
    setStorageLimitGb("50");
    setMinutesLimit("2000");
    setMaxResolution("1080p");
    setSeatLimit("5");
    setPriceMonthlyCents("0");
    setCommissionPercent("4.0");
    setModalError("");
    setModalSuccess("");
    setIsModalOpen(true);
  };

  const openEditModal = (plan: any) => {
    setEditingPlan(plan);
    setName(plan.name);
    setStorageLimitGb(String(plan.storageLimitGb));
    setMinutesLimit(String(plan.minutesLimit));
    setMaxResolution(plan.maxResolution || "1080p");
    setSeatLimit(String(plan.seatLimit || 1));
    setPriceMonthlyCents(String(plan.priceMonthlyCents || 0));
    setCommissionPercent(String(plan.commissionPercent ?? 5.0));
    setModalError("");
    setModalSuccess("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
    setModalError("");
    setModalSuccess("");
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setModalError("Plan name is required.");
      return;
    }

    setIsSubmitting(true);
    setModalError("");
    setModalSuccess("");

    try {
      const isEditing = Boolean(editingPlan);
      const url = isEditing ? `/api/admin/plans/${editingPlan.id}` : "/api/admin/plans";
      const method = isEditing ? "PATCH" : "POST";

      const payload = {
        name: name.trim(),
        storageLimitGb: parseInt(storageLimitGb, 10) || 0,
        minutesLimit: parseInt(minutesLimit, 10) || 0,
        maxResolution,
        seatLimit: parseInt(seatLimit, 10) || 1,
        priceMonthlyCents: parseInt(priceMonthlyCents, 10) || 0,
        commissionPercent: parseFloat(commissionPercent) || 0,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save plan");
      }

      setModalSuccess(data.message || "Plan saved successfully");
      setTimeout(() => {
        closeModal();
        fetchPlans();
        onRefreshOverview();
      }, 900);
    } catch (err: any) {
      setModalError(err.message || "Failed to save plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlan = async (plan: any) => {
    if (!confirm(`Are you sure you want to delete custom plan "${plan.name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to delete plan");
        return;
      }
      fetchPlans();
      onRefreshOverview();
    } catch (err: any) {
      alert(err.message || "Failed to delete plan");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="h-5 w-5 text-lime-400" />
            <span>Subscription & Custom Plans</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure standard tiers, craft custom enterprise/VIP plans, and customize commission fees.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={fetchPlans}
            variant="outline"
            size="sm"
            disabled={loading}
            className="border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-white h-9 rounded-xl text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-lime-400" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={openCreateModal}
            size="sm"
            className="bg-lime-500 hover:bg-lime-400 text-zinc-950 font-bold text-xs h-9 px-4 rounded-xl gap-1.5 shadow-[0_0_20px_rgba(132,204,22,0.25)]"
          >
            <Plus className="h-4 w-4" />
            <span>Add Custom Plan</span>
          </Button>
        </div>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 rounded-3xl bg-zinc-900/60 border border-zinc-800" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3">
          <Layers className="h-8 w-8 text-zinc-500 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No Plans Found</h3>
          <Button onClick={openCreateModal} size="sm" className="bg-lime-500 text-zinc-950 font-bold text-xs">
            Create First Custom Plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const isCustom = Boolean(plan.isCustom);
            const isUnlimited = plan.storageLimitGb === 0;

            return (
              <div
                key={plan.id}
                className={`relative overflow-hidden rounded-3xl border p-6 flex flex-col justify-between transition-all duration-200 ${
                  isCustom
                    ? "bg-gradient-to-b from-purple-950/20 via-zinc-900/60 to-zinc-950 border-purple-500/30 hover:border-purple-500/60"
                    : plan.name === "pro"
                    ? "bg-gradient-to-b from-lime-950/20 via-zinc-900/60 to-zinc-950 border-lime-500/30 hover:border-lime-500/60"
                    : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                {/* Top Badge & Title */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          isCustom
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                        }`}
                      >
                        {isCustom && <Sparkles className="h-2.5 w-2.5 text-purple-400" />}
                        {isCustom ? "Custom Plan" : "Standard Tier"}
                      </span>
                    </div>

                    <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1 font-mono">
                      <Building2 className="h-3 w-3 text-zinc-500" />
                      <span>{plan.organizationsCount || 0} orgs</span>
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-white uppercase tracking-tight">
                    {plan.name}
                  </h3>

                  <div className="mt-2 flex items-baseline gap-1 text-zinc-300">
                    <span className="text-2xl font-black text-white">
                      {plan.priceMonthlyCents === 0
                        ? "Free"
                        : `₹${(plan.priceMonthlyCents / 100).toLocaleString("en-IN")}`}
                    </span>
                    {plan.priceMonthlyCents > 0 && (
                      <span className="text-xs text-zinc-500">/ month</span>
                    )}
                  </div>

                  {/* Feature Limits List */}
                  <div className="mt-6 space-y-2.5 pt-4 border-t border-zinc-800/80 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <HardDrive className="h-3.5 w-3.5 text-lime-400" />
                        Storage Quota:
                      </span>
                      <span className="font-bold text-white">
                        {isUnlimited ? "Unlimited" : `${plan.storageLimitGb} GB`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-blue-400" />
                        Minutes Allocation:
                      </span>
                      <span className="font-bold text-white">
                        {plan.minutesLimit?.toLocaleString()} mins
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <Tv className="h-3.5 w-3.5 text-purple-400" />
                        Max Resolution:
                      </span>
                      <span className="font-bold text-white uppercase font-mono">
                        {plan.maxResolution || "1080p"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <UsersIcon className="h-3.5 w-3.5 text-amber-400" />
                        Seat Limit:
                      </span>
                      <span className="font-bold text-white">
                        {plan.seatLimit} {plan.seatLimit === 1 ? "seat" : "seats"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <BadgePercent className="h-3.5 w-3.5 text-emerald-400" />
                        Platform Fee / Take:
                      </span>
                      <span className="font-bold text-emerald-400">
                        {plan.commissionPercent ?? 5}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                  <Button
                    onClick={() => openEditModal(plan)}
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 rounded-xl border-zinc-800 bg-zinc-900 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 gap-1.5"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-lime-400" />
                    <span>Edit Plan</span>
                  </Button>

                  {isCustom && plan.organizationsCount === 0 && (
                    <Button
                      onClick={() => handleDeletePlan(plan)}
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-950/40 text-xs"
                      title="Delete Plan"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Add / Edit Plan Dialog Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-lg max-h-[90vh] flex flex-col p-6 overflow-hidden">
          <form onSubmit={handleSavePlan} className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <DialogHeader className="shrink-0 pb-3 border-b border-zinc-800">
              <DialogTitle className="flex items-center gap-2 text-white">
                {editingPlan ? (
                  <>
                    <Edit3 className="h-5 w-5 text-lime-400" />
                    <span>Edit Plan ({editingPlan.name})</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 text-lime-400" />
                    <span>Create Custom Subscription Plan</span>
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-zinc-400 text-xs">
                Configure plan quotas, maximum video resolution, and creator sales commission rates.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-3 pr-1">
              {modalError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}
              {modalSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>{modalSuccess}</span>
                </div>
              )}

              {/* Plan Name */}
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-200 font-semibold">Plan Identifier / Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. VIP Studio, Enterprise Ultra, Acme Custom"
                  className="bg-zinc-900 border-zinc-800 text-xs"
                  required
                />
              </div>

              {/* Limits Row 1 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-200">Storage Quota (GB) *</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      value={storageLimitGb}
                      onChange={(e) => setStorageLimitGb(e.target.value)}
                      placeholder="e.g. 50 (0 = Unlimited)"
                      className="bg-zinc-900 border-zinc-800 text-xs pr-10"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-mono">
                      GB
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500">Set 0 for unlimited</span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-200">Minutes Allocation *</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      value={minutesLimit}
                      onChange={(e) => setMinutesLimit(e.target.value)}
                      placeholder="e.g. 2000"
                      className="bg-zinc-900 border-zinc-800 text-xs pr-12"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-mono">
                      Mins
                    </span>
                  </div>
                </div>
              </div>

              {/* Limits Row 2 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-200">Max Video Resolution</Label>
                  <Select value={maxResolution} onValueChange={(val) => val && setMaxResolution(val)}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200 text-xs">
                      <SelectItem value="720p">720p HD</SelectItem>
                      <SelectItem value="1080p">1080p Full HD</SelectItem>
                      <SelectItem value="1440p">1440p 2K</SelectItem>
                      <SelectItem value="4k">4K Ultra HD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-200">Seat Limit</Label>
                  <Input
                    type="number"
                    min="1"
                    value={seatLimit}
                    onChange={(e) => setSeatLimit(e.target.value)}
                    placeholder="e.g. 5"
                    className="bg-zinc-900 border-zinc-800 text-xs h-9"
                    required
                  />
                </div>
              </div>

              {/* Pricing & Commission Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-200">Price Monthly (INR Paise)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={priceMonthlyCents}
                    onChange={(e) => setPriceMonthlyCents(e.target.value)}
                    placeholder="e.g. 99900 (for ₹999)"
                    className="bg-zinc-900 border-zinc-800 text-xs h-9"
                  />
                  <span className="text-[10px] text-zinc-500">
                    ≈ ₹{((parseInt(priceMonthlyCents, 10) || 0) / 100).toFixed(0)} / mo
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-200">Platform Fee / Commission (%)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={commissionPercent}
                      onChange={(e) => setCommissionPercent(e.target.value)}
                      placeholder="e.g. 3.5"
                      className="bg-zinc-900 border-zinc-800 text-xs h-9 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-mono">
                      %
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500">Tier platform cut</span>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-3 border-t border-zinc-800 shrink-0 mt-auto">
              <Button type="button" variant="ghost" onClick={closeModal} disabled={isSubmitting} className="text-zinc-400 text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-lime-500 hover:bg-lime-400 text-zinc-950 font-bold text-xs gap-1.5"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span>{editingPlan ? "Save Plan Changes" : "Create Plan"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
