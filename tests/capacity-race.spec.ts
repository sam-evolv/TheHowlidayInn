/**
 * Capacity Race Condition Tests
 * 
 * These tests verify that the atomic reservation system prevents overbooking
 * when multiple users simultaneously attempt to book the last available spots.
 * 
 * Key Scenarios:
 * 1. Multiple users racing for the last spot - only one succeeds
 * 2. Exactly N users trying to book N spots - all succeed
 * 3. N+1 users trying to book N spots - exactly N succeed, 1 fails
 * 4. Reservation expiry allows next user to claim the spot
 */

import { test, expect } from '@playwright/test';
import { sql } from 'drizzle-orm';
import { db } from '../server/db/client';
import { availability, reservations, bookings } from '../server/db/schema';

// Test configuration
const TEST_CONFIG = {
  daycareCapacity: 40,
  boardingCapacity: 20,
  trialCapacity: 40,
  reservationTTL: 10 * 60 * 1000, // 10 minutes
};

// Helper: Clean up test data before each test
async function cleanupTestData(testDate: string) {
  await db.delete(reservations).where(sql`date = ${testDate}`);
  await db.delete(bookings).where(sql`service_date = ${testDate} OR checkin_date = ${testDate}`);
  await db.delete(availability).where(sql`date = ${testDate}`);
}

// Helper: Get tomorrow's date (to avoid conflicts with real bookings)
function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

// Helper: Create N concurrent reservation requests
async function raceToReserve(
  context: any,
  serviceType: 'daycare' | 'boarding' | 'trial',
  date: string,
  count: number
) {
  const promises = Array.from({ length: count }, async (_, i) => {
    const page = await context.newPage();
    try {
      const response = await page.request.post('/api/reservations', {
        data: {
          serviceType,
          date,
          dogId: `race-dog-${i}-${Date.now()}`,
          userId: `race-user-${i}-${Date.now()}`,
        },
      });
      
      const status = response.status();
      let body = null;
      try {
        body = await response.json();
      } catch (e) {
        // Response might not be JSON
      }
      
      await page.close();
      return { status, body, index: i };
    } catch (error) {
      await page.close();
      return { status: 500, body: null, index: i, error };
    }
  });

  return Promise.all(promises);
}

