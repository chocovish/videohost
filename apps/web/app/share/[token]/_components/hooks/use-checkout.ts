"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PriceInfo, SharedData } from "../types";
import { getCalculatedPrice, loadCashfreeScript, loadRazorpayScript } from "../utils";

interface UseCheckoutDeps {
  data: SharedData | null;
  token: string;
  selectedBuyerCountry: string;
  accentHex: string;
  fetchSharedContent: () => Promise<void>;
}

interface UseCheckoutResult {
  priceInfo: PriceInfo;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isCheckingOut: boolean;
  checkoutError: string;
  checkoutSuccess: string;
  handleExecuteCheckout: () => Promise<void>;
}

/**
 * Purchase & checkout orchestration: free-claim, Cashfree modal,
 * Razorpay modal, and verify polling. Logic moved verbatim from
 * `shared-content-client.tsx` — only the surrounding plumbing changed.
 */
export function useCheckout({
  data,
  token,
  selectedBuyerCountry,
  accentHex,
  fetchSharedContent,
}: UseCheckoutDeps): UseCheckoutResult {
  const router = useRouter();

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutSuccess, setCheckoutSuccess] = useState("");

  const priceInfo = useMemo(
    () => getCalculatedPrice(data, selectedBuyerCountry),
    [data, selectedBuyerCountry]
  );

  const redirectToLogin = () => {
    const callback =
      typeof window !== "undefined" ? window.location.href : `/share/${token}`;
    router.push(`/auth/login?callbackUrl=${encodeURIComponent(callback)}`);
  };

  const handleExecuteCheckout = async () => {
    if (!token) return;
    const currentPrice = getCalculatedPrice(data, selectedBuyerCountry);

    // If cost is 0, claim for free directly without invoking payment gateway
    if (currentPrice.isFree) {
      if (!data?.isLoggedIn) {
        redirectToLogin();
        return;
      }

      setIsCheckingOut(true);
      setCheckoutError("");
      setCheckoutSuccess("");

      try {
        const res = await fetch("/api/content-purchases/free-claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentType: data?.type || "video",
            contentId: token,
            countryCode: selectedBuyerCountry,
          }),
        });

        const resData = await res.json();
        if (!res.ok) {
          if (resData.error === "LOGIN_REQUIRED") {
            redirectToLogin();
            return;
          }
          throw new Error(resData.message || resData.error || "Failed to claim free access.");
        }

        setCheckoutSuccess(resData.message || "Unlocked successfully! Loading content...");
        setTimeout(async () => {
          setIsCheckoutOpen(false);
          setCheckoutSuccess("");
          await fetchSharedContent();
        }, 1000);
      } catch (err: unknown) {
        setCheckoutError(
          err instanceof Error ? err.message : "Failed to claim free access."
        );
      } finally {
        setIsCheckingOut(false);
      }
      return;
    }

    setIsCheckingOut(true);
    setCheckoutError("");
    setCheckoutSuccess("");

    try {
      // 1. Create order on backend with active payment gateway
      const res = await fetch("/api/content-purchases/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: data?.type || "video",
          contentId: token,
          countryCode: selectedBuyerCountry,
        }),
      });

      const orderData = await res.json();
      if (!res.ok) {
        if (orderData.error === "LOGIN_REQUIRED") {
          redirectToLogin();
          return;
        }
        throw new Error(
          orderData.message || orderData.error || "Failed to initialize payment gateway order."
        );
      }

      // If already purchased or unlocked
      if (orderData.alreadyPurchased) {
        setCheckoutSuccess(orderData.message || "You own access to this content! Unlocking...");
        setTimeout(async () => {
          setIsCheckoutOpen(false);
          setCheckoutSuccess("");
          await fetchSharedContent();
        }, 1000);
        return;
      }

      // 2A. CASHFREE GATEWAY CHECKOUT
      if (orderData.gateway === "cashfree") {
        const scriptLoaded = await loadCashfreeScript();
        if (!scriptLoaded || !(window as unknown as { Cashfree?: unknown }).Cashfree) {
          throw new Error(
            "Cashfree payment gateway SDK failed to load. Please check your network connection."
          );
        }

        const cashfree = (
          window as unknown as {
            Cashfree: (opts: { mode: string }) => {
              checkout: (opts: unknown) => Promise<{ error?: { message?: string } }>;
            };
          }
        ).Cashfree({
          mode: orderData.cfEnv === "production" ? "production" : "sandbox",
        });

        const checkoutOptions = {
          paymentSessionId: orderData.paymentSessionId,
          redirectTarget: "_modal",
        };

        cashfree.checkout(checkoutOptions).then(async (result: { error?: { message?: string } }) => {
          if (result.error) {
            console.warn("[Cashfree Modal Result]:", result.error);
            if (result.error.message && result.error.message !== "User closed the popup") {
              setCheckoutError(result.error.message || "Payment cancelled or failed.");
            }
            setIsCheckingOut(false);
            return;
          }

          // Verify Cashfree Payment
          try {
            const verifyRes = await fetch("/api/content-purchases/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                gateway: "cashfree",
                order_id: orderData.orderId,
                contentType: data?.type || "video",
                contentId: token,
                countryCode: selectedBuyerCountry,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "Payment verification failed.");
            }

            setCheckoutSuccess(verifyData.message || "Payment verified! Unlocking content...");
            setTimeout(async () => {
              setIsCheckoutOpen(false);
              setCheckoutSuccess("");
              await fetchSharedContent();
            }, 1200);
          } catch (verifyErr: unknown) {
            setCheckoutError(
              verifyErr instanceof Error ? verifyErr.message : "Payment verification failed."
            );
          } finally {
            setIsCheckingOut(false);
          }
        });

        return;
      }

      // 2B. RAZORPAY GATEWAY CHECKOUT (Default)
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !(window as unknown as { Razorpay?: unknown }).Razorpay) {
        throw new Error(
          "Razorpay payment gateway SDK failed to load. Please check your network connection."
        );
      }

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: data?.organization?.name || "Taped",
        description: `Purchase: ${orderData.contentTitle || "Content Access"}`,
        order_id: orderData.orderId,
        prefill: {
          name: orderData.prefill?.name || "",
          email: orderData.prefill?.email || "",
        },
        theme: {
          color: accentHex || "#84cc16",
        },
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          try {
            const verifyRes = await fetch("/api/content-purchases/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                gateway: "razorpay",
                contentType: data?.type || "video",
                contentId: token,
                countryCode: selectedBuyerCountry,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "Payment verification failed.");
            }

            setCheckoutSuccess(verifyData.message || "Payment verified! Unlocking content...");
            setTimeout(async () => {
              setIsCheckoutOpen(false);
              setCheckoutSuccess("");
              await fetchSharedContent();
            }, 1200);
          } catch (verifyErr: unknown) {
            setCheckoutError(
              verifyErr instanceof Error ? verifyErr.message : "Payment verification failed."
            );
          } finally {
            setIsCheckingOut(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsCheckingOut(false);
          },
        },
      };

      const rzp = new (
        window as unknown as {
          Razorpay: new (opts: unknown) => {
            on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void;
            open: () => void;
          };
        }
      ).Razorpay(options);
      rzp.on("payment.failed", function (response: { error?: { description?: string } }) {
        console.warn("[Razorpay Payment Failed]:", response.error);
        setCheckoutError(response.error?.description || "Payment failed.");
        setIsCheckingOut(false);
      });
      rzp.open();
    } catch (err: unknown) {
      setCheckoutError(
        err instanceof Error ? err.message : "An unexpected error occurred during checkout."
      );
      setIsCheckingOut(false);
    }
  };

  return {
    priceInfo,
    isCheckoutOpen,
    setIsCheckoutOpen,
    isCheckingOut,
    checkoutError,
    checkoutSuccess,
    handleExecuteCheckout,
  };
}
