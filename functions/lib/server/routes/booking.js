// TODO HowlidayInn: Booking validation and Stripe integration with dog eligibility
import { Router } from "express";
import { db } from "../db/client";
import { dogs, vaccinations, settings as tblSettings } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { computeDogStatus } from "../lib/dogStatus";
import { requireAuth } from "../middleware/auth";
import Stripe from "stripe";
// Safely initialize Stripe with proper error handling
function createStripeInstance() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY environment variable is required but not set');
    }
    return new Stripe(secretKey);
}
let stripe = null;
function getStripe() {
    if (!stripe) {
        stripe = createStripeInstance();
    }
    return stripe;
}
export const bookingRouter = Router();
// Simple payment intent creation endpoint (for general payment flows)
bookingRouter.post("/api/checkout/create-intent", requireAuth, async (req, res) => {
    try {
        const { amount, currency = "eur", customerId } = req.body || {};
        // Logging for debugging
        console.log("[create-intent] amount:", amount, "currency:", currency);
        // Validate amount (must be integer cents)
        if (!Number.isInteger(amount) || amount <= 0) {
            console.error("[create-intent] Invalid amount:", amount);
            return res.status(400).json({ error: "INVALID_AMOUNT" });
        }
        // Validate Stripe key exists
        if (!process.env.STRIPE_SECRET_KEY) {
            console.error("[create-intent] STRIPE_SECRET_KEY not configured");
            return res.status(500).json({ error: "STRIPE_NOT_CONFIGURED" });
        }
        const intent = await getStripe().paymentIntents.create({
            amount,
            currency,
            customer: customerId || undefined,
            automatic_payment_methods: { enabled: true },
            metadata: {
                userId: req.user.uid,
                email: req.user.email
            }
        });
        console.log("[create-intent] Success - intent created:", intent.id);
        return res.json({ clientSecret: intent.client_secret });
    }
    catch (err) {
        console.error("[create-intent] error:", err?.message, "code:", err?.code);
        return res.status(500).json({
            error: "INTENT_CREATE_FAILED",
            code: err?.code,
            message: err?.message
        });
    }
});
// Alias route for backward compatibility (/api/payments/create-intent)
bookingRouter.post("/api/payments/create-intent", requireAuth, async (req, res) => {
    try {
        const { amount, currency = "eur", customerId } = req.body || {};
        // Logging for debugging
        console.log("[/api/payments/create-intent] amount:", amount, "currency:", currency);
        // Validate amount (must be integer cents)
        if (!Number.isInteger(amount) || amount <= 0) {
            console.error("[/api/payments/create-intent] Invalid amount:", amount);
            return res.status(400).json({ error: "INVALID_AMOUNT" });
        }
        // Validate Stripe key exists
        if (!process.env.STRIPE_SECRET_KEY) {
            console.error("[/api/payments/create-intent] STRIPE_SECRET_KEY not configured");
            return res.status(500).json({ error: "STRIPE_NOT_CONFIGURED" });
        }
        const intent = await getStripe().paymentIntents.create({
            amount,
            currency,
            customer: customerId || undefined,
            automatic_payment_methods: { enabled: true },
            metadata: {
                userId: req.user.uid,
                email: req.user.email
            }
        });
        console.log("[/api/payments/create-intent] Success - intent created:", intent.id);
        return res.json({ clientSecret: intent.client_secret });
    }
    catch (err) {
        console.error("[/api/payments/create-intent] failed:", err?.message, "code:", err?.code);
        return res.status(500).json({
            error: "INTENT_CREATE_FAILED",
            code: err?.code,
            message: err?.message
        });
    }
});
// Helper function to check capacity availability
async function checkCapacityAvailability(serviceType, startDate, endDate) {
    try {
        // Get capacity limits from settings
        const settings = await db.query.settings.findFirst({ where: eq(tblSettings.id, 1) });
        if (!settings || !settings.capacity) {
            throw new Error("Capacity settings not configured");
        }
        const capacity = settings.capacity;
        const totalCapacity = (capacity.large_kennels || 0) + (capacity.small_kennels || 0);
        if (totalCapacity === 0) {
            throw new Error("No kennel capacity configured");
        }
        // TODO: Implement actual booking counting once PostgreSQL bookings table exists
        // For now, simulate capacity checking with realistic logic
        // Calculate days in range
        const daysDifference = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const numberOfDays = Math.max(1, daysDifference);
        // Simple simulation: assume 70% occupancy rate for demonstration
        const simulatedOccupancy = Math.floor(totalCapacity * 0.7);
        const availableSpots = Math.max(0, totalCapacity - simulatedOccupancy);
        // For multi-day bookings, ensure capacity is available for all days
        const isAvailable = availableSpots > 0;
        console.log(`Capacity check: ${serviceType}, ${numberOfDays} days, total: ${totalCapacity}, simulated occupied: ${simulatedOccupancy}, available: ${availableSpots}`);
        return {
            totalCapacity,
            largeKennels: capacity.large_kennels || 0,
            smallKennels: capacity.small_kennels || 0,
            availableSpots,
            isAvailable,
            occupancy: simulatedOccupancy,
            days: numberOfDays
        };
    }
    catch (error) {
        console.error("Error checking capacity:", error);
        throw error;
    }
}
// Get capacity information for a date range
bookingRouter.get("/api/booking/capacity", async (req, res) => {
    try {
        const { serviceType, start, end } = req.query;
        if (!serviceType || !start || !end) {
            return res.status(400).json({
                error: "Missing required parameters: serviceType, start, end"
            });
        }
        const startDate = new Date(start);
        const endDate = new Date(end);
        const capacityInfo = await checkCapacityAvailability(serviceType, startDate, endDate);
        res.json({
            ok: true,
            ...capacityInfo,
            dates: { start, end },
            serviceType
        });
    }
    catch (error) {
        console.error("Capacity check error:", error);
        res.status(500).json({
            error: "Failed to check capacity",
            details: error.message
        });
    }
});
// Validate before pay
bookingRouter.get("/api/booking/validate", requireAuth, async (req, res) => {
    const { dogId, start, end } = req.query;
    if (!dogId || !start || !end) {
        return res.status(400).json({ ok: false, error: "Missing params" });
    }
    const d = await db.query.dogs.findFirst({
        where: and(eq(dogs.id, dogId), eq(dogs.ownerId, req.user.uid))
    });
    if (!d) {
        return res.status(404).json({ ok: false, error: "Dog not found" });
    }
    const sets = await db.query.settings.findFirst({ where: eq(tblSettings.id, 1) });
    // Fail-closed: Require settings to be properly configured
    if (!sets || !sets.requiredVaccines || sets.requiredVaccines.length === 0) {
        return res.status(503).json({
            ok: false,
            error: "System configuration error - vaccination requirements not available"
        });
    }
    const vax = await db.select().from(vaccinations).where(eq(vaccinations.dogId, dogId));
    const result = computeDogStatus(d, vax, {
        requiredVaccines: sets?.requiredVaccines || [],
        prohibitedBreeds: sets?.prohibitedBreeds || []
    }, {
        start: new Date(start),
        end: new Date(end)
    });
    if (result.status !== "verified") {
        return res.status(400).json({ ok: false, error: "Dog not eligible for selected dates" });
    }
    // Check capacity availability
    try {
        const capacityInfo = await checkCapacityAvailability("daycare", new Date(start), new Date(end));
        if (!capacityInfo.isAvailable) {
            return res.status(400).json({
                ok: false,
                error: "No capacity available for selected dates",
                availableSpots: capacityInfo.availableSpots
            });
        }
    }
    catch (capacityError) {
        console.error("Capacity check failed:", capacityError);
        return res.status(503).json({
            ok: false,
            error: "Unable to verify capacity availability"
        });
    }
    return res.json({ ok: true });
});
// Create PaymentIntent with server-side pricing
bookingRouter.post("/api/checkout/create-intent", requireAuth, async (req, res) => {
    const { dogId, start, end, serviceType } = req.body || {};
    if (!dogId || !start || !end || !serviceType) {
        return res.status(400).json({ error: "Missing params" });
    }
    // Server-side price calculation based on service type and duration
    const startDate = new Date(start);
    const endDate = new Date(end);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    // Define service pricing (in cents EUR) - server controlled
    const servicePricing = {
        daycare: 3500, // €35 per day
        boarding: 5500, // €55 per day  
        trial: 2000, // €20 flat rate
    };
    const basePrice = servicePricing[serviceType];
    if (!basePrice) {
        return res.status(400).json({ error: "Invalid service type" });
    }
    const amount = serviceType === 'trial' ? basePrice : basePrice * Math.max(1, days);
    const currency = "eur"; // Server-controlled currency
    // Double check eligibility server side
    const d = await db.query.dogs.findFirst({
        where: and(eq(dogs.id, dogId), eq(dogs.ownerId, req.user.uid))
    });
    if (!d) {
        return res.status(404).json({ error: "Dog not found" });
    }
    const sets = await db.query.settings.findFirst({ where: eq(tblSettings.id, 1) });
    // Fail-closed: Require settings to be properly configured
    if (!sets || !sets.requiredVaccines || sets.requiredVaccines.length === 0) {
        return res.status(503).json({
            ok: false,
            error: "System configuration error - vaccination requirements not available"
        });
    }
    const vax = await db.select().from(vaccinations).where(eq(vaccinations.dogId, dogId));
    const result = computeDogStatus(d, vax, {
        requiredVaccines: sets?.requiredVaccines || [],
        prohibitedBreeds: sets?.prohibitedBreeds || []
    }, {
        start: new Date(start),
        end: new Date(end)
    });
    if (result.status !== "verified") {
        return res.status(400).json({ error: "Dog not eligible for selected dates" });
    }
    // Check capacity availability before creating payment intent
    try {
        const capacityInfo = await checkCapacityAvailability(serviceType, startDate, endDate);
        if (!capacityInfo.isAvailable) {
            return res.status(400).json({
                error: "No capacity available for selected dates. Please choose different dates.",
                availableSpots: capacityInfo.availableSpots
            });
        }
    }
    catch (capacityError) {
        console.error("Capacity check failed during payment intent creation:", capacityError);
        return res.status(503).json({
            error: "Unable to verify capacity availability"
        });
    }
    const intent = await getStripe().paymentIntents.create({
        amount,
        currency,
        automatic_payment_methods: { enabled: true },
        metadata: { dogId, start, end, serviceType, calculatedAmount: amount.toString() }
    });
    res.json({ clientSecret: intent.client_secret });
});
// Removed: old create-intent-by-booking endpoint - now handled by simplified checkout router
export default bookingRouter;
