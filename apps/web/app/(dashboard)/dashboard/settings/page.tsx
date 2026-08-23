"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check, AlertCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import ImageCropper1to1Modal from "@/components/ImageCropper1to1Modal";
import {
  OrganizationSwitcherSection,
  OrganizationItem,
  OrganizationDetailsSection,
  TeamMembersSection,
  Member,
  Invitation,
  StorageQuotaSection,
  CreateOrganizationModal,
  ContentSalesPayoutSection,
  PurchasesStats,
  BankFormData,
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

  // Monetization, Purchases & Withdrawals state
  const [purchases, setPurchases] = useState<any[]>([]);
  const [purchasesStats, setPurchasesStats] = useState<PurchasesStats | null>(null);
  const [bankAccount, setBankAccount] = useState<any>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [hasPendingWithdrawal, setHasPendingWithdrawal] = useState(false);
  const [monetizationTab, setMonetizationTab] = useState<"purchases" | "withdrawals" | "bank" | "tiers">("purchases");
  const [purchaseFilterType, setPurchaseFilterType] = useState<"ALL" | "VIDEO" | "PLAYLIST" | "MEETING">("ALL");
  const [purchaseSearchQuery, setPurchaseSearchQuery] = useState("");
  const [copiedPaymentId, setCopiedPaymentId] = useState<string | null>(null);
  const [withdrawalPresetPct, setWithdrawalPresetPct] = useState<number | null>(null);
  const [loadingMonetization, setLoadingMonetization] = useState(false);

  // Bank Form state
  const [bankFormData, setBankFormData] = useState<BankFormData>({
    accountHolderName: "",
    accountNumber: "",
    routingNumber: "",
    bankName: "",
    swiftCode: "",
    accountType: "CHECKING",
    country: "US",
    currency: "USD",
  });

  // Active Payout / Monetization Currency
  const activeCurrency = bankAccount?.currency || purchasesStats?.currency || bankFormData.currency || (purchases.length > 0 && purchases[0].currency) || "USD";
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [bankSuccessMsg, setBankSuccessMsg] = useState("");
  const [bankErrorMsg, setBankErrorMsg] = useState("");

  // Withdrawal Request state
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [isRequestingWithdrawal, setIsRequestingWithdrawal] = useState(false);
  const [withdrawalSuccessMsg, setWithdrawalSuccessMsg] = useState("");
  const [withdrawalErrorMsg, setWithdrawalErrorMsg] = useState("");

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

  const fetchMonetizationData = async () => {
    setLoadingMonetization(true);
    try {
      const [resPurchases, resBank, resWithdrawals] = await Promise.all([
        fetch("/api/organization/purchases"),
        fetch("/api/organization/bank-account"),
        fetch("/api/organization/withdrawals"),
      ]);

      if (resPurchases.ok) {
        const pData = await resPurchases.json();
        setPurchases(pData.purchases || []);
        setPurchasesStats(pData.stats || null);
      }

      if (resBank.ok) {
        const bData = await resBank.json();
        if (bData.bankAccount) {
          setBankAccount(bData.bankAccount);
          setBankFormData({
            accountHolderName: bData.bankAccount.accountHolderName || "",
            accountNumber: bData.bankAccount.accountNumber || "",
            routingNumber: bData.bankAccount.routingNumber || "",
            bankName: bData.bankAccount.bankName || "",
            swiftCode: bData.bankAccount.swiftCode || "",
            accountType: bData.bankAccount.accountType || "CHECKING",
            country: bData.bankAccount.country || "US",
            currency: bData.bankAccount.currency || "USD",
          });
        }
      }

      if (resWithdrawals.ok) {
        const wData = await resWithdrawals.json();
        setWithdrawals(wData.withdrawals || []);
        setHasPendingWithdrawal(Boolean(wData.hasPendingWithdrawal));
      }
    } catch (err) {
      console.error("Failed to load monetization data:", err);
    } finally {
      setLoadingMonetization(false);
    }
  };

  useEffect(() => {
    fetchUserOrganizations();
    fetchOrgData();
    fetchMonetizationData();
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
      await fetchMonetizationData();

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
        setIsCropperOpen(true);
      }
    };
    reader.readAsDataURL(file);

    if (logoFileInputRef.current) {
      logoFileInputRef.current.value = "";
    }
  };

  const handleCropComplete = (croppedBase64: string) => {
    setNewLogoData(croppedBase64);
    setRemoveLogo(false);
    setIsCropperOpen(false);
  };

  const handleRemoveLogo = () => {
    setNewLogoData(null);
    setRemoveLogo(true);
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

  const handleSaveBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBank(true);
    setBankSuccessMsg("");
    setBankErrorMsg("");

    try {
      const res = await fetch("/api/organization/bank-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bankFormData),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save bank details");
      }

      setBankAccount(data.bankAccount);
      setBankSuccessMsg("Bank account details saved successfully!");
      setTimeout(() => setBankSuccessMsg(""), 4000);
    } catch (err: any) {
      setBankErrorMsg(err.message || "Failed to save bank account");
      setTimeout(() => setBankErrorMsg(""), 4000);
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) return;

    setIsRequestingWithdrawal(true);
    setWithdrawalSuccessMsg("");
    setWithdrawalErrorMsg("");

    try {
      const res = await fetch("/api/organization/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(withdrawalAmount),
          currency: activeCurrency,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit withdrawal request");
      }

      setWithdrawalSuccessMsg("Withdrawal request submitted! Our finance team is reviewing it.");
      setWithdrawalAmount("");
      setWithdrawalPresetPct(null);
      await fetchMonetizationData();
      setTimeout(() => setWithdrawalSuccessMsg(""), 6000);
    } catch (err: any) {
      setWithdrawalErrorMsg(err.message || "Failed to submit withdrawal request");
      setTimeout(() => setWithdrawalErrorMsg(""), 5000);
    } finally {
      setIsRequestingWithdrawal(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Organization Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Switch active organization, upload 1:1 logo, manage team members, permissions, storage limits, and creator payouts.
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

      {/* SECTION 2: ACTIVE ORGANIZATION DETAILS & 1:1 LOGO */}
      <OrganizationDetailsSection
        orgName={orgName}
        setOrgName={setOrgName}
        activeOrg={activeOrg}
        currentDisplayLogo={currentDisplayLogo}
        hasUnsavedChanges={hasUnsavedChanges}
        loading={loading}
        isSavingOrgDetails={isSavingOrgDetails}
        onSubmit={handleOrgDetailsSubmit}
        onRemoveLogo={handleRemoveLogo}
        onLogoFileSelect={handleLogoFileSelect}
        logoFileInputRef={logoFileInputRef}
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

      {/* SECTION 4: CONTENT SALES & PAYOUT CENTER */}
      <ContentSalesPayoutSection
        purchases={purchases}
        purchasesStats={purchasesStats}
        bankAccount={bankAccount}
        withdrawals={withdrawals}
        hasPendingWithdrawal={hasPendingWithdrawal}
        monetizationTab={monetizationTab}
        setMonetizationTab={setMonetizationTab}
        purchaseFilterType={purchaseFilterType}
        setPurchaseFilterType={setPurchaseFilterType}
        purchaseSearchQuery={purchaseSearchQuery}
        setPurchaseSearchQuery={setPurchaseSearchQuery}
        copiedPaymentId={copiedPaymentId}
        setCopiedPaymentId={setCopiedPaymentId}
        withdrawalPresetPct={withdrawalPresetPct}
        setWithdrawalPresetPct={setWithdrawalPresetPct}
        loadingMonetization={loadingMonetization}
        fetchMonetizationData={fetchMonetizationData}
        bankFormData={bankFormData}
        setBankFormData={setBankFormData}
        activeCurrency={activeCurrency}
        showAccountNumber={showAccountNumber}
        setShowAccountNumber={setShowAccountNumber}
        isSavingBank={isSavingBank}
        bankSuccessMsg={bankSuccessMsg}
        bankErrorMsg={bankErrorMsg}
        handleSaveBankAccount={handleSaveBankAccount}
        withdrawalAmount={withdrawalAmount}
        setWithdrawalAmount={setWithdrawalAmount}
        isRequestingWithdrawal={isRequestingWithdrawal}
        withdrawalSuccessMsg={withdrawalSuccessMsg}
        withdrawalErrorMsg={withdrawalErrorMsg}
        handleRequestWithdrawal={handleRequestWithdrawal}
        activeOrg={activeOrg}
      />

      {/* 1:1 Square Image Cropper Modal */}
      <ImageCropper1to1Modal
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        imageSrc={rawSelectedImage}
        onCropComplete={handleCropComplete}
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
