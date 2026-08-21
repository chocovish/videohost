export type PaymentGatewayType = "razorpay" | "cashfree";

/**
 * Returns the currently active payment gateway from environment variables.
 * Defaults to "razorpay" if unset or unrecognized.
 */
export function getActivePaymentGateway(): PaymentGatewayType {
  const envGateway = (
    process.env.NEXT_PUBLIC_PAYMENT_GATEWAY ||
    "razorpay"
  ).toLowerCase().trim();

  if (envGateway === "cashfree") {
    return "cashfree";
  }

  return "razorpay";
}

export function isGatewayActive(gateway: PaymentGatewayType): boolean {
  return getActivePaymentGateway() === gateway;
}
