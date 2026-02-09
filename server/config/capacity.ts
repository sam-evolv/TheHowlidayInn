import { db } from "../db/client";
import { capacityDefaults, capacityOverrides } from "../db/schema";
import { eq, and, lte, gte, desc } from "drizzle-orm";

// Capacity configuration with environment variable defaults
export const capacityConfig = {
  maxCapacityDaycare: parseInt(process.env.MAX_CAPACITY_DAYCARE || '10', 10),
  maxCapacityBoardingSmall: parseInt(process.env.MAX_CAPACITY_BOARDING_SMALL || '10', 10),
  maxCapacityBoardingLarge: parseInt(process.env.MAX_CAPACITY_BOARDING_LARGE || '8', 10),
  maxCapacityTrial: parseInt(process.env.MAX_CAPACITY_TRIAL || '8', 10),
  reservationTTLMin: parseInt(process.env.RESERVATION_TTL_MIN || '10', 10),
};

export function getCapacityForService(service: string): number {
  const normalized = service.toLowerCase();
  if (normalized === 'daycare') return capacityConfig.maxCapacityDaycare;
  if (normalized === 'boarding small') return capacityConfig.maxCapacityBoardingSmall;
  if (normalized === 'boarding large') return capacityConfig.maxCapacityBoardingLarge;
  if (normalized === 'boarding') return capacityConfig.maxCapacityBoardingSmall; // Default boarding to small
  if (normalized === 'trial day' || normalized === 'trial') return capacityConfig.maxCapacityTrial;
  
  // Default fallback
  return capacityConfig.maxCapacityDaycare;
}

// Get effective capacity considering defaults and overrides
// effectiveCapacity(service, date, slot) = overrides[service,date,slot] ?? defaults[service] ?? fallback
export async function getEffectiveCapacity(
  service: string,
  date: string,
  slot?: string | null
): Promise<number> {
  try {
    // Normalize slot: use "ALL_DAY" for null/empty slots
    const slotValue = (slot && slot.trim()) || "ALL_DAY";

    // Check for override first (most specific match)
    // Order by dateStart DESC to prefer more recent/specific overrides
    const override = await db
      .select()
      .from(capacityOverrides)
      .where(
        and(
          eq(capacityOverrides.service, service),
          lte(capacityOverrides.dateStart, date),
          gte(capacityOverrides.dateEnd, date),
          eq(capacityOverrides.slot, slotValue)
        )
      )
      .orderBy(desc(capacityOverrides.dateStart))
      .limit(1);

    if (override.length > 0) {
      return override[0].capacity;
    }

    // Fall back to default for this service
    const defaultCap = await db
      .select()
      .from(capacityDefaults)
      .where(eq(capacityDefaults.service, service))
      .limit(1);

    if (defaultCap.length > 0) {
      return defaultCap[0].capacity;
    }

    // Ultimate fallback to config values
    return getCapacityForService(service);
  } catch (error) {
    console.error("[capacity] Error getting effective capacity:", error);
    return getCapacityForService(service);
  }
}

export function getReservationTTLMinutes(): number {
  return capacityConfig.reservationTTLMin;
}
