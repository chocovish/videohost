"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Send,
  Check,
  Copy,
  Film,
  Loader2,
  AlertCircle,
  Link as LinkIcon,
  Globe,
  Lock,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
  ListVideo,
  DollarSign,
  Plus,
  Tag,
  Sparkles,
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface CountryPriceItem {
  countryCode: string;
  countryName: string;
  amount: number;
  currency: string;
}

export const POPULAR_COUNTRIES = [
  { code: "US", name: "United States", defaultCurrency: "USD" },
  { code: "IN", name: "India", defaultCurrency: "INR" },
  { code: "GB", name: "United Kingdom", defaultCurrency: "GBP" },
  { code: "EU", name: "European Union", defaultCurrency: "EUR" },
  { code: "CA", name: "Canada", defaultCurrency: "CAD" },
  { code: "AU", name: "Australia", defaultCurrency: "AUD" },
  { code: "DE", name: "Germany", defaultCurrency: "EUR" },
  { code: "FR", name: "France", defaultCurrency: "EUR" },
  { code: "JP", name: "Japan", defaultCurrency: "JPY" },
  { code: "BR", name: "Brazil", defaultCurrency: "BRL" },
  { code: "SG", name: "Singapore", defaultCurrency: "SGD" },
  { code: "AE", name: "United Arab Emirates", defaultCurrency: "AED" },
];

export const SUPPORTED_CURRENCIES = [
  "USD",
  "INR",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "JPY",
  "SGD",
  "AED",
  "BRL",
];

interface SharedEmailItem {
  id: string;
  email: string;
  createdAt: string;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "video" | "playlist";
  targetId: string;
  targetName: string;
  onAccessModeChange?: (newMode: "PUBLIC" | "RESTRICTED" | "PRIVATE" | "PURCHASABLE") => void;
}

