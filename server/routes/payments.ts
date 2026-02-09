import { Router } from 'express';
import Stripe from 'stripe';
import type { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { db } from '../db/client';
import { bookings } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-11-20.acacia' as any,
});

// Utility to derive origin for success/cancel
function getOrigin(req: Request) {
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host  = (req.headers['x-forwarded-host']  as string) || req.headers.host;
  return `${proto}://${host}`;
}

/**
 * POST /api/payments/checkout
 * Body: { bookingId, email }
 * Returns: { url }
 * Strategy: Look up booking in database to get verified price, create a Checkout Session, and return the hosted page URL for hard redirect.
 */
router.post('/checkout', async (req: Request, res: Response) => {
  try {
    const { bookingId, email } = req.body || {};

    if (!bookingId || !email) {
      return res.status(400).json({ error: 'Missing required fields: bookingId, email' });
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    // Look up booking to get server-verified price and details
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const origin = getOrigin(req);

    // Use server-verified booking amount (already in cents)
    const amount = booking.amount || 0;
    const service = booking.serviceType;
    const date = booking.serviceDate || booking.checkinDate || 'N/A';
    const dogId = booking.dogId || 'unknown';
    const userId = booking.userId || 'unknown';
    const currency = booking.currency || 'eur';

    // Enhanced metadata with new pricing details
    const metadata: Record<string, string> = {
      service: String(service),
      date: String(date),
      dogId: String(dogId),
      userId: String(userId),
      bookingId: String(bookingId),
      amountEUR: String(amount / 100),
    };

    // Add boarding-specific pricing metadata
    if (service === 'boarding:small' || service === 'boarding:large') {
      const dogs = service === 'boarding:large' ? 2 : 1;
      metadata.dogs = String(dogs);
      
      if (booking.checkinDate && booking.checkoutDate) {
        const checkinTime = new Date(booking.checkinDate).getTime();
        const checkoutTime = new Date(booking.checkoutDate).getTime();
        const totalHours = (checkoutTime - checkinTime) / (1000 * 60 * 60);
        const nights = Math.max(1, Math.ceil(totalHours / 24));
        metadata.nights = String(nights);
      }
      
      if (booking.pickupWindow) {
        metadata.pickupWindow = String(booking.pickupWindow);
      }
      
      metadata.pricingModel = '24h + PM pickup surcharge if applicable';
    } else if (service === 'daycare') {
      metadata.flatRate = '20';
      metadata.pricingModel = 'flat rate';
    } else if (service === 'trial') {
      metadata.flatRate = '20';
      metadata.pricingModel = 'flat rate';
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: `Howliday Inn - ${service}`,
              metadata,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata, // duplicate at session level for webhook convenience
      payment_intent_data: {
        metadata, // CRITICAL: Also attach metadata to PaymentIntent so it's available in payment_intent.succeeded event
      },
      // If you need to send email receipts
      customer_email: email || undefined,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
      // Reduce SCA friction
      allow_promotion_codes: false,
      billing_address_collection: 'auto',
    });

    return res.json({ url: session.url });
  } catch (err: any) {
    console.error('CHECKOUT ERROR:', err?.message || err);
    return res.status(500).json({ error: 'Unable to start checkout' });
  }
});

/**
 * POST /api/payments/webhook
 * Set STRIPE_WEBHOOK_SECRET in env. This finalises booking on event=checkout.session.completed
 */
router.post('/webhook', bodyParser.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).send('Missing webhook signature');
  }
  try {
    const event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = session.metadata || {};
      
      // AUTO_TRIAL_MARK: Auto-complete trial when Trial Day booking is paid
      if (process.env.AUTO_TRIAL_MARK === 'true' && meta.service === 'trial' && meta.dogId && meta.date) {
        const { storage } = await import('../storage');
        const trialDate = new Date(meta.date);
        // Set completion time to end of business day (17:59:59 local)
        trialDate.setHours(17, 59, 59, 0);
        
        try {
          await storage.updateDog(meta.dogId, {
            trialRequired: false,
            trialCompletedAt: trialDate,
            trialCompletedByUserId: null,
            trialNote: 'Auto-completed via payment webhook'
          } as any);
          console.log('AUTO_TRIAL_MARK: Trial completed for dog', meta.dogId);
        } catch (err) {
          console.error('AUTO_TRIAL_MARK: Failed to mark trial completed', err);
        }
      }
      
      console.log('WEBHOOK COMPLETED:', { sessionId: session.id, meta });
    }
    res.json({ received: true });
  } catch (err: any) {
    console.error('WEBHOOK ERROR:', err?.message || err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

/**
 * GET /api/payments/verify?session_id=cs_...
 * Used by the success page to confirm payment if webhook is delayed.
 */
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const sessionId = String(req.query.session_id || '');
    if (!sessionId) return res.status(400).json({ paid: false, error: 'missing session_id' });
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
    const paid = session.payment_status === 'paid';
    const meta = session.metadata || {};
    
    // AUTO_TRIAL_MARK: Also handle trial completion in verify endpoint (fallback if webhook was delayed)
    if (paid && process.env.AUTO_TRIAL_MARK === 'true' && meta.service === 'trial' && meta.dogId && meta.date) {
      const { storage } = await import('../storage');
      const dog = await storage.getDog(meta.dogId);
      
      // Only mark if not already marked
      if (dog && (dog as any).trialRequired) {
        const trialDate = new Date(meta.date);
        trialDate.setHours(17, 59, 59, 0);
        
        try {
          await storage.updateDog(meta.dogId, {
            trialRequired: false,
            trialCompletedAt: trialDate,
            trialCompletedByUserId: null,
            trialNote: 'Auto-completed via payment verification'
          } as any);
          console.log('AUTO_TRIAL_MARK (verify): Trial completed for dog', meta.dogId);
        } catch (err) {
          console.error('AUTO_TRIAL_MARK (verify): Failed to mark trial completed', err);
        }
      }
    }
    
    return res.json({ paid, metadata: meta, sessionId });
  } catch (err: any) {
    console.error('VERIFY ERROR:', err?.message || err);
    return res.status(500).json({ paid: false, error: 'verify-failed' });
  }
});

export default router;
