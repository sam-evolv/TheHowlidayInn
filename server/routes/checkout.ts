import express from "express";
import { createPaymentIntent } from "../lib/stripeWrapper";
import { sendConfirmationEmail } from "../utils/sendEmail";
import { requireAuth } from "../middleware/auth";

const router = express.Router();

// POST /api/checkout/create-intent-by-booking
// Accepts JSON body: { amount?: number, currency?: string, bookingId?: string, email?: string, dogAge?: string, phoneNumber?: string, serviceType?: string }
// - amount is integer cents; defaults to 3500 (EUR 35)
// - currency defaults to "eur"
// - email for receipt_email (optional)
// - dogAge, phoneNumber, serviceType for metadata (optional, defaults to "n/a")
// Returns: { clientSecret }
router.post("/create-intent-by-booking", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const amount = Number.isInteger(body.amount) ? body.amount : 3500;
    const currency = typeof body.currency === "string" ? body.currency : "eur";

    // Extract and validate email from body
    const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
    const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
    const email = emailRaw && isEmail(emailRaw) ? emailRaw : undefined;

    // Extract optional fields with defaults
    const dogAge = typeof body.dogAge === "string" && body.dogAge.trim() ? body.dogAge.trim() : "n/a";
    const phoneNumber = typeof body.phoneNumber === "string" && body.phoneNumber.trim() ? body.phoneNumber.trim() : "n/a";
    const serviceType = typeof body.serviceType === "string" && body.serviceType.trim() ? body.serviceType.trim() : "n/a";
    const ownerName = typeof body.ownerName === "string" && body.ownerName.trim() ? body.ownerName.trim() : "n/a";

    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({ error: "INVALID_AMOUNT" });
    }

    // Dev-only log
    if (process.env.NODE_ENV !== "production") {
      console.log("[dev] checkout intent: receipt_email =", email || "(none)");
    }

    const intent = await createPaymentIntent({
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
      receipt_email: email,
      metadata: {
        bookingId: body.bookingId ? String(body.bookingId) : "n/a",
        reservationId: body.reservationId ? String(body.reservationId) : "n/a",
        serviceType,
        dogAge,
        phoneNumber,
        customerEmail: email || "n/a",
        ownerName,
        context: "howliday-create-intent-by-booking",
      },
      description: "Howliday Inn booking",
    });

    console.log("📧 PaymentIntent created:", {
      id: intent.id,
      receipt_email: intent.receipt_email,
      metadata: intent.metadata,
      status: intent.status,
    });

    if (email) {
      await sendConfirmationEmail(email, body.bookingId, amount);
    }

    if (!intent.client_secret) {
      return res.status(500).json({ error: "NO_CLIENT_SECRET" });
    }
    return res.json({ clientSecret: intent.client_secret });
  } catch (err: any) {
    console.error("[checkout] create-intent error:", err?.message || err);
    return res.status(500).json({ error: "INTENT_CREATE_FAILED" });
  }
});

export default router;