export default function ShareModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
  onAccessModeChange,
}: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState<string>("");
  const [accessMode, setAccessMode] = useState<"PUBLIC" | "RESTRICTED" | "PRIVATE" | "PURCHASABLE">("PUBLIC");
  const [allowedEmails, setAllowedEmails] = useState<SharedEmailItem[]>([]);

  // Pricing state
  const [price, setPrice] = useState<string>("");
  const [currency, setCurrency] = useState<string>("USD");
  const [countryPricing, setCountryPricing] = useState<CountryPriceItem[]>([]);

  // Add country pricing inline state
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("IN");
  const [countryAmount, setCountryAmount] = useState<string>("");
  const [countryCurrency, setCountryCurrency] = useState<string>("INR");
  const [showAddCountryForm, setShowAddCountryForm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [savingMode, setSavingMode] = useState(false);
  const [copied, setCopied] = useState(false);

  const [emailInput, setEmailInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [showNoteField, setShowNoteField] = useState(false);
  const [addingEmail, setAddingEmail] = useState(false);
  const [deletingEmailId, setDeletingEmailId] = useState<string | null>(null);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchShareDetails = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/share?targetType=${targetType}&targetId=${targetId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setShareUrl(data.shareUrl);
        setAccessMode(data.accessMode || "PUBLIC");
        setAllowedEmails(data.allowedEmails || []);
        if (data.price !== undefined && data.price !== null) {
          setPrice(String(data.price));
        } else {
          setPrice("");
        }
        setCurrency(data.currency || "USD");
        setCountryPricing(Array.isArray(data.countryPricing) ? data.countryPricing : []);
      } else {
        setErrorMsg(data.error || "Failed to load share settings");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load share settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && targetId) {
      setShareUrl("");
      setEmailInput("");
      setMessageInput("");
      setShowNoteField(false);
      setShowAddCountryForm(false);
      setSuccessMsg(null);
      setErrorMsg(null);
      setCopied(false);
      fetchShareDetails();
    }
  }, [isOpen, targetId, targetType]);

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleModeChange = async (
    newMode: "PUBLIC" | "RESTRICTED" | "PRIVATE" | "PURCHASABLE",
    priceOverride?: number | null,
    currencyOverride?: string,
    countryPricingOverride?: CountryPriceItem[]
  ) => {
    setSavingMode(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const numPrice = priceOverride !== undefined 
        ? priceOverride 
        : price ? parseFloat(price) : null;

      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_MODE",
          targetType,
          targetId,
          accessMode: newMode,
          price: numPrice,
          currency: currencyOverride || currency,
          countryPricing: countryPricingOverride !== undefined ? countryPricingOverride : countryPricing,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAccessMode(data.accessMode);
        setAllowedEmails(data.allowedEmails || []);
        if (data.price !== undefined && data.price !== null) {
          setPrice(String(data.price));
        }
        if (data.currency) setCurrency(data.currency);
        if (data.countryPricing) setCountryPricing(data.countryPricing);
        if (onAccessModeChange) onAccessModeChange(data.accessMode);
        setSuccessMsg(`Access settings updated`);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(data.error || "Failed to update access settings");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update access settings");
    } finally {
      setSavingMode(false);
    }
  };

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = price ? parseFloat(price) : 0;
    if (isNaN(numPrice) || numPrice < 0) {
      setErrorMsg("Please enter a valid price.");
      return;
    }
    await handleModeChange("PURCHASABLE", numPrice, currency, countryPricing);
  };

  const handleAddCountryPrice = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = countryAmount ? parseFloat(countryAmount) : 0;
    if (isNaN(numAmount) || numAmount < 0) {
      setErrorMsg("Please enter a valid country price amount.");
      return;
    }

    const matched = POPULAR_COUNTRIES.find((c) => c.code === selectedCountryCode);
    const countryName = matched ? matched.name : selectedCountryCode;

    const existingIdx = countryPricing.findIndex((cp) => cp.countryCode === selectedCountryCode);
    let updated: CountryPriceItem[];
    if (existingIdx >= 0) {
      updated = [...countryPricing];
      updated[existingIdx] = {
        countryCode: selectedCountryCode,
        countryName,
        amount: numAmount,
        currency: countryCurrency,
      };
    } else {
      updated = [
        ...countryPricing,
        {
          countryCode: selectedCountryCode,
          countryName,
          amount: numAmount,
          currency: countryCurrency,
        },
      ];
    }

    setCountryPricing(updated);
    setCountryAmount("");
    setShowAddCountryForm(false);
    // Auto-save pricing changes
    handleModeChange("PURCHASABLE", price ? parseFloat(price) : null, currency, updated);
  };

  const handleRemoveCountryPrice = (countryCode: string) => {
    const updated = countryPricing.filter((cp) => cp.countryCode !== countryCode);
    setCountryPricing(updated);
    handleModeChange("PURCHASABLE", price ? parseFloat(price) : null, currency, updated);
  };

  const handleAddAndInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setAddingEmail(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_EMAIL",
          targetType,
          targetId,
          email: cleanEmail,
          message: messageInput,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAccessMode(data.accessMode);
        setAllowedEmails(data.allowedEmails || []);
        setEmailInput("");
        setMessageInput("");
        setShowNoteField(false);
        if (onAccessModeChange) onAccessModeChange(data.accessMode);
        setSuccessMsg(`Invited ${cleanEmail}`);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(data.error || "Failed to add email");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to add email invitation");
    } finally {
      setAddingEmail(false);
    }
  };

  const handleRemoveEmail = async (emailId: string, emailStr: string) => {
    setDeletingEmailId(emailId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REMOVE_EMAIL",
          targetType,
          targetId,
          emailId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAllowedEmails(data.allowedEmails || []);
        setSuccessMsg(`Removed access for ${emailStr}`);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(data.error || "Failed to remove email");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to remove email");
    } finally {
      setDeletingEmailId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        {/* Header */}
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              {targetType === "video" ? (
                <Film className="w-5 h-5" />
              ) : (
                <ListVideo className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base font-bold text-foreground">
                Share {targetType === "video" ? "Video" : "Playlist"}
              </DialogTitle>
              <DialogDescription className="truncate mt-0.5 text-xs text-muted-foreground">
                {targetName || "Manage access, set purchasable pricing, and invite viewers"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-0.5 min-h-0">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="flex-1">{successMsg}</span>
            </div>
          )}

          {/* 1. Share Link Bar */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-primary" /> Public Share Link
            </Label>

            <div className="flex items-center gap-2">
              <Input
                type="text"
                readOnly
                value={loading ? "Loading link..." : shareUrl}
                className="font-mono text-xs select-all bg-muted/40 h-9"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                disabled={loading || !shareUrl}
                className="shrink-0 h-9 gap-1.5 px-3"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </Button>
            </div>
          </div>

          {/* 2. Access Settings Selector (4 modes: Public, Purchasable, Restricted, Private) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Share Mode</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  id: "PUBLIC",
                  title: "Public",
                  icon: Globe,
                  desc: "Anyone with link",
                },
                {
                  id: "PURCHASABLE",
                  title: "Purchasable",
                  icon: DollarSign,
                  desc: "Pay to watch",
                  highlight: true,
                },
                {
                  id: "RESTRICTED",
                  title: "Restricted",
                  icon: Lock,
                  desc: "Invited emails",
                },
                {
                  id: "PRIVATE",
                  title: "Private",
                  icon: ShieldAlert,
                  desc: "Workspace only",
                },
              ].map((option) => {
                const Icon = option.icon;
                const isSelected = accessMode === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={savingMode}
                    onClick={() => handleModeChange(option.id as any)}
                    className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30"
                        : "border-border bg-card hover:bg-accent text-card-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className={`p-1 rounded-md ${isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-foreground leading-tight flex items-center gap-1">
                        {option.title}
                        {option.id === "PURCHASABLE" && (
                          <Tag className="w-2.5 h-2.5 text-primary" />
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        {option.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. PURCHASABLE PRICING CONFIGURATION (Active when accessMode === "PURCHASABLE") */}
          {accessMode === "PURCHASABLE" && (
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">
                    Content Pricing
                  </h4>
                </div>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                  Paid Access
                </Badge>
              </div>

              {/* Base Price & Currency Form */}
              <form onSubmit={handleSavePricing} className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-foreground mb-1.5 block">
                    Base Default Price
                  </Label>
                  <div className="flex items-center gap-2">
                    {/* Unified Input Group with Left Inbuilt Currency Dropdown */}
                    <div className="relative flex-1 flex items-center rounded-xl border border-input bg-card shadow-xs focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary transition-all overflow-hidden">
                      <div className="w-24 shrink-0 border-r border-border bg-muted/40">
                        <Select value={currency} onValueChange={(val) => setCurrency(val || "USD")}>
                          <SelectTrigger className="h-9 text-xs font-bold bg-transparent border-0 rounded-none shadow-none focus-visible:ring-0 px-2.5">
                            <SelectValue placeholder="USD" />
                          </SelectTrigger>
                          <SelectContent align="start">
                            {SUPPORTED_CURRENCIES.map((curr) => (
                              <SelectItem key={curr} value={curr} className="text-xs font-medium">
                                {curr}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="text-xs font-semibold h-9 bg-transparent border-0 rounded-none shadow-none focus-visible:ring-0 px-3"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      size="sm"
                      disabled={savingMode || !price}
                      className="h-9 px-4 font-bold text-xs shrink-0 rounded-xl"
                    >
                      {savingMode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Visitors worldwide without country-specific overrides will see this price in their checkout.
                  </p>
                </div>
              </form>

              {/* Country Specific Pricing Section */}
              <div className="pt-3 border-t border-primary/15 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-primary" /> Country-Specific Pricing Overrides
                  </Label>
                  {!showAddCountryForm && (
                    <button
                      type="button"
                      onClick={() => setShowAddCountryForm(true)}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Country
                    </button>
                  )}
                </div>

                {/* Country Pricing Rules List */}
                {countryPricing.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {countryPricing.map((cp) => (
                      <div
                        key={cp.countryCode}
                        className="p-2.5 rounded-xl border border-border bg-card flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-[10px]">
                            {cp.countryCode}
                          </span>
                          <span className="font-medium text-foreground">{cp.countryName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-primary">
                            {cp.currency} {cp.amount.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCountryPrice(cp.countryCode)}
                            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            title="Remove country rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">
                    No country overrides configured. All countries will use the base price.
                  </p>
                )}

                {/* Add Country Form */}
                {showAddCountryForm && (
                  <form
                    onSubmit={handleAddCountryPrice}
                    className="p-3 rounded-xl border border-primary/30 bg-card space-y-2.5 animate-in fade-in"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Add Country Pricing</span>
                      <button
                        type="button"
                        onClick={() => setShowAddCountryForm(false)}
                        className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-5">
                        <Select
                          value={selectedCountryCode}
                          onValueChange={(code) => {
                            if (!code) return;
                            setSelectedCountryCode(code);
                            const found = POPULAR_COUNTRIES.find((c) => c.code === code);
                            if (found) setCountryCurrency(found.defaultCurrency);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs bg-background rounded-lg">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            {POPULAR_COUNTRIES.map((c) => (
                              <SelectItem key={c.code} value={c.code} className="text-xs">
                                {c.name} ({c.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Inbuilt Currency + Amount for Country Rule */}
                      <div className="sm:col-span-5 flex items-center rounded-lg border border-input bg-background shadow-xs focus-within:ring-1 focus-within:ring-primary focus-within:border-primary overflow-hidden h-8">
                        <div className="w-20 shrink-0 border-r border-border bg-muted/40">
                          <Select value={countryCurrency} onValueChange={(val) => setCountryCurrency(val || "USD")}>
                            <SelectTrigger className="h-8 text-xs font-bold bg-transparent border-0 rounded-none shadow-none focus-visible:ring-0 px-2">
                              <SelectValue placeholder="USD" />
                            </SelectTrigger>
                            <SelectContent align="start">
                              {SUPPORTED_CURRENCIES.map((curr) => (
                                <SelectItem key={curr} value={curr} className="text-xs">
                                  {curr}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            placeholder="0.00"
                            value={countryAmount}
                            onChange={(e) => setCountryAmount(e.target.value)}
                            className="text-xs font-semibold h-8 bg-transparent border-0 rounded-none shadow-none focus-visible:ring-0 px-2.5"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <Button type="submit" size="sm" className="w-full h-8 text-xs font-bold rounded-lg">
                          Save
                        </Button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* 4. Invite by Email Section (Active when accessMode === "RESTRICTED") */}
          {accessMode === "RESTRICTED" && (
            <div className="pt-2 border-t border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-primary" /> Invite People
                </Label>
                {allowedEmails.length > 0 && (
                  <Badge variant="secondary">
                    {allowedEmails.length} invited
                  </Badge>
                )}
              </div>

              <form onSubmit={handleAddAndInvite} className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      disabled={addingEmail}
                      placeholder="name@example.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={addingEmail || !emailInput.trim()}
                    className="shrink-0 gap-1.5"
                  >
                    {addingEmail ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Invite</span>
                  </Button>
                </div>

                {!showNoteField ? (
                  <button
                    type="button"
                    onClick={() => setShowNoteField(true)}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    + Add message to invitation
                  </button>
                ) : (
                  <div className="space-y-1 animate-in fade-in duration-150">
                    <textarea
                      rows={2}
                      disabled={addingEmail}
                      placeholder="Add an optional message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    />
                  </div>
                )}
              </form>
            </div>
          )}

          {/* 5. People with Access List (When allowedEmails > 0) */}
          {allowedEmails.length > 0 && accessMode === "RESTRICTED" && (
            <div className="pt-2 border-t border-border space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> People with access ({allowedEmails.length})
              </p>

              <div className="max-h-32 overflow-y-auto divide-y divide-border rounded-lg border border-border bg-card">
                {allowedEmails.map((item) => (
                  <div
                    key={item.id}
                    className="px-3 py-2 flex items-center justify-between text-xs hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-medium text-foreground truncate">{item.email}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Added {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={deletingEmailId === item.id}
                      onClick={() => handleRemoveEmail(item.id, item.email)}
                      title="Remove access"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      {deletingEmailId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-destructive" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pinned Footer */}
        <DialogFooter className="pt-3 border-t border-border shrink-0">
          <Button type="button" onClick={onClose} className="w-full sm:w-auto font-semibold">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

