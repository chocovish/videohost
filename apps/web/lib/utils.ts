export { cn } from "cn";

export const CURRENCY_SYMBOLS: Record<string, string> = {
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

export function getCurrencySymbol(currency: string = "USD"): string {
  const curr = (currency || "USD").toUpperCase();
  return CURRENCY_SYMBOLS[curr] || `${curr} `;
}

export function formatMoney(amount: number | null | undefined, currency: string = "USD"): string {
  const num = Number(amount);
  const validNum = isNaN(num) ? 0 : num;
  const sym = getCurrencySymbol(currency);
  if ((currency || "").toUpperCase() === "INR") {
    return `${sym}${validNum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${sym}${validNum.toFixed(2)}`;
}

export function formatCurrencyPrice(amount: number | null | undefined, currency: string = "USD"): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return "Free";
  const num = Number(amount);
  if (num === 0) return "Free";
  const curr = (currency || "USD").toUpperCase();
  const sym = CURRENCY_SYMBOLS[curr] || `${curr} `;
  return `${sym}${num.toFixed(2)}`;
}

/**
 * Resolves the application base URL without trailing slashes.
 * Supports both client-side (window.location.origin) and server-side execution.
 * Prioritizes NEXT_PUBLIC_APP_URL, APP_URL, and NEXTAUTH_URL environment variables.
 */
export function getBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }

  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL;

  if (envUrl) {
    const trimmed = envUrl.trim().replace(/\/+$/, "");
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return trimmed.startsWith("localhost") || trimmed.startsWith("127.0.0.1")
      ? `http://${trimmed}`
      : `https://${trimmed}`;
  }

  return process.env.NODE_ENV === "production" ? "https://taped.in" : "http://localhost:3000";
}


