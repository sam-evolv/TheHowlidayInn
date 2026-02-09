import Stripe from "stripe";
function inferMode(pk) {
    if (!pk)
        return "unknown";
    if (pk.startsWith("pk_live_"))
        return "live";
    if (pk.startsWith("pk_test_"))
        return "test";
    return "unknown";
}
export async function stripeHealthHandler(req, res) {
    const hasSecret = !!process.env.STRIPE_SECRET_KEY;
    const pk = process.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
    const mode = inferMode(pk);
    const result = {
        ok: false,
        hasSecret,
        hasPublishable: !!pk,
        mode,
        canCreateIntent: false,
        error: null,
    };
    try {
        if (!hasSecret)
            throw new Error("NO_SECRET");
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });
        // Create a tiny PaymentIntent (not confirmed) to validate wiring.
        const pi = await stripe.paymentIntents.create({
            amount: 50, // 0.50 EUR
            currency: "eur",
            automatic_payment_methods: { enabled: true },
            description: "healthcheck",
        });
        result.canCreateIntent = !!pi?.id;
        result.ok = !!pi?.client_secret;
    }
    catch (e) {
        result.error = e?.message || "UNKNOWN";
    }
    return res.json(result);
}
