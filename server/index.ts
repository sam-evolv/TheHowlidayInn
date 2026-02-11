import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
// TODO HowlidayInn: Import new Drizzle-based routes
import dogsRouter from "./routes/dogs";
import adminDogsRouter from "./routes/adminDogs";
import bookingRouter from "./routes/booking";
import checkoutRouter from "./routes/checkout";
import paymentsRouter from "./routes/payments";
import usersRouter from "./routes/users";
import settingsRouter from "./routes/settings";
import remindersRouter from "./routes/reminders";
import availabilityRouter from "./routes/availability";
import reservationsRouter from "./routes/reservations";
import adminSettingsRouter from "./routes/adminSettings";
import demoRoute from "./routes/demo";
import { registerCloudinaryRoutes } from "./uploads/cloudinary";
import { authBootstrap } from "./routes/authBootstrap";
import { firebaseHealthHandler, checkFirebaseEnv } from "./utils/firebaseConfigCheck";
import { stripeHealthHandler } from "./utils/stripeHealth";
import { authRouter } from "./routes/auth";
import { ensureOwnerExists } from "./auth/bootstrapOwner";
import { startSweeper } from "./jobs/sweeper";

// TODO HowlidayInn: Startup environment variable checks
function checkRequiredEnvVars() {
  const requiredVars = [
    'DATABASE_URL',
    'STRIPE_SECRET_KEY',
    'ADMIN_CRON_TOKEN'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`⚠️  Missing required environment variables: ${missingVars.join(', ')}`);
    console.warn('Some features may not work correctly.');
  }
  
  // Check Cloudinary configuration if uploads provider is set to cloudinary
  if (process.env.UPLOADS_PROVIDER === 'cloudinary') {
    const cloudinaryVars = [
      'CLOUDINARY_CLOUD_NAME', 
      'CLOUDINARY_UPLOAD_PRESET', 
      'CLOUDINARY_API_KEY', 
      'CLOUDINARY_API_SECRET'
    ];
    const missingCloudinary = cloudinaryVars.filter(varName => !process.env[varName]);
    if (missingCloudinary.length > 0) {
      console.warn(`⚠️  Cloudinary upload provider selected but missing: ${missingCloudinary.join(', ')}`);
      console.warn('Vaccination document uploads will not work without proper Cloudinary configuration.');
    }
  } else if (!process.env.UPLOADS_PROVIDER) {
    console.warn('⚠️  UPLOADS_PROVIDER not set. Vaccination document uploads may not work.');
  }
}

checkRequiredEnvVars();

// Log Stripe key presence (not value)
console.log("[server] STRIPE_SECRET_KEY present:", !!process.env.STRIPE_SECRET_KEY);

// Firebase config check at startup
(function () {
  const r = checkFirebaseEnv(process.env as any);
  const mode = (process.env.VITE_STRIPE_PUBLIC_KEY || "").startsWith("pk_live_") ? "live" : "test";
  console.log(`[health] firebase ok=${r.ok} missing=${r.missing.length} warn=${r.warnings.length} mode=${mode}`);
  if (!r.ok) {
    console.warn("[health] firebase diagnostics:", r.diagnostics);
    if (r.missing.length) console.warn("[health] firebase missing:", r.missing);
  }
})();

// CORS: Allow Netlify frontend to call this API cross-origin
const ALLOWED_ORIGINS = [
  'https://thehowlidayinn.netlify.app',
  'https://thehowlidayinn.ie',
  'https://www.thehowlidayinn.ie',
];

const app = express();

// Normalize duplicate slashes in the request path FIRST (before any middleware)
// This must be the very first middleware to prevent Express router redirects
app.use((req, _res, next) => {
  if (req.url) {
    const [path, query = ''] = req.url.split('?', 2);
    const normalized = path.replace(/\/{2,}/g, '/');
    req.url = query ? `${normalized}?${query}` : normalized;
  }
  next();
});

// trust Replit's proxy so HTTPS is detected
app.set('trust proxy', 1);

