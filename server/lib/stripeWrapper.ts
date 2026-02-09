import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2025-08-27.basil' });

// Read once at boot. If set, forces cents for smoke tests.
const PRICE_OVERRIDE_CENTS = process.env.PRICE_OVERRIDE_CENTS
  ? parseInt(process.env.PRICE_OVERRIDE_CENTS, 10)
  : undefined;

export async function createPaymentIntent(params: Stripe.PaymentIntentCreateParams) {
  const finalParams = { ...params };

  if (Number.isFinite(PRICE_OVERRIDE_CENTS)) {
    finalParams.amount = PRICE_OVERRIDE_CENTS as number;
  }

  console.log(`[stripe] createPaymentIntent amount=${finalParams.amount}` +
              (PRICE_OVERRIDE_CENTS ? ` (OVERRIDE active: ${PRICE_OVERRIDE_CENTS})` : ''));

  return stripe.paymentIntents.create(finalParams);
}

export { stripe };
