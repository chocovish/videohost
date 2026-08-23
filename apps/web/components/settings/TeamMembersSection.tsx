"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  Loader2,
  Mail,
  RefreshCw,
  Trash2,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrganizationItem } from "./OrganizationSwitcherSection";

export interface Member {
  id: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string; email: string };
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
}

interface TeamMembersSectionProps {
  activeOrg: OrganizationItem | undefined;
  members: Member[];
  invitations: Invitation[];
  inviteEmail: string;
  setInviteEmail: (email: string) => void;
  inviteRole: string;
  setInviteRole: (role: string) => void;
  loading: boolean;
  isInviting: boolean;
  onInvite: (e: React.FormEvent) => Promise<void>;
  onResendInvite: (email: string, role: string) => Promise<void>;
  onRevokeInvite: (invitationId: string) => Promise<void>;
  onRoleChange: (memberId: string, newRole: string) => Promise<void>;
  onRemoveMember: (memberId: string, memberName: string) => void;
}

export function TeamMembersSection({
  activeOrg,
  members,
  invitations,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  loading,
  isInviting,
  onInvite,
  onResendInvite,
  onRevokeInvite,
  onRoleChange,
  onRemoveMember,
}: TeamMembersSectionProps) {
  const router = useRouter();

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6 border border-border space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-base text-foreground">Invite & Manage Members</h3>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {members.length} members {invitations.length > 0 && `(${invitations.length} pending)`}
        </span>
      </div>

      {/* Invite Form */}
      {activeOrg?.planName?.toLowerCase() !== "enterprise" ? (
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Enterprise Feature: Team Member Invites
            </span>
            <button
              type="button"
              onClick={() => router.push("/dashboard/pricing")}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-lg transition-all shadow-2xs cursor-pointer"
            >
              Upgrade to Enterprise
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Inviting team members to collaborate in your workspace is an Enterprise plan feature. Upgrade your workspace to invite team members and assign roles.
          </p>
        </div>
      ) : (
        <form onSubmit={onInvite} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            required
            disabled={isInviting}
            placeholder="colleague@company.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-input bg-white dark:bg-slate-900 text-sm outline-hidden focus:ring-2 focus:ring-primary disabled:opacity-60 transition-all"
          />
          <div className="w-full sm:w-36">
            <Select
              value={inviteRole}
              disabled={isInviting}
              onValueChange={(val) => setInviteRole(val || "MEMBER")}
            >
              <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-slate-900 border-input text-sm">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="VIEWER">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button
            type="submit"
            disabled={isInviting || !inviteEmail.trim()}
            className="w-full sm:w-auto px-5 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all min-h-[44px] shadow-xs hover:opacity-95 cursor-pointer"
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
      )}

      {/* Pending Invitations Section */}
      {invitations.length > 0 && (
        <div className="pt-2 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Pending Invitations ({invitations.length})
          </h4>
          <div className="divide-y divide-border border border-border rounded-xl p-2 bg-muted/30">
            {invitations.map((inv) => (
              <div key={inv.id} className="py-2.5 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 font-bold text-xs flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-foreground truncate">{inv.email}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 uppercase">
                    {inv.role}
                  </span>
                  <button
                    onClick={() => onResendInvite(inv.email, inv.role)}
                    disabled={isInviting}
                    title="Resend invitation email"
                    className="p-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onRevokeInvite(inv.id)}
                    title="Revoke invitation"
                    className="p-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
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
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> Active Team Members ({members.length})
        </h4>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading members...
            </div>
          ) : members.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No organization members added yet. Use the form above to invite team members.
            </div>
          ) : (
            members.map((m) => (
              <div key={m.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/15 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                    {m.user.name ? m.user.name.charAt(0).toUpperCase() : m.user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{m.user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {m.role === "OWNER" ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-primary/15 text-primary uppercase">
                      OWNER
                    </span>
                  ) : (
                    <>
                      <div className="w-28">
                        <Select
                          value={m.role}
                          onValueChange={(val) => {
                            if (val) onRoleChange(m.id, val);
                          }}
                        >
                          <SelectTrigger className="h-8 rounded-lg text-xs font-bold bg-muted text-foreground uppercase border-border">
                            <SelectValue placeholder={m.role} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">ADMIN</SelectItem>
                            <SelectItem value="MEMBER">MEMBER</SelectItem>
                            <SelectItem value="VIEWER">VIEWER</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <button
                        onClick={() => onRemoveMember(m.id, m.user.name || m.user.email)}
                        title="Remove member"
                        className="p-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
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
  );
}
