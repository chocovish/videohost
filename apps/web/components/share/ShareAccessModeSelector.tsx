"use client";

import React, { useMemo, useState } from "react";
import {
  Globe,
  DollarSign,
  Lock,
  ShieldAlert,
  Tag,
  Plus,
  Trash2,
  Mail,
  Loader2,
  Users,
  Check,
  Copy,
  Link as LinkIcon,
  X,
  Sparkles,
  Search,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShareAccessMode,
  ShareTargetType,
  CountryPriceItem,
  SharedEmailItem,
  POPULAR_COUNTRIES,
  SUPPORTED_CURRENCIES,
  getAccessModeDetails,
} from "./types";

export interface ShareAccessModeSelectorProps {
  targetType?: ShareTargetType;
  modeContext?: "create" | "edit" | "share";
  accessMode: ShareAccessMode;
  onChangeAccessMode: (mode: ShareAccessMode) => void;
  // Pricing props
  price?: string | number;
  onChangePrice?: (price: string) => void;
  currency?: string;
  onChangeCurrency?: (currency: string) => void;
  countryPricing?: CountryPriceItem[];
  onChangeCountryPricing?: (pricing: CountryPriceItem[]) => void;
  onSavePricing?: () => Promise<void> | void;
  // Email invite props (Create / Local state)
  inviteEmails?: string[];
  onChangeInviteEmails?: (emails: string[]) => void;
  // Email invite props (Share / Live server sync)
  allowedEmails?: SharedEmailItem[];
  onAddEmail?: (email: string, message?: string) => Promise<void> | void;
  onRemoveEmail?: (idOrEmail: string, emailStr?: string) => Promise<void> | void;
  // Share link props
  shareUrl?: string;
  hideShareLink?: boolean;
  // UI states
  isSaving?: boolean;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
  hideHeader?: boolean;
  customTitle?: string;
  customDescription?: string;
}

