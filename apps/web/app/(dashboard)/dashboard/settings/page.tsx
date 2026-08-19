"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Users,
  UserPlus,
  HardDrive,
  Building2,
  Save,
  Loader2,
  Check,
  AlertCircle,
  Mail,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle2,
  Plus,
  ArrowRight,
  Shield,
  X,
  Sparkles,
  Upload,
  Crop,
  Image as ImageIcon,
  Info,
  Camera,
} from "lucide-react";
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
import { formatBytes } from "@/lib/video-utils";
import ImageCropper1to1Modal from "@/components/ImageCropper1to1Modal";

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

interface OrganizationItem {
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

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();

  // Multi-organization state
  const [userOrgs, setUserOrgs] = useState<OrganizationItem[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string>("");
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null);

  const activeOrg = userOrgs.find((o) => o.isActive || o.id === activeOrgId);

  // Create org modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  // Organization settings state
  const [orgName, setOrgName] = useState("");
  const [initialOrgName, setInitialOrgName] = useState("");
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const [newLogoData, setNewLogoData] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [isSavingOrgDetails, setIsSavingOrgDetails] = useState(false);
  const [orgSuccessMsg, setOrgSuccessMsg] = useState("");
  const [orgErrorMsg, setOrgErrorMsg] = useState("");

  // 1:1 Image Cropper Modal state
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [rawSelectedImage, setRawSelectedImage] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Usage state
  const [usageInfo, setUsageInfo] = useState<{
    usedBytes: number;
    storageLimitBytes: number;
    storageLimitGb: number;
  } | null>(null);

  // Custom limit request state
  const [customLimitInput, setCustomLimitInput] = useState("");
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const fetchUserOrganizations = async () => {
    try {
      const res = await fetch("/api/organizations");
      if (res.ok) {
        const data = await res.json();
        setUserOrgs(data.organizations || []);
        setActiveOrgId(data.activeOrganizationId || "");
      }
    } catch (err) {
      console.error("Failed to load user organizations:", err);
    }
  };

  const fetchOrgData = async () => {
    try {
      const [resOrg, resUsage] = await Promise.all([
        fetch("/api/organization"),
        fetch("/api/v1/usage"),
      ]);

      if (resOrg.ok) {
        const data = await resOrg.json();
        if (data.organization) {
          setOrgName(data.organization.name || "");
          setInitialOrgName(data.organization.name || "");
          setOrgLogoUrl(data.organization.logoUrl || null);
          setNewLogoData(null);
          setRemoveLogo(false);
          if (data.organization.members) {
            setMembers(data.organization.members);
          }
          if (data.organization.invitations) {
            setInvitations(data.organization.invitations);
          }
        }
      }

      if (resUsage.ok) {
        const usageData = await resUsage.json();
        if (usageData.usage) {
          setUsageInfo(usageData.usage);
        }
      }
    } catch (err) {
      console.error("Failed to load organization data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserOrganizations();
    fetchOrgData();
  }, []);

  const handleSwitchOrg = async (orgId: string) => {
    if (orgId === activeOrgId || switchingOrgId) return;
    setSwitchingOrgId(orgId);
    setOrgSuccessMsg("");
    setOrgErrorMsg("");

    try {
      const res = await fetch("/api/organizations/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to switch organization");
      }

      await updateSession({ organizationId: orgId });
      setActiveOrgId(orgId);
      setUserOrgs((prev) =>
        prev.map((o) => ({
          ...o,
          isActive: o.id === orgId,
        }))
      );

      setOrgSuccessMsg(`Switched active workspace to "${data.organization?.name}"`);

      // Reload organization data for newly selected active org
      await fetchOrgData();
      router.refresh();
      setTimeout(() => setOrgSuccessMsg(""), 4000);
    } catch (err: any) {
      setOrgErrorMsg(err.message || "Failed to switch organization");
      setTimeout(() => setOrgErrorMsg(""), 4000);
    } finally {
      setSwitchingOrgId(null);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim() || isCreatingOrg) return;

    setIsCreatingOrg(true);
    setOrgSuccessMsg("");
    setOrgErrorMsg("");

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newOrgName.trim(),
          slug: newOrgSlug.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create organization");
      }

      await updateSession({ organizationId: data.organization.id });
      setOrgSuccessMsg(`Created workspace "${data.organization.name}" and set as active!`);
      setNewOrgName("");
      setNewOrgSlug("");
      setIsCreateModalOpen(false);

