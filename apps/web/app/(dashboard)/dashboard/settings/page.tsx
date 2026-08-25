"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check, AlertCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import ImageCropperModal, { AspectRatioOption } from "@/components/ImageCropperModal";
import {
  OrganizationSwitcherSection,
  OrganizationItem,
  OrganizationDetailsSection,
  TeamMembersSection,
  Member,
  Invitation,
  StorageQuotaSection,
  CreateOrganizationModal,
} from "@/components/settings";

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

  // Organization cover photo state
  const [orgCoverUrl, setOrgCoverUrl] = useState<string | null>(null);
  const [newCoverData, setNewCoverData] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);

  const [isSavingOrgDetails, setIsSavingOrgDetails] = useState(false);
  const [orgSuccessMsg, setOrgSuccessMsg] = useState("");
  const [orgErrorMsg, setOrgErrorMsg] = useState("");

  // Image Cropper Modal state (supports both 1:1 logo and 3:1 cover photo)
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropTarget, setCropTarget] = useState<"logo" | "cover">("logo");
  const [cropAspectRatio, setCropAspectRatio] = useState<AspectRatioOption>("1:1");
  const [cropTitle, setCropTitle] = useState("Crop Image");
  const [cropDescription, setCropDescription] = useState("");
  const [rawSelectedImage, setRawSelectedImage] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);

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

  const [removeMemberTarget, setRemoveMemberTarget] = useState<{ id: string; name: string } | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  const fetchUserOrganizations = async () => {
    try {
      const res = await fetch("/api/organizations");
      if (res.ok) {
        const data = await res.json();
        setUserOrgs(data.organizations || []);
        if (data.activeOrganizationId) {
          setActiveOrgId(data.activeOrganizationId);
        }
      }
    } catch (err) {
      console.error("Failed to load user organizations:", err);
    }
  };

  const fetchOrgData = async () => {
    setLoading(true);
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

          setOrgCoverUrl(data.organization.coverUrl || null);
          setNewCoverData(null);
          setRemoveCover(false);

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
    try {
      const res = await fetch("/api/organizations/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to switch organization");
      }

      setActiveOrgId(orgId);
      await updateSession();
      await fetchUserOrganizations();
      await fetchOrgData();

      router.refresh();
    } catch (err: any) {
      setOrgErrorMsg(err.message || "Failed to switch organization");
      setTimeout(() => setOrgErrorMsg(""), 4000);
    } finally {
      setSwitchingOrgId(null);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setIsCreatingOrg(true);
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

      setIsCreateModalOpen(false);
      setNewOrgName("");
      setNewOrgSlug("");
      setOrgSuccessMsg(`Workspace "${data.organization.name}" created successfully!`);

      await fetchUserOrganizations();
      await handleSwitchOrg(data.organization.id);
    } catch (err: any) {
      setOrgErrorMsg(err.message || "Failed to create organization");
      setTimeout(() => setOrgErrorMsg(""), 4000);
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setOrgErrorMsg("Please select a valid image file (PNG, JPG, SVG, WebP)");
      setTimeout(() => setOrgErrorMsg(""), 4000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setOrgErrorMsg("Logo image size must be under 5MB");
      setTimeout(() => setOrgErrorMsg(""), 4000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setRawSelectedImage(event.target.result as string);
        setCropTarget("logo");
        setCropAspectRatio("1:1");
        setCropTitle("Crop Organization Logo (1:1 Ratio)");
        setCropDescription("Position and zoom your organization logo to a 1:1 square ratio (e.g. 512×512px).");
        setIsCropperOpen(true);
      }
    };
    reader.readAsDataURL(file);

    if (logoFileInputRef.current) {
      logoFileInputRef.current.value = "";
    }
  };

  const handleCoverFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setOrgErrorMsg("Please select a valid image file (PNG, JPG, WebP)");
      setTimeout(() => setOrgErrorMsg(""), 4000);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setOrgErrorMsg("Cover photo size must be under 10MB");
      setTimeout(() => setOrgErrorMsg(""), 4000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setRawSelectedImage(event.target.result as string);
        setCropTarget("cover");
        setCropAspectRatio("3:1");
        setCropTitle("Crop Organization Cover Photo (3:1 Banner)");
        setCropDescription("Position and zoom your header cover banner (Recommended: 1200×400px 3:1 ratio).");
        setIsCropperOpen(true);
      }
    };
    reader.readAsDataURL(file);

    if (coverFileInputRef.current) {
      coverFileInputRef.current.value = "";
    }
  };

  const handleCropComplete = (croppedBase64: string) => {
    if (cropTarget === "logo") {
      setNewLogoData(croppedBase64);
      setRemoveLogo(false);
    } else if (cropTarget === "cover") {
      setNewCoverData(croppedBase64);
      setRemoveCover(false);
    }
    setIsCropperOpen(false);
  };

  const handleRemoveLogo = () => {
    setNewLogoData(null);
    setRemoveLogo(true);
  };

  const handleRemoveCover = () => {
    setNewCoverData(null);
    setRemoveCover(true);
  };

  // Check if there are unsaved changes
  const hasNameChanged = orgName.trim() !== initialOrgName && orgName.trim().length > 0;
  const hasLogoChanged = newLogoData !== null || (removeLogo && orgLogoUrl !== null);
  const hasCoverChanged = newCoverData !== null || (removeCover && orgCoverUrl !== null);
  const hasUnsavedChanges = hasNameChanged || hasLogoChanged || hasCoverChanged;

  // Active display logo (new local crop > current server logo > null)
  const currentDisplayLogo = removeLogo ? null : newLogoData || orgLogoUrl;
  // Active display cover (new local crop > current server cover > null)
  const currentDisplayCover = removeCover ? null : newCoverData || orgCoverUrl;

  const handleOrgDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasUnsavedChanges || isSavingOrgDetails) return;

    setIsSavingOrgDetails(true);
    setOrgSuccessMsg("");
    setOrgErrorMsg("");

    try {
      const payload: {
        name?: string;
        logoData?: string;
        removeLogo?: boolean;
        coverData?: string;
        removeCover?: boolean;
      } = {};

      if (hasNameChanged) {
        payload.name = orgName.trim();
      }

      if (removeLogo) {
        payload.removeLogo = true;
      } else if (newLogoData) {
        payload.logoData = newLogoData;
      }

      if (removeCover) {
        payload.removeCover = true;
      } else if (newCoverData) {
        payload.coverData = newCoverData;
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

        setOrgCoverUrl(data.organization.coverUrl || null);
        setNewCoverData(null);
        setRemoveCover(false);

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

      setOrgSuccessMsg("Organization details and media updated successfully!");
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

  const handleRemoveMember = (memberId: string, memberName: string) => {
    setRemoveMemberTarget({ id: memberId, name: memberName });
  };

  const handleExecuteRemoveMember = async () => {
    if (!removeMemberTarget) return;
    const { id: memberId, name: memberName } = removeMemberTarget;
    setIsRemovingMember(true);
    try {
      const res = await fetch(`/api/organization/members/${memberId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to remove member");
      }

      setRemoveMemberTarget(null);
      setActionMessage(`Member ${memberName} removed successfully`);
      fetchOrgData();
      setTimeout(() => setActionMessage(""), 3000);
    } catch (err: any) {
      setOrgErrorMsg(err.message || "Failed to remove member");
      setTimeout(() => setOrgErrorMsg(""), 4000);
    } finally {
      setIsRemovingMember(false);
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
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Organization Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Switch active organization, upload 1:1 logo, manage team members, permissions, and storage limits.
        </p>
      </div>

      {/* Global Org Notification Messages */}
      {orgSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{orgSuccessMsg}</span>
        </div>
      )}

      {orgErrorMsg && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{orgErrorMsg}</span>
        </div>
      )}

      {actionMessage && (
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 text-sm flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* SECTION 1: WORKSPACE SWITCHER & ORGANIZATIONS LIST */}
      <OrganizationSwitcherSection
        userOrgs={userOrgs}
        switchingOrgId={switchingOrgId}
        onSwitchOrg={handleSwitchOrg}
        onCreateOrgClick={() => setIsCreateModalOpen(true)}
      />

      {/* SECTION 2: ACTIVE ORGANIZATION DETAILS & MEDIA */}
      <OrganizationDetailsSection
        orgName={orgName}
        setOrgName={setOrgName}
        activeOrg={activeOrg}
        currentDisplayLogo={currentDisplayLogo}
        currentDisplayCover={currentDisplayCover}
        hasUnsavedChanges={hasUnsavedChanges}
        loading={loading}
        isSavingOrgDetails={isSavingOrgDetails}
        onSubmit={handleOrgDetailsSubmit}
        onRemoveLogo={handleRemoveLogo}
        onLogoFileSelect={handleLogoFileSelect}
        logoFileInputRef={logoFileInputRef}
        onRemoveCover={handleRemoveCover}
        onCoverFileSelect={handleCoverFileSelect}
        coverFileInputRef={coverFileInputRef}
      />

      {/* SECTION 3: MEMBERS & STORAGE QUOTA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left 2 Cols: Team Members & Invitations */}
        <div className="lg:col-span-2 space-y-6">
          <TeamMembersSection
            activeOrg={activeOrg}
            members={members}
            invitations={invitations}
            inviteEmail={inviteEmail}
            setInviteEmail={setInviteEmail}
            inviteRole={inviteRole}
            setInviteRole={setInviteRole}
            loading={loading}
            isInviting={isInviting}
            onInvite={handleInvite}
            onResendInvite={handleResendInvite}
            onRevokeInvite={handleRevokeInvite}
            onRoleChange={handleRoleChange}
            onRemoveMember={handleRemoveMember}
          />
        </div>

        {/* Right 1 Col: Storage Quota */}
        <div className="space-y-6">
          <StorageQuotaSection
            usageInfo={usageInfo}
            customLimitInput={customLimitInput}
            setCustomLimitInput={setCustomLimitInput}
            requestSubmitted={requestSubmitted}
            onCustomLimitRequest={handleCustomLimitRequest}
          />
        </div>
      </div>

      {/* Image Cropper Modal (1:1 Square Logo & 3:1 Banner Cover Photo) */}
      <ImageCropperModal
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        imageSrc={rawSelectedImage}
        onCropComplete={handleCropComplete}
        aspectRatio={cropAspectRatio}
        title={cropTitle}
        description={cropDescription}
      />

      {/* Create Organization Modal */}
      <CreateOrganizationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        activeOrg={activeOrg}
        userOrgsCount={userOrgs.length}
        newOrgName={newOrgName}
        setNewOrgName={setNewOrgName}
        newOrgSlug={newOrgSlug}
        setNewOrgSlug={setNewOrgSlug}
        isCreatingOrg={isCreatingOrg}
        onCreateOrg={handleCreateOrg}
      />

      {/* Remove Member Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(removeMemberTarget)}
        onOpenChange={(open) => {
          if (!open) setRemoveMemberTarget(null);
        }}
        title={`Remove ${removeMemberTarget?.name}?`}
        description={`Are you sure you want to remove ${removeMemberTarget?.name} from this organization? They will lose access to all shared resources and workspace data.`}
        variant="danger"
        confirmText="Remove Member"
        cancelText="Cancel"
        isLoading={isRemovingMember}
        onConfirm={handleExecuteRemoveMember}
        onCancel={() => setRemoveMemberTarget(null)}
      />
    </div>
  );
}
