"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Film,
  Calendar,
  ListVideo,
  AlertCircle,
  Check,
  Loader2,
  Sparkles,
  Save,
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
import {
  ShareAccessMode,
  ShareTargetType,
  CountryPriceItem,
  SharedEmailItem,
  POPULAR_COUNTRIES,
  SUPPORTED_CURRENCIES,
  ShareAccessModeSelector,
} from "@/components/share";

// Re-export for backwards compatibility across existing imports
export { POPULAR_COUNTRIES, SUPPORTED_CURRENCIES };
export type { CountryPriceItem, SharedEmailItem, ShareAccessMode, ShareTargetType };

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ShareTargetType;
  targetId: string;
  targetName?: string;
  onAccessModeChange?: (newMode: ShareAccessMode) => void;
}

interface DraftEmailItem extends SharedEmailItem {
  message?: string;
  isNew?: boolean;
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

  // Initial fetched server state
  const [serverState, setServerState] = useState<{
    accessMode: ShareAccessMode;
    price: string;
    currency: string;
    countryPricing: CountryPriceItem[];
    allowedEmails: SharedEmailItem[];
  } | null>(null);

  // Local draft state (Pending user save)
  const [draftAccessMode, setDraftAccessMode] = useState<ShareAccessMode>("PUBLIC");
  const [draftPrice, setDraftPrice] = useState<string>("");
  const [draftCurrency, setDraftCurrency] = useState<string>("USD");
  const [draftCountryPricing, setDraftCountryPricing] = useState<CountryPriceItem[]>([]);
  const [draftAllowedEmails, setDraftAllowedEmails] = useState<DraftEmailItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
        const resolvedMode: ShareAccessMode = data.accessMode || "PUBLIC";
        const resolvedPrice = data.price !== undefined && data.price !== null ? String(data.price) : "";
        const resolvedCurrency = data.currency || "USD";
        const resolvedCountryPricing = Array.isArray(data.countryPricing) ? data.countryPricing : [];
        const resolvedAllowedEmails = Array.isArray(data.allowedEmails) ? data.allowedEmails : [];

        setServerState({
          accessMode: resolvedMode,
          price: resolvedPrice,
          currency: resolvedCurrency,
          countryPricing: resolvedCountryPricing,
          allowedEmails: resolvedAllowedEmails,
        });

