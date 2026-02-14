import { Router, Request, Response } from "express";
import { db } from "../db/client";
import { availability } from "../db/schema";
import { and, eq } from "drizzle-orm";
import { getEffectiveCapacity } from "../config/capacity";
import { ensureTenant } from "../services/userService";

const router = Router();

// GET /api/availability?service=Daycare&date=2025-10-10&slot=09:00-12:00
router.get("/", async (req: Request, res: Response) => {
  try {
    const { service: serviceProp, serviceType, date, slot } = req.query;
    const service = serviceProp || serviceType;

    if (!service || !date) {
      return res.status(400).json({ 
        success: false, 
        error: "service and date are required" 
      });
    }

    // Upsert: create if not exists, otherwise return existing record
    // This prevents duplicates even with concurrent requests
    // Use "ALL_DAY" sentinel for null/empty slots (PostgreSQL unique constraint requires non-null)
    const slotValue = (slot && (slot as string).trim()) || "ALL_DAY";
    const effectiveCapacity = await getEffectiveCapacity(
      service as string,
      date as string,
      slotValue === "ALL_DAY" ? null : slotValue
    );
    
    const tenantId = await ensureTenant();
    const [record] = await db
      .insert(availability)
      .values({
        tenantId,
        service: service as string,
        date: date as string,
        slot: slotValue,
        capacity: effectiveCapacity,
        reserved: 0,
        confirmed: 0,
      })
      .onConflictDoUpdate({
        target: [availability.service, availability.date, availability.slot],
        set: {
          capacity: effectiveCapacity,
          updatedAt: new Date(),
        },
      })
      .returning();
    const remaining = Math.max(0, record.capacity - record.reserved - record.confirmed);

    return res.json({
      success: true,
      data: {
        service: record.service,
        date: record.date,
        slot: record.slot === "ALL_DAY" ? null : record.slot,
        capacity: record.capacity,
        reserved: record.reserved,
        confirmed: record.confirmed,
        remaining,
      },
    });
  } catch (error) {
    console.error("[availability] Error fetching availability:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to fetch availability" 
    });
  }
});

export default router;