// CORS middleware — must be before routes
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('--thehowlidayinn.netlify.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Cron');
    res.setHeader('Access-Control-Expose-Headers', 'content-type, access-control-allow-origin');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// one origin: https + www (only for custom domain, skip Replit/API)
app.use((req, res, next) => {
  const host = req.headers.host || '';
  // Skip redirect for Replit domain and API paths — Replit handles its own TLS
  if (host.includes('.replit.app') || host.includes('.repl.co') || req.path.startsWith('/api/')) {
    return next();
  }
  const isHttps = req.headers['x-forwarded-proto'] === 'https';
  if (!isHttps) {
    return res.redirect(301, `https://www.thehowlidayinn.ie${req.originalUrl}`);
  }
  if (host === 'thehowlidayinn.ie') {
    return res.redirect(301, `https://www.thehowlidayinn.ie${req.originalUrl}`);
  }
  next();
});

// Cookie parser
app.use(cookieParser());

// Mount demo bypass route BEFORE maintenance gate (must be early in middleware chain)
app.use(demoRoute);

// ============================================================================
// MAINTENANCE MODE SYSTEM
// ============================================================================
import fs from 'fs';
import path from 'path';

const BYPASS_TOKEN = process.env.MAINTENANCE_BYPASS_TOKEN || 'letmein-123';
const MAINT_FILE = '.maintenance';

function getMaintState(): 'on' | 'off' {
  try {
    const val = fs.readFileSync(MAINT_FILE, 'utf8').trim().toLowerCase();
    if (val === 'on' || val === 'off') return val as 'on' | 'off';
  } catch {}
  return (process.env.MAINTENANCE_MODE || 'off').toLowerCase() as 'on' | 'off';
}

function setMaintState(state: boolean): void {
  fs.writeFileSync(MAINT_FILE, state ? 'on' : 'off');
}

// Bypass setter via query parameter
app.use((req, res, next) => {
  const adminToken = req.query.admin as string | undefined;
  if (adminToken && adminToken === BYPASS_TOKEN) {
    res.cookie('maintenance_bypass', BYPASS_TOKEN, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    });
    return res.redirect(req.path || '/');
  }
  next();
});

// Toggle endpoints (protected by token)
app.get('/_maint/on', (req, res) => {
  if (req.query.token !== BYPASS_TOKEN) {
    return res.status(401).send('Unauthorized');
  }
  setMaintState(true);
  res.type('text').send('✅ Maintenance mode: ON\n\nPublic now sees: /public/maintenance.html\n\nBypass: add ?admin=' + BYPASS_TOKEN + ' to URL');
});

app.get('/_maint/off', (req, res) => {
  if (req.query.token !== BYPASS_TOKEN) {
    return res.status(401).send('Unauthorized');
  }
  setMaintState(false);
  res.type('text').send('✅ Maintenance mode: OFF\n\nSite is now public');
});

// Status endpoint (read-only, no auth required)
app.get('/_maint/status', (_req, res) => {
  const state = getMaintState();
  res.type('text').send(`maintenance=${state}`);
});

// Clear bypass cookie (allows testing public view)
app.get('/_maint/forget', (_req, res) => {
  res.clearCookie('maintenance_bypass', { path: '/' });
  res.type('text').send('✅ Bypass cookie cleared\n\nYou now see the public view.\nRefresh to see maintenance page if mode is ON.');
});

// Maintenance gate middleware
app.use((req, res, next) => {
  const isOn = getMaintState() === 'on';
  const hasBypass = req.cookies.maintenance_bypass === BYPASS_TOKEN;
  
  // Always allow these paths through (needed for maintenance page assets)
  const allowedPaths = [
    '/_maint/',           // Toggle endpoints
    '/maintenance.css',   // Maintenance page styling
    '/logo.png',          // Logo on maintenance page
    '/favicon.ico'        // Browser favicon
  ];
  
  if (allowedPaths.some(p => req.path.startsWith(p) || req.path === p)) {
    return next();
  }
  
  if (isOn && !hasBypass) {
    return res.sendFile(path.join(process.cwd(), 'public', 'maintenance.html'));
  }
  next();
});

