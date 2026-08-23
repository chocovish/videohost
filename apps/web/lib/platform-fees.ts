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
 * Computes exact split between platform commission fee, payment gateway fee (3%), and net creator earnings.
 * All amounts are cleanly rounded to 2 decimal places.
 */
export function calculateSaleSplit(
  grossAmount: number,
  planName?: string | null,
  customRate?: number | null,
  customGatewayRate?: number | null
): SaleSplitResult {
  const safeGross = Math.max(0, Number(grossAmount) || 0);
  const commissionPercent =
    typeof customRate === "number" && !isNaN(customRate) && customRate >= 0
      ? customRate
      : getCommissionRateForPlan(planName);

  const gatewayFeePercent =
    typeof customGatewayRate === "number" && !isNaN(customGatewayRate) && customGatewayRate >= 0
      ? customGatewayRate
      : PAYMENT_GATEWAY_FEE_PERCENT;

  const rawCommissionAmount = safeGross * (commissionPercent / 100);
  const commissionAmount = Math.round(rawCommissionAmount * 100) / 100;

  const rawGatewayAmount = safeGross * (gatewayFeePercent / 100);
  const gatewayFeeAmount = Math.round(rawGatewayAmount * 100) / 100;

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
