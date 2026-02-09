import { db } from "../db/client";
import { reservations, availability } from "../db/schema";
import { and, eq, lt, sql } from "drizzle-orm";

let sweeperInterval: NodeJS.Timeout | null = null;

// TTL Sweeper: Find and expire reservations that have passed their expiry time
export async function sweepExpiredReservations(): Promise<number> {
  try {
    const now = new Date();
    
    // Find all active reservations that have expired
    const expiredReservations = await db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.status, "active"),
          lt(reservations.expiresAt, now)
        )
      );

    if (expiredReservations.length === 0) {
      return 0;
    }

    console.log(`[sweeper] Found ${expiredReservations.length} expired reservations to clean up`);

    // Process each expired reservation
    for (const reservation of expiredReservations) {
      try {
        await db.transaction(async (tx: any) => {
          // Mark reservation as expired
          await tx
            .update(reservations)
            .set({ 
              status: "expired",
              updatedAt: new Date(),
            })
            .where(eq(reservations.id, reservation.id));

          // Build availability query conditions
          const conditions = [
            eq(availability.service, reservation.service),
            eq(availability.date, reservation.date),
          ];

          if (reservation.slot) {
            conditions.push(eq(availability.slot, reservation.slot));
          } else {
            conditions.push(eq(availability.slot, null as any));
          }

          // Decrement reserved count
          await tx
            .update(availability)
            .set({ 
              reserved: sql`GREATEST(0, ${availability.reserved} - 1)`,
              updatedAt: new Date(),
            })
            .where(and(...conditions));
        });

        console.log(`[sweeper] Expired reservation ${reservation.id} for ${reservation.service} on ${reservation.date}`);
      } catch (error) {
        console.error(`[sweeper] Error expiring reservation ${reservation.id}:`, error);
      }
    }

    return expiredReservations.length;
  } catch (error) {
    console.error("[sweeper] Error in TTL sweeper:", error);
    return 0;
  }
}

// Start the sweeper to run every minute
export function startSweeper(intervalMinutes: number = 1): void {
  if (sweeperInterval) {
    console.log("[sweeper] Sweeper already running");
    return;
  }

  console.log(`[sweeper] Starting TTL sweeper (runs every ${intervalMinutes} minute(s))`);
  
  // Run immediately on start
  sweepExpiredReservations().catch(err => {
    console.error("[sweeper] Initial sweep failed:", err);
  });

  // Then run on interval
  sweeperInterval = setInterval(() => {
    sweepExpiredReservations().catch(err => {
      console.error("[sweeper] Sweep failed:", err);
    });
  }, intervalMinutes * 60 * 1000);
}

// Stop the sweeper
export function stopSweeper(): void {
  if (sweeperInterval) {
    clearInterval(sweeperInterval);
    sweeperInterval = null;
    console.log("[sweeper] TTL sweeper stopped");
  }
}
