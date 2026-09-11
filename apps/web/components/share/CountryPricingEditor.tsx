"use client";

import React, { useState } from "react";
import { Globe, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountryPriceItem, POPULAR_COUNTRIES } from "./types";
import { GLOBAL_CURRENCY_OPTIONS, cn } from "@/lib/utils";

export interface CountryPricingEditorProps {
  countryPricing?: CountryPriceItem[];
  onChangeCountryPricing?: (pricing: CountryPriceItem[]) => void;
  disabled?: boolean;
  className?: string;
  defaultCurrency?: string;
}

export function CountryPricingEditor({
  countryPricing = [],
  onChangeCountryPricing,
  disabled = false,
  className,
  defaultCurrency = "USD",
}: CountryPricingEditorProps) {
  const [showAddCountryForm, setShowAddCountryForm] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState("US");
  const [countryAmount, setCountryAmount] = useState("");
  const [countryCurrency, setCountryCurrency] = useState(defaultCurrency || "USD");
  const [countryError, setCountryError] = useState<string | null>(null);

  const handleAddCountryPrice = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = countryAmount ? parseFloat(countryAmount) : 0;
    if (isNaN(numAmount) || numAmount < 0) {
      setCountryError("Please enter a valid country price greater than or equal to 0.");
      return;
    }

    const matched = POPULAR_COUNTRIES.find((c) => c.code === selectedCountryCode);
    const countryName = matched ? matched.name : selectedCountryCode;

    const existingIdx = countryPricing.findIndex(
      (cp) => cp.countryCode === selectedCountryCode
    );
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

  const handleRemoveCountryPrice = (countryCode: string) => {
    const updated = countryPricing.filter((cp) => cp.countryCode !== countryCode);
    onChangeCountryPricing?.(updated);
  };

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-primary" /> Country-Specific Pricing Overrides
        </Label>
        {!showAddCountryForm && (
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => {
              setShowAddCountryForm(true);
              const found = POPULAR_COUNTRIES.find((c) => c.code === selectedCountryCode);
              if (found) setCountryCurrency(found.defaultCurrency || defaultCurrency || "USD");
            }}
            disabled={disabled}
            className="h-auto p-0 text-xs font-bold gap-1 disabled:opacity-50 cursor-pointer"
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
                  disabled={disabled}
                  title="Remove country rule"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 cursor-pointer"
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
              className="text-muted-foreground hover:text-foreground cursor-pointer"
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
                  if (found) setCountryCurrency(found.defaultCurrency || defaultCurrency || "USD");
                }}
                disabled={disabled}
              >
                <SelectTrigger className="h-8 text-xs bg-background rounded-lg">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {POPULAR_COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code} className="text-xs">
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Inbuilt Currency + Amount for Country Rule */}
            <div className="sm:col-span-5 flex items-stretch rounded-lg border border-input bg-background shadow-2xs focus-within:ring-1 focus-within:ring-primary focus-within:border-primary overflow-hidden h-8">
              <div className="w-20 shrink-0 self-stretch border-r border-border bg-muted/40 flex items-center">
                <Select
                  value={countryCurrency}
                  onValueChange={(val) => setCountryCurrency(val || defaultCurrency || "USD")}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-full h-full gap-1 rounded-none border-0 bg-transparent px-2 text-xs font-bold shadow-none outline-none focus-visible:border-transparent focus-visible:ring-0 data-[size=default]:h-full dark:bg-transparent dark:hover:bg-transparent">
                    <SelectValue placeholder="USD" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectGroup>
                      {GLOBAL_CURRENCY_OPTIONS.map((c) => (
                        <SelectItem key={c.code} value={c.code} className="text-xs">
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
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
                  disabled={disabled}
                  className="text-xs font-semibold h-8 bg-transparent border-0 rounded-none shadow-none focus-visible:ring-0 px-2.5"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <Button
                type="submit"
                size="sm"
                disabled={disabled || !countryAmount}
                className="w-full h-8 text-xs font-bold rounded-lg cursor-pointer"
              >
                Save
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

