import crypto from "crypto";

export type CashfreeEnvironment = "SANDBOX" | "PRODUCTION";

export interface CashfreeCustomerDetails {
  customer_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
}

export interface CreateCashfreeOrderParams {
  orderId: string;
  orderAmount: number; // in INR (e.g. 999.00 or 999)
  orderCurrency?: string; // default "INR"
  customer: CashfreeCustomerDetails;
  notes?: Record<string, string>;
  returnUrl?: string;
  notifyUrl?: string;
}

export interface CashfreeOrderResponse {
  cf_order_id: string;
  order_id: string;
  entity: string;
  order_currency: string;
  order_amount: number;
  order_status: "ACTIVE" | "PAID" | "EXPIRED" | "TERMINATED" | "TERMINATION_REQUESTED";
  payment_session_id: string;
  order_expiry_time?: string;
  order_note?: string;
  order_tags?: Record<string, string>;
}

export interface CashfreePaymentEntity {
  cf_payment_id: string;
  payment_status: "SUCCESS" | "FAILED" | "PENDING" | "USER_DROPPED" | "CANCELLED";
  payment_amount: number;
  payment_currency: string;
  payment_message?: string;
  payment_time?: string;
  payment_completion_time?: string;
  payment_method?: Record<string, any>;
  payment_group?: string;
  auth_id?: string;
  bank_reference?: string;
}

export interface CreateCashfreeSubscriptionParams {
  subscriptionId: string;
  planId?: string;
  planName: string;
  planAmount: number; // in INR (e.g. 999.00)
  planIntervalType: "MONTH" | "YEAR" | "WEEK" | "DAY";
  planIntervals?: number; // default 1
  customer: CashfreeCustomerDetails;
  notes?: Record<string, string>;
  returnUrl?: string;
  notifyUrl?: string;
}

export interface CashfreeSubscriptionResponse {
  subscription_id: string;
  cf_subscription_id?: string;
  subscription_status:
    | "INITIALIZED"
    | "BANK_APPROVAL_PENDING"
    | "ACTIVE"
    | "ON_HOLD"
    | "CANCELLED"
    | "COMPLETED"
    | "EXPIRED";
  auth_link?: string;
  payment_session_id?: string;
  subscription_session_id?: string;
  customer_details?: CashfreeCustomerDetails;
  plan_details?: any;
  subscription_tags?: Record<string, string>;
  notes?: Record<string, string>;
  created_at?: string;
}

export function getCashfreeConfig() {
  const appId =
    process.env.CASHFREE_APP_ID ||
    process.env.NEXT_PUBLIC_CASHFREE_APP_ID ||
    process.env.CASHFREE_CLIENT_ID ||
    "";
  const secretKey =
    process.env.CASHFREE_SECRET_KEY ||
    process.env.CASHFREE_CLIENT_SECRET ||
    "";
  const rawEnv = (
    process.env.NEXT_PUBLIC_CASHFREE_ENV ||
    "SANDBOX"
  ).toUpperCase().trim();
  const env: CashfreeEnvironment = (rawEnv === "PRODUCTION" || rawEnv === "PROD") ? "PRODUCTION" : "SANDBOX";
  const apiVersion = process.env.CASHFREE_API_VERSION || "2026-01-01";
  const baseUrl =
    env === "PRODUCTION"
      ? "https://api.cashfree.com/pg"
      : "https://sandbox.cashfree.com/pg";

  return {
    appId,
    secretKey,
    env,
    apiVersion,
    baseUrl,
    clientMode: env.toLowerCase() as "sandbox" | "production",
  };
}

/**
 * Format a phone number for Cashfree requirements (10 digits minimum)
 */
function sanitizePhoneNumber(phone?: string): string {
  if (!phone) return "9999999999";
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return "9999999999";
}

/**
 * Helper to compute the webhook notify_url for Cashfree API payloads.
 * Cashfree requires a valid public/tunneled URL and rejects localhost/127.0.0.1.
 */
function getWebhookNotifyUrl(customNotifyUrl?: string): string | undefined {
  if (customNotifyUrl) return customNotifyUrl;
  const appUrl = (process.env.APP_URL || process.env.NEXTAUTH_URL || "").trim();
  if (!appUrl) return undefined;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(appUrl)) {
    return undefined;
  }
  return `${appUrl.replace(/\/+$/, "")}/api/payments/webhook`;
}

/**
 * Create an order on Cashfree PG (API version v6 / 2026-01-01)
 */
