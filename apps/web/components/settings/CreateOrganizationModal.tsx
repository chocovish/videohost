"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Building2, Sparkles, AlertCircle, Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrganizationItem } from "./OrganizationSwitcherSection";

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeOrg: OrganizationItem | undefined;
  userOrgsCount: number;
  newOrgName: string;
  setNewOrgName: (val: string) => void;
  newOrgSlug: string;
  setNewOrgSlug: (val: string) => void;
  isCreatingOrg: boolean;
  onCreateOrg: (e: React.FormEvent) => Promise<void>;
}

export function CreateOrganizationModal({
  isOpen,
  onClose,
  activeOrg,
  userOrgsCount,
  newOrgName,
  setNewOrgName,
  newOrgSlug,
  setNewOrgSlug,
  isCreatingOrg,
  onCreateOrg,
}: CreateOrganizationModalProps) {
  const router = useRouter();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/15 text-primary shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle>Create New Organization</DialogTitle>
              <DialogDescription>Add a new workspace to manage videos and team members</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {activeOrg?.planName?.toLowerCase() !== "enterprise" ? (
          <div className="flex flex-col flex-1 justify-between space-y-4">
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2.5 my-1">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300">
                <Sparkles className="w-4 h-4 text-purple-600" /> Enterprise Plan Required
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                New organization creation can only be done on the Enterprise plan (up to 5 organizations maximum).
              </p>
            </div>
            <DialogFooter className="pt-2 border-t border-border mt-auto">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  onClose();
                  router.push("/dashboard/pricing");
                }}
                className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs"
              >
                Upgrade to Enterprise Plan
              </Button>
            </DialogFooter>
          </div>
        ) : userOrgsCount >= 5 ? (
          <div className="flex flex-col flex-1 justify-between space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 my-1 text-center">
              <div className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Organization Limit Reached
              </div>
              <p className="text-xs text-muted-foreground">
                You have reached the maximum limit of 5 organizations allowed on the Enterprise plan.
              </p>
            </div>
            <DialogFooter className="pt-2 border-t border-border mt-auto">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onCreateOrg} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="org-name-input">
                Organization Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="org-name-input"
                type="text"
                required
                placeholder="e.g. Acme Video Studio"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org-slug-input">
                Custom Slug <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                id="org-slug-input"
                type="text"
                placeholder="e.g. acme-video-studio"
                value={newOrgSlug}
                onChange={(e) => setNewOrgSlug(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Unique identifier used in URLs and API keys (up to 5 orgs per Enterprise account).
              </p>
            </div>

            <DialogFooter className="pt-2 border-t border-border mt-auto">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingOrg || !newOrgName.trim()}
                className="w-full sm:w-auto min-w-[150px]"
              >
                {isCreatingOrg ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1.5" /> Create Workspace
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
