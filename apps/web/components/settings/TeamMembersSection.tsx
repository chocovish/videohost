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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
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
        <Alert>
          <Sparkles className="w-4 h-4" />
          <AlertTitle className="text-xs font-bold">Enterprise Feature: Team Member Invites</AlertTitle>
          <AlertDescription className="text-xs">
            Inviting team members to collaborate in your workspace is an Enterprise plan feature. Upgrade your workspace to invite team members and assign roles.
          </AlertDescription>
          <div className="absolute top-2.5 right-3 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => router.push("/dashboard/pricing")}
              className="font-extrabold text-xs"
            >
              Upgrade to Enterprise
            </Button>
          </div>
        </Alert>
      ) : (
        <form onSubmit={onInvite} className="flex flex-col sm:flex-row gap-3">
          <Input
            type="email"
            required
            disabled={isInviting}
            placeholder="colleague@company.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-1 rounded-xl"
          />
          <div className="w-full sm:w-36">
            <Select
              value={inviteRole}
              disabled={isInviting}
              onValueChange={(val) => setInviteRole(val || "MEMBER")}
            >
              <SelectTrigger className="h-11 rounded-xl bg-background border-input text-sm">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="VIEWER">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            disabled={isInviting || !inviteEmail.trim()}
            className="w-full sm:w-auto min-h-[44px]"
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
          </Button>
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
                  <div className="w-8 h-8 rounded-full bg-muted border border-border text-muted-foreground font-bold text-xs flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-foreground truncate">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Badge variant="secondary" className="uppercase">
                    {inv.role}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onResendInvite(inv.email, inv.role)}
                    disabled={isInviting}
                    title="Resend invitation email"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onRevokeInvite(inv.id)}
                    title="Revoke invitation"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
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
                    <Badge variant="secondary" className="uppercase">
                      OWNER
                    </Badge>
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onRemoveMember(m.id, m.user.name || m.user.email)}
                        title="Remove member"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