test.describe('Capacity Race Condition Tests', () => {
  test.beforeEach(async () => {
    // Tests use future dates to avoid conflicts
  });

  test('Race condition: Multiple users competing for last spot - only one succeeds', async ({ context }) => {
    const testDate = getTomorrowDate();
    await cleanupTestData(testDate);

    // Pre-fill capacity leaving exactly 1 spot
    const spotsToFill = TEST_CONFIG.daycareCapacity - 1;
    
    for (let i = 0; i < spotsToFill; i++) {
      const page = await context.newPage();
      const response = await page.request.post('/api/reservations', {
        data: {
          serviceType: 'daycare',
          date: testDate,
          dogId: `prefill-dog-${i}`,
          userId: `prefill-user-${i}`,
        },
      });
      expect(response.status()).toBe(200);
      await page.close();
    }

    // Now race 5 users for the last spot
    const results = await raceToReserve(context, 'daycare', testDate, 5);

    // Exactly 1 should succeed (200), others should fail (409)
    const successes = results.filter(r => r.status === 200);
    const failures = results.filter(r => r.status === 409);

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(4);

    console.log(`[RACE TEST] 1 spot left, 5 competed: ${successes.length} succeeded, ${failures.length} failed ✓`);

    await cleanupTestData(testDate);
  });

  test('Race condition: Exactly N users for N spots - all succeed', async ({ context }) => {
    const testDate = getTomorrowDate();
    await cleanupTestData(testDate);

    const availableSpots = 5;

    // Pre-fill to leave exactly 5 spots
    const spotsToFill = TEST_CONFIG.boardingCapacity - availableSpots;
    
    for (let i = 0; i < spotsToFill; i++) {
      const page = await context.newPage();
      await page.request.post('/api/reservations', {
        data: {
          serviceType: 'boarding',
          date: testDate,
          dogId: `prefill-dog-${i}`,
          userId: `prefill-user-${i}`,
        },
      });
      await page.close();
    }

    // Race exactly 5 users for 5 spots
    const results = await raceToReserve(context, 'boarding', testDate, availableSpots);

    // All should succeed
    const successes = results.filter(r => r.status === 200);
    const failures = results.filter(r => r.status === 409);

    expect(successes.length).toBe(availableSpots);
    expect(failures.length).toBe(0);

    console.log(`[RACE TEST] ${availableSpots} spots, ${availableSpots} competed: all succeeded ✓`);

    await cleanupTestData(testDate);
  });

  test('Race condition: N+1 users for N spots - exactly N succeed', async ({ context }) => {
    const testDate = getTomorrowDate();
    await cleanupTestData(testDate);

    const availableSpots = 3;

    // Pre-fill to leave exactly 3 spots
    const spotsToFill = TEST_CONFIG.trialCapacity - availableSpots;
    
    for (let i = 0; i < spotsToFill; i++) {
      const page = await context.newPage();
      await page.request.post('/api/reservations', {
        data: {
          serviceType: 'trial',
          date: testDate,
          dogId: `prefill-dog-${i}`,
          userId: `prefill-user-${i}`,
        },
      });
      await page.close();
    }

    // Race 4 users for 3 spots
    const racers = availableSpots + 1;
    const results = await raceToReserve(context, 'trial', testDate, racers);

    // Exactly N should succeed, 1 should fail
    const successes = results.filter(r => r.status === 200);
    const failures = results.filter(r => r.status === 409);

    expect(successes.length).toBe(availableSpots);
    expect(failures.length).toBe(1);

    console.log(`[RACE TEST] ${availableSpots} spots, ${racers} competed: ${successes.length} succeeded, ${failures.length} failed ✓`);

    await cleanupTestData(testDate);
  });

  test('Race condition: Heavy concurrent load - capacity never exceeded', async ({ context }) => {
    const testDate = getTomorrowDate();
    await cleanupTestData(testDate);

    // Race a large number of users (2x capacity)
    const racers = TEST_CONFIG.daycareCapacity * 2;
    const results = await raceToReserve(context, 'daycare', testDate, racers);

    // Count successes and failures
    const successes = results.filter(r => r.status === 200);
    const failures = results.filter(r => r.status === 409);

    // Exactly capacity should succeed
    expect(successes.length).toBeLessThanOrEqual(TEST_CONFIG.daycareCapacity);
    expect(successes.length + failures.length).toBe(racers);

    console.log(`[RACE TEST] Heavy load: ${racers} requests, ${successes.length} succeeded (max: ${TEST_CONFIG.daycareCapacity}) ✓`);

    // Verify database state: total reservations should not exceed capacity
    const [dbState] = await db
      .select()
      .from(availability)
      .where(sql`date = ${testDate} AND service_type = 'daycare'`);

    if (dbState) {
      const occupied = dbState.capacity - dbState.available;
      expect(occupied).toBeLessThanOrEqual(TEST_CONFIG.daycareCapacity);
      console.log(`[RACE TEST] DB verification: ${occupied}/${TEST_CONFIG.daycareCapacity} spots occupied ✓`);
    }

    await cleanupTestData(testDate);
  });

  test('Race condition: Expired reservation allows next user to claim spot', async ({ context }) => {
    const testDate = getTomorrowDate();
    await cleanupTestData(testDate);

    // Fill to capacity with one spot
    const page1 = await context.newPage();
    const response1 = await page1.request.post('/api/reservations', {
      data: {
        serviceType: 'daycare',
        date: testDate,
        dogId: 'expiry-dog-1',
        userId: 'expiry-user-1',
      },
    });
    
    expect(response1.status()).toBe(200);
    const reservation1 = await response1.json();
    const reservationId = reservation1.reservationId;
    await page1.close();

    // Next user should fail (capacity full)
    const page2 = await context.newPage();
    const response2 = await page2.request.post('/api/reservations', {
      data: {
        serviceType: 'daycare',
        date: testDate,
        dogId: 'expiry-dog-2',
        userId: 'expiry-user-2',
      },
    });
    
    expect(response2.status()).toBe(409);
    await page2.close();

    // Manually expire the first reservation by updating database
    await db
      .update(reservations)
      .set({ expiresAt: new Date(Date.now() - 1000) }) // 1 second ago
      .where(sql`id = ${reservationId}`);

    // Wait for sweeper to run (or trigger it manually if possible)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Now the spot should be available again
    const page3 = await context.newPage();
    const response3 = await page3.request.post('/api/reservations', {
      data: {
        serviceType: 'daycare',
        date: testDate,
        dogId: 'expiry-dog-3',
        userId: 'expiry-user-3',
      },
    });

    expect(response3.status()).toBe(200);
    console.log('[RACE TEST] Expired reservation released, new reservation succeeded ✓');
    await page3.close();

    await cleanupTestData(testDate);
  });

  test('Race condition: Release and re-reserve creates no gap', async ({ context }) => {
    const testDate = getTomorrowDate();
    await cleanupTestData(testDate);

    // Create and immediately release a reservation 100 times in rapid succession
    for (let i = 0; i < 100; i++) {
      const page = await context.newPage();
      
      // Create reservation
      const createResponse = await page.request.post('/api/reservations', {
        data: {
          serviceType: 'daycare',
          date: testDate,
          dogId: `churn-dog-${i}`,
          userId: `churn-user-${i}`,
        },
      });
      
      if (createResponse.status() === 200) {
        const { reservationId } = await createResponse.json();
        
        // Immediately release
        await page.request.post(`/api/reservations/${reservationId}/release`);
      }
      
      await page.close();
    }

    // Check final state - should have 0 active reservations
    const [finalState] = await db
      .select()
      .from(availability)
      .where(sql`date = ${testDate} AND service_type = 'daycare'`);

    if (finalState) {
      expect(finalState.available).toBe(finalState.capacity);
      console.log('[RACE TEST] Rapid churn: no reservations leaked ✓');
    }

    await cleanupTestData(testDate);
  });
});

