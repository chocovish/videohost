"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ContentSalesPayoutSection,
  PurchasesStats,
  BankFormData,
  OrganizationItem,
} from "@/components/settings";

export default function SalesAndPayoutsPage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Active Organization Info
  const [activeOrg, setActiveOrg] = useState<OrganizationItem | null>(null);

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

  const fetchOrgData = async () => {
    try {
      const res = await fetch("/api/organization");
      if (res.ok) {
        const data = await res.json();
        if (data.organization) {
          setActiveOrg(data.organization);
        }
      }
    } catch (err) {
      console.error("Failed to load organization info:", err);
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
    fetchOrgData();
    fetchMonetizationData();
  }, []);

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

      {/* CONTENT SALES & PAYOUT CENTER */}
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
        activeOrg={activeOrg || undefined}
      />
    </div>
  );
}