console.log('[maintenance] state:', getMaintState());
console.log('[maintenance] status:', '/_maint/status');
console.log('[maintenance] forget bypass:', '/_maint/forget');
console.log('[maintenance] toggle endpoints: /_maint/on and /_maint/off (token required)');
console.log('[maintenance] preview:', '/maintenance.html');

// ============================================================================
// END MAINTENANCE MODE SYSTEM
// ============================================================================

// Compression middleware for all responses
app.use(compression());

// Caching headers for static assets
app.use('/assets', (req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  next();
});

// Raw body parser for Stripe webhook before JSON parser
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Import Stripe for webhook handling
import Stripe from 'stripe';
import { getUncachableResendClient } from './lib/resendClient.js';
import { storage } from './storage.js';
import { db } from './db/client';
import { availability, reservations } from './db/schema';
import { and, eq, sql } from 'drizzle-orm';

// Initialize Stripe
let stripeInstance: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
    }
    stripeInstance = new Stripe(secretKey);
  }
  return stripeInstance;
}

// Stripe webhook handler - MUST be before express.json() to use raw body
app.post("/api/stripe/webhook", async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error('[wh] Missing STRIPE_WEBHOOK_SECRET');
    return res.status(400).send('Webhook secret not configured');
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('[wh] event', event.type, 'id:', event.id);
  } catch (err: any) {
    console.error('[wh] signature verification failed:', { msg: err?.message, name: err?.name });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('[wh] payment_intent.succeeded', {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          metadata: paymentIntent.metadata
        });
        await handleWebhookPaymentSuccess(paymentIntent.metadata, paymentIntent.id);
        break;
      
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
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

  } catch (error: any) {
    console.error('[wh] handling error:', { msg: error?.message, name: error?.name, stack: error?.stack });
    res.status(500).json({ error: 'Webhook handling failed' });
  }
});

// GET handler for webhook path - returns 405 to confirm Express owns this path
app.get("/api/stripe/webhook", (_req, res) => {
  res.status(405).send("Method Not Allowed");
});

// Webhook payment success handler
async function handleWebhookPaymentSuccess(metadata: { [key: string]: string | null }, paymentIntentId?: string) {
  const { bookingId, reservationId } = metadata;
  
  // Guard: ensure bookingId exists
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
  } catch (error: any) {
    console.error('[payment] error updating booking', { 
      bookingId, 
      error: error?.message, 
      stack: error?.stack 
    });
    throw error;
  }
}