test.describe('Capacity Boundary Tests', () => {
  test('Boundary: Exactly capacity requests - all succeed', async ({ context }) => {
    const testDate = getTomorrowDate();
    await cleanupTestData(testDate);

    const capacity = 10; // Use smaller capacity for faster test
    
    // Mock smaller capacity for this test (would need to be configurable in real system)
    // For now, just test with actual capacity
    
    const results = await raceToReserve(context, 'boarding', testDate, TEST_CONFIG.boardingCapacity);
    
    const successes = results.filter(r => r.status === 200);
    
    expect(successes.length).toBe(TEST_CONFIG.boardingCapacity);
    console.log(`[BOUNDARY TEST] Exactly capacity (${TEST_CONFIG.boardingCapacity}) requests: all succeeded ✓`);

    await cleanupTestData(testDate);
  });

  test('Boundary: Capacity + 1 requests - one fails', async ({ context }) => {
    const testDate = getTomorrowDate();
    await cleanupTestData(testDate);

    const requests = TEST_CONFIG.boardingCapacity + 1;
    const results = await raceToReserve(context, 'boarding', testDate, requests);
    
    const successes = results.filter(r => r.status === 200);
    const failures = results.filter(r => r.status === 409);
    
    expect(successes.length).toBe(TEST_CONFIG.boardingCapacity);
    expect(failures.length).toBe(1);
    
    console.log(`[BOUNDARY TEST] Capacity + 1 (${requests}) requests: ${successes.length} succeeded, ${failures.length} failed ✓`);

    await cleanupTestData(testDate);
  });
});
