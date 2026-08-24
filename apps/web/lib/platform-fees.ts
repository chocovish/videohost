/**
 * Platform Fee, Gateway Fee & Creator Earnings Calculation Utility
 *
 * Platform Commission Rates (Plan-Tiered):
 * - Free: 6.5% platform fee
 * - Basic: 5.5% platform fee
 * - Pro: 4.0% platform fee
 * - Enterprise: 3.5% platform fee (lowest rate)
 *
 * Payment Gateway Processing Fee (Constant):
 * - 3.0% on all card, UPI, and gateway transactions
 */

export const PLAN_COMMISSION_RATES: Record<string, number> = {
  free: 6.5,
  basic: 5.5,
  pro: 4.0,
  enterprise: 3.5,
};

export const DEFAULT_COMMISSION_PERCENT = 6.5;
export const PAYMENT_GATEWAY_FEE_PERCENT = 3.0;

export interface SaleSplitResult {
  grossAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  gatewayFeePercent: number;
  gatewayFeeAmount: number;
  totalFeeAmount: number;
  creatorEarnings: number;
  planSnapshot: string;
}

/**
 * Returns the platform commission percentage for a given plan name.
 */
export function getCommissionRateForPlan(planName?: string | null): number {
  if (!planName) return DEFAULT_COMMISSION_PERCENT;
  const key = planName.trim().toLowerCase();
  if (key in PLAN_COMMISSION_RATES) {
    return PLAN_COMMISSION_RATES[key];
  }
  return DEFAULT_COMMISSION_PERCENT;
}

/**
 * Computes exact split between platform commission fee, payment gateway fee (actual or calculated with taxes), and net creator earnings.
 * All amounts are cleanly rounded to 2 decimal places.
 */
export function calculateSaleSplit(
  grossAmount: number,
  planName?: string | null,
  customCommissionRate?: number | null,
  customGatewayRateOrAmount?: number | null,
  options?: {
    isExactGatewayAmount?: boolean;
    actualGatewayFeeAmount?: number | null;
    actualGatewayFeePercent?: number | null;
  }
): SaleSplitResult {
  const safeGross = Math.max(0, Number(grossAmount) || 0);
  const commissionPercent =
    typeof customCommissionRate === "number" && !isNaN(customCommissionRate) && customCommissionRate >= 0
      ? customCommissionRate
      : getCommissionRateForPlan(planName);

  const rawCommissionAmount = safeGross * (commissionPercent / 100);
  const commissionAmount = Math.round(rawCommissionAmount * 100) / 100;

  let gatewayFeeAmount = 0;
  let gatewayFeePercent = 0;

  if (options?.actualGatewayFeeAmount !== undefined && options.actualGatewayFeeAmount !== null) {
    gatewayFeeAmount = Math.round(Math.max(0, Number(options.actualGatewayFeeAmount)) * 100) / 100;
    gatewayFeePercent =
      options.actualGatewayFeePercent !== undefined && options.actualGatewayFeePercent !== null
        ? Number(options.actualGatewayFeePercent)
        : safeGross > 0
        ? Math.round(((gatewayFeeAmount / safeGross) * 100) * 100) / 100
        : 0;
  } else if (options?.isExactGatewayAmount && typeof customGatewayRateOrAmount === "number") {
    gatewayFeeAmount = Math.round(Math.max(0, customGatewayRateOrAmount) * 100) / 100;
    gatewayFeePercent =
      safeGross > 0
        ? Math.round(((gatewayFeeAmount / safeGross) * 100) * 100) / 100
        : 0;
  } else {
    // If customGatewayRateOrAmount is provided and represents a percentage (default fallback)
    const feeRate =
      typeof customGatewayRateOrAmount === "number" && !isNaN(customGatewayRateOrAmount) && customGatewayRateOrAmount >= 0
        ? customGatewayRateOrAmount
        : PAYMENT_GATEWAY_FEE_PERCENT;

    gatewayFeePercent = feeRate;
    const rawGatewayAmount = safeGross * (feeRate / 100);
    gatewayFeeAmount = Math.round(rawGatewayAmount * 100) / 100;
  }

  const totalFeeAmount = Math.round((commissionAmount + gatewayFeeAmount) * 100) / 100;
  const creatorEarnings = Math.max(0, Math.round((safeGross - totalFeeAmount) * 100) / 100);

  const planSnapshot = (planName || "FREE").trim().toUpperCase();

  return {
    grossAmount: safeGross,
    commissionPercent,
    commissionAmount,
    gatewayFeePercent,
    gatewayFeeAmount,
    totalFeeAmount,
    creatorEarnings,
    planSnapshot,
  };
}

