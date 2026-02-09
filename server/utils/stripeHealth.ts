import type { Request, Response } from "express";
import { createPaymentIntent } from "../lib/stripeWrapper";

function inferMode(pk?: string) {
  if (!pk) return "unknown";
  if (pk.startsWith("pk_live_")) return "live";
  if (pk.startsWith("pk_test_")) return "test";
  return "unknown";
}

export async function stripeHealthHandler(req: Request, res: Response) {
  const hasSecret = !!process.env.STRIPE_SECRET_KEY;
  const pk = process.env.VITE_STRIPE_PUBLIC_KEY || "";
  const mode = inferMode(pk);

  const result = {
    ok: false,
    hasSecret,
    hasPublishable: !!pk,
    mode,
    canCreateIntent: false,
    error: null as null | string,
  };

  try {
    if (!hasSecret) throw new Error("NO_SECRET");
    // Create a tiny PaymentIntent (not confirmed) to validate wiring.
    const pi = await createPaymentIntent({
      amount: 50, // 0.50 EUR
      currency: "eur",
      automatic_payment_methods: { enabled: true },
      description: "healthcheck",
    });
    result.canCreateIntent = !!pi?.id;
    result.ok = !!pi?.client_secret;
  } catch (e: any) {
    result.error = e?.message || "UNKNOWN";
  }
  return res.json(result);
}
