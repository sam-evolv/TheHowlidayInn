import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-08-27.basil",
});

async function enableReceipts() {
  try {
    const account = await stripe.accounts.update(
      process.env.STRIPE_ACCOUNT_ID || "",
      {
        settings: {
          email: {
            receipts: {
              payments: true,
              refunds: true,
            },
          },
        },
      } as any
    );

    console.log("✅ Stripe receipts enabled:", account.settings?.email?.receipts);
  } catch (err) {
    console.error("❌ Failed to enable receipts:", err);
  }
}

enableReceipts();
