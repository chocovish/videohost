"use client";

import React from "react";
import { Building2, Plus, Check, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";

export interface OrganizationItem {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  themeId: string;
  planName: string;
  role: string;
  joinedAt: string;
  memberCount: number;
  isActive: boolean;
}

interface OrganizationSwitcherSectionProps {
  userOrgs: OrganizationItem[];
  switchingOrgId: string | null;
  onSwitchOrg: (orgId: string) => Promise<void>;
  onCreateOrgClick: () => void;
}

export function OrganizationSwitcherSection({
  userOrgs,
  switchingOrgId,
  onSwitchOrg,
  onCreateOrgClick,
}: OrganizationSwitcherSectionProps) {
  const getRoleBadgeStyle = (role: string) => {
    switch (role.toUpperCase()) {
      case "OWNER":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "ADMIN":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "MEMBER":
        return "bg-lime-500/15 text-lime-700 border-lime-500/30";
      default:
        return "bg-slate-500/10 text-slate-600 border-slate-500/20";
    }
  };

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6 border border-border space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/15 text-primary shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">Switch Active Organization</h3>
            <p className="text-xs text-muted-foreground">
              You belong to {userOrgs.length} organization{userOrgs.length !== 1 ? "s" : ""}. Select an active organization to switch your current workspace.
            </p>
          </div>
        </div>

        <button
          onClick={onCreateOrgClick}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-bold text-xs rounded-xl hover:opacity-90 transition-all shadow-xs active:scale-95 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> New Organization
        </button>
      </div>

      {/* Organizations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {userOrgs.map((org) => {
          const isSwitching = switchingOrgId === org.id;

          return (
            <div
              key={org.id}
              className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-200 bg-card ${
                org.isActive
                  ? "border-primary ring-2 ring-primary/20 shadow-md"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {org.logoUrl ? (
                      <div className="w-9 h-9 rounded-xl border border-border overflow-hidden bg-white dark:bg-slate-900 shrink-0 flex items-center justify-center shadow-2xs">
                        <img
                          src={org.logoUrl}
                          alt={org.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 ${
                          org.isActive
                            ? "bg-primary text-white"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-sm text-foreground truncate">
                        {org.name}
                      </h4>
                      <p className="text-[11px] text-muted-foreground truncate">
                        slug: {org.slug}
                      </p>
                    </div>
                  </div>

                  {org.isActive && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary font-extrabold text-[10px] uppercase tracking-wider border border-primary/30 shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                  <span
                    className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${getRoleBadgeStyle(
                      org.role
                    )}`}
                  >
                    {org.role}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[10px] font-semibold capitalize">
                    {org.planName} Plan
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-medium">
                    {org.memberCount} member{org.memberCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end">
                {org.isActive ? (
                  <span className="text-xs font-semibold text-primary flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Current Workspace
                  </span>
                ) : (
                  <button
                    onClick={() => onSwitchOrg(org.id)}
                    disabled={isSwitching}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary font-bold text-xs rounded-xl border border-primary/20 hover:bg-primary hover:text-white transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSwitching ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Switching...
                      </>
                    ) : (
                      <>
                        Switch Workspace <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