export async function createCashfreeOrder(
  params: CreateCashfreeOrderParams
): Promise<CashfreeOrderResponse> {
  const config = getCashfreeConfig();

  if (!config.appId || !config.secretKey) {
    throw new Error(
      "Cashfree credentials (CASHFREE_APP_ID, CASHFREE_SECRET_KEY) are not configured."
    );
  }

  const notifyUrl = getWebhookNotifyUrl(params.notifyUrl);

  const payload = {
    order_id: params.orderId,
    order_amount: Number(params.orderAmount.toFixed(2)),
    order_currency: params.orderCurrency || "INR",
    customer_details: {
      customer_id: params.customer.customer_id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50),
      customer_name: params.customer.customer_name || "Workspace Customer",
      customer_email: params.customer.customer_email || "customer@example.com",
      customer_phone: sanitizePhoneNumber(params.customer.customer_phone),
    },
    order_meta: {
      return_url:
        params.returnUrl ||
        `${process.env.APP_URL || "http://localhost:3000"}/pricing?order_id={order_id}`,
      ...(notifyUrl ? { notify_url: notifyUrl } : {}),
    },
    ...(params.notes ? { order_tags: params.notes } : {}),
  };

  const response = await fetch(`${config.baseUrl}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": config.appId,
      "x-client-secret": config.secretKey,
      "x-api-version": config.apiVersion,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("[Cashfree Create Order Error]:", data);
    throw new Error(
      data.message || data.error || `Cashfree API returned HTTP ${response.status}`
    );
  }

  return data as CashfreeOrderResponse;
}

/**
 * Retrieve order details from Cashfree by orderId
 */
export async function getCashfreeOrder(orderId: string): Promise<CashfreeOrderResponse> {
  const config = getCashfreeConfig();

  if (!config.appId || !config.secretKey) {
    throw new Error("Cashfree credentials are not configured.");
  }

  const response = await fetch(`${config.baseUrl}/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": config.appId,
      "x-client-secret": config.secretKey,
      "x-api-version": config.apiVersion,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error(`[Cashfree Get Order ${orderId} Error]:`, data);
    throw new Error(
      data.message || data.error || `Failed to fetch Cashfree order ${orderId}`
    );
  }

  return data as CashfreeOrderResponse;
}

/**
 * Retrieve all payment attempts for an order from Cashfree
 */
export async function getCashfreeOrderPayments(
  orderId: string
): Promise<CashfreePaymentEntity[]> {
  const config = getCashfreeConfig();

  if (!config.appId || !config.secretKey) {
    throw new Error("Cashfree credentials are not configured.");
  }

  const response = await fetch(
    `${config.baseUrl}/orders/${encodeURIComponent(orderId)}/payments`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": config.appId,
        "x-client-secret": config.secretKey,
        "x-api-version": config.apiVersion,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(`[Cashfree Get Payments for ${orderId} Error]:`, data);
    throw new Error(
      data.message || data.error || `Failed to fetch payments for order ${orderId}`
    );
  }

  return (Array.isArray(data) ? data : []) as CashfreePaymentEntity[];
}

/**
 * Verify webhook signature sent by Cashfree
 * Formula: HMAC_SHA256(timestamp + rawBody, secretKey) -> Base64
 */
export function verifyCashfreeWebhookSignature({
  rawBody,
  signature,
  timestamp,
}: {
  rawBody: string;
  signature: string;
  timestamp: string;
}): boolean {
  try {
    const config = getCashfreeConfig();
    if (!config.secretKey) return false;

    const signedPayload = `${timestamp}${rawBody}`;
    const expectedSignature = crypto
      .createHmac("sha256", config.secretKey)
      .update(signedPayload)
      .digest("base64");

    return expectedSignature === signature;
  } catch (err) {
    console.error("[Cashfree Webhook Signature Verification Error]:", err);
    return false;
  }
}

/**
 * Create a recurring subscription on Cashfree Subscriptions API (v6 / 2026-01-01)
 */
