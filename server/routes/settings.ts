// Settings API routes for serving business configuration data
import { Router } from "express";
import { db } from "../db/client";
import { settings, configSettings, capacityDefaults, capacityOverrides, reservations } from "../db/schema";
import { eq, sql, and, lte, gte, or } from "drizzle-orm";
import { upsertCapacitySchema } from "../../shared/schema";
import { requireOwnerAuth } from "../auth/session";

const settingsRouter = Router();

// GET /api/settings/public - Public business settings (no auth required)
settingsRouter.get("/api/settings/public", async (req, res) => {
  try {
    const settingsData = await db.select({
      pricing: settings.pricing,
      capacity: settings.capacity,
      policies: settings.policies,
      contact: settings.contact,
      hours: settings.hours,
      faqs: settings.faqs,
      breedPolicy: settings.breedPolicy,
      prohibitedBreeds: settings.prohibitedBreeds,
      trialRules: settings.trialRules
    }).from(settings).where(eq(settings.id, 1));

    const publicSettings = settingsData.length > 0 ? settingsData[0] : null;
    
    res.json({
      pricing: publicSettings?.pricing || {
        daycare: 20,
        boarding_per_night_single: 25,
        boarding_per_night_two_dogs: 40,
        late_pickup_extra: 10,
        trial_day: 20
      },
      capacity: publicSettings?.capacity || {
        large_kennels: 8,
        small_kennels: 12
      },
      policies: publicSettings?.policies || {
        vaccinations_required: true,
        kennel_cough_required: true,
        cancellation_policy: "Full refund with 48 hours cancellation notice. During peak season (May-September) 72 hours notice is required.",
        neutered_only_facility: false
      },
      contact: publicSettings?.contact || {
        phone: "0873345702",
        email: "howlidayinn1@gmail.com",
        booking_confirmations_email: "howlidayinn1@gmail.com"
      },
      hours: publicSettings?.hours || {
        weekdays: { drop_off: "8-10am", pick_up: "4-6pm" },
        saturday: { drop_off: "9-11am", pick_up: "4-6pm" },
        sunday: { pick_up: "4-6pm" }
      },
      faqs: publicSettings?.faqs || [],
      breedPolicy: publicSettings?.breedPolicy || {
        banned_breeds: [],
        crossbreeds_of_banned_not_accepted: false,
        note: ""
      },
      prohibitedBreeds: (publicSettings?.prohibitedBreeds as string[]) || [],
      trialRules: publicSettings?.trialRules || {
        required_for_new_customers: true
      }
    });
  } catch (error) {
    console.error("GET /api/settings/public error:", error);
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

// GET /api/capacity/overview - Get unified capacity overview for a specific date
settingsRouter.get("/api/capacity/overview", async (req, res) => {
  try {
    const date = req.query.date as string;
    const debug = process.env.CAPACITY_DEBUG === 'true';
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ 
        success: false, 
        error: "Valid date parameter (YYYY-MM-DD) is required" 
      });
    }

    if (debug) console.log(`[CAPACITY_DEBUG] Computing overview for date: ${date}`);

    // 1. Get all capacity defaults
    const allDefaults = await db.select().from(capacityDefaults);
    const defaultsMap = new Map<string, number>();
    allDefaults.forEach(d => {
      defaultsMap.set(d.service, d.capacity);
    });

    if (debug) console.log('[CAPACITY_DEBUG] Defaults from DB:', Object.fromEntries(defaultsMap));

    // Set fallback defaults if not in database (only used as last resort)
    const getDefaultCapacity = (service: string): number => {
      const dbDefault = defaultsMap.get(service);
      if (dbDefault !== undefined) return dbDefault;
      
      // Fallback only if not in DB
      const fallback = service === "Daycare" ? 10 : 
                      service === "Boarding Small" ? 10 : 
                      service === "Boarding Large" ? 8 : 
                      service === "Trial Day" ? 10 : 10;
      
      if (debug) console.log(`[CAPACITY_DEBUG] Using fallback for ${service}: ${fallback}`);
      return fallback;
    };

    // 2. Get overrides for this specific date
    const overridesForDate = await db
      .select()
      .from(capacityOverrides)
      .where(
        and(
          lte(capacityOverrides.dateStart, date),
          gte(capacityOverrides.dateEnd, date)
        )
      );

    const overridesMap = new Map<string, number>();
    overridesForDate.forEach(o => {
      // Use override capacity for the service
      overridesMap.set(o.service, o.capacity);
    });

    if (debug) console.log('[CAPACITY_DEBUG] Overrides for date:', Object.fromEntries(overridesMap));

    // 3. Calculate effective capacity (override or default)
    const getEffectiveCapacity = (service: string): number => {
      const override = overridesMap.get(service);
      const defaultCap = getDefaultCapacity(service);
      const effective = override ?? defaultCap;
      
      if (debug) {
        console.log(`[CAPACITY_DEBUG] ${service}: override=${override}, default=${defaultCap}, effective=${effective}`);
      }
      
      return effective;
    };

    // 4. Count bookings from reservations
    const allReservations = await db
      .select()
      .from(reservations)
      .where(eq(reservations.date, date));

    // Count by service and status
    const bookingCounts = new Map<string, { booked: number; reserved: number }>();
    
    ["Daycare", "Boarding Small", "Boarding Large", "Trial Day"].forEach(service => {
      bookingCounts.set(service, { booked: 0, reserved: 0 });
    });

    allReservations.forEach(r => {
      const current = bookingCounts.get(r.service) || { booked: 0, reserved: 0 };
      if (r.status === "committed") {
        current.booked++;
      } else if (r.status === "active") {
        current.reserved++;
      }
      bookingCounts.set(r.service, current);
    });

    // 5. Build resource data
    const resources: Record<string, { capacity: number; booked: number; reserved: number }> = {};
    ["Daycare", "Boarding Small", "Boarding Large", "Trial Day"].forEach(service => {
      const capacity = getEffectiveCapacity(service);
      const counts = bookingCounts.get(service) || { booked: 0, reserved: 0 };
      resources[service.toLowerCase().replace(/ /g, ":")] = {
        capacity,
        booked: counts.booked,
        reserved: counts.reserved,
      };
    });

    // 6. Calculate boarding aggregate (small + large)
    const boardingAggregate = {
      capacity: resources["boarding:small"].capacity + resources["boarding:large"].capacity,
      booked: resources["boarding:small"].booked + resources["boarding:large"].booked,
      reserved: resources["boarding:small"].reserved + resources["boarding:large"].reserved,
    };

    // 7. Calculate totals
    const totalCapacity = resources["daycare"].capacity + boardingAggregate.capacity + resources["trial:day"].capacity;
    const totalBooked = resources["daycare"].booked + boardingAggregate.booked + resources["trial:day"].booked;
    const totalReserved = resources["daycare"].reserved + boardingAggregate.reserved + resources["trial:day"].reserved;
    const totalOccupied = totalBooked + totalReserved;
    const totalAvailable = totalCapacity - totalOccupied;
    const utilisationPct = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

    res.set('Cache-Control', 'no-store');
    res.set('Vary', '*');
    
    return res.json({
      date,
      resources,
      aggregate: {
        boarding: boardingAggregate,
      },
      totals: {
        capacity: totalCapacity,
        available: totalAvailable,
        occupied: totalOccupied,
        utilisationPct,
      },
    });
  } catch (error) {
    console.error("[capacity/overview] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch capacity overview",
    });
  }
});