// Commit a reservation (move from reserved to confirmed)
async function commitReservation(reservationId: string) {
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

    await db.transaction(async (tx: any) => {
      // Mark reservation as committed
      await tx
        .update(reservations)
        .set({ 
          status: 'committed',
          updatedAt: new Date(),
        })
        .where(eq(reservations.id, reservationId));

      // Build availability query conditions
      // Use "ALL_DAY" as sentinel for null/empty slots to match availability route
      const slotValue = (reservation.slot && reservation.slot.trim()) || "ALL_DAY";
      const conditions = [
        eq(availability.service, reservation.service),
        eq(availability.date, reservation.date),
        eq(availability.slot, slotValue),
      ];

      // Move 1 from reserved to confirmed
      await tx
        .update(availability)
        .set({ 
          reserved: sql`GREATEST(0, ${availability.reserved} - 1)`,
          confirmed: sql`${availability.confirmed} + 1`,
          updatedAt: new Date(),
        })
        .where(and(...conditions));
    });

    console.log('[reservation] committed successfully', { 
      reservationId, 
      service: reservation.service, 
      date: reservation.date 
    });
  } catch (error: any) {
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
const BRAND_BADGE_BG = "#FAF8F4"; // Cream background for dark mode compatibility
const BRAND_BADGE_SHADOW = "0 1px 3px rgba(0,0,0,0.08)";

// Create retina srcset for Cloudinary URLs
function retinaSrcset(url: string): string {
  return url.includes("w_320") ? `${url.replace("w_320", "w_640")} 2x` : "";
}

// Render logo block with CID inline image for guaranteed visibility
function renderLogoBlockCID(): string {
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
async function sendWebhookBookingReceipt(bookingId: string) {
  try {
    const booking = await storage.getBooking(bookingId);
    if (!booking || !booking.email) {
      console.error('[receipt] cannot send: booking not found or missing email', { bookingId });
      return;
    }

    const amount = booking.amount ? (booking.amount / 100).toFixed(2) : '0.00';
    
    // Format dates based on service type
    let serviceDates = '';
    if (booking.serviceType.startsWith('boarding') && booking.checkinDate && booking.checkoutDate) {
      serviceDates = `${booking.checkinDate} to ${booking.checkoutDate}`;
    } else if (booking.serviceType === 'daycare' && booking.serviceDate) {
      serviceDates = booking.serviceDate;
    } else if (booking.serviceType === 'trial' && booking.trialDate) {
      serviceDates = booking.trialDate;
    }

    const serviceTypeLabel = booking.serviceType === 'daycare' ? 'Daycare' : 
                             booking.serviceType.startsWith('boarding') ? 'Boarding' :
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
              <td style="padding: 12px 0; color: #666; font-size: 15px;">Date${booking.serviceType.startsWith('boarding') ? 's' : ''}</td>
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

    const { sendReceiptEmailCID } = await import('./email/sendReceipt');
    
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
  } catch (error: any) {
    console.error('[receipt] send failed:', { 
      bookingId, 
      error: error?.message, 
      stack: error?.stack 
    });
    // Don't throw - payment is already successful, just log the email error
  }
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

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

      log(logLine);
    }
  });

  next();
});

// TODO HowlidayInn: Wire new Drizzle-based routes at startup level
app.use("/api/auth", authRouter);
app.use(dogsRouter);
app.use(adminDogsRouter);
app.use(bookingRouter);
app.use("/api/checkout", checkoutRouter);
app.use("/api/payments", paymentsRouter);
app.use(usersRouter);
app.use(settingsRouter);
app.use(remindersRouter);
app.use("/api/availability", availabilityRouter);
app.use("/api/reservations", reservationsRouter);
app.use("/api/admin/settings", adminSettingsRouter);
app.use(authBootstrap);

// Start TTL sweeper job (runs every minute to clean up expired reservations)
startSweeper();

// TODO HowlidayInn: Register upload provider routes
if (process.env.UPLOADS_PROVIDER === 'cloudinary') {
  registerCloudinaryRoutes(app);
}

(async () => {
  // Bootstrap owner account on startup
  await ensureOwnerExists();
  
  const server = await registerRoutes(app);

  app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

  // Health endpoints - defined before SPA fallback to prevent hijacking
  app.get("/api/ops/health/firebase", firebaseHealthHandler);
  app.get("/api/ops/health/stripe", stripeHealthHandler);

  // --- BEGIN: Maintenance direct + preview routes ---
  // Serve the maintenance assets from /public (these also handled by allowlist middleware above)
  app.use('/maintenance.css', express.static(path.join(process.cwd(), 'public', 'maintenance.css')));
  app.use('/logo.png', express.static(path.join(process.cwd(), 'public', 'logo.png')));

  // Direct route to the maintenance page (so /maintenance.html doesn't hit SPA router)
  app.get('/maintenance.html', (_req, res) => {
    return res.sendFile(path.join(process.cwd(), 'public', 'maintenance.html'));
  });

  // Private preview (no public impact) - requires token
  app.get('/_maint/preview', (req, res) => {
    const token = process.env.MAINTENANCE_BYPASS_TOKEN || 'letmein-123';
    if (req.query.token !== token) {
      return res.status(401).send('Unauthorized');
    }
    return res.sendFile(path.join(process.cwd(), 'public', 'maintenance.html'));
  });
  // --- END: Maintenance direct + preview routes ---

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("[error handler]", { status, message, stack: err?.stack });
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
