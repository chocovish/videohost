import type { PriceInfo, SharedData } from "./types";

/**
 * Shared, dependency-free helpers for the share page.
 * Each function is moved verbatim from `shared-content-client.tsx`
 * so behaviour stays identical — only the location changed.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  CAD: "CA$",
  AUD: "AU$",
  JPY: "¥",
  SGD: "SG$",
  AED: "AED ",
  BRL: "R$",
};

/** Resolve the effective price for a billing country (country override wins). */
export function getCalculatedPrice(
  dataObj: SharedData | null,
  targetCountryCode: string
): PriceInfo {
  if (!dataObj) return { amount: 0, currency: "USD", formatted: "Free", isFree: true };
  let finalAmount =
    dataObj.price !== null && dataObj.price !== undefined ? Number(dataObj.price) : 0;
  let finalCurrency = dataObj.currency || "USD";

  if (dataObj.countryPricing && Array.isArray(dataObj.countryPricing)) {
    const matched = dataObj.countryPricing.find(
      (cp) => cp.countryCode?.toUpperCase() === targetCountryCode?.toUpperCase()
    );
    if (matched && matched.amount !== undefined) {
      finalAmount = Number(matched.amount);
      if (matched.currency) finalCurrency = matched.currency;
    }
  }

  const isFree = finalAmount <= 0;
  const sym = CURRENCY_SYMBOLS[finalCurrency] || `${finalCurrency} `;
  return {
    amount: finalAmount,
    currency: finalCurrency,
    isFree,
    formatted: isFree ? "Free" : `${sym}${finalAmount.toFixed(2)}`,
  };
}

/** Human-readable meeting schedule; falls back gracefully on bad input. */
export function formatMeetingTime(dateStr?: string | null): string {
  if (!dateStr) return "Flexible / Scheduled Conference";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return dateStr;
  }
}

/** Lazily inject the Razorpay checkout SDK (singleton). */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/** Lazily inject the Cashfree checkout SDK (singleton). */
export function loadCashfreeScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as unknown as { Cashfree?: unknown }).Cashfree) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Best-effort visitor country detection (server hint wins, then timezone,
 * then browser locale). Extracted so checkout + playlist + video share it.
 */
export function detectBuyerCountry(
  detectedCountryCode: string | undefined,
  fallback: string
): string {
  if (detectedCountryCode) return detectedCountryCode.toUpperCase();
  try {
    if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz.includes("Calcutta") || tz.includes("Kolkata") || tz.startsWith("Asia/Kolkata")) {
        return "IN";
      }
      if (
        tz.startsWith("America/New_York") ||
        tz.startsWith("America/Chicago") ||
        tz.startsWith("America/Los_Angeles") ||
        tz.startsWith("America/Denver") ||
        tz.startsWith("US/")
      ) {
        return "US";
      }
      if (tz.startsWith("Europe/London")) return "GB";
      if (tz.startsWith("Europe/Paris")) return "FR";
      if (tz.startsWith("Europe/Berlin")) return "DE";
      if (tz.startsWith("Asia/Tokyo")) return "JP";
      if (tz.startsWith("Australia/")) return "AU";
      if (tz.startsWith("America/Toronto") || tz.startsWith("Canada/")) return "CA";
      if (tz.startsWith("Asia/Singapore")) return "SG";
      if (tz.startsWith("Asia/Dubai")) return "AE";
      if (tz.startsWith("America/Sao_Paulo")) return "BR";
    }
    if (typeof navigator !== "undefined") {
      const lang =
        navigator.language || (navigator.languages && navigator.languages[0]) || "";
      const parts = lang.split("-");
      if (parts.length > 1 && parts[1].length === 2) {
        return parts[1].toUpperCase();
      }
    }
  } catch {
    // ignore — fall through to the previous value
  }
  return fallback;
}

/** Map the `cardRoundness` config value to a Tailwind class. */
export function getRoundnessClass(cardRoundness?: string): string {
  if (cardRoundness === "xl") return "rounded-xl";
  if (cardRoundness === "pill") return "rounded-[1.75rem]";
  if (cardRoundness === "square") return "rounded-lg";
  return "rounded-2xl";
}

/** Merge DB config with live-preview overrides (preview always wins). */
export function mergeShareConfig<T extends object>(
  dataConfig: T | null | undefined,
  overrideConfig: Partial<T> | undefined,
  defaults: T
): T {
  return {
    ...defaults,
    ...dataConfig,
    ...overrideConfig,
  };
}
