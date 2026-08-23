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
  Image as ImageIcon,
  Info,
  Camera,
  DollarSign,
  CreditCard,
  Wallet,
  ArrowDownToLine,
  Landmark,
  Receipt,
  Eye,
  EyeOff,
  Film,
  ListVideo,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatBytes } from "@/lib/video-utils";
import ImageCropper1to1Modal from "@/components/ImageCropper1to1Modal";
import { formatMoney, getCurrencySymbol } from "@/lib/utils";

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

  // Monetization, Purchases & Withdrawals state
  const [purchases, setPurchases] = useState<any[]>([]);
  const [purchasesStats, setPurchasesStats] = useState<{
    totalGrossRevenue: number;
    availableBalance: number;
    totalWithdrawnOrPending: number;
    totalPurchasesCount: number;
    videoPurchasesCount: number;
    playlistPurchasesCount: number;
    meetingPurchasesCount?: number;
    currency?: string;
  } | null>(null);
  const [bankAccount, setBankAccount] = useState<any>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [hasPendingWithdrawal, setHasPendingWithdrawal] = useState(false);
  const [monetizationTab, setMonetizationTab] = useState<"purchases" | "bank" | "withdrawals">("purchases");
  const [loadingMonetization, setLoadingMonetization] = useState(false);
  // Bank Form state
  const [bankFormData, setBankFormData] = useState({
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
        throw new Error(data.error || "Failed to save bank account.");
      }

      setBankSuccessMsg(data.message || "Bank account details saved successfully!");
      setBankAccount(data.bankAccount);
      setTimeout(() => setBankSuccessMsg(""), 4000);
    } catch (err: any) {
      setBankErrorMsg(err.message || "Failed to save bank account.");
      setTimeout(() => setBankErrorMsg(""), 4000);
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawalAmount);
    if (isNaN(amt) || amt <= 0) {
      setWithdrawalErrorMsg("Please enter a valid withdrawal amount greater than 0.");
      return;
    }

    setIsRequestingWithdrawal(true);
    setWithdrawalSuccessMsg("");
    setWithdrawalErrorMsg("");

    try {
      const res = await fetch("/api/organization/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, currency: activeCurrency }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to request withdrawal.");
      }

      setWithdrawalSuccessMsg(data.message || "Withdrawal request submitted successfully!");
      setWithdrawalAmount("");
      await fetchMonetizationData();
      setTimeout(() => setWithdrawalSuccessMsg(""), 4000);
    } catch (err: any) {
      setWithdrawalErrorMsg(err.message || "Failed to request withdrawal.");
      setTimeout(() => setWithdrawalErrorMsg(""), 4000);
    } finally {
      setIsRequestingWithdrawal(false);
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
      await fetchMonetizationData();
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

  const [removeMemberTarget, setRemoveMemberTarget] = useState<{ id: string; name: string } | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

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
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Organization Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Switch active organization, upload 1:1 logo, manage team members, permissions, and storage limits.
        </p>
      </div>

      {/* Messages */}
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

      {/* SECTION 1: WORKSPACE SWITCHER & ORGANIZATIONS LIST */}
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
            onClick={() => setIsCreateModalOpen(true)}
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
                      onClick={() => handleSwitchOrg(org.id)}
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

      {/* SECTION 2: CURRENT ACTIVE ORGANIZATION DETAILS & 1:1 LOGO */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 border border-border space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">Active Organization Details</h3>
              <p className="text-xs text-muted-foreground">
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
            <div className="lg:col-span-4 p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-primary" /> Organization Logo
                </label>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/30">
                  1:1 Ratio
                </span>
              </div>

              {/* 1:1 Square Logo Preview & Action Triggers */}
              <div className="flex flex-col items-center justify-center p-4 bg-card border border-border rounded-2xl space-y-3">
                <div className="relative group w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-border bg-white dark:bg-slate-900 shadow-xs overflow-hidden flex items-center justify-center shrink-0">
                  {currentDisplayLogo ? (
                    <img
                      src={currentDisplayLogo}
                      alt="Organization Logo"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-primary/10 text-primary font-extrabold text-2xl select-none">
                      {orgName ? orgName.charAt(0).toUpperCase() : "O"}
                    </div>
                  )}

                  {/* Hover Overlay with Quick Crop / Change Trigger */}
                  <div
                    onClick={() => logoFileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-xs"
                    title="Click to upload or replace logo"
                  >
                    <Camera className="w-5 h-5 text-primary" />
                    <span className="text-[10px] font-bold">Change 1:1</span>
                  </div>
                </div>

                {/* Logo Action Buttons */}
                <div className="w-full flex flex-wrap items-center justify-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all cursor-pointer border border-primary/20 shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {currentDisplayLogo ? "Replace" : "Upload Logo"}
                  </button>

                  {currentDisplayLogo && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="inline-flex items-center gap-1 p-1.5 rounded-xl text-xs text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-all cursor-pointer"
                      title="Remove Logo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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

              <div className="text-[11px] text-muted-foreground flex items-start gap-1.5 leading-relaxed pt-1">
                <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span>
                  Saved at 1:1 square ratio (e.g. 512×512). Supports PNG, JPG, SVG, WebP up to 5MB.
                </span>
              </div>
            </div>

            {/* Right 8 cols: Organization Name and Slug */}
            <div className="lg:col-span-8 space-y-4 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Organization Display Name
                  </label>
                  <input
                    type="text"
                    required
                    disabled={loading}
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-white dark:bg-slate-900 text-sm outline-hidden focus:ring-2 focus:ring-primary transition-all disabled:opacity-60"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Visible across your shared videos, playlists, meetings, and team invites.
                  </p>
                </div>

                {activeOrg && (
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-muted-foreground">Workspace Slug</span>
                      <span className="font-mono text-xs font-bold text-foreground">{activeOrg.slug}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-muted-foreground">Plan & Entitlement</span>
                      <span className="capitalize font-bold text-primary">{activeOrg.planName} Plan</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <button
                  type="submit"
                  disabled={isSavingOrgDetails || loading || !hasUnsavedChanges}
                  className="w-full sm:w-auto px-6 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-xs hover:opacity-95 min-h-[44px] cursor-pointer"
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

            {inviteSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{inviteSuccess}</span>
              </div>
            )}

            {inviteError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            {actionMessage && (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 text-sm flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
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
              <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
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
                          onClick={() => handleResendInvite(inv.email, inv.role)}
                          disabled={isInviting}
                          title="Resend invitation email"
                          className="p-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
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
                                  if (val) handleRoleChange(m.id, val);
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
          <div className="glass-card rounded-2xl p-6 border border-border space-y-4">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-base text-foreground">Storage Quota</h3>
            </div>

            <div className="p-4 rounded-xl bg-muted/60 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span>Plan Storage Limit</span>
                <span className="text-primary font-bold">
                  {usageInfo ? `${usageInfo.storageLimitGb} GB Storage` : "2 GB Storage"}
                </span>
              </div>

              {usageInfo && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                    <span>Current Usage</span>
                    <span className="font-semibold text-foreground">
                      {formatBytes(usageInfo.usedBytes)} / {formatBytes(usageInfo.storageLimitBytes)}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.round((usageInfo.usedBytes / usageInfo.storageLimitBytes) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground pt-1">
                Adaptive HLS encoding and original video uploads consume total storage quota.
              </p>
            </div>

            {/* Custom Quota Override Request */}
            <div className="pt-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Need a Custom Storage Limit?
              </h4>
              <form onSubmit={handleCustomLimitRequest} className="space-y-3">
                <input
                  type="text"
                  placeholder="e.g. 50 GB storage"
                  value={customLimitInput}
                  onChange={(e) => setCustomLimitInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-input bg-white dark:bg-slate-900 text-sm outline-hidden"
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

      {/* SECTION 4: CONTENT MONETIZATION, PURCHASES & PAYOUT WITHDRAWALS */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 border border-border space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-lime-500/15 text-lime-500 shrink-0">
              <DollarSign className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">Content Purchases & Payout Withdrawals</h3>
              <p className="text-xs text-muted-foreground">
                Track revenue generated from purchasable videos and playlists, configure bank account, and request payouts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border self-start sm:self-auto">
            <button
              onClick={() => setMonetizationTab("purchases")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                monetizationTab === "purchases"
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Purchases ({purchases.length})
            </button>
            <button
              onClick={() => setMonetizationTab("bank")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                monetizationTab === "bank"
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Bank Account {bankAccount ? "✓" : ""}
            </button>
            <button
              onClick={() => setMonetizationTab("withdrawals")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                monetizationTab === "withdrawals"
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Withdrawals ({withdrawals.length})
            </button>
          </div>
        </div>

        {/* Revenue Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5 text-primary" /> Gross Sales Revenue
            </span>
            <p className="text-2xl font-black text-foreground">
              {formatMoney(purchasesStats ? purchasesStats.totalGrossRevenue : 0, activeCurrency)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              From {purchasesStats?.totalPurchasesCount || 0} completed orders
            </p>
          </div>

          <div className="p-4 rounded-xl bg-lime-500/10 border border-lime-500/20 space-y-1">
            <span className="text-[11px] font-semibold text-lime-600 dark:text-lime-400 uppercase flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5" /> Available for Payout
            </span>
            <p className="text-2xl font-black text-lime-600 dark:text-lime-400">
              {formatMoney(purchasesStats ? purchasesStats.availableBalance : 0, activeCurrency)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Ready for withdrawal to bank ({activeCurrency})
            </p>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
              <Film className="w-3.5 h-3.5 text-primary" /> Content & Meet Sales
            </span>
            <p className="text-2xl font-black text-foreground">
              {purchasesStats?.videoPurchasesCount || 0} <span className="text-xs text-muted-foreground font-normal">vids</span> / {purchasesStats?.playlistPurchasesCount || 0} <span className="text-xs text-muted-foreground font-normal">playlists</span> / {purchasesStats?.meetingPurchasesCount || 0} <span className="text-xs text-muted-foreground font-normal">meets</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              Individual content unlock sales
            </p>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
              <ArrowDownToLine className="w-3.5 h-3.5 text-amber-500" /> Pending / Paid Out
            </span>
            <p className="text-2xl font-black text-foreground">
              {formatMoney(purchasesStats ? purchasesStats.totalWithdrawnOrPending : 0, activeCurrency)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {hasPendingWithdrawal ? "⚠️ 1 request currently pending" : "No pending requests"}
            </p>
          </div>
        </div>

        {/* TAB 1: PURCHASES HISTORY */}
        {monetizationTab === "purchases" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" /> Content Purchases History ({purchases.length})
              </h4>
              <button
                onClick={fetchMonetizationData}
                disabled={loadingMonetization}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingMonetization ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>

            {loadingMonetization ? (
              <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading purchases...
              </div>
            ) : purchases.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-border rounded-xl space-y-2 p-6 bg-muted/20">
                <Receipt className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
                <p className="text-sm font-semibold text-foreground">No purchases recorded yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  When visitors purchase your videos or playlists in Purchasable mode, order details and sales revenue will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-3 px-4">Buyer</th>
                      <th className="py-3 px-4">Content</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Amount Paid</th>
                      <th className="py-3 px-4">Country</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Payment ID</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {purchases.map((purchase) => (
                      <tr key={purchase.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">
                            {purchase.user?.name || "Guest / Buyer"}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {purchase.user?.email || "—"}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {purchase.video?.title || purchase.playlist?.title || purchase.meeting?.title || "Shared Content"}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            purchase.contentType === "PLAYLIST"
                              ? "bg-purple-500/15 text-purple-600 border border-purple-500/20"
                              : purchase.contentType === "MEETING"
                              ? "bg-amber-500/15 text-amber-600 border border-amber-500/20"
                              : "bg-blue-500/15 text-blue-600 border border-blue-500/20"
                          }`}>
                            {purchase.contentType}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-foreground">
                          {formatMoney(purchase.amount, purchase.currency)} <span className="text-[10px] text-muted-foreground font-normal font-mono">({purchase.currency})</span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-mono">
                          {purchase.countryCode || "GLOBAL"}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {new Date(purchase.createdAt).toLocaleDateString()} {new Date(purchase.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                          {purchase.paymentId}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                            {purchase.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BANK ACCOUNT SETTINGS */}
        {monetizationTab === "bank" && (
          <div className="space-y-6 max-w-2xl">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Landmark className="w-4 h-4 text-primary" /> Bank Account for Payouts
              </h4>
              <p className="text-xs text-muted-foreground">
                Enter your official bank account details. Revenue payouts requested will be wired directly to this account.
              </p>
            </div>

            {bankSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{bankSuccessMsg}</span>
              </div>
            )}

            {bankErrorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bankErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveBankAccount} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="bank-holder-input">Account Holder Full Name *</Label>
                  <Input
                    id="bank-holder-input"
                    required
                    placeholder="e.g. John Doe / Studio Corp LLC"
                    value={bankFormData.accountHolderName}
                    onChange={(e) => setBankFormData({ ...bankFormData, accountHolderName: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bank-name-input">Bank Name *</Label>
                  <Input
                    id="bank-name-input"
                    required
                    placeholder="e.g. JPMorgan Chase / HDFC Bank"
                    value={bankFormData.bankName}
                    onChange={(e) => setBankFormData({ ...bankFormData, bankName: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="bank-acc-input">Account / IBAN Number *</Label>
                    <button
                      type="button"
                      onClick={() => setShowAccountNumber(!showAccountNumber)}
                      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      {showAccountNumber ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showAccountNumber ? "Hide" : "Show"}
                    </button>
                  </div>
                  <Input
                    id="bank-acc-input"
                    required
                    type={showAccountNumber ? "text" : "password"}
                    placeholder="e.g. 123456789012"
                    value={bankFormData.accountNumber}
                    onChange={(e) => setBankFormData({ ...bankFormData, accountNumber: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bank-routing-input">Routing / IFSC / Sort Code</Label>
                  <Input
                    id="bank-routing-input"
                    placeholder="e.g. 021000021 / HDFC0001234"
                    value={bankFormData.routingNumber}
                    onChange={(e) => setBankFormData({ ...bankFormData, routingNumber: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bank-swift-input">SWIFT / BIC Code (Optional for International)</Label>
                  <Input
                    id="bank-swift-input"
                    placeholder="e.g. CHASUS33XXX"
                    value={bankFormData.swiftCode}
                    onChange={(e) => setBankFormData({ ...bankFormData, swiftCode: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bank-type-select">Account Type</Label>
                  <Select
                    value={bankFormData.accountType}
                    onValueChange={(val) => setBankFormData({ ...bankFormData, accountType: val || "CHECKING" })}
                  >
                    <SelectTrigger id="bank-type-select" className="w-full h-9 rounded-xl bg-card border-input text-foreground text-xs font-medium">
                      <SelectValue placeholder="Select Account Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CHECKING">Checking / Current Account</SelectItem>
                      <SelectItem value="SAVINGS">Savings Account</SelectItem>
                      <SelectItem value="BUSINESS">Business Corporate Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bank-country-select">Bank Country</Label>
                  <Select
                    value={bankFormData.country}
                    onValueChange={(val) => {
                      const country = val || "US";
                      const countryCurrencyMap: Record<string, string> = {
                        US: "USD",
                        IN: "INR",
                        GB: "GBP",
                        DE: "EUR",
                        FR: "EUR",
                        CA: "CAD",
                        AU: "AUD",
                        SG: "SGD",
                        AE: "AED",
                      };
                      setBankFormData((prev) => ({
                        ...prev,
                        country,
                        currency: countryCurrencyMap[country] || prev.currency,
                      }));
                    }}
                  >
                    <SelectTrigger id="bank-country-select" className="w-full h-9 rounded-xl bg-card border-input text-foreground text-xs font-medium">
                      <SelectValue placeholder="Select Country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">🇺🇸 United States</SelectItem>
                      <SelectItem value="IN">🇮🇳 India</SelectItem>
                      <SelectItem value="GB">🇬🇧 United Kingdom</SelectItem>
                      <SelectItem value="CA">🇨🇦 Canada</SelectItem>
                      <SelectItem value="DE">🇩🇪 Germany</SelectItem>
                      <SelectItem value="FR">🇫🇷 France</SelectItem>
                      <SelectItem value="AU">🇦🇺 Australia</SelectItem>
                      <SelectItem value="SG">🇸🇬 Singapore</SelectItem>
                      <SelectItem value="AE">🇦🇪 United Arab Emirates</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bank-currency-select">Payout Currency</Label>
                  <Select
                    value={bankFormData.currency}
                    onValueChange={(val) => setBankFormData({ ...bankFormData, currency: val || "USD" })}
                  >
                    <SelectTrigger id="bank-currency-select" className="w-full h-9 rounded-xl bg-card border-input text-foreground text-xs font-medium">
                      <SelectValue placeholder="Select Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="CAD">CAD (CA$)</SelectItem>
                      <SelectItem value="AUD">AUD (AU$)</SelectItem>
                      <SelectItem value="SGD">SGD (SG$)</SelectItem>
                      <SelectItem value="AED">AED (AED)</SelectItem>
                      <SelectItem value="JPY">JPY (¥)</SelectItem>
                      <SelectItem value="BRL">BRL (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSavingBank || !bankFormData.accountHolderName.trim() || !bankFormData.accountNumber.trim() || !bankFormData.bankName.trim()}
                  className="w-full sm:w-auto font-bold text-xs"
                >
                  {isSavingBank ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Saving Bank Details...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-1.5" /> Save Bank Account
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: PAYOUT WITHDRAWALS */}
        {monetizationTab === "withdrawals" && (
          <div className="space-y-6">
            {/* Request Withdrawal Box */}
            <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ArrowDownToLine className="w-4 h-4 text-primary" /> Request Payout Withdrawal
                </h4>
                <p className="text-xs text-muted-foreground">
                  Available for withdrawal: <strong className="text-foreground">{formatMoney(purchasesStats ? purchasesStats.availableBalance : 0, activeCurrency)}</strong>. Withdrawals are processed in {activeCurrency} to your saved bank account.
                </p>
              </div>

              {/* Strict Requirement Notice: Single pending withdrawal constraint */}
              {hasPendingWithdrawal && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  <div>
                    <span className="font-bold">Pending Withdrawal In Progress:</span> You currently have a pending withdrawal request under review. Per platform policy, you cannot submit a new withdrawal request until your active pending request is processed.
                  </div>
                </div>
              )}

              {!bankAccount && (
                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 shrink-0 text-purple-600" />
                    <span>Please configure your Bank Account before requesting a withdrawal.</span>
                  </div>
                  <button
                    onClick={() => setMonetizationTab("bank")}
                    className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 shrink-0 cursor-pointer"
                  >
                    Add Bank Account
                  </button>
                </div>
              )}

              {withdrawalSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{withdrawalSuccessMsg}</span>
                </div>
              )}

              {withdrawalErrorMsg && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{withdrawalErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleRequestWithdrawal} className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="space-y-1.5 flex-1 w-full">
                  <Label htmlFor="withdraw-amt-input" className="text-xs">
                    Withdrawal Amount ({getCurrencySymbol(activeCurrency)} {activeCurrency})
                  </Label>
                  <Input
                    id="withdraw-amt-input"
                    type="number"
                    step="0.01"
                    min="1"
                    max={purchasesStats?.availableBalance || 0}
                    disabled={hasPendingWithdrawal || !bankAccount || (purchasesStats?.availableBalance || 0) <= 0 || isRequestingWithdrawal}
                    placeholder={`e.g. ${purchasesStats?.availableBalance ? purchasesStats.availableBalance.toFixed(2) : "50.00"}`}
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={
                    hasPendingWithdrawal ||
                    !bankAccount ||
                    !withdrawalAmount ||
                    parseFloat(withdrawalAmount) <= 0 ||
                    (purchasesStats && parseFloat(withdrawalAmount) > purchasesStats.availableBalance) ||
                    isRequestingWithdrawal
                  }
                  className="w-full sm:w-auto font-bold text-xs shrink-0"
                >
                  {isRequestingWithdrawal ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Submitting...
                    </>
                  ) : (
                    <>
                      <ArrowDownToLine className="w-4 h-4 mr-1.5" /> Request Payout
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Withdrawal Requests History Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Withdrawal History ({withdrawals.length})
              </h4>

              {withdrawals.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                  No withdrawal requests recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/60 border-b border-border text-muted-foreground font-semibold">
                      <tr>
                        <th className="py-3 px-4">Requested Date</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Bank Destination</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Processed Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {withdrawals.map((w) => (
                        <tr key={w.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-medium text-foreground">
                            {new Date(w.createdAt).toLocaleDateString()} {new Date(w.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-4 font-black text-foreground">
                            {formatMoney(w.amount, w.currency)} <span className="text-[10px] text-muted-foreground font-normal font-mono">({w.currency})</span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {w.bankDetails?.bankName ? (
                              <span>
                                {w.bankDetails.bankName} &bull; ****{w.bankDetails.accountNumber?.slice(-4)}
                              </span>
                            ) : (
                              "Saved Bank Account"
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              w.status === "PENDING"
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                : w.status === "PROCESSING"
                                ? "bg-blue-500/15 text-blue-600 border border-blue-500/30"
                                : w.status === "COMPLETED" || w.status === "APPROVED"
                                ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                                : "bg-red-500/15 text-red-600 border border-red-500/30"
                            }`}>
                              {w.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {w.processedAt ? new Date(w.processedAt).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
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
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-3 my-2">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300">
                <Sparkles className="w-4 h-4 text-purple-600" /> Enterprise Plan Required
              </div>
              <p className="text-xs text-muted-foreground">
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
              <p className="text-xs text-muted-foreground">
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
