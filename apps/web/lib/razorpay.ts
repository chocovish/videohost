import Razorpay from "razorpay";
import crypto from "crypto";

const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_example12345";
const key_secret = process.env.RAZORPAY_KEY_SECRET || "example_secret_key_12345";

export const razorpayClient = new Razorpay({
  key_id,
  key_secret,
});

/**
 * Verify Razorpay payment signature from client checkout callback
 * signature = hmac_sha256(razorpay_order_id + "|" + razorpay_payment_id, key_secret)
 */
export function verifyRazorpaySignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET || "example_secret_key_12345";
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
}

/**
 * Verify Razorpay webhook signature
 */
export function verifyRazorpayWebhookSignature({
  rawBody,
  signature,
}: {
  rawBody: string;
  signature: string;
}): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "example_webhook_secret_12345";
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  return expectedSignature === signature;
}

export interface RazorpayFeeDetails {
  totalFeeAmount: number; // Total fee including taxes in standard currency units (e.g. INR / USD)
  baseFeeAmount: number;  // Processing fee excluding tax
  taxAmount: number;      // Service tax / GST component
  currency?: string;
  feePercent?: number;    // Calculated fee percentage if gross amount provided
}

/**
 * Extracts fee and tax breakdown from a Razorpay payment entity / webhook payload.
 * Razorpay returns `fee` and `tax` in subunits (e.g. paise/cents).
 * Note: Razorpay's `fee` field represents the total fee charged, which includes `tax`.
 */
export function extractRazorpayFeeFromPayload(
  paymentEntity: any,
  grossAmount?: number
): RazorpayFeeDetails {
  if (!paymentEntity) {
    return { totalFeeAmount: 0, baseFeeAmount: 0, taxAmount: 0 };
  }

  const rawTotalFee = Number(paymentEntity.fee || 0); // In subunits (paise)
  const rawTax = Number(paymentEntity.tax || 0);       // In subunits (paise)

  const totalFeeAmount = Math.round((rawTotalFee / 100) * 100) / 100;
  const taxAmount = Math.round((rawTax / 100) * 100) / 100;
  const baseFeeAmount = Math.max(0, Math.round((totalFeeAmount - taxAmount) * 100) / 100);

  const safeGross = Number(grossAmount) || (paymentEntity.amount ? Number(paymentEntity.amount) / 100 : 0);
  const feePercent =
    safeGross > 0
      ? Math.round(((totalFeeAmount / safeGross) * 100) * 100) / 100
      : undefined;

  return {
    totalFeeAmount,
    baseFeeAmount,
    taxAmount,
    currency: paymentEntity.currency || "INR",
    feePercent,
  };
}

/**
 * Queries Razorpay Payments API to fetch real fee & tax charges for a captured payment.
 */
export async function fetchRazorpayPaymentFee(
  paymentId: string,
  grossAmount?: number
): Promise<RazorpayFeeDetails> {
  try {
    if (!paymentId || paymentId.startsWith("test_") || paymentId.startsWith("free_")) {
      return { totalFeeAmount: 0, baseFeeAmount: 0, taxAmount: 0 };
    }

    const payment: any = await razorpayClient.payments.fetch(paymentId);
    return extractRazorpayFeeFromPayload(payment, grossAmount);
  } catch (err: any) {
    console.warn(`[Razorpay fetchPaymentFee Error for ${paymentId}]:`, err?.message || err);
    return { totalFeeAmount: 0, baseFeeAmount: 0, taxAmount: 0 };
  }
}