// GET /api/settings/capacity - Get current capacity settings
settingsRouter.get("/api/settings/capacity", async (req, res) => {
  try {
    const [result] = await db
      .select()
      .from(configSettings)
      .where(eq(configSettings.key, "capacity"))
      .limit(1);

    if (result) {
      return res.json({
        success: true,
        data: JSON.parse(result.value),
      });
    }

    // Return defaults if not set
    return res.json({
      success: true,
      data: {
        daycare: 40,
        boarding: 20,
        trial: 8,
      },
    });
  } catch (error) {
    console.error("[settings] Error fetching capacity:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch capacity settings",
    });
  }
});

// POST /api/settings/capacity - Update capacity settings
settingsRouter.post("/api/settings/capacity", requireOwnerAuth, async (req: any, res) => {
  try {
    const { daycare, boarding, trial } = req.body;

    if (!daycare || !boarding || !trial) {
      return res.status(400).json({
        success: false,
        error: "All capacity values are required",
      });
    }

    const capacityData = {
      daycare: parseInt(daycare),
      boarding: parseInt(boarding),
      trial: parseInt(trial),
    };

    // Check if setting exists
    const [existing] = await db
      .select()
      .from(configSettings)
      .where(eq(configSettings.key, "capacity"))
      .limit(1);

    if (existing) {
      // Update existing
      await db
        .update(configSettings)
        .set({
          value: JSON.stringify(capacityData),
          updatedAt: new Date(),
        })
        .where(eq(configSettings.key, "capacity"));
    } else {
      // Create new
      await db.insert(configSettings).values({
        key: "capacity",
        value: JSON.stringify(capacityData),
      });
    }

    // Update all current and future availability records to reflect new capacity limits
    const today = new Date().toISOString().split('T')[0];

    // Update availability records for each service - affects today and all future dates
    // Using parameterized queries to prevent SQL injection
    const daycareCapacity = String(Number(capacityData.daycare) || 0);
    const boardingCapacity = String(Number(capacityData.boarding) || 0);
    const trialCapacity = String(Number(capacityData.trial) || 0);

    await db.execute(sql`
      UPDATE availability
      SET capacity = ${daycareCapacity}::int, updated_at = now()
      WHERE service = 'Daycare' AND date >= ${today} AND slot = 'ALL_DAY'
    `);

    await db.execute(sql`
      UPDATE availability
      SET capacity = ${boardingCapacity}::int, updated_at = now()
      WHERE service = 'Boarding' AND date >= ${today} AND slot = 'ALL_DAY'
    `);

    await db.execute(sql`
      UPDATE availability
      SET capacity = ${trialCapacity}::int, updated_at = now()
      WHERE service = 'Trial Day' AND date >= ${today} AND slot = 'ALL_DAY'
    `);

    return res.json({
      success: true,
      data: capacityData,
    });
  } catch (error) {
    console.error("[settings] Error updating capacity:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update capacity settings",
    });
  }
});