export function ShareAccessModeSelector({
  targetType = "video",
  modeContext = "create",
  accessMode,
  onChangeAccessMode,
  price = "",
  onChangePrice,
  currency = "USD",
  onChangeCurrency,
  countryPricing = [],
  onChangeCountryPricing,
  onSavePricing,
  inviteEmails = [],
  onChangeInviteEmails,
  allowedEmails = [],
  onAddEmail,
  onRemoveEmail,
  shareUrl,
  hideShareLink = false,
  isSaving = false,
  disabled = false,
  className = "",
  compact = false,
  hideHeader = false,
  customTitle,
  customDescription,
}: ShareAccessModeSelectorProps) {
  // Share link copy state
  const [copied, setCopied] = useState(false);

  // Add country pricing state
  const [showAddCountryForm, setShowAddCountryForm] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState("IN");
  const [countryAmount, setCountryAmount] = useState("");
  const [countryCurrency, setCountryCurrency] = useState("INR");
  const [countryError, setCountryError] = useState<string | null>(null);

  // Email input state
  const [emailInput, setEmailInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [showNoteField, setShowNoteField] = useState(false);
  const [addingEmail, setAddingEmail] = useState(false);
  const [deletingEmailId, setDeletingEmailId] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSearch, setEmailSearch] = useState("");

  const isInteractiveDisabled = disabled || isSaving;

  const emailQuery = emailSearch.trim().toLowerCase();
  const filteredAllowedEmails = useMemo(() => {
    if (!emailQuery) return allowedEmails;
    return allowedEmails.filter((item) => item.email.toLowerCase().includes(emailQuery));
  }, [allowedEmails, emailQuery]);
  const filteredInviteEmails = useMemo(() => {
    if (!emailQuery) return inviteEmails;
    return inviteEmails.filter((email) => email.toLowerCase().includes(emailQuery));
  }, [inviteEmails, emailQuery]);

  // Copy share URL
  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Add country price override
  const handleAddCountryPrice = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = countryAmount ? parseFloat(countryAmount) : 0;
    if (isNaN(numAmount) || numAmount < 0) {
      setCountryError("Please enter a valid country price greater than or equal to 0.");
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

    onChangeCountryPricing?.(updated);
    setCountryAmount("");
    setShowAddCountryForm(false);
    setCountryError(null);
  };

  // Remove country price override
  const handleRemoveCountryPrice = (countryCode: string) => {
    const updated = countryPricing.filter((cp) => cp.countryCode !== countryCode);
    onChangeCountryPricing?.(updated);
  };

  // Handle adding email in create / local tag mode
  const handleAddLocalEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    if (inviteEmails.includes(trimmed)) {
      setEmailInput("");
      setEmailError(null);
      return;
    }
    onChangeInviteEmails?.([...inviteEmails, trimmed]);
    setEmailInput("");
    setEmailError(null);
  };

  const handleRemoveLocalEmail = (emailToRemove: string) => {
    onChangeInviteEmails?.(inviteEmails.filter((e) => e !== emailToRemove));
  };

  // Handle adding email in live server mode
  const handleAddLiveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    if (!onAddEmail) {
      handleAddLocalEmail();
      return;
    }

    setAddingEmail(true);
    setEmailError(null);
    try {
      await onAddEmail(cleanEmail, messageInput || undefined);
      setEmailInput("");
      setMessageInput("");
      setShowNoteField(false);
    } catch (err: any) {
      setEmailError(err?.message || "Failed to send invitation.");
    } finally {
      setAddingEmail(false);
    }
  };

  // Handle removing email in live server mode
  const handleRemoveLiveEmail = async (id: string, emailStr: string) => {
    if (!onRemoveEmail) return;
    setDeletingEmailId(id);
    try {
      await onRemoveEmail(id, emailStr);
    } catch (err: any) {
      setEmailError(err?.message || "Failed to remove email.");
    } finally {
      setDeletingEmailId(null);
    }
  };

  const modes: { id: ShareAccessMode; icon: any }[] = [
    { id: "PUBLIC", icon: Globe },
    { id: "PURCHASABLE", icon: DollarSign },
    { id: "RESTRICTED", icon: Lock },
    { id: "PRIVATE", icon: ShieldAlert },
  ];

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Optional Share Link Bar (For Share Modal / Details) */}
      {!hideShareLink && shareUrl && (
        <div className="space-y-1.5 pb-1">
          <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5 text-primary" /> Public Share Link
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              readOnly
              value={shareUrl}
              className="font-mono text-xs select-all bg-muted/40 h-9"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              disabled={isInteractiveDisabled}
              className="shrink-0 h-9 gap-1.5 px-3"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copied ? "Copied" : "Copy"}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            {customTitle || "Share & Access Mode"}
          </Label>
          <span className="text-xs text-muted-foreground">
            {customDescription ||
              (targetType === "meeting"
                ? "Controls who can enter the meeting"
                : "Controls who can view or purchase this content")}
          </span>
        </div>
      )}

      {/* Access Mode Cards Grid */}
      <div className={`grid ${compact ? "grid-cols-2 gap-2" : "grid-cols-2 sm:grid-cols-4 gap-2.5"}`}>
        {modes.map(({ id, icon: Icon }) => {
          const meta = getAccessModeDetails(id, targetType);
          const isSelected = accessMode === id;
          return (
            <button
              key={id}
              type="button"
              disabled={isInteractiveDisabled}
              onClick={() => onChangeAccessMode(id)}
              className={`p-2.5 sm:p-3 rounded-xl text-left border transition-all flex flex-col justify-between gap-1.5 cursor-pointer select-none ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30"
                  : "border-border bg-card hover:bg-accent/70 text-card-foreground hover:border-border/80"
              } ${isInteractiveDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className={`p-1.5 rounded-lg ${
                    isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                {isSelected && <span className="w-2 h-2 rounded-full bg-primary" />}
              </div>

              <div>
                <p className="font-bold text-xs text-foreground leading-tight flex items-center gap-1">
                  {meta.title}
                  {id === "PURCHASABLE" && <Tag className="w-2.5 h-2.5 text-primary" />}
                </p>
                <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                  {meta.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* PURCHASABLE PRICING CONFIGURATION (Active when accessMode === "PURCHASABLE") */}
      {accessMode === "PURCHASABLE" && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">
                {targetType === "meeting" ? "Entry Pass Pricing" : "Content Pricing"}
              </h4>
            </div>
            <Badge variant="lime">
              Paid Access
            </Badge>
          </div>

          {/* Base Price & Currency Form */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground block">
              {targetType === "meeting" ? "Base Entry Pass Price" : "Base Default Price"}
            </Label>
            <div className="flex items-center gap-2">
              {/* Unified Input Group with Inbuilt Currency Dropdown */}
              <div className="relative flex-1 flex items-center rounded-xl border border-input bg-card shadow-xs focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary transition-all overflow-hidden">
                <div className="w-24 shrink-0 border-r border-border bg-muted/40">
                  <Select
                    value={currency || "USD"}
                    onValueChange={(val) => onChangeCurrency?.(val || "USD")}
                    disabled={isInteractiveDisabled}
                  >
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
                    placeholder="19.99"
                    value={price !== undefined ? String(price) : ""}
                    onChange={(e) => onChangePrice?.(e.target.value)}
                    disabled={isInteractiveDisabled}
                    className="text-xs font-semibold h-9 bg-transparent border-0 rounded-none shadow-none focus-visible:ring-0 px-3"
                  />
                </div>
              </div>

              {onSavePricing && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onSavePricing()}
                  disabled={isInteractiveDisabled || price === "" || price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0}
                  className="h-9 px-4 font-bold text-xs shrink-0 rounded-xl"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Visitors worldwide without country-specific overrides will see this price in their checkout.
            </p>
          </div>

          {/* Country Specific Pricing Section */}
          <div className="pt-3 border-t border-primary/15 space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-primary" /> Country-Specific Pricing Overrides
              </Label>
              {!showAddCountryForm && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setShowAddCountryForm(true)}
                  disabled={isInteractiveDisabled}
                  className="h-auto p-0 text-xs font-bold gap-1 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Country
                </Button>
              )}
            </div>

            {countryError && (
              <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-lg">{countryError}</p>
            )}

            {/* Country Pricing Rules List */}
            {countryPricing.length > 0 ? (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {countryPricing.map((cp) => (
                  <div
                    key={cp.countryCode}
                    className="p-2.5 rounded-xl border border-border bg-card flex items-center justify-between text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-xs">
                        {cp.countryCode}
                      </span>
                      <span className="font-medium text-foreground">{cp.countryName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-primary">
                        {cp.currency} {Number(cp.amount).toFixed(2)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleRemoveCountryPrice(cp.countryCode)}
                        disabled={isInteractiveDisabled}
                        title="Remove country rule"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No country overrides configured. All countries will use the base price.
              </p>
            )}

            {/* Add Country Form */}
            {showAddCountryForm && (
              <form
                onSubmit={handleAddCountryPrice}
                className="p-3 rounded-xl border border-primary/30 bg-card space-y-2.5 animate-in fade-in duration-150 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Add Country Pricing</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      setShowAddCountryForm(false);
                      setCountryError(null);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </Button>
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
                      disabled={isInteractiveDisabled}
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
                  <div className="sm:col-span-5 flex items-center rounded-lg border border-input bg-background shadow-2xs focus-within:ring-1 focus-within:ring-primary focus-within:border-primary overflow-hidden h-8">
                    <div className="w-20 shrink-0 border-r border-border bg-muted/40">
                      <Select
                        value={countryCurrency}
                        onValueChange={(val) => setCountryCurrency(val || "USD")}
                        disabled={isInteractiveDisabled}
                      >
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
                        disabled={isInteractiveDisabled}
                        className="text-xs font-semibold h-8 bg-transparent border-0 rounded-none shadow-none focus-visible:ring-0 px-2.5"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isInteractiveDisabled || !countryAmount}
                      className="w-full h-8 text-xs font-bold rounded-lg"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* RESTRICTED INVITE SECTION (Active when accessMode === "RESTRICTED") */}
      {accessMode === "RESTRICTED" && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-accent/30 border border-border space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                {targetType === "meeting" ? "Invite Restricted Attendees" : "Invite Restricted Viewers"}
              </Label>
            </div>
            {(inviteEmails.length > 0 || allowedEmails.length > 0) && (
              <Badge variant="secondary">
                {onAddEmail ? `${allowedEmails.length} invited` : `${inviteEmails.length} added`}
              </Badge>
            )}
          </div>

          {emailError && (
            <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-lg">{emailError}</p>
          )}

          {/* Form: Either Live Server Invite or Local Tag Chips */}
          {onAddEmail ? (
            // Live Server Invite Form (for Share modal / active items)
            <form onSubmit={handleAddLiveEmail} className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    disabled={isInteractiveDisabled || addingEmail}
                    placeholder="name@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="pl-8 text-xs bg-background h-9"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isInteractiveDisabled || addingEmail || !emailInput.trim()}
                  className="shrink-0 gap-1.5 h-9 font-semibold text-xs cursor-pointer"
                >
                  {addingEmail ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Add</span>
                </Button>
              </div>

              {!showNoteField ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setShowNoteField(true)}
                  className="h-auto p-0 text-muted-foreground hover:text-foreground"
                >
                  + Add message to invitation
                </Button>
              ) : (
                <div className="space-y-1 animate-in fade-in duration-150">
                  <Textarea
                    rows={2}
                    disabled={isInteractiveDisabled || addingEmail}
                    placeholder="Add an optional note to the invite email..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="text-xs min-h-0 rounded-md bg-background border-input py-1.5 px-3"
                  />
                </div>
              )}
            </form>
          ) : (
            // Local Tag Chips Form (for Create / Edit forms before submission)
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    disabled={isInteractiveDisabled}
                    placeholder="colleague@company.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        handleAddLocalEmail();
                      }
                    }}
                    className="pl-8 text-xs bg-background h-9"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLocalEmail}
                  disabled={isInteractiveDisabled || !emailInput.trim()}
                  className="shrink-0 cursor-pointer bg-background h-9 gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </Button>
              </div>

              {inviteEmails.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {inviteEmails.length > 4 && (
                    <div className="relative">
                      <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        value={emailSearch}
                        onChange={(e) => setEmailSearch(e.target.value)}
                        placeholder="Search emails..."
                        className="h-7 pl-7 pr-7 text-xs bg-background"
                      />
                      {emailSearch && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setEmailSearch("")}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label="Clear search"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto">
                    {filteredInviteEmails.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-0.5 py-1">No matching emails</p>
                    ) : (
                      filteredInviteEmails.map((email) => (
                        <Badge
                          key={email}
                          variant="secondary"
                          className="gap-1 py-0 px-1.5 h-6 font-normal bg-background border border-border"
                        >
                          <span className="max-w-[180px] truncate">{email}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleRemoveLocalEmail(email)}
                            className="size-4 p-0 text-muted-foreground hover:text-destructive"
                            aria-label={`Remove ${email}`}
                          >
                            <X className="w-2.5 h-2.5" />
                          </Button>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* People with Access List (Server Sync) */}
          {allowedEmails.length > 0 && onAddEmail && (
            <div className="pt-2 border-t border-border space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Access ({emailQuery ? `${filteredAllowedEmails.length}/${allowedEmails.length}` : allowedEmails.length})
                </p>
              </div>

              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={emailSearch}
                  onChange={(e) => setEmailSearch(e.target.value)}
                  placeholder="Search emails..."
                  className="h-7 pl-7 pr-7 text-xs bg-background"
                />
                {emailSearch && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setEmailSearch("")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>

              <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-card p-1.5">
                {filteredAllowedEmails.length === 0 ? (
                  <p className="px-1 py-1 text-xs text-muted-foreground">No matching emails</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {filteredAllowedEmails.map((item) => (
                      <span
                        key={item.id}
                        className="inline-flex items-center gap-0.5 max-w-full h-6 pl-1.5 pr-0.5 rounded-md border border-border bg-muted/40 text-xs hover:bg-muted/70 transition-colors"
                        title={item.email}
                      >
                        <span className="truncate font-medium text-foreground max-w-[11rem]">
                          {item.email}
                        </span>
                        {item.isNew && (
                          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-primary">
                            new
                          </span>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          disabled={isInteractiveDisabled || deletingEmailId === item.id}
                          onClick={() => handleRemoveLiveEmail(item.id, item.email)}
                          title="Remove access"
                          aria-label={`Remove ${item.email}`}
                          className="shrink-0 size-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 p-0"
                        >
                          {deletingEmailId === item.id ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-destructive" />
                          ) : (
                            <X className="w-2.5 h-2.5" />
                          )}
                        </Button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
