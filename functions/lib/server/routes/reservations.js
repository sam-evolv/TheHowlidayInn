import { Router } from "express";
import { db } from "../db/client";
import { availability, reservations } from "../db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getCapacityForService, getReservationTTLMinutes } from "../config/capacity";
import { createReservationSchema, createPaymentIntentSchema } from "../../shared/schema";
import Stripe from "stripe";
const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-08-27.basil",
});
// POST /api/reservations
router.post("/", async (req, res) => {
    try {
        const validationResult = createReservationSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                success: false,
                error: validationResult.error.errors[0]?.message || "Invalid request"
            });
        }
        const { service, date, slot, userEmail, dogId, idempotencyKey } = validationResult.data;
        // Check for existing active reservation with this idempotency key
        const existingReservation = await db
            .select()
            .from(reservations)
            .where(and(eq(reservations.idempotencyKey, idempotencyKey), eq(reservations.status, "active")))
            .limit(1);
        if (existingReservation && existingReservation.length > 0) {
            return res.json({
                success: true,
                data: { reservationId: existingReservation[0].id },
            });
        }
        // Start transaction - we need atomic operations
        const result = await db.transaction(async (tx) => {
            // Build availability query conditions
            const conditions = [
                eq(availability.service, service),
                eq(availability.date, date),
            ];
            if (slot) {
                conditions.push(eq(availability.slot, slot));
            }
            else {
                conditions.push(eq(availability.slot, null));
            }
            // Load availability with FOR UPDATE lock (PostgreSQL row-level lock)
            const availabilityRecords = await tx
                .select()
                .from(availability)
                .where(and(...conditions))
                .for("update")
                .limit(1);
            let availabilityRecord = availabilityRecords[0];
            // If no availability record exists, create one
            if (!availabilityRecord) {
                const defaultCapacity = getCapacityForService(service);
                const [newRecord] = await tx
                    .insert(availability)
                    .values({
                    service,
                    date,
                    slot: slot || null,
                    capacity: defaultCapacity,
                    reserved: 0,
                    confirmed: 0,
                })
                    .returning();
                availabilityRecord = newRecord;
            }
            // Check if there's remaining capacity
            const remaining = availabilityRecord.capacity - availabilityRecord.reserved - availabilityRecord.confirmed;
            if (remaining <= 0) {
                throw new Error("FULL");
            }
            // Calculate expiry time
            const ttlMinutes = getReservationTTLMinutes();
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);
            // Create reservation
            const [reservation] = await tx
                .insert(reservations)
                .values({
                service,
                date,
                slot: slot || null,
                userEmail,
                dogId: dogId || null,
                status: "active",
                expiresAt,
                idempotencyKey,
            })
                .returning();
            // Increment reserved count
            await tx
                .update(availability)
                .set({
                reserved: sql `${availability.reserved} + 1`,
                updatedAt: new Date(),
            })
                .where(eq(availability.id, availabilityRecord.id));
            return reservation;
        });
        return res.json({
            success: true,
            data: { reservationId: result.id },
        });
    }
    catch (error) {
        console.error("[reservations] Error creating reservation:", error);
        if (error.message === "FULL") {
            return res.status(409).json({
                success: false,
                error: "FULL",
                message: "This date is fully booked. Please pick another date.",
            });
        }
        return res.status(500).json({
            success: false,
            error: "Failed to create reservation"
        });
    }
});
// POST /api/reservations/:id/payment-intent
router.post("/:id/payment-intent", async (req, res) => {
    try {
        const { id } = req.params;
        const validationResult = createPaymentIntentSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                success: false,
                error: validationResult.error.errors[0]?.message || "Invalid request"
            });
        }
        const { amountCents, currency, bookingId } = validationResult.data;
        // Validate reservation exists, is active, and not expired
        const [reservation] = await db
            .select()
            .from(reservations)
            .where(eq(reservations.id, id))
            .limit(1);
        if (!reservation) {
            return res.status(404).json({
                success: false,
                error: "Reservation not found"
            });
        }
        if (reservation.status !== "active") {
            return res.status(400).json({
                success: false,
                error: "Reservation is no longer active"
            });
        }
        if (new Date(reservation.expiresAt) < new Date()) {
            return res.status(400).json({
                success: false,
                error: "Reservation has expired"
            });
        }
        // Create Stripe PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountCents,
            currency: currency || "eur",
            automatic_payment_methods: { enabled: true },
            metadata: {
                bookingId: bookingId || "",
                reservationId: id,
                service: reservation.service,
                date: reservation.date,
                slot: reservation.slot || "",
            },
        });
        // Store payment intent ID on reservation
        await db
            .update(reservations)
            .set({
            pendingPaymentIntentId: paymentIntent.id,
            updatedAt: new Date(),
        })
            .where(eq(reservations.id, id));
        return res.json({
            success: true,
            data: {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
            },
        });
    }
    catch (error) {
        console.error("[reservations] Error creating payment intent:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to create payment intent"
        });
    }
});
// POST /api/reservations/:id/release
router.post("/:id/release", async (req, res) => {
    try {
        const { id } = req.params;
        // Find the reservation
        const [reservation] = await db
            .select()
            .from(reservations)
            .where(eq(reservations.id, id))
            .limit(1);
        if (!reservation) {
            return res.status(404).json({
                success: false,
                error: "Reservation not found"
            });
        }
        // Only release if active (not already committed/released/expired)
        if (reservation.status !== "active") {
            return res.json({
                success: true,
                message: "Reservation already processed"
            });
        }
        // Transaction to mark as released and decrement reserved
        await db.transaction(async (tx) => {
            // Mark reservation as released
            await tx
                .update(reservations)
                .set({
                status: "released",
                updatedAt: new Date(),
            })
                .where(eq(reservations.id, id));
            // Find and update availability
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
            // Decrement reserved count
            await tx
                .update(availability)
                .set({
                reserved: sql `GREATEST(0, ${availability.reserved} - 1)`,
                updatedAt: new Date(),
            })
                .where(and(...conditions));
        });
        return res.json({
            success: true,
            message: "Reservation released successfully"
        });
    }
    catch (error) {
        console.error("[reservations] Error releasing reservation:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to release reservation"
        });
    }
});
export default router;
