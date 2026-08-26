"use client";

import React from "react";
import { Building2, Plus, Check, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface OrganizationItem {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
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
  const getRoleBadgeStyle = (role: string): "default" | "secondary" | "destructive" | "outline" | "lime" => {
    switch (role.toUpperCase()) {
      case "OWNER":
        return "default";
      case "ADMIN":
        return "secondary";
      case "MEMBER":
        return "lime";
      default:
        return "outline";
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

        <Button
          type="button"
          size="sm"
          onClick={onCreateOrgClick}
          className="shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4" /> New Organization
        </Button>
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
                      <div className="w-9 h-9 rounded-xl border border-border overflow-hidden bg-muted shrink-0 flex items-center justify-center shadow-2xs">
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
                            ? "bg-primary text-primary-foreground"
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
                      <p className="text-xs text-muted-foreground truncate">
                        slug: {org.slug}
                      </p>
                    </div>
                  </div>

                  {org.isActive && (
                    <Badge variant="lime" className="uppercase tracking-wider shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                  <Badge variant={getRoleBadgeStyle(org.role)} className="uppercase tracking-wider">
                    {org.role}
                  </Badge>
                  <Badge variant="outline" className="font-semibold capitalize">
                    {org.planName} Plan
                  </Badge>
                  <Badge variant="outline" className="font-normal text-muted-foreground">
                    {org.memberCount} member{org.memberCount !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end">
                {org.isActive ? (
                  <span className="text-xs font-semibold text-primary flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Current Workspace
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onSwitchOrg(org.id)}
                    disabled={isSwitching}
                    className="border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground"
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
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
