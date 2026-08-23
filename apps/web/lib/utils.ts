import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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