      await fetchUserOrganizations();
      await fetchOrgData();
      router.refresh();
      setTimeout(() => setOrgSuccessMsg(""), 4000);
    } catch (err: any) {
      setOrgErrorMsg(err.message || "Failed to create organization");
      setTimeout(() => setOrgErrorMsg(""), 4000);
    } finally {
      setIsCreatingOrg(false);
    }
  };

  // Logo file selection and 1:1 cropper triggers
  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setOrgErrorMsg("Please select an image file (PNG, JPG, SVG, WebP, GIF).");
      setTimeout(() => setOrgErrorMsg(""), 4000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setOrgErrorMsg("Logo image size must be less than 5MB.");
      setTimeout(() => setOrgErrorMsg(""), 4000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setRawSelectedImage(result);
      setIsCropperOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset input so re-selecting same file triggers change
    if (logoFileInputRef.current) {
      logoFileInputRef.current.value = "";
    }
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    setNewLogoData(croppedDataUrl);
    setRemoveLogo(false);
  };

  const handleRemoveLogo = () => {
    setNewLogoData(null);
    setRemoveLogo(true);
    if (logoFileInputRef.current) {
      logoFileInputRef.current.value = "";
    }
  };

  const handleReCrop = () => {
    if (newLogoData) {
      setRawSelectedImage(newLogoData);
      setIsCropperOpen(true);
    } else if (orgLogoUrl) {
      setRawSelectedImage(orgLogoUrl);
      setIsCropperOpen(true);
    } else {
      logoFileInputRef.current?.click();
    }
  };

  // Check if there are unsaved changes
  const hasNameChanged = orgName.trim() !== initialOrgName && orgName.trim().length > 0;
  const hasLogoChanged = newLogoData !== null || (removeLogo && orgLogoUrl !== null);
  const hasUnsavedChanges = hasNameChanged || hasLogoChanged;

  // Active display logo (new local crop > current server logo > null)
  const currentDisplayLogo = removeLogo ? null : newLogoData || orgLogoUrl;

  const handleOrgDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasUnsavedChanges || isSavingOrgDetails) return;

    setIsSavingOrgDetails(true);
    setOrgSuccessMsg("");
    setOrgErrorMsg("");

    try {
      const payload: { name?: string; logoData?: string; removeLogo?: boolean } = {};

      if (hasNameChanged) {
        payload.name = orgName.trim();
      }

      if (removeLogo) {
        payload.removeLogo = true;
      } else if (newLogoData) {
        payload.logoData = newLogoData;
      }

      const res = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update organization details");
      }

      if (data.organization) {
        setInitialOrgName(data.organization.name);
        setOrgName(data.organization.name);
        setOrgLogoUrl(data.organization.logoUrl || null);
        setNewLogoData(null);
        setRemoveLogo(false);

        // Update active org in list
        setUserOrgs((prev) =>
          prev.map((o) =>
            o.id === activeOrgId || o.isActive
              ? {
                  ...o,
                  name: data.organization.name,
                  logoUrl: data.organization.logoUrl,
                }
              : o
          )
        );
      }

      setOrgSuccessMsg("Organization details updated successfully!");
      fetchUserOrganizations();
      router.refresh();
      setTimeout(() => setOrgSuccessMsg(""), 4000);
    } catch (err: any) {
      setOrgErrorMsg(err.message || "Failed to update organization details");
      setTimeout(() => setOrgErrorMsg(""), 4000);
    } finally {
      setIsSavingOrgDetails(false);
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
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[hsl(var(--foreground))]">
          Organization Settings
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Switch active organization, upload 1:1 logo, manage team members, permissions, and storage limits.
        </p>
      </div>

      {/* Messages */}
      {orgSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm flex items-center gap-2">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{orgSuccessMsg}</span>
        </div>
      )}

      {orgErrorMsg && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{orgErrorMsg}</span>
        </div>
      )}

      {/* SECTION 1: WORKSPACE SWITCHER & ORGANIZATIONS LIST */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 border border-[hsl(var(--border))] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[hsl(var(--foreground))]">Switch Active Organization</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                You belong to {userOrgs.length} organization{userOrgs.length !== 1 ? "s" : ""}. Select an active organization to switch your current workspace.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-white font-bold text-xs rounded-xl hover:opacity-90 transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
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
                className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-200 bg-[hsl(var(--card))] ${
                  org.isActive
                    ? "border-[hsl(var(--primary))] ring-2 ring-[hsl(var(--primary))]/20 shadow-md"
                    : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/40"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {org.logoUrl ? (
                        <div className="w-9 h-9 rounded-xl border border-[hsl(var(--border))] overflow-hidden bg-white dark:bg-slate-900 shrink-0 flex items-center justify-center shadow-xs">
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
                              ? "bg-[hsl(var(--primary))] text-white"
                              : "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
                          }`}
                        >
                          {org.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-sm text-[hsl(var(--foreground))] truncate">
                          {org.name}
                        </h4>
                        <p className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">
                          slug: {org.slug}
                        </p>
                      </div>
                    </div>

                    {org.isActive && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] font-extrabold text-[10px] uppercase tracking-wider border border-[hsl(var(--primary))]/30 shrink-0">
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
                    <span className="px-2 py-0.5 rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] text-[10px] font-semibold capitalize">
                      {org.planName} Plan
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] text-[10px] font-medium">
                      {org.memberCount} member{org.memberCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[hsl(var(--border))] flex items-center justify-end">
                  {org.isActive ? (
                    <span className="text-xs font-semibold text-[hsl(var(--primary))] flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Current Workspace
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSwitchOrg(org.id)}
                      disabled={isSwitching}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] font-bold text-xs rounded-xl border border-[hsl(var(--primary))]/20 hover:bg-[hsl(var(--primary))] hover:text-white transition-all disabled:opacity-50 cursor-pointer"
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

      {/* SECTION 2: CURRENT ACTIVE ORGANIZATION DETAILS & 1:1 LOGO */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 border border-[hsl(var(--border))] space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[hsl(var(--foreground))]">Active Organization Details</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Manage organization display name and 1:1 resolution logo stored at the organization level
              </p>
            </div>
          </div>

          {hasUnsavedChanges && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse">
              Unsaved changes
            </span>
          )}
        </div>

        <form onSubmit={handleOrgDetailsSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 4 cols: 1:1 Resolution Organization Logo Box */}
            <div className="lg:col-span-4 p-4 rounded-2xl bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[hsl(var(--primary))]" /> Organization Logo
                </label>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/30">
                  1:1 Ratio
                </span>
              </div>

              {/* 1:1 Square Logo Preview & Action Triggers */}
              <div className="flex flex-col items-center justify-center p-4 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl space-y-3">
                <div className="relative group w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-[hsl(var(--border))] bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                  {currentDisplayLogo ? (
                    <img
                      src={currentDisplayLogo}
                      alt="Organization Logo"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] font-extrabold text-2xl select-none">
                      {orgName ? orgName.charAt(0).toUpperCase() : "O"}
                    </div>
                  )}

                  {/* Hover Overlay with Quick Crop / Change Trigger */}
                  <div
                    onClick={() => logoFileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-xs"
                    title="Click to upload or replace logo"
                  >
                    <Camera className="w-5 h-5 text-[hsl(var(--primary))]" />
                    <span className="text-[10px] font-bold">Change 1:1</span>
                  </div>
                </div>

                {/* Logo Action Buttons */}
                <div className="w-full flex flex-wrap items-center justify-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-white transition-all cursor-pointer border border-[hsl(var(--primary))]/20 shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {currentDisplayLogo ? "Replace" : "Upload Logo"}
                  </button>

                  {currentDisplayLogo && (
                    <>
                      <button
                        type="button"
                        onClick={handleReCrop}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] transition-all cursor-pointer border border-[hsl(var(--border))]"
                        title="Re-crop to 1:1 Square"
                      >
                        <Crop className="w-3.5 h-3.5" /> Crop
                      </button>

                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="inline-flex items-center gap-1 p-1.5 rounded-xl text-xs text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-all cursor-pointer"
                        title="Remove Logo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>

                <input
                  type="file"
                  ref={logoFileInputRef}
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  onChange={handleLogoFileSelect}
                  className="hidden"
                />
              </div>

              <div className="text-[11px] text-[hsl(var(--muted-foreground))] flex items-start gap-1.5 leading-relaxed pt-1">
                <Info className="w-3.5 h-3.5 text-[hsl(var(--primary))] shrink-0 mt-0.5" />
                <span>
                  Saved at 1:1 square ratio (e.g. 512×512). Supports PNG, JPG, SVG, WebP up to 5MB.
                </span>
              </div>
            </div>

            {/* Right 8 cols: Organization Name and Slug */}
            <div className="lg:col-span-8 space-y-4 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">
                    Organization Display Name
                  </label>
                  <input
                    type="text"
                    required
                    disabled={loading}
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--input))] bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] transition-all disabled:opacity-60"
                  />
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1.5">
                    Visible across your shared videos, playlists, meetings, and team invites.
                  </p>
                </div>

                {activeOrg && (
                  <div className="p-3.5 rounded-xl bg-[hsl(var(--muted))]/40 border border-[hsl(var(--border))] space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[hsl(var(--muted-foreground))]">Workspace Slug</span>
                      <span className="font-mono text-xs font-bold text-[hsl(var(--foreground))]">{activeOrg.slug}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[hsl(var(--muted-foreground))]">Plan & Entitlement</span>
                      <span className="capitalize font-bold text-[hsl(var(--primary))]">{activeOrg.planName} Plan</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-[hsl(var(--border))]">
                <button
                  type="submit"
                  disabled={isSavingOrgDetails || loading || !hasUnsavedChanges}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[hsl(var(--primary))] text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-sm hover:opacity-95 min-h-[44px] cursor-pointer"
                >
                  {isSavingOrgDetails ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save Organization Details
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* SECTION 3: MEMBERS & STORAGE QUOTA */}
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
            {activeOrg?.planName?.toLowerCase() !== "enterprise" ? (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Enterprise Feature: Team Member Invites
                  </span>
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/pricing")}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-lg transition-all shadow-xs cursor-pointer"
                  >
                    Upgrade to Enterprise
                  </button>
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Inviting team members to collaborate in your workspace is an Enterprise plan feature. Upgrade your workspace to invite team members and assign roles.
                </p>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  required
                  disabled={isInviting}
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-[hsl(var(--input))] bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] disabled:opacity-60 transition-all"
                />
                <select
                  value={inviteRole}
                  disabled={isInviting}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-[hsl(var(--input))] bg-white dark:bg-slate-900 text-sm outline-none disabled:opacity-60 transition-all"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                  <option value="VIEWER">Viewer</option>
                </select>
                <button
                  type="submit"
                  disabled={isInviting || !inviteEmail.trim()}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[hsl(var(--primary))] text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all min-h-[44px] shadow-sm hover:opacity-95 cursor-pointer"
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
                          className="p-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-lg transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRevokeInvite(inv.id)}
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
        </div>

        {/* Right 1 Col: Plans & Storage Quota */}
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-[hsl(var(--border))] space-y-4">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-[hsl(var(--primary))]" />
              <h3 className="font-bold text-base text-[hsl(var(--foreground))]">Storage Quota</h3>
            </div>

            <div className="p-4 rounded-xl bg-[hsl(var(--muted))]/60 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span>Plan Storage Limit</span>
                <span className="text-[hsl(var(--primary))] font-bold">
                  {usageInfo ? `${usageInfo.storageLimitGb} GB Storage` : "2 GB Storage"}
                </span>
              </div>

              {usageInfo && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
                    <span>Current Usage</span>
                    <span className="font-semibold text-[hsl(var(--foreground))]">
                      {formatBytes(usageInfo.usedBytes)} / {formatBytes(usageInfo.storageLimitBytes)}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-[hsl(var(--primary))] rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.round((usageInfo.usedBytes / usageInfo.storageLimitBytes) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <p className="text-xs text-[hsl(var(--muted-foreground))] pt-1">
                Adaptive HLS encoding and original video uploads consume total storage quota.
              </p>
            </div>

            {/* Custom Quota Override Request */}
            <div className="pt-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">
                Need a Custom Storage Limit?
              </h4>
              <form onSubmit={handleCustomLimitRequest} className="space-y-3">
                <input
                  type="text"
                  placeholder="e.g. 50 GB storage"
                  value={customLimitInput}
                  onChange={(e) => setCustomLimitInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[hsl(var(--input))] bg-white dark:bg-slate-900 text-sm outline-none"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-slate-900 text-white font-semibold text-xs rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Request Custom Storage Override
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

      {/* 1:1 Square Image Cropper Modal */}
      <ImageCropper1to1Modal
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        imageSrc={rawSelectedImage}
        onCropComplete={handleCropComplete}
      />

      {/* Create Organization Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={(open) => !open && setIsCreateModalOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle>Create New Organization</DialogTitle>
                <DialogDescription>Add a new workspace to manage videos and team members</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {activeOrg?.planName?.toLowerCase() !== "enterprise" ? (
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-3 my-2">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300">
                <Sparkles className="w-4 h-4 text-purple-600" /> Enterprise Plan Required
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                New organization creation can only be done on the Enterprise plan (up to 5 organizations maximum).
              </p>
              <Button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  router.push("/dashboard/pricing");
                }}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs"
              >
                Upgrade to Enterprise Plan
              </Button>
            </div>
          ) : userOrgs.length >= 5 ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 my-2 text-center">
              <div className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Organization Limit Reached
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                You have reached the maximum limit of 5 organizations allowed on the Enterprise plan.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreateOrg} className="space-y-4">
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
                  Custom Slug <span className="text-[hsl(var(--muted-foreground))] font-normal">(Optional)</span>
                </Label>
                <Input
                  id="org-slug-input"
                  type="text"
                  placeholder="e.g. acme-video-studio"
                  value={newOrgSlug}
                  onChange={(e) => setNewOrgSlug(e.target.value)}
                />
                <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                  Unique identifier used in URLs and API keys (up to 5 orgs per Enterprise account).
                </p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateModalOpen(false)}
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
    </div>
  );
}
