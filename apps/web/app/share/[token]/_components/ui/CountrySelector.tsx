"use client";

import { Globe } from "lucide-react";
import type { CountryPrice } from "../types";
import type { ShareTheme } from "../share-theme";

interface CountrySelectorProps {
  theme: ShareTheme;
  value: string;
  onChange: (countryCode: string) => void;
  countryPricing?: CountryPrice[];
  defaultCurrency?: string;
  /**
   * `"themed"` matches the meeting ticket-stub selector (adapts to light/dark
   * palette). `"dark"` matches the always-dark paywall-hero selector used by
   * video + playlist.
   */
  variant?: "themed" | "dark";
}

/** Billing-country dropdown for dynamic country pricing. */
export function CountrySelector({
  theme,
  value,
  onChange,
  countryPricing,
  defaultCurrency = "USD",
  variant = "themed",
}: CountrySelectorProps) {
  if (!countryPricing || countryPricing.length === 0) return null;

  if (variant === "dark") {
    return (
      <div className="w-full flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
        <span className="text-slate-400 font-semibold flex items-center gap-1.5 shrink-0 text-[11px] sm:text-xs">
          <Globe className="w-3.5 h-3.5 text-slate-400" /> Billing Country:
        </span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 rounded-lg px-2.5 py-1 focus:outline-hidden"
        >
          <option value="">Default ({defaultCurrency})</option>
          {countryPricing.map((cp) => (
            <option key={cp.countryCode} value={cp.countryCode}>
              {cp.countryName || cp.countryCode} ({cp.currency} {cp.amount})
            </option>
          ))}
        </select>
      </div>
    );
  }

  const { surfaceHex, surfaceBorderHex, surfaceTextHex, iconHex } = theme;
  const isLight = theme.isLight;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border"
      style={{ backgroundColor: surfaceHex, borderColor: surfaceBorderHex }}
    >
      <span className="text-xs font-semibold flex items-center gap-2" style={{ color: surfaceTextHex }}>
        <Globe className="w-3.5 h-3.5" style={{ color: iconHex }} /> Billing Country:
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-hidden"
        style={{
          backgroundColor: isLight ? "#f1f5f9" : "#1e293b",
          borderColor: surfaceBorderHex,
          color: surfaceTextHex,
        }}
      >
        <option value="">Default International ({defaultCurrency})</option>
        {countryPricing.map((cp) => (
          <option key={cp.countryCode} value={cp.countryCode}>
            {cp.countryName || cp.countryCode} ({cp.currency} {cp.amount})
          </option>
        ))}
      </select>
    </div>
  );
}