        // Initialize local draft state
        setDraftAccessMode(resolvedMode);
        setDraftPrice(resolvedPrice);
        setDraftCurrency(resolvedCurrency);
        setDraftCountryPricing(resolvedCountryPricing);
        setDraftAllowedEmails(resolvedAllowedEmails);
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
      setServerState(null);
      setSuccessMsg(null);
      setErrorMsg(null);
      fetchShareDetails();
    }
  }, [isOpen, targetId, targetType]);

  // Compute if user has made any unsaved draft modifications
  const hasChanges = useMemo(() => {
    if (!serverState) return false;

    if (draftAccessMode !== serverState.accessMode) return true;
    if (draftCurrency !== serverState.currency) return true;

    // Price comparison for Purchasable mode
    if (draftAccessMode === "PURCHASABLE") {
      const draftPriceNum = draftPrice !== "" && draftPrice !== null && !isNaN(Number(draftPrice)) ? parseFloat(draftPrice) : null;
      const serverPriceNum = serverState.price !== "" && serverState.price !== null && !isNaN(Number(serverState.price)) ? parseFloat(serverState.price) : null;
      if (draftPriceNum !== serverPriceNum) return true;

      // Country pricing comparison
      if (JSON.stringify(draftCountryPricing) !== JSON.stringify(serverState.countryPricing)) {
        return true;
      }
    }

    // Allowed emails comparison for Restricted mode
    if (draftAccessMode === "RESTRICTED") {
      const draftEmails = draftAllowedEmails.map((e) => e.email.toLowerCase()).sort();
      const serverEmails = serverState.allowedEmails.map((e) => e.email.toLowerCase()).sort();
      if (draftEmails.length !== serverEmails.length) return true;
      for (let i = 0; i < draftEmails.length; i++) {
        if (draftEmails[i] !== serverEmails[i]) return true;
      }
    }

    return false;
  }, [serverState, draftAccessMode, draftPrice, draftCurrency, draftCountryPricing, draftAllowedEmails]);

  // Add email locally to draft list
  const handleAddDraftEmail = (email: string, message?: string) => {
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (draftAllowedEmails.some((e) => e.email.toLowerCase() === clean)) {
      setErrorMsg(`${clean} is already in the invited list.`);
      return;
    }

    setErrorMsg(null);
    setDraftAllowedEmails((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        email: clean,
        message,
        isNew: true,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  // Remove email locally from draft list
  const handleRemoveDraftEmail = (idOrEmail: string, emailStr?: string) => {
    setErrorMsg(null);
    setDraftAllowedEmails((prev) =>
      prev.filter(
        (e) => e.id !== idOrEmail && e.email !== idOrEmail && e.email !== emailStr
      )
    );
  };

  // Save all changes in one comprehensive update to DB
  const handleSaveAll = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const isPurchasable = draftAccessMode === "PURCHASABLE";
    if (isPurchasable) {
      const numPrice = draftPrice ? parseFloat(draftPrice) : 0;
      if (isNaN(numPrice) || numPrice < 0) {
        setErrorMsg("Please enter a valid price greater than or equal to 0.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        action: "SAVE_ALL",
        targetType,
        targetId,
        accessMode: draftAccessMode,
        price: isPurchasable && draftPrice !== "" && draftPrice !== null && !isNaN(Number(draftPrice)) ? parseFloat(draftPrice) : null,
        currency: isPurchasable ? draftCurrency : "USD",
        countryPricing: isPurchasable ? draftCountryPricing : [],
        emails: draftAllowedEmails.map((e) => ({
          email: e.email,
          message: e.message,
        })),
      };

      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const updatedMode: ShareAccessMode = data.accessMode || draftAccessMode;
        const updatedPrice = data.price !== undefined && data.price !== null ? String(data.price) : "";
        const updatedCurrency = data.currency || draftCurrency;
        const updatedCountryPricing = Array.isArray(data.countryPricing) ? data.countryPricing : [];
        const updatedAllowedEmails = Array.isArray(data.allowedEmails) ? data.allowedEmails : [];

        setServerState({
          accessMode: updatedMode,
          price: updatedPrice,
          currency: updatedCurrency,
          countryPricing: updatedCountryPricing,
          allowedEmails: updatedAllowedEmails,
        });

        setDraftAccessMode(updatedMode);
        setDraftPrice(updatedPrice);
        setDraftCurrency(updatedCurrency);
        setDraftCountryPricing(updatedCountryPricing);
        setDraftAllowedEmails(updatedAllowedEmails);

        if (onAccessModeChange) onAccessModeChange(updatedMode);

        setSuccessMsg("Share settings saved successfully");
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(data.error || "Failed to save share settings");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save share settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        {/* Header */}
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              {targetType === "video" ? (
                <Film className="w-5 h-5" />
              ) : targetType === "meeting" ? (
                <Calendar className="w-5 h-5" />
              ) : (
                <ListVideo className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base font-bold text-foreground">
                Share {targetType === "video" ? "Video" : targetType === "meeting" ? "Meeting" : "Playlist"}
              </DialogTitle>
              <DialogDescription className="truncate mt-0.5 text-xs text-muted-foreground">
                {targetName ||
                  (targetType === "meeting"
                    ? "Manage entry pass pricing, invitations, and share meeting link"
                    : "Manage access, set purchasable pricing, and invite viewers")}
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

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Loading share settings...</p>
            </div>
          ) : (
            <ShareAccessModeSelector
              targetType={targetType}
              modeContext="share"
              accessMode={draftAccessMode}
              onChangeAccessMode={setDraftAccessMode}
              price={draftPrice}
              onChangePrice={setDraftPrice}
              currency={draftCurrency}
              onChangeCurrency={setDraftCurrency}
              countryPricing={draftCountryPricing}
              onChangeCountryPricing={setDraftCountryPricing}
              allowedEmails={draftAllowedEmails}
              onAddEmail={handleAddDraftEmail}
              onRemoveEmail={handleRemoveDraftEmail}
              shareUrl={shareUrl}
              isSaving={saving}
              hideHeader={true}
            />
          )}
        </div>

        {/* Pinned Footer with Save Button */}
        <DialogFooter className="pt-3 border-t border-border shrink-0 flex items-center justify-between sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Unsaved changes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="font-medium"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveAll}
              disabled={loading || saving || !hasChanges}
              className="font-semibold min-w-[120px] gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