// PUT /api/capacity/defaults - Update capacity defaults
settingsRouter.put("/api/capacity/defaults", requireOwnerAuth, async (req: any, res) => {
  try {
    const { daycare, boardingSmall, boardingLarge, trial } = req.body;

    if (daycare === undefined || boardingSmall === undefined || boardingLarge === undefined || trial === undefined) {
      return res.status(400).json({
        success: false,
        error: "All capacity values are required (daycare, boardingSmall, boardingLarge, trial)",
      });
    }

    // Update or insert each default
    const updates = [
      { service: "Daycare", capacity: parseInt(daycare) },
      { service: "Boarding Small", capacity: parseInt(boardingSmall) },
      { service: "Boarding Large", capacity: parseInt(boardingLarge) },
      { service: "Trial Day", capacity: parseInt(trial) },
    ];

    for (const { service, capacity } of updates) {
      await db
        .insert(capacityDefaults)
        .values({ service, capacity })
        .onConflictDoUpdate({
          target: [capacityDefaults.service],
          set: { capacity, updatedAt: new Date() },
        });
    }

    const updatedDefaults = {
      daycare: parseInt(daycare),
      boardingSmall: parseInt(boardingSmall),
      boardingLarge: parseInt(boardingLarge),
      trial: parseInt(trial),
    };

    return res.json({
      success: true,
      data: updatedDefaults,
    });
  } catch (error) {
    console.error("[capacity/defaults] Error updating defaults:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update capacity defaults",
    });
  }
});

// GET /api/admin/capacity - Get all capacity defaults and overrides
settingsRouter.get("/api/admin/capacity", requireOwnerAuth, async (req: any, res) => {
  try {
    // Get all capacity defaults
    const allDefaults = await db.select().from(capacityDefaults);
    
    // Get all capacity overrides
    const allOverrides = await db.select().from(capacityOverrides);

    // Format defaults as an object for easier frontend access
    const defaultsObj: Record<string, number> = {};
    allDefaults.forEach(d => {
      const key = d.service.toLowerCase().replace(' ', '_');
      defaultsObj[key] = d.capacity;
    });
    
    // Ensure we have all three services with fallback values
    const defaults = {
      daycare: defaultsObj['daycare'] || 10,
      'boarding_small': defaultsObj['boarding_small'] || 10,
      'boarding_large': defaultsObj['boarding_large'] || 8,
      trial: defaultsObj['trial_day'] || defaultsObj['trial'] || 8,
    };

    return res.json({
      defaults,
      overrides: allOverrides.map(o => ({
        service: o.service,
        date_start: o.dateStart,
        date_end: o.dateEnd,
        slot: o.slot,
        capacity: o.capacity,
      })),
    });
  } catch (error) {
    console.error("[capacity] Error fetching capacity:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch capacity data",
    });
  }
});