export async function createCashfreeSubscription(
  params: CreateCashfreeSubscriptionParams
): Promise<CashfreeSubscriptionResponse> {
  const config = getCashfreeConfig();

  if (!config.appId || !config.secretKey) {
    throw new Error(
      "Cashfree credentials (CASHFREE_APP_ID, CASHFREE_SECRET_KEY) are not configured."
    );
  }

  const generatedPlanId =
    params.planId ||
    `plan_${params.planName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${params.planIntervalType.toLowerCase()}`;

  const payload = {
    subscription_id: params.subscriptionId,
    customer_details: {
      customer_id: params.customer.customer_id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50),
      customer_name: params.customer.customer_name || "Workspace Customer",
      customer_email: params.customer.customer_email || "customer@example.com",
      customer_phone: sanitizePhoneNumber(params.customer.customer_phone),
    },
    plan_details: {
      plan_id: generatedPlanId,
      plan_name: `${params.planName.toUpperCase()} ${params.planIntervalType === "YEAR" ? "Yearly" : "Monthly"} Plan`,
      plan_type: "PERIODIC",
      plan_amount: Number(params.planAmount.toFixed(2)),
      plan_currency: "INR",
      plan_interval_type: params.planIntervalType,
      plan_intervals: params.planIntervals || 1,
      plan_max_amount: Number((params.planAmount * 2).toFixed(2)),
      plan_note: `Taped ${params.planName} Subscription`,
    },
    subscription_meta: {
      return_url:
        params.returnUrl ||
        `${process.env.APP_URL || "http://localhost:3000"}/pricing?subscription_id={subscription_id}`,
      notification_channel: ["EMAIL"],
      ...(getWebhookNotifyUrl(params.notifyUrl)
        ? { notify_url: getWebhookNotifyUrl(params.notifyUrl) }
        : {}),
    },
    ...(params.notes ? { subscription_tags: params.notes } : {}),
  };

  const response = await fetch(`${config.baseUrl}/subscriptions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": config.appId,
      "x-client-secret": config.secretKey,
      "x-api-version": config.apiVersion,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("[Cashfree Create Subscription Error]:", data);
    throw new Error(
      data.message || data.error || `Cashfree Subscription API returned HTTP ${response.status}`
    );
  }

  return data as CashfreeSubscriptionResponse;
}

/**
 * Retrieve recurring subscription details from Cashfree
 */
export async function getCashfreeSubscription(
  subscriptionId: string
): Promise<CashfreeSubscriptionResponse> {
  const config = getCashfreeConfig();

  if (!config.appId || !config.secretKey) {
    throw new Error("Cashfree credentials are not configured.");
  }

  const response = await fetch(
    `${config.baseUrl}/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": config.appId,
        "x-client-secret": config.secretKey,
        "x-api-version": config.apiVersion,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(`[Cashfree Get Subscription ${subscriptionId} Error]:`, data);
    throw new Error(
      data.message || data.error || `Failed to fetch Cashfree subscription ${subscriptionId}`
    );
  }

  return data as CashfreeSubscriptionResponse;
}

/**
 * Cancel a recurring subscription on Cashfree
 */
export async function cancelCashfreeSubscription(
  subscriptionId: string
): Promise<{ success: boolean; data?: any }> {
  const config = getCashfreeConfig();

  if (!config.appId || !config.secretKey) {
    throw new Error("Cashfree credentials are not configured.");
  }

  // Try manage endpoint with action CANCEL first
  try {
    const response = await fetch(
      `${config.baseUrl}/subscriptions/${encodeURIComponent(subscriptionId)}/manage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": config.appId,
          "x-client-secret": config.secretKey,
          "x-api-version": config.apiVersion,
        },
        body: JSON.stringify({
          subscription_id: subscriptionId,
          action: "CANCEL",
        }),
      }
    );

    const data = await response.json();
    if (response.ok) {
      return { success: true, data };
    }

    console.warn(`[Cashfree Manage Subscription Cancel returned ${response.status}]:`, data);
  } catch (err) {
    console.warn("[Cashfree Manage Cancel Exception, attempting fallback]:", err);
  }

  // Fallback to /cancel endpoint
  const cancelRes = await fetch(
    `${config.baseUrl}/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": config.appId,
        "x-client-secret": config.secretKey,
        "x-api-version": config.apiVersion,
      },
      body: JSON.stringify({ subscription_id: subscriptionId }),
    }
  );

  const cancelData = await cancelRes.json().catch(() => ({}));
  return { success: cancelRes.ok, data: cancelData };
}

/**
 * Retrieve payments/invoices for a Cashfree subscription
 */
export async function getCashfreeSubscriptionPayments(
  subscriptionId: string
): Promise<CashfreePaymentEntity[]> {
  const config = getCashfreeConfig();

  if (!config.appId || !config.secretKey) {
    throw new Error("Cashfree credentials are not configured.");
  }

  const response = await fetch(
    `${config.baseUrl}/subscriptions/${encodeURIComponent(subscriptionId)}/payments`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": config.appId,
        "x-client-secret": config.secretKey,
        "x-api-version": config.apiVersion,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(`[Cashfree Get Subscription Payments for ${subscriptionId} Error]:`, data);
    return [];
  }

  return (Array.isArray(data) ? data : []) as CashfreePaymentEntity[];
}

