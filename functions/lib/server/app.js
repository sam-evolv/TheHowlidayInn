import Stripe from "stripe";
// Import routes
import { authRouter } from "./routes/auth.js";
import dogsRouter from "./routes/dogs.js";
import adminDogsRouter from "./routes/adminDogs.js";
import bookingRouter from "./routes/booking.js";
import checkoutRouter from "./routes/checkout.js";
import usersRouter from "./routes/users.js";
import settingsRouter from "./routes/settings.js";
import remindersRouter from "./routes/reminders.js";
import availabilityRouter from "./routes/availability.js";
import reservationsRouter from "./routes/reservations.js";
import { authBootstrap } from "./routes/authBootstrap.js";
import { registerCloudinaryRoutes } from "./uploads/cloudinary.js";
import { firebaseHealthHandler } from "./utils/firebaseConfigCheck.js";
import { stripeHealthHandler } from "./utils/stripeHealth.js";
import { storage } from "./storage.js";
import { db } from "./db/client.js";
import { availability, reservations } from "./db/schema.js";
import { and, eq, sql } from "drizzle-orm";
// Initialize Stripe
let stripeInstance = null;
function getStripe() {
    if (!stripeInstance) {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
        }
        stripeInstance = new Stripe(secretKey);
    }
    return stripeInstance;
}
// Commit a reservation (move from reserved to confirmed)
async function commitReservation(reservationId) {
    try {
        const [reservation] = await db
            .select()
            .from(reservations)
            .where(eq(reservations.id, reservationId))
            .limit(1);
        if (!reservation) {
            console.error('[reservation] reservation not found', { reservationId });
            return;
        }
        // Idempotent: if already committed, skip
        if (reservation.status === 'committed') {
            console.log('[reservation] already committed', { reservationId });
            return;
        }
        // Only commit if currently active
        if (reservation.status !== 'active') {
            console.error('[reservation] cannot commit non-active reservation', {
                reservationId,
                currentStatus: reservation.status
            });
            return;
        }
        await db.transaction(async (tx) => {
            // Mark reservation as committed
            await tx
                .update(reservations)
                .set({
                status: 'committed',
                updatedAt: new Date(),
            })
                .where(eq(reservations.id, reservationId));
            // Build availability query conditions
            const conditions = [
                eq(availability.service, reservation.service),
                eq(availability.date, reservation.date),
            ];
            if (reservation.slot) {
                conditions.push(eq(availability.slot, reservation.slot));
            }
            else {
                conditions.push(eq(availability.slot, null));
            }
            // Move 1 from reserved to confirmed
            await tx
                .update(availability)
                .set({
                reserved: sql `GREATEST(0, ${availability.reserved} - 1)`,
                confirmed: sql `${availability.confirmed} + 1`,
                updatedAt: new Date(),
            })
                .where(and(...conditions));
        });
        console.log('[reservation] committed successfully', {
            reservationId,
            service: reservation.service,
            date: reservation.date
        });
    }
    catch (error) {
        console.error('[reservation] error committing reservation', {
            reservationId,
            error: error?.message
        });
        throw error;
    }
}
// Email logo configuration
const DEFAULT_LOGO = "https://thehowlidayinn.ie/assets/logo.png";
const LOGO_URL = (process.env.COMPANY_LOGO_URL || DEFAULT_LOGO).trim();
const BRAND_BADGE_BG = "#FAF8F4";
const BRAND_BADGE_SHADOW = "0 1px 3px rgba(0,0,0,0.08)";
// Render logo block with CID inline image
function renderLogoBlockCID() {
    const width = 160;
    const height = 60;
    return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 auto;">
    <tr>
      <td align="center" style="padding:24px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" style="background:${BRAND_BADGE_BG}; border-radius:12px; box-shadow:${BRAND_BADGE_SHADOW}; padding:16px;">
          <tr>
            <td align="center">
              <img
                src="cid:howliday-logo"
                width="${width}" height="${height}"
                alt="The Howliday Inn"
                style="display:block; border:0; outline:none; text-decoration:none; height:auto; width:${width}px;"
              />
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}
// Webhook receipt email sender
async function sendWebhookBookingReceipt(bookingId) {
    try {
        const booking = await storage.getBooking(bookingId);
        if (!booking || !booking.email) {
            console.error('[receipt] cannot send: booking not found or missing email', { bookingId });
            return;
        }
        const amount = booking.amount ? (booking.amount / 100).toFixed(2) : '0.00';
        // Format dates based on service type
        let serviceDates = '';
        if (booking.serviceType === 'boarding' && booking.checkinDate && booking.checkoutDate) {
            serviceDates = `${booking.checkinDate} to ${booking.checkoutDate}`;
        }
        else if (booking.serviceType === 'daycare' && booking.serviceDate) {
            serviceDates = booking.serviceDate;
        }
        else if (booking.serviceType === 'trial' && booking.trialDate) {
            serviceDates = booking.trialDate;
        }
        const serviceTypeLabel = booking.serviceType === 'daycare' ? 'Daycare' :
            booking.serviceType === 'boarding' ? 'Boarding' :
                booking.serviceType === 'trial' ? 'Trial Day' : booking.serviceType;
        const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; color: #2D1F16;">
        ${renderLogoBlockCID()}

        <h2 style="text-align: center; margin: 32px 0 8px; color: #2D1F16;">Payment Successful! 🎉</h2>
        <p style="text-align: center; color: #555; font-size: 16px;">Thank you for booking with <strong>The Howliday Inn</strong></p>

        <div style="background-color: #FAF8F4; padding: 24px; border-radius: 8px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; color: #666; font-size: 15px;">Booking Reference</td>
              <td style="padding: 12px 0; text-align: right; font-family: monospace; font-weight: bold; color: #2D1F16;">${bookingId}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #666; font-size: 15px;">Service</td>
              <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #2D1F16;">${serviceTypeLabel}</td>
            </tr>
            ${serviceDates ? `
            <tr>
              <td style="padding: 12px 0; color: #666; font-size: 15px;">Date${booking.serviceType === 'boarding' ? 's' : ''}</td>
              <td style="padding: 12px 0; text-align: right; color: #2D1F16;">${serviceDates}</td>
            </tr>
            ` : ''}
            ${booking.dogName ? `
            <tr>
              <td style="padding: 12px 0; color: #666; font-size: 15px;">Dog's Name</td>
              <td style="padding: 12px 0; text-align: right; color: #2D1F16;">${booking.dogName}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 12px 0; color: #666; font-size: 15px; border-top: 2px solid #C9A66B; padding-top: 16px;">Amount Paid</td>
              <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 20px; color: #C9A66B; border-top: 2px solid #C9A66B; padding-top: 16px;">
                €${amount}
              </td>
            </tr>
          </table>
        </div>

        <div style="background-color: #FFF9E6; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #C9A66B;">
          <h3 style="margin: 0 0 12px; color: #2D1F16; font-size: 16px;">What happens next?</h3>
          <ol style="margin: 0; padding-left: 20px; color: #555; line-height: 1.8;">
            <li>You'll receive a confirmation email with all booking details</li>
            <li>Please arrive during your selected drop-off time</li>
            <li>Bring any special instructions or medications for your dog</li>
          </ol>
        </div>

        <div style="background-color: #FAF8F4; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <h4 style="margin: 0 0 12px; color: #C9A66B; font-size: 15px;">Important Reminders</h4>
          <ul style="margin: 0; padding-left: 20px; color: #666; font-size: 14px; line-height: 1.8;">
            <li>Ensure your dog's vaccinations are up to date</li>
            <li>Bring vaccination records if requested</li>
            <li>Contact us if you need to make any changes</li>
          </ul>
        </div>

        <hr style="border: none; border-top: 1px solid #E5E5E5; margin: 32px 0;" />

        <div style="text-align: center; font-size: 13px; color: #888; line-height: 1.6;">
          <p style="margin: 8px 0;"><strong style="color: #2D1F16;">The Howliday Inn</strong></p>
          <p style="margin: 8px 0;">Kilgarvan, Curraghabinny, Carrigaline, Co. Cork, Ireland</p>
          <p style="margin: 8px 0;">
            <strong>Phone:</strong> <a href="tel:+353873345702" style="color: #C9A66B; text-decoration: none;">(087) 334-5702</a><br/>
            <strong>Email:</strong> <a href="mailto:howlidayinn1@gmail.com" style="color: #C9A66B; text-decoration: none;">howlidayinn1@gmail.com</a>
          </p>
        </div>
      </div>
    `;
        const { sendReceiptEmailCID } = await import('./email/sendReceipt.js');
        const emailResponse = await sendReceiptEmailCID({
            to: booking.email,
            subject: `Payment Confirmed - The Howliday Inn Booking #${bookingId.substring(0, 8)}`,
            html
        });
        console.log('[receipt] email sent', {
            bookingId,
            to: booking.email,
            emailId: emailResponse?.data?.id || emailResponse,
            status: 'SUCCESS'
        });
    }
    catch (error) {
        console.error('[receipt] send failed:', {
            bookingId,
            error: error?.message,
            stack: error?.stack
        });
    }
}
// Webhook payment success handler
async function handleWebhookPaymentSuccess(metadata, paymentIntentId) {
    const { bookingId, reservationId } = metadata;
    if (!bookingId || bookingId === 'n/a') {
        console.error('[payment] CRITICAL: No bookingId in payment metadata', {
            metadata,
            paymentIntentId,
            reason: 'MISSING_BOOKING_ID'
        });
        return;
    }
    console.log('[payment] processing success', { bookingId, reservationId, paymentIntentId });
    try {
        // Handle reservation commit if reservationId provided
        if (reservationId) {
            await commitReservation(reservationId);
        }
        // Update booking status to confirmed and paid
        await storage.updateBooking(bookingId, {
            status: 'confirmed',
            paymentStatus: 'paid'
        });
        console.log('[payment] booking updated', { bookingId, status: 'confirmed', paymentStatus: 'paid' });
        // Send receipt email
        await sendWebhookBookingReceipt(bookingId);
    }
    catch (error) {
        console.error('[payment] error updating booking', {
            bookingId,
            error: error?.message,
            stack: error?.stack
        });
        throw error;
    }
}
// Stripe webhook handler
async function stripeWebhookHandler(req, res) {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
        console.error('[wh] Missing STRIPE_WEBHOOK_SECRET');
        return res.status(400).send('Webhook secret not configured');
    }
    let event;
    try {
        // Use rawBody from Firebase Functions v2
        const body = req.rawBody || req.body;
        event = getStripe().webhooks.constructEvent(body, sig, endpointSecret);
        console.log('[wh] event', event.type, 'id:', event.id);
    }
    catch (err) {
        console.error('[wh] signature verification failed:', { msg: err?.message, name: err?.name });
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    try {
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                console.log('[wh] payment_intent.succeeded', {
                    id: paymentIntent.id,
                    amount: paymentIntent.amount,
                    currency: paymentIntent.currency,
                    metadata: paymentIntent.metadata
                });
                await handleWebhookPaymentSuccess(paymentIntent.metadata, paymentIntent.id);
                break;
            case 'checkout.session.completed':
                const session = event.data.object;
                console.log('[wh] checkout.session.completed', {
                    id: session.id,
                    amount_total: session.amount_total,
                    currency: session.currency,
                    metadata: session.metadata
                });
                await handleWebhookPaymentSuccess(session.metadata || {}, session.id);
                break;
            default:
                console.log('[wh] unhandled event type:', event.type);
        }
        res.json({ received: true });
    }
    catch (error) {
        console.error('[wh] handling error:', { msg: error?.message, name: error?.name, stack: error?.stack });
        res.status(500).json({ error: 'Webhook handling failed' });
    }
}
export function buildApp(app) {
    // Logging middleware
    app.use((req, res, next) => {
        const start = Date.now();
        const path = req.path;
        let capturedJsonResponse = undefined;
        const originalResJson = res.json;
        res.json = function (bodyJson, ...args) {
            capturedJsonResponse = bodyJson;
            return originalResJson.apply(res, [bodyJson, ...args]);
        };
        res.on("finish", () => {
            const duration = Date.now() - start;
            if (path.startsWith("/api")) {
                let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
                if (capturedJsonResponse) {
                    logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
                }
                if (logLine.length > 80) {
                    logLine = logLine.slice(0, 79) + "…";
                }
                console.log(logLine);
            }
        });
        next();
    });
    // Stripe webhook handler (raw body already configured in index.ts)
    app.post("/api/stripe/webhook", stripeWebhookHandler);
    // GET handler for webhook path - returns 405
    app.get("/api/stripe/webhook", (_req, res) => {
        res.status(405).send("Method Not Allowed");
    });
    // Mount routers
    app.use("/api/auth", authRouter);
    app.use(dogsRouter);
    app.use(adminDogsRouter);
    app.use(bookingRouter);
    app.use("/api/checkout", checkoutRouter);
    app.use(usersRouter);
    app.use(settingsRouter);
    app.use(remindersRouter);
    app.use("/api/availability", availabilityRouter);
    app.use("/api/reservations", reservationsRouter);
    app.use(authBootstrap);
    // Upload provider routes
    if (process.env.UPLOADS_PROVIDER === 'cloudinary') {
        registerCloudinaryRoutes(app);
    }
    // Health endpoints
    app.get("/api/health", async (_req, res) => {
        try {
            res.json({
                ok: true,
                projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || null,
                hasDbUrl: !!(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL),
            });
        }
        catch (e) {
            res.status(500).json({ ok: false, error: e?.message });
        }
    });
    app.get("/api/ops/health/firebase", firebaseHealthHandler);
    app.get("/api/ops/health/stripe", stripeHealthHandler);
    // Error handler
    app.use((err, _req, res, _next) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        res.status(status).json({ message });
        console.error(err);
    });
    return app;
}
