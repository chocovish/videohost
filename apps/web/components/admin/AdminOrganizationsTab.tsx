"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Search,
  RefreshCw,
  HardDrive,
  Layers,
  Edit3,
  Check,
  AlertCircle,
  Loader2,
  User,
  Film,
  Users as UsersIcon,
  Sparkles,
  Database,
  ArrowRight,
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

interface AdminOrganizationsTabProps {
  onRefreshOverview: () => void;
}

export function AdminOrganizationsTab({ onRefreshOverview }: AdminOrganizationsTabProps) {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Edit Modal state
  const [selectedOrg, setSelectedOrg] = useState<any | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [customStorageLimit, setCustomStorageLimit] = useState<string>("");
  const [customMinutesLimit, setCustomMinutesLimit] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const [orgsRes, plansRes] = await Promise.all([
        fetch(`/api/admin/organizations?${params.toString()}`),
        fetch("/api/admin/plans"),
      ]);

      const [orgsData, plansData] = await Promise.all([
        orgsRes.json(),
        plansRes.json(),
      ]);

      if (orgsData.success) {
        setOrganizations(orgsData.organizations || []);
      }
      if (plansData.success) {
        setAvailablePlans(plansData.plans || []);
      }
    } catch (err) {
      console.error("Failed to fetch organizations or plans:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const openEditModal = (org: any) => {
    setSelectedOrg(org);
    setSelectedPlanId(org.planId || org.plan?.id || "");
    setCustomStorageLimit(
      org.customStorageLimitGb !== null && org.customStorageLimitGb !== undefined
        ? String(org.customStorageLimitGb)
        : ""
    );
    setCustomMinutesLimit(
      org.customMinutesLimit !== null && org.customMinutesLimit !== undefined
        ? String(org.customMinutesLimit)
        : ""
    );
    setModalError("");
    setModalSuccess("");
  };

  const closeEditModal = () => {
    setSelectedOrg(null);
    setSelectedPlanId("");
    setCustomStorageLimit("");
    setCustomMinutesLimit("");
    setModalError("");
    setModalSuccess("");
  };

  const handleSaveOrganization = async () => {
    if (!selectedOrg) return;
    setIsSubmitting(true);
    setModalError("");
    setModalSuccess("");

    try {
      const payload: any = {
        planId: selectedPlanId,
        customStorageLimitGb: customStorageLimit.trim() === "" ? null : parseInt(customStorageLimit, 10),
        customMinutesLimit: customMinutesLimit.trim() === "" ? null : parseInt(customMinutesLimit, 10),
      };

      const res = await fetch(`/api/admin/organizations/${selectedOrg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update organization");
      }

      setModalSuccess(data.message || "Organization updated successfully");
      setTimeout(() => {
        closeEditModal();
        fetchData();
        onRefreshOverview();
      }, 900);
    } catch (err: any) {
      setModalError(err.message || "Failed to execute organization update");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-400" />
            <span>Organization Workspaces & Storage Quotas</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Assign subscription tiers, override storage allocations, and inspect workspace resource consumption.
          </p>
        </div>

        <Button
          onClick={fetchData}
          variant="outline"
          size="sm"
          disabled={loading}
          className="self-start sm:self-auto border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-white h-9 rounded-xl text-xs gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-lime-400" : ""}`} />
          <span>Refresh Orgs</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by workspace name or slug..."
            className="pl-9 pr-20 h-10 bg-zinc-900/60 border-zinc-800 text-xs rounded-xl focus-visible:ring-purple-500"
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

      {/* Organizations Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-sm">
        {loading ? (
          <div className="p-12 text-center text-zinc-400 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto" />
            <p className="text-xs">Loading organizations...</p>
          </div>
        ) : organizations.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-400">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">No Organizations Found</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              {searchQuery
                ? `No organizations matched the search query "${searchQuery}".`
                : "No organizations created yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/60 border-b border-zinc-800/80 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Organization</th>
                  <th className="py-3.5 px-4">Owner</th>
                  <th className="py-3.5 px-4">Current Plan</th>
                  <th className="py-3.5 px-4">Storage Usage vs Quota</th>
                  <th className="py-3.5 px-4">Assets & Members</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {organizations.map((org) => {
                  const hasCustomStorage = org.customStorageLimitGb !== null && org.customStorageLimitGb !== undefined;
                  const limitGb = org.effectiveStorageLimitGb;
                  const isUnlimited = limitGb === 0;
                  const usedGb = org.usedGb || 0;
                  const usagePct = isUnlimited ? 0 : Math.min(100, Math.round((usedGb / limitGb) * 100));

                  return (
                    <tr key={org.id} className="hover:bg-zinc-800/30 transition-colors">
                      {/* Organization Info */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-white text-xs">{org.name}</p>
                          <p className="text-[11px] text-zinc-400 font-mono">slug: {org.slug}</p>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="py-4 px-4">
                        {org.owner ? (
                          <div className="space-y-0.5">
                            <p className="font-semibold text-zinc-200 text-xs truncate max-w-[140px]">
                              {org.owner.name || "Owner"}
                            </p>
                            <p className="text-[11px] text-zinc-400 font-mono truncate max-w-[140px]">
                              {org.owner.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-zinc-500 text-[11px] italic">No owner assigned</span>
                        )}
                      </td>

                      {/* Current Plan */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              org.plan?.isCustom
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                : org.plan?.name === "enterprise"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : org.plan?.name === "pro"
                                ? "bg-lime-500/10 text-lime-400 border border-lime-500/20"
                                : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                            }`}
                          >
                            <Layers className="h-3 w-3" />
                            <span>{org.plan?.name}</span>
                          </span>
                          {org.plan?.isCustom && (
                            <span className="block text-[9px] text-purple-400 font-semibold">
                              ★ Custom Plan
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Storage Usage Bar */}
                      <td className="py-4 px-4">
                        <div className="space-y-1.5 max-w-[200px]">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-white">{usedGb} GB</span>
                            <span className="text-zinc-400">
                              {isUnlimited ? "Unlimited" : `/ ${limitGb} GB`}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                usagePct > 90
                                  ? "bg-red-500"
                                  : usagePct > 70
                                  ? "bg-amber-500"
                                  : "bg-lime-400"
                              }`}
                              style={{ width: `${isUnlimited ? 5 : usagePct}%` }}
                            />
                          </div>
                          {hasCustomStorage && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-lime-400 bg-lime-500/10 px-1.5 py-0.5 rounded border border-lime-500/20">
                              <Sparkles className="h-2.5 w-2.5" />
                              Custom Limit Override
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Assets & Members */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5 text-[11px] text-zinc-400">
                          <div className="flex items-center gap-1 text-zinc-300">
                            <Film className="h-3 w-3 text-zinc-500" />
                            <span>{org.videosCount || 0} Videos</span>
                          </div>
                          <div className="flex items-center gap-1 text-zinc-400">
                            <UsersIcon className="h-3 w-3 text-zinc-500" />
                            <span>{org.membersCount || 0} Members</span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <Button
                          onClick={() => openEditModal(org)}
                          size="sm"
                          className="h-7 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-[11px] font-semibold gap-1.5 border border-zinc-700"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-lime-400" />
                          <span>Change Plan & Limits</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Plan & Storage Modal */}
      {selectedOrg && (
        <Dialog open={!!selectedOrg} onOpenChange={(open) => !open && closeEditModal()}>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Edit3 className="h-5 w-5 text-lime-400" />
                <span>Modify Organization Plan & Storage Limits</span>
              </DialogTitle>
              <DialogDescription className="text-zinc-400 text-xs">
                Update plan assignment and allocate custom storage/minutes quotas for{" "}
                <span className="font-semibold text-white">{selectedOrg.name}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
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

              {/* Select Plan */}
              <div className="space-y-2">
                <Label className="text-xs text-zinc-200 font-semibold">Assigned Subscription Plan</Label>
                <Select value={selectedPlanId} onValueChange={(val) => val && setSelectedPlanId(val)}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs h-10">
                    <SelectValue placeholder="Select plan..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200 text-xs">
                    {availablePlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name.toUpperCase()} {plan.isCustom ? "★ (Custom)" : ""} —{" "}
                        {plan.storageLimitGb === 0 ? "Unlimited Storage" : `${plan.storageLimitGb} GB Storage`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-zinc-500">
                  Select any standard (free, basic, pro, enterprise) or custom plan.
                </p>
              </div>

              {/* Custom Storage Override */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-zinc-200 font-semibold">
                    Custom Storage Limit (GB Override)
                  </Label>
                  <button
                    type="button"
                    onClick={() => setCustomStorageLimit("")}
                    className="text-[10px] text-lime-400 hover:underline"
                  >
                    Reset to Plan Default
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    value={customStorageLimit}
                    onChange={(e) => setCustomStorageLimit(e.target.value)}
                    placeholder="Leave empty to use plan default (e.g. 50, 100, 500, or 0 for unlimited)"
                    className="bg-zinc-900 border-zinc-800 text-xs pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-mono">
                    GB
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Override plan storage quota for this workspace. Set 0 for unlimited, or leave blank for default plan storage.
                </p>
              </div>

              {/* Custom Minutes Override */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-zinc-200 font-semibold">
                    Custom Minutes Limit (Override)
                  </Label>
                  <button
                    type="button"
                    onClick={() => setCustomMinutesLimit("")}
                    className="text-[10px] text-lime-400 hover:underline"
                  >
                    Reset to Plan Default
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    value={customMinutesLimit}
                    onChange={(e) => setCustomMinutesLimit(e.target.value)}
                    placeholder="Leave empty for plan default (e.g. 1000, 5000)"
                    className="bg-zinc-900 border-zinc-800 text-xs pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-mono">
                    Mins
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={closeEditModal} disabled={isSubmitting} className="text-zinc-400 text-xs">
                Cancel
              </Button>
              <Button
                onClick={handleSaveOrganization}
                disabled={isSubmitting}
                className="bg-lime-500 hover:bg-lime-400 text-zinc-950 font-bold text-xs gap-1.5"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span>Save Changes</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