// POST /api/admin/capacity - Create capacity override
settingsRouter.post("/api/admin/capacity", requireOwnerAuth, async (req: any, res) => {
  try {
    const { service, date_start, date_end, slot, capacity } = req.body;

    if (!service || !date_start || capacity === undefined) {
      return res.status(400).json({
        success: false,
        error: "service, date_start, and capacity are required",
      });
    }

    const slotValue = slot || "ALL_DAY";
    const dateEndValue = date_end || date_start;

    await db.insert(capacityOverrides).values({
      service,
      dateStart: date_start,
      dateEnd: dateEndValue,
      slot: slotValue,
      capacity,
    }).onConflictDoUpdate({
      target: [
        capacityOverrides.service,
        capacityOverrides.dateStart,
        capacityOverrides.dateEnd,
        capacityOverrides.slot
      ],
      set: {
        capacity,
        updatedAt: new Date(),
      },
    });

    return res.json({
      success: true,
      message: "Capacity override created successfully",
    });
  } catch (error) {
    console.error("[capacity] Error creating override:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create capacity override",
    });
  }
});

// DELETE /api/admin/capacity - Delete capacity override
settingsRouter.delete("/api/admin/capacity", requireOwnerAuth, async (req: any, res) => {
  try {
    const { service, date_start, date_end, slot } = req.query;

    if (!service || !date_start) {
      return res.status(400).json({
        success: false,
        error: "service and date_start are required",
      });
    }

    const slotValue = (slot as string) || "ALL_DAY";
    const dateEndValue = (date_end as string) || (date_start as string);

    await db.delete(capacityOverrides).where(
      and(
        eq(capacityOverrides.service, service as string),
        eq(capacityOverrides.dateStart, date_start as string),
        eq(capacityOverrides.dateEnd, dateEndValue),
        eq(capacityOverrides.slot, slotValue)
      )
    );

    return res.json({
      success: true,
      message: "Capacity override deleted successfully",
    });
  } catch (error) {
    console.error("[capacity] Error deleting override:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete capacity override",
    });
  }
});

// POST /api/admin/capacity/reset - Reset all capacity overrides
settingsRouter.post("/api/admin/capacity/reset", requireOwnerAuth, async (req: any, res) => {
  try {
    await db.delete(capacityOverrides);
    
    return res.json({
      success: true,
      message: "All capacity overrides have been reset",
    });
  } catch (error) {
    console.error("[capacity] Error resetting overrides:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to reset capacity overrides",
    });
  }
});

// POST /api/admin/capacity/upsert - Create or update capacity overrides
settingsRouter.post("/api/admin/capacity/upsert", requireOwnerAuth, async (req: any, res) => {
  try {
    const validation = upsertCapacitySchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
    }

    const { service, mode, date, dateStart, dateEnd, slot, capacity } = validation.data;

    // Normalize slot: use "ALL_DAY" for null/empty slots
    const slotValue = (slot && slot.trim()) || "ALL_DAY";

    if (mode === "reset") {
      // Delete all overrides for this service/slot combination
      await db
        .delete(capacityOverrides)
        .where(
          and(
            eq(capacityOverrides.service, service),
            eq(capacityOverrides.slot, slotValue)
          )
        );

      return res.json({
        success: true,
        message: "Capacity reset to defaults",
      });
    }

    if (mode === "single" && date && capacity !== undefined) {
      // Upsert override for single date (idempotent)
      await db.insert(capacityOverrides).values({
        service,
        dateStart: date,
        dateEnd: date,
        slot: slotValue,
        capacity,
      }).onConflictDoUpdate({
        target: [
          capacityOverrides.service, 
          capacityOverrides.dateStart, 
          capacityOverrides.dateEnd, 
          capacityOverrides.slot
        ],
        set: {
          capacity,
          updatedAt: new Date(),
        },
      });
    } else if (mode === "range" && dateStart && dateEnd && capacity !== undefined) {
      // Upsert override for date range (idempotent)
      await db.insert(capacityOverrides).values({
        service,
        dateStart,
        dateEnd,
        slot: slotValue,
        capacity,
      }).onConflictDoUpdate({
        target: [
          capacityOverrides.service,
          capacityOverrides.dateStart,
          capacityOverrides.dateEnd,
          capacityOverrides.slot
        ],
        set: {
          capacity,
          updatedAt: new Date(),
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        error: "Invalid parameters for selected mode",
      });
    }

    return res.json({
      success: true,
      message: "Capacity updated successfully",
    });
  } catch (error) {
    console.error("[capacity] Error upserting capacity:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update capacity",
    });
  }
});

export default settingsRouter;