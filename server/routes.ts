import type { Express, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookingSchema, insertCustomerSchema } from "@shared/schema";
import { computeBoarding, computeDaycare, computeTrial, type PricingModel } from "@shared/pricing";
import { z } from "zod";
import Stripe from "stripe";
import { requireAuth, requireAdmin, optionalAuth, type AuthenticatedRequest } from "./middleware/auth";
import { requireOwnerAuth } from "./auth/session";
import { admin } from "./firebase-admin";

// Use Firestore from admin
const adminDb = admin.firestore();
import { 
  EnhancedFirebaseDog, 
  Vaccination, 
  HealthProfile, 
  KennelSettings,
  COLLECTIONS,
  createInsertVaccinationSchema,
  createInsertHealthProfileSchema,
  createInsertKennelSettingsSchema,
  // createInsertDogSchema, // Removed - use proper validation in new routes
  createUpdateDogSchema
} from "./types/dogProfile";
import { recomputeAndUpdateDogStatus } from "./businessLogic";
import { getUncachableResendClient } from "./lib/resendClient.js";
import { db } from "./db/client";
import { users, dogs, vaccinations, healthProfiles, settings } from "./db/schema";
import { eq, desc } from "drizzle-orm";
import { ensureTenant } from "./services/userService";

// Legacy Stripe initialization - Use getStripe() factory for safer initialization
let stripe: Stripe | null = null;
function getLegacyStripe(): Stripe {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
    }
    stripe = new Stripe(secretKey);
  }
  return stripe;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Stripe configuration endpoint - provides publishable key to frontend
  app.get('/api/stripe/config', (req, res) => {
    const publishableKey = process.env.VITE_STRIPE_PUBLIC_KEY;
    if (!publishableKey) {
      return res.status(500).json({ error: 'Stripe publishable key not configured' });
    }
    res.json({ publishableKey });
  });

  // Get all bookings
  app.get('/api/bookings', requireOwnerAuth, async (req, res) => {
    try {
      const bookings = await storage.getBookings();
      const safeBookings = bookings.map(({ email, phone, ownerName, emergencyName, emergencyPhone, ...rest }: any) => rest);
      res.json(safeBookings);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch bookings' });
    }
  });

  // Get booking by ID
  app.get('/api/bookings/:id', requireOwnerAuth, async (req, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch booking' });
    }
  });

  // Helper function to convert time slot to ISO datetime
  const timeSlotToISO = (date: string, timeSlot: string): string => {
    const startTime = timeSlot.split('-')[0].trim();
    return `${date}T${startTime}:00.000Z`;
  };

  // Create new booking
  app.post('/api/bookings', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertBookingSchema.parse(req.body);
      
      // Booking pause validation (Christmas period)
      const { validateTrialBooking, validateDaycareOrBoardingBooking } = await import('./featureFlags');
      const overrideHeader = req.headers['x-booking-override'] as string | undefined;
      
      // Block trial bookings during pause period
      if (validatedData.serviceType === 'trial') {
        try {
          validateTrialBooking(overrideHeader);
        } catch (error: any) {
          return res.status(403).json({
            code: 'TRIAL_BOOKING_PAUSED',
            message: error.message || 'Trial bookings are currently unavailable.'
          });
        }
      }
      
      // Require trial completion confirmation for daycare/boarding during pause
      if (validatedData.serviceType === 'daycare' || 
          validatedData.serviceType === 'boarding:small' || 
          validatedData.serviceType === 'boarding:large') {
        try {
          validateDaycareOrBoardingBooking(validatedData.trialCompleted, overrideHeader);
        } catch (error: any) {
          return res.status(403).json({
            code: 'TRIAL_CONFIRMATION_REQUIRED',
            message: error.message || 'Trial completion confirmation required.'
          });
        }
      }
      
      // Server-side time slot validation
      const { getDailyWindows, isTimeSlotValid } = await import('@shared/hoursPolicy');
      
      // Validate daycare time slot
      if (validatedData.serviceType === 'daycare' && validatedData.serviceDate && validatedData.timeSlot) {
        const serviceDate = new Date(validatedData.serviceDate);
        if (!isTimeSlotValid(serviceDate, validatedData.timeSlot)) {
          return res.status(400).json({ 
            message: 'Invalid time slot for selected date. Drop-off and collection are only available during operating windows.' 
          });
        }
      }
      
      // Validate boarding check-in/check-out time slots
      if ((validatedData.serviceType === 'boarding:small' || validatedData.serviceType === 'boarding:large') && 
          validatedData.checkinDate && validatedData.checkoutDate) {
        
        if (validatedData.checkinTimeSlot) {
          const checkinDate = new Date(validatedData.checkinDate);
          if (!isTimeSlotValid(checkinDate, validatedData.checkinTimeSlot)) {
            return res.status(400).json({ 
              message: 'Invalid check-in time slot. Check-in is only available during operating windows.' 
            });
          }
        }
        
        if (validatedData.checkoutTimeSlot) {
          const checkoutDate = new Date(validatedData.checkoutDate);
          if (!isTimeSlotValid(checkoutDate, validatedData.checkoutTimeSlot)) {
            return res.status(400).json({ 
              message: 'Invalid check-out time slot. Check-out is only available during operating windows.' 
            });
          }
        }
      }
      
      // Trial Day gating enforcement - block Daycare/Boarding if trial required
      if ((validatedData.serviceType === 'daycare' || 
           validatedData.serviceType === 'boarding:small' || 
           validatedData.serviceType === 'boarding:large') && 
          validatedData.dogId) {
        
        const dog = await storage.getDog(validatedData.dogId);
        if (dog) {
          const { trialEligibility: calculateEligibility } = await import('@shared/trial');
          const eligibility = calculateEligibility(
            (dog as any).trialRequired ?? true,
            (dog as any).trialCompletedAt?.toISOString()
          );

          if (eligibility.trialRequired) {
            return res.status(403).json({
              code: 'TRIAL_REQUIRED',
              message: 'A Trial Day must be completed before booking this service.'
            });
          }

          if (!eligibility.eligible && eligibility.eligibleFrom) {
            return res.status(403).json({
              code: 'TRIAL_COOLDOWN',
              message: 'Daycare and boarding unlock the day after your Trial Day.',
              eligibleFrom: eligibility.eligibleFrom
            });
          }
        }
      }
      
      // Feature-flagged pricing model
      const pricingModel = (process.env.PRICING_MODEL || 'hours_v1') as PricingModel;
      
      // Server-side authoritative price calculation
      let calculatedAmountEUR = 0;
      let pricingMetadata: Record<string, any> = { pricingModel };
      let nightsCalculated: number | undefined;
      let pmSurchargeCalculated: number | undefined;
      
      if (validatedData.serviceType === 'daycare') {
        const result = computeDaycare(pricingModel);
        calculatedAmountEUR = result.total;
        pricingMetadata = { ...pricingMetadata, serviceType: 'daycare', flatRate: calculatedAmountEUR };
      } else if (validatedData.serviceType === 'trial') {
        const result = computeTrial(pricingModel);
        calculatedAmountEUR = result.total;
        pricingMetadata = { ...pricingMetadata, serviceType: 'trial', flatRate: calculatedAmountEUR };
      } else if (validatedData.serviceType === 'boarding:small' || validatedData.serviceType === 'boarding:large') {
        // Boarding price calculation
        if (!validatedData.checkinDate || !validatedData.checkoutDate || 
            !validatedData.checkinTimeSlot || !validatedData.checkoutTimeSlot) {
          return res.status(400).json({ 
            message: 'Missing required boarding fields: checkinDate, checkoutDate, checkinTimeSlot, checkoutTimeSlot' 
          });
        }
        
        // v1 requires pickupWindow, v2 derives PM from checkoutTimeSlot
        if (pricingModel === 'hours_v1' && !validatedData.pickupWindow) {
          return res.status(400).json({ 
            message: 'Missing required field for hours_v1 pricing: pickupWindow' 
          });
        }
        
        const dogCount = validatedData.serviceType === 'boarding:large' ? 2 : 1;
        const checkinISO = timeSlotToISO(validatedData.checkinDate, validatedData.checkinTimeSlot);
        const checkoutISO = timeSlotToISO(validatedData.checkoutDate, validatedData.checkoutTimeSlot);
        
        const pricing = computeBoarding({
          dogCount,
          checkinISO,
          checkoutISO,
          checkoutTimeLabel: validatedData.checkoutTimeSlot,
          pickupWindow: validatedData.pickupWindow as 'AM' | 'PM' | undefined,
        }, pricingModel);
        
        calculatedAmountEUR = pricing.total;
        nightsCalculated = pricing.nights;
        pmSurchargeCalculated = pricing.pmSurcharge;
        
        pricingMetadata = {
          ...pricingMetadata,
          serviceType: validatedData.serviceType,
          dogCount,
          nights: pricing.nights,
          perNight: pricing.perNight,
          pmSurcharge: pricing.pmSurcharge,
          checkoutTimeSlot: validatedData.checkoutTimeSlot,
        };
      } else {
        return res.status(400).json({ message: 'Unsupported service type' });
      }
      
      // Override client-sent amount with server-calculated authoritative price
      validatedData.amount = Math.round(calculatedAmountEUR * 100); // Convert to cents
      validatedData.currency = 'eur';
      
      // Persist pricing metadata in booking
      const bookingWithMetadata = {
        ...validatedData,
        pricingModel,
        nights: nightsCalculated,
        pmSurcharge: pmSurchargeCalculated ? Math.round(pmSurchargeCalculated * 100) : undefined, // Store in cents
      };
      
      console.log('[booking] Server-calculated price:', {
        serviceType: validatedData.serviceType,
        amountEUR: calculatedAmountEUR,
        amountCents: validatedData.amount,
        metadata: pricingMetadata
      });
      
      // Check if customer exists
      let customer = await storage.getCustomerByEmail(validatedData.email);
      
      // If new customer, create customer record
      if (!customer) {
        customer = await storage.createCustomer({
          email: validatedData.email,
          name: validatedData.ownerName,
          phone: validatedData.phone,
          isFirstTime: true,
        });
      }

      // Create booking with calculated price and metadata
      const booking = await storage.createBooking(bookingWithMetadata);
      
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid booking data', errors: error.errors });
      }
      console.error('Error creating booking:', error);
      res.status(500).json({ message: 'Failed to create booking' });
    }
  });

  // Update booking
  app.patch('/api/bookings/:id', requireOwnerAuth, async (req, res) => {
    try {
      const booking = await storage.updateBooking(req.params.id, req.body);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update booking' });
    }
  });

  // Mark trial as complete
  app.patch('/api/bookings/:id/complete-trial', requireOwnerAuth, async (req, res) => {
    try {
      const booking = await storage.updateBooking(req.params.id, { 
        trialCompleted: true,
        status: 'completed'
      });
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: 'Failed to complete trial' });
    }
  });

  // Delete booking
  app.delete('/api/bookings/:id', requireOwnerAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteBooking(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete booking' });
    }
  });

  // Admin API: Get booking statistics
  app.get('/api/admin/stats', requireOwnerAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const allBookings = await storage.getBookings();
      
      // Calculate raw revenue
      const rawRevenue = allBookings
        .filter(b => b.paymentStatus === 'paid')
        .reduce((sum, b) => sum + (b.amount || 0), 0);
      
      // Get revenue offsets from settings
      const settings = await storage.getSettings();
      const offsets = (settings?.revenueOffsets as any) || { all: 0, byDay: {} };
      const offsetAll = Number(offsets.all) || 0;
      
      // Apply offset to get display revenue
      const displayRevenue = Math.max(0, rawRevenue - offsetAll);
      
      const stats = {
        total: allBookings.length,
        confirmed: allBookings.filter(b => b.status === 'confirmed').length,
        pending: allBookings.filter(b => b.status === 'pending').length,
        completed: allBookings.filter(b => b.status === 'completed').length,
        cancelled: allBookings.filter(b => b.status === 'cancelled').length,
        revenueCents: displayRevenue,
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Admin stats error:', error);
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // Admin API: Get filtered bookings list
  app.get('/api/admin/bookings', requireOwnerAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { date, service, status, q, limit = '100', offset = '0' } = req.query as Record<string, string>;
      
      let bookings = await storage.getBookings();
      
      // Apply filters
      if (date) {
        bookings = bookings.filter(b => {
          const bookingDate = b.serviceDate || b.checkinDate || b.trialDate;
          return bookingDate && bookingDate.startsWith(date);
        });
      }
      
      if (service && service !== 'all') {
        bookings = bookings.filter(b => b.serviceType === service);
      }
      
      if (status && status !== 'all') {
        bookings = bookings.filter(b => b.status === status);
      }
      
      if (q) {
        const search = q.toLowerCase();
        bookings = bookings.filter(b => 
          b.ownerName?.toLowerCase().includes(search) ||
          b.email?.toLowerCase().includes(search) ||
          b.dogName?.toLowerCase().includes(search) ||
          b.breed?.toLowerCase().includes(search)
        );
      }
      
      // Pagination
      const total = bookings.length;
      const limitNum = parseInt(limit);
      const offsetNum = parseInt(offset);
      bookings = bookings.slice(offsetNum, offsetNum + limitNum);
      
      res.json({ rows: bookings, total });
    } catch (error) {
      console.error('Admin bookings list error:', error);
      res.status(500).json({ message: 'Failed to fetch bookings' });
    }
  });

  // Admin API: Export bookings to CSV
  app.get('/api/admin/bookings/export', requireOwnerAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { date, service, status, q } = req.query as Record<string, string>;
      
      let bookings = await storage.getBookings();
      
      // Apply same filters as list endpoint
      if (date) {
        bookings = bookings.filter(b => {
          const bookingDate = b.serviceDate || b.checkinDate || b.trialDate;
          return bookingDate && bookingDate.startsWith(date);
        });
      }
      
      if (service && service !== 'all') {
        bookings = bookings.filter(b => b.serviceType === service);
      }
      
      if (status && status !== 'all') {
        bookings = bookings.filter(b => b.status === status);
      }
      
      if (q) {
        const search = q.toLowerCase();
        bookings = bookings.filter(b => 
          b.ownerName?.toLowerCase().includes(search) ||
          b.email?.toLowerCase().includes(search) ||
          b.dogName?.toLowerCase().includes(search)
        );
      }
      
      // Build CSV
      const headers = [
        'ID', 'Dog Name', 'Breed', 'Service', 'Date', 'Owner', 'Email', 'Phone',
        'Status', 'Payment Status', 'Amount', 'Created At'
      ];
      
      const rows = bookings.map(b => [
        b.id,
        b.dogName || '',
        b.breed || '',
        b.serviceType,
        b.serviceDate || b.checkinDate || b.trialDate || '',
        b.ownerName || '',
        b.email || '',
        b.phone || '',
        b.status || 'pending',
        b.paymentStatus || 'unpaid',
        `€${((b.amount || 0) / 100).toFixed(2)}`,
        b.createdAt || ''
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=howliday-bookings-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvContent);
    } catch (error) {
      console.error('Admin export error:', error);
      res.status(500).json({ message: 'Failed to export bookings' });
    }
  });

  // Get customer by email
  app.get('/api/customers/email/:email', requireOwnerAuth, async (req, res) => {
    try {
      const customer = await storage.getCustomerByEmail(req.params.email);
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch customer' });
    }
  });

  // Get customer by Firebase UID
  app.get('/api/customers/firebase/:uid', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const customer = await storage.getCustomerByFirebaseUid(req.params.uid);
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch customer' });
    }
  });

  // Create new customer
  app.post('/api/customers', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid customer data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create customer' });
    }
  });

  // Dog routes
  
  // Get dogs for a customer
  app.get('/api/dogs/customer/:customerId', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const dogs = await storage.getDogsByCustomer(req.params.customerId);
      res.json(dogs);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch dogs' });
    }
  });

  // Get dog by ID
  app.get('/api/dogs/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const dog = await storage.getDog(req.params.id);
      if (!dog) {
        return res.status(404).json({ message: 'Dog not found' });
      }
      res.json(dog);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch dog' });
    }
  });

  // Create new dog profile
  app.post('/api/dogs', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Note: This legacy endpoint should be deprecated in favor of /api/me/dogs
      const validatedData = req.body; // Basic validation only for legacy compatibility
      const dog = await storage.createDog(validatedData);
      res.status(201).json(dog);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid dog data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create dog profile' });
    }
  });

  // Update dog profile
  app.patch('/api/dogs/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const dog = await storage.updateDog(req.params.id, req.body);
      if (!dog) {
        return res.status(404).json({ message: 'Dog not found' });
      }
      res.json(dog);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update dog profile' });
    }
  });

  // Delete dog profile
  app.delete('/api/dogs/:id', requireOwnerAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteDog(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: 'Dog not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete dog profile' });
    }
  });

  // Get trial status for a dog
  app.get('/api/dogs/:dogId/trial-status', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const dog = await storage.getDog(req.params.dogId);

      const { trialEligibility: calculateEligibility } = await import('@shared/trial');
      const trialRequired = dog?.trialRequired ?? true;
      const trialCompletedAt = dog?.trialCompletedAt;
      const eligibility = calculateEligibility(
        trialRequired,
        trialCompletedAt ? (trialCompletedAt instanceof Date ? trialCompletedAt.toISOString() : String(trialCompletedAt)) : undefined
      );

      res.json({
        trialRequired: eligibility.trialRequired,
        trialCompletedAt: eligibility.trialCompletedAt,
        eligibleFrom: eligibility.eligibleFrom,
        eligible: eligibility.eligible
      });
    } catch (error) {
      console.error('Error fetching trial status:', error);
      res.status(500).json({ message: 'Failed to fetch trial status' });
    }
  });

  // Admin: Mark trial as completed for a dog
  app.post('/api/admin/dogs/:dogId/trial/complete', requireOwnerAuth, async (req, res) => {
    try {
      const userId = (req as any).session?.userId;

      const dog = await storage.getDog(req.params.dogId);
      if (!dog) {
        return res.status(404).json({ message: 'Dog not found' });
      }

      const { completedAt, note } = req.body;
      const completedTimestamp = completedAt ? new Date(completedAt) : new Date();

      const updatedDog = await storage.updateDog(req.params.dogId, {
        trialRequired: false,
        trialCompletedAt: completedTimestamp,
        trialCompletedByUserId: userId || null,
        trialNote: note || null
      });

      res.json({
        message: 'Trial marked as completed',
        dog: updatedDog
      });
    } catch (error) {
      console.error('Error marking trial as completed:', error);
      res.status(500).json({ message: 'Failed to mark trial as completed' });
    }
  });

  // DEPRECATED: Legacy payment endpoint - client-controlled amounts are unsafe
  // Use /api/checkout/create-intent from booking.ts instead for secure server-side pricing
  app.post("/api/create-payment-intent", async (req, res) => {
    res.status(410).json({ 
      message: "This endpoint is deprecated for security reasons. Use /api/checkout/create-intent instead.",
      redirect: "/api/checkout/create-intent"
    });
  });

  // DEPRECATED: Legacy checkout session - client-controlled amounts are unsafe  
  // Use /api/checkout/create-intent from booking.ts instead for secure server-side pricing
  app.post("/api/create-checkout-session", async (req, res) => {
    res.status(410).json({ 
      message: "This endpoint is deprecated for security reasons. Use /api/checkout/create-intent instead.",
      redirect: "/api/checkout/create-intent"
    });
  });

  // NOTE: Stripe webhook handler has been moved to server/index.ts
  // to ensure proper raw body parsing before express.json() middleware

  // Debug endpoint: Check receipt status for a booking (admin-only)
  app.get('/api/debug/receipt-status', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const bookingId = String(req.query.bookingId || '');
      if (!bookingId) {
        return res.status(400).json({ error: 'MISSING_BOOKING_ID' });
      }

      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ error: 'NOT_FOUND' });
      }

      console.log('[debug] receipt-status checked', { bookingId, email: booking.email });

      res.json({
        bookingId,
        userEmail: booking.email,
        paymentStatus: booking.paymentStatus,
        status: booking.status,
        amount: booking.amount,
        serviceType: booking.serviceType
      });
    } catch (e: any) {
      console.error('[debug] receipt-status error:', { msg: e?.message, stack: e?.stack });
      res.status(500).json({ error: 'DEBUG_STATUS_FAILED', message: e?.message });
    }
  });

  // Debug endpoint: Resend receipt email (idempotent, admin-only)
  app.post('/api/debug/resend-receipt', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { bookingId } = req.body || {};
      if (!bookingId) {
        return res.status(400).json({ error: 'MISSING_BOOKING_ID' });
      }

      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ error: 'NOT_FOUND' });
      }

      console.log('[debug] resending receipt', { bookingId, email: booking.email });

      // Reuse the same receipt sending logic
      await sendBookingReceipt(bookingId);

      res.json({ ok: true, bookingId, email: booking.email });
    } catch (e: any) {
      console.error('[debug] resend-receipt error:', { msg: e?.message, stack: e?.stack });
      res.status(500).json({ error: 'RESEND_FAILED', message: e?.message });
    }
  });

  // Email logo configuration for debug resend
  const DEFAULT_LOGO = "https://thehowlidayinn.ie/assets/logo.png";
  const LOGO_URL = (process.env.COMPANY_LOGO_URL || DEFAULT_LOGO).trim();
  const BRAND_BADGE_BG = "#FAF8F4";
  const BRAND_BADGE_SHADOW = "0 1px 3px rgba(0,0,0,0.08)";

  function retinaSrcset(url: string): string {
    return url.includes("w_320") ? `${url.replace("w_320", "w_640")} 2x` : "";
  }

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

  async function sendBookingReceipt(bookingId: string) {
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

  // Enhanced Dog Profile Routes (Firebase-backed)
  
  // Get enhanced dogs for a user
  app.get('/api/enhanced/dogs', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.uid;
      const dogsSnapshot = await adminDb.collection(COLLECTIONS.DOGS)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      
      const dogs = dogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(dogs);
    } catch (error) {
      console.error('Error fetching enhanced dogs:', error);
      res.status(500).json({ message: 'Failed to fetch dogs' });
    }
  });

  // Get enhanced dog by ID
  app.get('/api/enhanced/dogs/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const dogDoc = await adminDb.collection(COLLECTIONS.DOGS).doc(req.params.id).get();
      
      if (!dogDoc.exists) {
        return res.status(404).json({ message: 'Dog not found' });
      }

      const dogData = dogDoc.data();
      
      // Check ownership or admin access
      if (dogData?.userId !== req.user!.uid && dogData?.ownerUid !== req.user!.uid && !req.user!.admin) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json({ id: dogDoc.id, ...dogData });
    } catch (error) {
      console.error('Error fetching dog:', error);
      res.status(500).json({ message: 'Failed to fetch dog' });
    }
  });

  // Create enhanced dog profile
  app.post('/api/enhanced/dogs', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.uid;
      // Note: Legacy endpoint - proper validation available in /api/me/dogs
      const validatedData = createUpdateDogSchema().parse(req.body);
      
      const dogData = {
        ...validatedData,
        userId,
        ownerUid: userId, // Backward compatibility
        status: 'pending' as const, // Always start as pending
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Only admins can set status, disallowedReason, nextExpiry on create
      if (!req.user!.admin) {
        dogData.status = 'pending' as const;
        delete (dogData as any).disallowedReason;
        delete (dogData as any).nextExpiry;
      }

      const docRef = await adminDb.collection(COLLECTIONS.DOGS).add(dogData);
      const createdDog = { id: docRef.id, ...dogData };
      
      res.status(201).json(createdDog);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid dog data', errors: error.errors });
      }
      console.error('Error creating dog:', error);
      res.status(500).json({ message: 'Failed to create dog profile' });
    }
  });

  // Update enhanced dog profile
  app.patch('/api/enhanced/dogs/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const dogRef = adminDb.collection(COLLECTIONS.DOGS).doc(req.params.id);
      const dogDoc = await dogRef.get();

      if (!dogDoc.exists) {
        return res.status(404).json({ message: 'Dog not found' });
      }

      const dogData = dogDoc.data();
      
      // Check ownership or admin access
      if (dogData?.userId !== req.user!.uid && dogData?.ownerUid !== req.user!.uid && !req.user!.admin) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Validate request body with Zod
      const updateSchema = createUpdateDogSchema();
      const validatedData = updateSchema.parse(req.body);
      
      const updateData: any = { 
        ...validatedData,
        updatedAt: new Date() 
      };
      
      // Admin can update admin-only fields
      if (req.user!.admin) {
        const adminOnlyFields = ['status', 'disallowedReason', 'nextExpiry'];
        for (const field of adminOnlyFields) {
          if (field in req.body) {
            updateData[field] = req.body[field];
          }
        }
      }

      await dogRef.update(updateData);
      const updatedDoc = await dogRef.get();
      
      res.json({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid dog data', errors: error.errors });
      }
      console.error('Error updating dog:', error);
      res.status(500).json({ message: 'Failed to update dog profile' });
    }
  });

  // Delete enhanced dog profile
  app.delete('/api/enhanced/dogs/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const dogRef = adminDb.collection(COLLECTIONS.DOGS).doc(req.params.id);
      const dogDoc = await dogRef.get();

      if (!dogDoc.exists) {
        return res.status(404).json({ message: 'Dog not found' });
      }

      const dogData = dogDoc.data();
      
      // Check ownership or admin access
      if (dogData?.userId !== req.user!.uid && dogData?.ownerUid !== req.user!.uid && !req.user!.admin) {
        return res.status(403).json({ message: 'Access denied' });
      }

      await dogRef.delete();
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting dog:', error);
      res.status(500).json({ message: 'Failed to delete dog profile' });
    }
  });

  // Vaccination Routes

  // Get vaccinations for a dog
  app.get('/api/enhanced/dogs/:dogId/vaccinations', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // First verify dog ownership
      const dogDoc = await adminDb.collection(COLLECTIONS.DOGS).doc(req.params.dogId).get();
      if (!dogDoc.exists) {
        return res.status(404).json({ message: 'Dog not found' });
      }

      const dogData = dogDoc.data();
      if (dogData?.userId !== req.user!.uid && dogData?.ownerUid !== req.user!.uid && !req.user!.admin) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const vaccinationsSnapshot = await adminDb.collection(COLLECTIONS.VACCINATIONS)
        .where('dogId', '==', req.params.dogId)
        .orderBy('dateAdministered', 'desc')
        .get();
      
      const vaccinations = vaccinationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(vaccinations);
    } catch (error) {
      console.error('Error fetching vaccinations:', error);
      res.status(500).json({ message: 'Failed to fetch vaccinations' });
    }
  });

  // Create vaccination record
  app.post('/api/enhanced/vaccinations', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const vaccinationSchema = createInsertVaccinationSchema();
      const validatedData = vaccinationSchema.parse(req.body);

      // Verify dog ownership
      const dogDoc = await adminDb.collection(COLLECTIONS.DOGS).doc(validatedData.dogId).get();
      if (!dogDoc.exists) {
        return res.status(404).json({ message: 'Dog not found' });
      }

      const dogData = dogDoc.data();
      if (dogData?.userId !== req.user!.uid && dogData?.ownerUid !== req.user!.uid && !req.user!.admin) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const vaccinationData = {
        ...validatedData,
        verified: false, // Always start as unverified
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await adminDb.collection(COLLECTIONS.VACCINATIONS).add(vaccinationData);
      const createdVaccination = { id: docRef.id, ...vaccinationData };
      
      // Recompute dog status after vaccination change
      await recomputeAndUpdateDogStatus(validatedData.dogId);
      
      res.status(201).json(createdVaccination);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid vaccination data', errors: error.errors });
      }
      console.error('Error creating vaccination:', error);
      res.status(500).json({ message: 'Failed to create vaccination record' });
    }
  });

  // Update vaccination record
  app.patch('/api/enhanced/vaccinations/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const vaccinationRef = adminDb.collection(COLLECTIONS.VACCINATIONS).doc(req.params.id);
      const vaccinationDoc = await vaccinationRef.get();

      if (!vaccinationDoc.exists) {
        return res.status(404).json({ message: 'Vaccination record not found' });
      }

      const vaccinationData = vaccinationDoc.data();
      
      // Verify dog ownership
      const dogDoc = await adminDb.collection(COLLECTIONS.DOGS).doc(vaccinationData!.dogId).get();
      if (!dogDoc.exists) {
        return res.status(404).json({ message: 'Associated dog not found' });
      }

      const dogData = dogDoc.data();
      if (dogData?.userId !== req.user!.uid && dogData?.ownerUid !== req.user!.uid && !req.user!.admin) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const updateData = { ...req.body, updatedAt: new Date() };

      // Remove fields that non-admins can't change
      if (!req.user!.admin) {
        delete updateData.verified;
        delete updateData.dogId;
      }

      await vaccinationRef.update(updateData);
      const updatedDoc = await vaccinationRef.get();
      
      // Recompute dog status after vaccination change
      await recomputeAndUpdateDogStatus(vaccinationData!.dogId);
      
      res.json({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      console.error('Error updating vaccination:', error);
      res.status(500).json({ message: 'Failed to update vaccination record' });
    }
  });

  // Delete vaccination record
  app.delete('/api/enhanced/vaccinations/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const vaccinationRef = adminDb.collection(COLLECTIONS.VACCINATIONS).doc(req.params.id);
      const vaccinationDoc = await vaccinationRef.get();

      if (!vaccinationDoc.exists) {
        return res.status(404).json({ message: 'Vaccination record not found' });
      }

      const vaccinationData = vaccinationDoc.data();
      
      // Verify dog ownership
      const dogDoc = await adminDb.collection(COLLECTIONS.DOGS).doc(vaccinationData!.dogId).get();
      if (!dogDoc.exists) {
        return res.status(404).json({ message: 'Associated dog not found' });
      }

      const dogData = dogDoc.data();
      if (dogData?.userId !== req.user!.uid && dogData?.ownerUid !== req.user!.uid && !req.user!.admin) {
        return res.status(403).json({ message: 'Access denied' });
      }

      await vaccinationRef.delete();
      
      // Recompute dog status after vaccination deletion
      await recomputeAndUpdateDogStatus(vaccinationData!.dogId);
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting vaccination:', error);
      res.status(500).json({ message: 'Failed to delete vaccination record' });
    }
  });

  // Admin Routes

  // Get all dogs (admin only)
  app.get('/api/admin/dogs', requireOwnerAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const statusFilter = req.query.status as string;

      // Query PostgreSQL instead of Firestore
      let query = db.select().from(dogs).orderBy(desc(dogs.createdAt));
      
      if (statusFilter) {
        query = query.where(eq(dogs.status, statusFilter)) as any;
      }

      const dogsResult = await query.limit(limit).offset((page - 1) * limit);
      
      // Get owner information for each dog
      const dogsWithOwner = await Promise.all(dogsResult.map(async (dog) => {
        const owner = await db.select().from(users).where(eq(users.id, dog.ownerId)).limit(1);
        
        // Get vaccinations for the dog
        const dogVaccinations = await db.select().from(vaccinations).where(eq(vaccinations.dogId, dog.id));
        
        // Get health profile
        const healthProfile = await db.select().from(healthProfiles).where(eq(healthProfiles.dogId, dog.id)).limit(1);
        
        return {
          id: dog.id,
          name: dog.name,
          breed: dog.breed,
          sex: dog.sex,
          dob: dog.dob,
          weightKg: dog.weightKg,
          neuteredSpayed: dog.neuteredSpayed,
          color: dog.color,
          microchip: dog.microchip,
          photoUrl: dog.photoUrl,
          vaxTypes: dog.vaxTypes,
          vaxDate: dog.vaxDate,
          vaxExpiry: dog.vaxExpiry,
          temperament: dog.temperament,
          status: dog.status,
          disallowedReason: dog.disallowedReason,
          createdAt: dog.createdAt,
          updatedAt: dog.updatedAt,
          owner: owner[0] ? {
            id: owner[0].id,
            name: owner[0].name,
            email: owner[0].email,
            phone: owner[0].phone
          } : null,
          vaccinations: dogVaccinations,
          healthProfile: healthProfile[0] || null
        };
      }));
      
      res.json({
        dogs: dogsWithOwner,
        page,
        limit,
        total: dogsResult.length
      });
    } catch (error) {
      console.error('Error fetching dogs for admin:', error);
      res.status(500).json({ message: 'Failed to fetch dogs' });
    }
  });

  // Get individual dog details (admin only)
  app.get('/api/admin/dogs/:id', requireOwnerAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dogId = req.params.id;
      
      // Get dog details
      const dogResult = await db.select().from(dogs).where(eq(dogs.id, dogId)).limit(1);
      if (!dogResult || dogResult.length === 0) {
        return res.status(404).json({ message: 'Dog not found' });
      }
      
      const dog = dogResult[0];
      
      // Get owner information
      const owner = await db.select().from(users).where(eq(users.id, dog.ownerId)).limit(1);
      
      // Get vaccinations
      const dogVaccinations = await db.select().from(vaccinations).where(eq(vaccinations.dogId, dogId));
      
      // Get health profile
      const healthProfile = await db.select().from(healthProfiles).where(eq(healthProfiles.dogId, dogId)).limit(1);
      
      res.json({
        id: dog.id,
        name: dog.name,
        breed: dog.breed,
        sex: dog.sex,
        dob: dog.dob,
        weightKg: dog.weightKg,
        neuteredSpayed: dog.neuteredSpayed,
        color: dog.color,
        microchip: dog.microchip,
        photoUrl: dog.photoUrl,
        temperament: dog.temperament,
        status: dog.status,
        disallowedReason: dog.disallowedReason,
        createdAt: dog.createdAt,
        owner: owner[0] ? {
          id: owner[0].id,
          name: owner[0].name,
          email: owner[0].email,
          phone: owner[0].phone
        } : null,
        vaccinations: dogVaccinations,
        healthProfile: healthProfile[0] || null
      });
    } catch (error) {
      console.error('Error fetching dog details:', error);
      res.status(500).json({ message: 'Failed to fetch dog details' });
    }
  });

  // Update dog status (admin only)
  app.patch('/api/admin/dogs/:id/status', requireOwnerAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, disallowedReason } = req.body;
      
      if (!['pending', 'verified', 'expired', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      const dogRef = adminDb.collection(COLLECTIONS.DOGS).doc(req.params.id);
      const dogDoc = await dogRef.get();

      if (!dogDoc.exists) {
        return res.status(404).json({ message: 'Dog not found' });
      }

      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'rejected' && disallowedReason) {
        updateData.disallowedReason = disallowedReason;
      }

      await dogRef.update(updateData);
      const updatedDoc = await dogRef.get();
      
      res.json({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      console.error('Error updating dog status:', error);
      res.status(500).json({ message: 'Failed to update dog status' });
    }
  });

  // Verify vaccination (admin only)
  app.patch('/api/admin/vaccinations/:id/verify', requireOwnerAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { verified } = req.body;
      
      const vaccinationRef = adminDb.collection(COLLECTIONS.VACCINATIONS).doc(req.params.id);
      const vaccinationDoc = await vaccinationRef.get();

      if (!vaccinationDoc.exists) {
        return res.status(404).json({ message: 'Vaccination record not found' });
      }

      await vaccinationRef.update({
        verified: Boolean(verified),
        updatedAt: new Date(),
      });

      const updatedDoc = await vaccinationRef.get();
      const vaccinationData = updatedDoc.data();
      
      // Recompute dog status after verification change
      if (vaccinationData?.dogId) {
        await recomputeAndUpdateDogStatus(vaccinationData.dogId);
      }
      
      res.json({ id: updatedDoc.id, ...vaccinationData });
    } catch (error) {
      console.error('Error verifying vaccination:', error);
      res.status(500).json({ message: 'Failed to verify vaccination' });
    }
  });

  // Get kennel settings
  app.get('/api/settings', optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const defaultSettings = {
        requiredVaccines: [
          { type: 'rabies', label: 'Rabies', required: true, validityMonths: 12 },
          { type: 'dhpp', label: 'DHPP', required: true, validityMonths: 12 },
          { type: 'bordetella', label: 'Bordetella', required: true, validityMonths: 6 },
        ],
        prohibitedBreeds: [],
        leadTimeHours: 12,
      };

      const rows = await db.select({
        requiredVaccines: settings.requiredVaccines,
        prohibitedBreeds: settings.prohibitedBreeds,
        leadTimeHours: settings.leadTimeHours,
      }).from(settings).where(eq(settings.id, 1));

      if (rows.length === 0) {
        return res.json(defaultSettings);
      }

      res.json({
        requiredVaccines: rows[0].requiredVaccines || defaultSettings.requiredVaccines,
        prohibitedBreeds: rows[0].prohibitedBreeds || defaultSettings.prohibitedBreeds,
        leadTimeHours: rows[0].leadTimeHours ?? defaultSettings.leadTimeHours,
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ message: 'Failed to fetch settings' });
    }
  });

  // Update kennel settings (admin only)
  app.patch('/api/admin/settings', requireOwnerAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const settingsSchema = createInsertKennelSettingsSchema();
      const validatedData = settingsSchema.parse(req.body);

      // Upsert settings row via Drizzle/PostgreSQL
      const [updated] = await db
        .update(settings)
        .set(validatedData)
        .where(eq(settings.id, 1))
        .returning();

      if (!updated) {
        // Row doesn't exist yet — insert it
        const tenantId = await ensureTenant();
        const [inserted] = await db.insert(settings).values({
          tenantId,
          ...validatedData,
          requiredVaccines: validatedData.requiredVaccines ?? [],
          prohibitedBreeds: validatedData.prohibitedBreeds ?? [],
        }).returning();
        return res.json(inserted);
      }

      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid settings data', errors: error.errors });
      }
      console.error('Error updating settings:', error);
      res.status(500).json({ message: 'Failed to update settings' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
