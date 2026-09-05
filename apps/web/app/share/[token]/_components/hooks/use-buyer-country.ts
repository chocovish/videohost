"use client";

import { useEffect, useState } from "react";
import { detectBuyerCountry } from "../utils";

/**
 * Visitor billing country: server-detected code wins, otherwise
 * timezone/locale heuristics. Shared by every paywall + checkout dialog
 * so the price is identical everywhere on the page.
 */
export function useBuyerCountry(detectedCountryCode?: string) {
  const [selectedBuyerCountry, setSelectedBuyerCountry] = useState<string>("US");

  useEffect(() => {
    setSelectedBuyerCountry((prev) =>
      detectBuyerCountry(detectedCountryCode, prev)
    );
  }, [detectedCountryCode]);

  return { selectedBuyerCountry, setSelectedBuyerCountry };
}
