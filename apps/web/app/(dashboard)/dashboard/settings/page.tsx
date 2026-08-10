"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, UserPlus, HardDrive, Building2, Save, Loader2, Check, AlertCircle, Mail, Trash2, RefreshCw, Clock } from "lucide-react";

interface Member {
  id: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string; email: string };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
}

export default function SettingsPage() {
  const router = useRouter();

  // Organization name state
  const [orgName, setOrgName] = useState("");
  const [initialOrgName, setInitialOrgName] = useState("");
  const [isSavingOrgName, setIsSavingOrgName] = useState(false);
  const [orgSuccessMsg, setOrgSuccessMsg] = useState("");
  const [orgErrorMsg, setOrgErrorMsg] = useState("");

  // Team members & invites state
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [loading, setLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // Custom limit request state
  const [customLimitInput, setCustomLimitInput] = useState("");
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const fetchOrgData = async () => {
    try {
      const res = await fetch("/api/organization");
      if (res.ok) {
        const data = await res.json();
        if (data.organization) {
          setOrgName(data.organization.name || "");
          setInitialOrgName(data.organization.name || "");
          if (data.organization.members) {
            setMembers(data.organization.members);
          }
          if (data.organization.invitations) {
            setInvitations(data.organization.invitations);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load organization data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgData();
  }, []);

  const handleOrgNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || orgName.trim() === initialOrgName) return;

    setIsSavingOrgName(true);
    setOrgSuccessMsg("");
    setOrgErrorMsg("");

    try {
      const res = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update organization name");
      }

      setInitialOrgName(data.organization.name);
      setOrgName(data.organization.name);
      setOrgSuccessMsg("Organization name updated successfully!");

      router.refresh();
      setTimeout(() => setOrgSuccessMsg(""), 4000);
    } catch (err: any) {
      setOrgErrorMsg(err.message || "Failed to update organization name");
      setTimeout(() => setOrgErrorMsg(""), 4000);
    } finally {
      setIsSavingOrgName(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    setInviteSuccess("");
    setInviteError("");

    try {
      const res = await fetch("/api/organization/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      setInviteSuccess(data.message || `Invitation sent to ${inviteEmail.trim()}`);
      setInviteEmail("");
      fetchOrgData();
      setTimeout(() => setInviteSuccess(""), 5000);
    } catch (err: any) {
      setInviteError(err.message || "Failed to send invitation");
      setTimeout(() => setInviteError(""), 5000);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    try {
      const res = await fetch(`/api/organization/invite?id=${invitationId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to revoke invitation");
      }

      setActionMessage("Invitation revoked successfully");
      fetchOrgData();
      setTimeout(() => setActionMessage(""), 3000);
    } catch (err: any) {
      setInviteError(err.message || "Failed to revoke invitation");
      setTimeout(() => setInviteError(""), 4000);
    }
  };

  const handleResendInvite = async (email: string, role: string) => {
    setIsInviting(true);
    setInviteSuccess("");
    setInviteError("");

    try {
      const res = await fetch("/api/organization/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to resend invitation email");
      }

      setInviteSuccess(`Invitation email resent to ${email}`);
      fetchOrgData();
      setTimeout(() => setInviteSuccess(""), 4000);
    } catch (err: any) {
      setInviteError(err.message || "Failed to resend invitation");
      setTimeout(() => setInviteError(""), 4000);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this organization?`)) return;

    try {
      const res = await fetch(`/api/organization/members/${memberId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to remove member");
      }

      setActionMessage(`Member ${memberName} removed successfully`);
      fetchOrgData();
      setTimeout(() => setActionMessage(""), 3000);
    } catch (err: any) {
      setOrgErrorMsg(err.message || "Failed to remove member");
      setTimeout(() => setOrgErrorMsg(""), 4000);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/organization/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      setActionMessage("Member role updated");
      fetchOrgData();
      setTimeout(() => setActionMessage(""), 3000);
    } catch (err: any) {
      setOrgErrorMsg(err.message || "Failed to update role");
      setTimeout(() => setOrgErrorMsg(""), 4000);
    }
  };

  const handleCustomLimitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setRequestSubmitted(true);
    setTimeout(() => setRequestSubmitted(false), 4000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[hsl(var(--foreground))]">
          Organization Settings
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Manage your organization details, team member invitations, permissions, and storage limits
        </p>
      </div>

      {/* Top Section: Organization Profile (Change Name) */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 border border-[hsl(var(--border))] space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-[hsl(var(--border))]">
          <div className="p-2 rounded-xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[hsl(var(--foreground))]">Organization Details</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Update your workspace display name as seen across your dashboard, sidebar, and navbar
            </p>
          </div>
        </div>

        {orgSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{orgSuccessMsg}</span>
          </div>
        )}

        {orgErrorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{orgErrorMsg}</span>
          </div>
        )}

        <form onSubmit={handleOrgNameSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">
              Organization Name
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                disabled={loading}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Acme Corporation"
                className="flex-1 px-4 py-2.5 rounded-xl border border-[hsl(var(--input))] bg-white text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] transition-all disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={isSavingOrgName || loading || !orgName.trim() || orgName.trim() === initialOrgName}
                className="w-full sm:w-auto px-5 py-2.5 bg-[hsl(var(--primary))] text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-sm hover:opacity-95 min-h-[44px]"
              >
                {isSavingOrgName ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left 2 Cols: Team Members & Invitations */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-2xl p-4 sm:p-6 border border-[hsl(var(--border))] space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[hsl(var(--primary))]" />
                <h3 className="font-bold text-base text-[hsl(var(--foreground))]">Invite & Manage Members</h3>
              </div>
              <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
                {members.length} members {invitations.length > 0 && `(${invitations.length} pending)`}
              </span>
            </div>

            {inviteSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>{inviteSuccess}</span>
              </div>
            )}

            {inviteError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            {actionMessage && (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 text-sm flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>{actionMessage}</span>
              </div>
            )}

            {/* Invite Form */}
            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                disabled={isInviting}
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-[hsl(var(--input))] bg-white text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] disabled:opacity-60 transition-all"
              />
              <select
                value={inviteRole}
                disabled={isInviting}
                onChange={(e) => setInviteRole(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-[hsl(var(--input))] bg-white text-sm outline-none disabled:opacity-60 transition-all"
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <button
                type="submit"
                disabled={isInviting || !inviteEmail.trim()}
                className="w-full sm:w-auto px-5 py-2.5 bg-[hsl(var(--primary))] text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all min-h-[44px] shadow-sm hover:opacity-95"
              >
                {isInviting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> Send Invite
                  </>
                )}
              </button>
            </form>

            {/* Pending Invitations Section */}
            {invitations.length > 0 && (
              <div className="pt-2 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Pending Invitations ({invitations.length})
                </h4>
                <div className="divide-y divide-[hsl(var(--border))] border border-[hsl(var(--border))] rounded-xl p-2 bg-[hsl(var(--muted))]/30">
                  {invitations.map((inv) => (
                    <div key={inv.id} className="py-2.5 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 font-bold text-xs flex items-center justify-center shrink-0">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-[hsl(var(--foreground))] truncate">{inv.email}</p>
                          <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                            Expires {new Date(inv.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 uppercase">
                          {inv.role}
                        </span>
                        <button
                          onClick={() => handleResendInvite(inv.email, inv.role)}
                          disabled={isInviting}
                          title="Resend invitation email"
                          className="p-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRevokeInvite(inv.id)}
                          title="Revoke invitation"
                          className="p-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Members Table */}
            <div className="pt-2 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Active Team Members ({members.length})
              </h4>
              <div className="divide-y divide-[hsl(var(--border))]">
                {loading ? (
                  <div className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))] flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--primary))]" /> Loading members...
                  </div>
                ) : members.length === 0 ? (
                  <div className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                    No organization members added yet. Use the form above to invite team members.
                  </div>
                ) : (
                  members.map((m) => (
                    <div key={m.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] font-bold text-sm flex items-center justify-center shrink-0">
                          {m.user.name ? m.user.name.charAt(0).toUpperCase() : m.user.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-[hsl(var(--foreground))] truncate">{m.user.name}</p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{m.user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {m.role === "OWNER" ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] uppercase">
                            OWNER
                          </span>
                        ) : (
                          <>
                            <select
                              value={m.role}
                              onChange={(e) => handleRoleChange(m.id, e.target.value)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] uppercase border border-[hsl(var(--border))] outline-none cursor-pointer"
                            >
                              <option value="ADMIN">ADMIN</option>
                              <option value="MEMBER">MEMBER</option>
                              <option value="VIEWER">VIEWER</option>
                            </select>
                            <button
                              onClick={() => handleRemoveMember(m.id, m.user.name || m.user.email)}
                              title="Remove member"
                              className="p-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Plans & Custom Limits */}
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-[hsl(var(--border))] space-y-4">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-[hsl(var(--primary))]" />
              <h3 className="font-bold text-base text-[hsl(var(--foreground))]">Storage Quota</h3>
            </div>

            <div className="p-4 rounded-xl bg-[hsl(var(--muted))]/60 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span>Free Plan Limit</span>
                <span className="text-[hsl(var(--primary))]">200 Video Minutes</span>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Adaptive HLS encoding and original uploads consume stored minute quotas.
              </p>
            </div>

            {/* Custom Quota Override Request (Contact Sales flow) */}
            <div className="pt-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">
                Need a Custom Minute Limit?
              </h4>
              <form onSubmit={handleCustomLimitRequest} className="space-y-3">
                <input
                  type="number"
                  placeholder="e.g. 5000 minutes"
                  value={customLimitInput}
                  onChange={(e) => setCustomLimitInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[hsl(var(--input))] bg-white text-sm outline-none"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-slate-900 text-white font-semibold text-xs rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Request Custom Limit Override
                </button>
              </form>

              {requestSubmitted && (
                <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs text-center font-medium">
                  Request submitted to sales & support!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
