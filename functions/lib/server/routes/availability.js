import { Router } from "express";
import { db } from "../db/client";
import { availability } from "../db/schema";
import { and, eq } from "drizzle-orm";
import { getCapacityForService } from "../config/capacity";
const router = Router();
// GET /api/availability?service=Daycare&date=2025-10-10&slot=09:00-12:00
router.get("/", async (req, res) => {
    try {
        const { service, date, slot } = req.query;
        if (!service || !date) {
            return res.status(400).json({
                success: false,
                error: "service and date are required"
            });
        }
        // Build query conditions
        const conditions = [
            eq(availability.service, service),
            eq(availability.date, date),
        ];
        // Add slot condition if provided
        if (slot) {
            conditions.push(eq(availability.slot, slot));
        }
        else {
            // For all-day services, slot should be null
            conditions.push(eq(availability.slot, null));
        }
        // Try to find existing availability record
        let availabilityRecord = await db
            .select()
            .from(availability)
            .where(and(...conditions))
            .limit(1);
        // If no record exists, create one with default capacity
        if (!availabilityRecord || availabilityRecord.length === 0) {
            const defaultCapacity = getCapacityForService(service);
            const [newRecord] = await db
                .insert(availability)
                .values({
                service: service,
                date: date,
                slot: slot || null,
                capacity: defaultCapacity,
                reserved: 0,
                confirmed: 0,
            })
                .returning();
            availabilityRecord = [newRecord];
        }
        const record = availabilityRecord[0];
        const remaining = Math.max(0, record.capacity - record.reserved - record.confirmed);
        return res.json({
            success: true,
            data: {
                service: record.service,
                date: record.date,
                slot: record.slot,
                capacity: record.capacity,
                reserved: record.reserved,
                confirmed: record.confirmed,
                remaining,
            },
        });
    }
    catch (error) {
        console.error("[availability] Error fetching availability:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to fetch availability"
        });
    }
});
export default router;
