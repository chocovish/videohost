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
