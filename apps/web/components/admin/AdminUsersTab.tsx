"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  UserCheck,
  UserX,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Building2,
  Calendar,
  AlertCircle,
  Check,
  Loader2,
  Mail,
  LogIn,
  Shield,
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

interface AdminUsersTabProps {
  onRefreshOverview: () => void;
}

export function AdminUsersTab({ onRefreshOverview }: AdminUsersTabProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL"); // ALL | ACTIVE | BLOCKED
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Block/Unblock Modal state
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  // Impersonate Modal state
  const [impersonatingUser, setImpersonatingUser] = useState<any | null>(null);
  const [isImpersonatingLoading, setIsImpersonatingLoading] = useState(false);
  const [impersonateError, setImpersonateError] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "ALL") params.set("filter", filter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const openBlockModal = (user: any) => {
    setSelectedUser(user);
    setBlockReason(user.blockedReason || "");
    setModalError("");
    setModalSuccess("");
  };

  const closeBlockModal = () => {
    setSelectedUser(null);
    setBlockReason("");
    setModalError("");
    setModalSuccess("");
  };

  const openImpersonateModal = (user: any) => {
    setImpersonatingUser(user);
    setImpersonateError("");
  };

  const closeImpersonateModal = () => {
    setImpersonatingUser(null);
    setImpersonateError("");
    setIsImpersonatingLoading(false);
  };

  const handleExecuteImpersonation = async () => {
    if (!impersonatingUser) return;
    setIsImpersonatingLoading(true);
    setImpersonateError("");

    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: impersonatingUser.id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to start user impersonation");
      }

      // Hard redirect to dashboard so browser loads session cleanly
      window.location.href = data.redirect || "/dashboard";
    } catch (err: any) {
      setImpersonateError(err.message || "Failed to start impersonation session");
      setIsImpersonatingLoading(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    setModalError("");
    setModalSuccess("");

    const willBlock = !selectedUser.isBlocked;

    try {
      const res = await fetch("/api/admin/users/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          isBlocked: willBlock,
          reason: willBlock ? (blockReason.trim() || "Blocked by administrator") : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update user block status");
      }

      setModalSuccess(data.message || "User updated successfully");
      setTimeout(() => {
        closeBlockModal();
        fetchUsers();
        onRefreshOverview();
      }, 900);
    } catch (err: any) {
      setModalError(err.message || "Failed to execute user block update");
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
            <Users className="h-5 w-5 text-blue-400" />
            <span>User Accounts & Moderation</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Search registered users, log in as user to test and browse the site, and manage account statuses.
          </p>
        </div>

        <Button
          onClick={fetchUsers}
          variant="outline"
          size="sm"
          disabled={loading}
          className="self-start sm:self-auto border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-white h-9 rounded-xl text-xs gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-lime-400" : ""}`} />
          <span>Refresh Users</span>
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 bg-zinc-900/70 p-1.5 rounded-2xl border border-zinc-800/80">
          {[
            { id: "ALL", label: "All Users" },
            { id: "ACTIVE", label: "Active Only" },
            { id: "BLOCKED", label: "Blocked Only" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === tab.id
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
            placeholder="Search by name or email..."
            className="pl-9 pr-20 h-10 bg-zinc-900/60 border-zinc-800 text-xs rounded-xl focus-visible:ring-blue-500"
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

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-sm">
        {loading ? (
          <div className="p-12 text-center text-zinc-400 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" />
            <p className="text-xs">Loading users directory...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-400">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">No Users Found</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              {searchQuery
                ? `No user accounts matched the search query "${searchQuery}".`
                : "No users registered in this system yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/60 border-b border-zinc-800/80 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Workspaces / Orgs</th>
                  <th className="py-3.5 px-4">View Mode</th>
                  <th className="py-3.5 px-4">Joined Date</th>
                  <th className="py-3.5 px-4 text-right">Actions & Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {users.map((user) => {
                  const isBlocked = Boolean(user.isBlocked);

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-zinc-800/30 transition-colors ${
                        isBlocked ? "bg-red-950/10" : ""
                      }`}
                    >
                      {/* User Info */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 font-bold text-white text-xs shrink-0 overflow-hidden">
                            {user.image ? (
                              <img src={user.image} alt={user.name || ""} className="h-full w-full object-cover" />
                            ) : (
                              (user.name?.[0] || user.email?.[0] || "U").toUpperCase()
                            )}
                          </div>
                          <div className="space-y-0.5 max-w-[200px]">
                            <p className="font-bold text-white text-xs truncate">
                              {user.name || "Unnamed User"}
                            </p>
                            <p className="text-[11px] text-zinc-400 truncate flex items-center gap-1 font-mono">
                              <Mail className="h-3 w-3 text-zinc-500" />
                              <span>{user.email || "No email"}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {isBlocked ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                              <ShieldAlert className="h-3 w-3" />
                              Blocked
                            </span>
                            {user.blockedReason && (
                              <p className="text-[10px] text-red-300/80 italic truncate max-w-[150px]">
                                {user.blockedReason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <ShieldCheck className="h-3 w-3" />
                              Active
                          </span>
                        )}
                      </td>

                      {/* Workspaces */}
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {user.memberships?.length > 0 ? (
                            user.memberships.map((m: any, idx: number) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-zinc-800/80 border border-zinc-700/60 text-zinc-300"
                              >
                                <Building2 className="h-2.5 w-2.5 text-zinc-400" />
                                <span className="truncate max-w-[100px]">{m.organization?.name}</span>
                                <span className="text-[9px] text-zinc-500 uppercase">({m.role})</span>
                              </span>
                            ))
                          ) : (
                            <span className="text-zinc-500 text-[11px] italic">No workspaces</span>
                          )}
                        </div>
                      </td>

                      {/* View Mode */}
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {user.viewMode || "CREATOR"}
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="py-4 px-4 text-[11px] text-zinc-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-zinc-500" />
                          <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>

                      {/* Moderation & Impersonation Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Login As User Button */}
                          <Button
                            onClick={() => openImpersonateModal(user)}
                            disabled={isBlocked}
                            size="sm"
                            title={isBlocked ? "Cannot log in as a blocked user" : "Log in as this user to browse site"}
                            className="h-7 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-[11px] font-semibold gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <LogIn className="h-3.5 w-3.5 text-amber-400" />
                            <span className="hidden sm:inline">Login as User</span>
                          </Button>

                          {/* Block / Unblock Button */}
                          {isBlocked ? (
                            <Button
                              onClick={() => openBlockModal(user)}
                              size="sm"
                              className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold gap-1.5"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>Unblock</span>
                            </Button>
                          ) : (
                            <Button
                              onClick={() => openBlockModal(user)}
                              variant="destructive"
                              size="sm"
                              className="h-7 px-2.5 rounded-lg bg-red-950/50 hover:bg-red-900 border border-red-500/30 text-red-300 hover:text-white text-[11px] font-semibold gap-1.5"
                            >
                              <UserX className="h-3.5 w-3.5" />
                              <span>Block</span>
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

      {/* Impersonate Confirmation Dialog */}
      {impersonatingUser && (
        <Dialog open={!!impersonatingUser} onOpenChange={(open) => !open && closeImpersonateModal()}>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-md max-h-[90vh] flex flex-col p-6 overflow-hidden">
            <DialogHeader className="shrink-0 pb-3 border-b border-zinc-800">
              <DialogTitle className="flex items-center gap-2 text-white">
                <LogIn className="h-5 w-5 text-amber-400" />
                <span>Log In As User (Impersonation)</span>
              </DialogTitle>
              <DialogDescription className="text-zinc-400 text-xs">
                Temporarily switch into this user&apos;s account session to browse, debug, or verify their workspace experience.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-3 pr-1">
              {impersonateError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{impersonateError}</span>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Account Name:</span>
                  <span className="font-semibold text-white">{impersonatingUser.name || "None"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Email Address:</span>
                  <span className="font-mono text-zinc-300">{impersonatingUser.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">User ID:</span>
                  <span className="font-mono text-[10px] text-zinc-500">{impersonatingUser.id}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300/90 text-xs space-y-1">
                <p className="font-semibold text-amber-200 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>How impersonation works:</span>
                </p>
                <p className="text-[11px] leading-relaxed text-amber-200/80">
                  You will be redirected to the site dashboard and browse with this user&apos;s data and permissions. A persistent indicator banner will stay at the top of the site with a one-click &ldquo;Exit & Return to Admin&rdquo; button.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-3 border-t border-zinc-800 shrink-0 mt-auto">
              <Button
                variant="ghost"
                onClick={closeImpersonateModal}
                disabled={isImpersonatingLoading}
                className="text-zinc-400 text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExecuteImpersonation}
                disabled={isImpersonatingLoading}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5"
              >
                {isImpersonatingLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                <span>{isImpersonatingLoading ? "Starting Session..." : "Confirm & Login as User"}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Block/Unblock Confirmation Dialog */}
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={(open) => !open && closeBlockModal()}>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-md max-h-[90vh] flex flex-col p-6 overflow-hidden">
            <DialogHeader className="shrink-0 pb-3 border-b border-zinc-800">
              <DialogTitle className="flex items-center gap-2 text-white">
                {selectedUser.isBlocked ? (
                  <>
                    <UserCheck className="h-5 w-5 text-emerald-400" />
                    <span>Unblock User Account</span>
                  </>
                ) : (
                  <>
                    <UserX className="h-5 w-5 text-red-400" />
                    <span>Block User Account</span>
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-zinc-400 text-xs">
                {selectedUser.isBlocked ? (
                  <>
                    Restoring access for user{" "}
                    <span className="font-semibold text-white">
                      {selectedUser.name || selectedUser.email}
                    </span>
                    . They will immediately be able to log back into the platform.
                  </>
                ) : (
                  <>
                    Blocking user{" "}
                    <span className="font-semibold text-white">
                      {selectedUser.name || selectedUser.email}
                    </span>
                    . They will immediately be rejected from login and active sessions will be terminated.
                  </>
                )}
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

              {!selectedUser.isBlocked && (
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-300">Block Reason / Administrative Note</Label>
                  <Input
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="e.g. Terms violation, spam, chargeback abuse"
                    className="bg-zinc-900 border-zinc-800 text-xs"
                    autoFocus
                  />
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 pt-3 border-t border-zinc-800 shrink-0 mt-auto">
              <Button variant="ghost" onClick={closeBlockModal} disabled={isSubmitting} className="text-zinc-400 text-xs">
                Cancel
              </Button>
              <Button
                onClick={handleToggleBlock}
                disabled={isSubmitting}
                className={
                  selectedUser.isBlocked
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
                    : "bg-red-600 hover:bg-red-500 text-white text-xs gap-1.5"
                }
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : selectedUser.isBlocked ? (
                  <UserCheck className="h-4 w-4" />
                ) : (
                  <UserX className="h-4 w-4" />
                )}
                <span>{selectedUser.isBlocked ? "Confirm Unblock" : "Confirm Block User"}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

