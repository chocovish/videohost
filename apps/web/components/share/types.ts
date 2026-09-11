export type ShareAccessMode = "PUBLIC" | "RESTRICTED" | "PRIVATE" | "PURCHASABLE";

export type ShareTargetType = "video" | "playlist" | "meeting";

export interface CountryPriceItem {
  countryCode: string;
  countryName: string;
  amount: number;
  currency: string;
}

export interface SharedEmailItem {
  id: string;
  email: string;
  createdAt: string;
  isNew?: boolean;
}

import { ALLOWED_CURRENCIES, AllowedCurrency } from "@/lib/utils";

export const POPULAR_COUNTRIES = [
  { code: "US", name: "United States", defaultCurrency: "USD" },
  { code: "IN", name: "India", defaultCurrency: "INR" },
  { code: "GB", name: "United Kingdom", defaultCurrency: "USD" },
  { code: "EU", name: "European Union", defaultCurrency: "USD" },
  { code: "CA", name: "Canada", defaultCurrency: "USD" },
  { code: "AU", name: "Australia", defaultCurrency: "USD" },
  { code: "DE", name: "Germany", defaultCurrency: "USD" },
  { code: "FR", name: "France", defaultCurrency: "USD" },
  { code: "JP", name: "Japan", defaultCurrency: "USD" },
  { code: "BR", name: "Brazil", defaultCurrency: "USD" },
  { code: "SG", name: "Singapore", defaultCurrency: "USD" },
  { code: "AE", name: "United Arab Emirates", defaultCurrency: "USD" },
];

export const SUPPORTED_CURRENCIES: readonly string[] = ALLOWED_CURRENCIES;

export interface AccessModeMeta {
  id: ShareAccessMode;
  title: string;
  desc: string;
  badge?: string;
  highlight?: boolean;
}

export function getAccessModeDetails(
  mode: ShareAccessMode,
  targetType: ShareTargetType = "video"
): AccessModeMeta {
  switch (mode) {
    case "PUBLIC":
      return {
        id: "PUBLIC",
        title: "Public",
        desc: targetType === "meeting" ? "Anyone can join" : "Anyone with link",
      };
    case "PURCHASABLE":
      return {
        id: "PURCHASABLE",
        title: "Purchasable",
        desc: targetType === "meeting" ? "Paid entry pass" : "Pay to watch",
        highlight: true,
      };
    case "RESTRICTED":
      return {
        id: "RESTRICTED",
        title: "Restricted",
        desc: targetType === "meeting" ? "Invited participants" : "Invited viewers only",
      };
    case "PRIVATE":
      return {
        id: "PRIVATE",
        title: "Private",
        desc: "Workspace members only",
      };
  }
}