export interface CashfreeChargesDetails {
  totalChargesAmount: number; // Total charges including taxes
  serviceCharge: number;      // Base gateway processing fee
  serviceTax: number;         // GST / Service tax on gateway charges
  feePercent?: number;        // Effective fee percentage if gross amount available
}

/**
 * Extracts real payment gateway charges and taxes from Cashfree payment object or webhook payload.
 * Supports payment_charge_details, payment_charges, charges_details, and settlement details.
 */
export function extractCashfreePaymentCharges(
  paymentOrData: any,
  grossAmount?: number
): CashfreeChargesDetails {
  if (!paymentOrData) {
    return { totalChargesAmount: 0, serviceCharge: 0, serviceTax: 0 };
  }

  const chargeObj =
    paymentOrData.payment_charge_details ||
    paymentOrData.charges_details ||
    paymentOrData.charge_details ||
    paymentOrData.order_charge_details ||
    {};

  const serviceCharge = Number(chargeObj.service_charge || paymentOrData.service_charge || 0);
  const serviceTax = Number(
    chargeObj.service_tax ||
    chargeObj.tax ||
    paymentOrData.service_tax ||
    paymentOrData.payment_tax ||
    0
  );

  let totalCharges = 0;
  if (chargeObj.total_charge !== undefined && chargeObj.total_charge !== null) {
    totalCharges = Number(chargeObj.total_charge);
  } else if (serviceCharge > 0 || serviceTax > 0) {
    totalCharges = serviceCharge + serviceTax;
  } else if (
    paymentOrData.payment_charges !== undefined &&
    paymentOrData.payment_charges !== null &&
    !isNaN(Number(paymentOrData.payment_charges))
  ) {
    totalCharges = Number(paymentOrData.payment_charges);
  } else if (
    paymentOrData.order_charges !== undefined &&
    paymentOrData.order_charges !== null &&
    !isNaN(Number(paymentOrData.order_charges))
  ) {
    totalCharges = Number(paymentOrData.order_charges);
  } else if (
    paymentOrData.settlement_charge !== undefined ||
    paymentOrData.settlement_tax !== undefined
  ) {
    totalCharges =
      Number(paymentOrData.settlement_charge || 0) + Number(paymentOrData.settlement_tax || 0);
  }

  const totalChargesAmount = Math.round(Math.max(0, totalCharges) * 100) / 100;
  const safeGross =
    Number(grossAmount) ||
    Number(paymentOrData.payment_amount || paymentOrData.order_amount || 0);
  const feePercent =
    safeGross > 0
      ? Math.round(((totalChargesAmount / safeGross) * 100) * 100) / 100
      : undefined;

  return {
    totalChargesAmount,
    serviceCharge: Math.round(serviceCharge * 100) / 100,
    serviceTax: Math.round(serviceTax * 100) / 100,
    feePercent,
  };
}

/**
 * Fetches payments for a Cashfree order and extracts actual gateway charges & taxes.
 */
export async function fetchCashfreeOrderPaymentCharges(
  orderId: string,
  grossAmount?: number
): Promise<CashfreeChargesDetails> {
  try {
    if (!orderId || orderId.startsWith("test_") || orderId.startsWith("free_")) {
      return { totalChargesAmount: 0, serviceCharge: 0, serviceTax: 0 };
    }

    const payments = await getCashfreeOrderPayments(orderId).catch(() => []);
    const successfulPayment = payments.find((p) => p.payment_status === "SUCCESS") || payments[0];

    if (successfulPayment) {
      return extractCashfreePaymentCharges(successfulPayment, grossAmount);
    }

    // Try fetching the order itself for order_charges
    const order = await getCashfreeOrder(orderId).catch(() => null);
    if (order) {
      return extractCashfreePaymentCharges(order, grossAmount);
    }

    return { totalChargesAmount: 0, serviceCharge: 0, serviceTax: 0 };
  } catch (err: any) {
    console.warn(`[Cashfree fetchOrderPaymentCharges Error for ${orderId}]:`, err?.message || err);
    return { totalChargesAmount: 0, serviceCharge: 0, serviceTax: 0 };
  }
}

