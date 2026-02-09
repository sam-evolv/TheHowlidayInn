import { Router } from 'express';
import { db } from '../db/client';
import { settings as tblSettings, bookings } from '../db/schema';
import { eq } from 'drizzle-orm';
import { requireOwnerAuth } from '../auth/session';

const router = Router();

// Helper functions for revenue calculations
async function getRawRevenue(): Promise<number> {
  const allBookings = await db.select().from(bookings);
  return allBookings
    .filter(b => b.paymentStatus === 'paid')
    .reduce((sum, b) => sum + (b.amount || 0), 0);
}

async function getRevenueOffsets() {
  const settings = await db.query.settings.findFirst({ where: eq(tblSettings.id, 1) });
  const offsets = (settings?.revenueOffsets as any) || { all: 0, byDay: {} };
  return {
    all: Number(offsets.all) || 0,
    byDay: offsets.byDay || {}
  };
}

async function updateRevenueOffsets(offsets: { all: number; byDay: Record<string, number> }) {
  await db
    .insert(tblSettings)
    .values({
      requiredVaccines: [],
      prohibitedBreeds: [],
      revenueOffsets: offsets
    })
    .onConflictDoUpdate({
      target: tblSettings.id,
      set: { revenueOffsets: offsets }
    });
}

// GET /api/admin/settings/revenue-offsets
router.get('/revenue-offsets', requireOwnerAuth, async (req, res) => {
  try {
    const offsets = await getRevenueOffsets();
    const rawRevenue = await getRawRevenue();
    const displayRevenue = Math.max(0, rawRevenue - offsets.all);
    
    res.json({ 
      success: true, 
      offsets,
      rawRevenueCents: rawRevenue,
      displayRevenueCents: displayRevenue
    });
  } catch (error) {
    console.error('[admin.settings] Error fetching revenue offsets:', error);
    res.status(500).json({ success: false, error: 'fetch_failed' });
  }
});

// POST /api/admin/settings/revenue-reset
router.post('/revenue-reset', requireOwnerAuth, async (req, res) => {
  try {
    const { scope } = req.body || {};
    
    if (scope === 'all') {
      const rawRevenue = await getRawRevenue();
      const currentOffsets = await getRevenueOffsets();
      
      await updateRevenueOffsets({
        all: rawRevenue,
        byDay: currentOffsets.byDay
      });
      
      return res.json({ 
        success: true, 
        scope: 'all',
        newDisplayRevenueCents: 0,
        offsetAppliedCents: rawRevenue
      });
    }
    
    res.status(400).json({ success: false, error: 'invalid_scope' });
  } catch (error) {
    console.error('[admin.settings] Revenue reset error:', error);
    res.status(500).json({ success: false, error: 'reset_failed' });
  }
});

// GET /api/admin/settings/restricted-breeds
router.get('/restricted-breeds', requireOwnerAuth, async (req, res) => {
  try {
    const settings = await db.query.settings.findFirst({ where: eq(tblSettings.id, 1) });
    const breeds = (settings?.prohibitedBreeds as string[]) || [];
    
    res.json({ success: true, breeds });
  } catch (error) {
    console.error('[admin.settings] Error fetching restricted breeds:', error);
    res.status(500).json({ success: false, error: 'fetch_failed' });
  }
});

// POST /api/admin/settings/restricted-breeds
router.post('/restricted-breeds', requireOwnerAuth, async (req, res) => {
  try {
    const { breed } = req.body || {};
    
    if (!breed || typeof breed !== 'string' || !breed.trim()) {
      return res.status(400).json({ success: false, error: 'missing_breed' });
    }
    
    const settings = await db.query.settings.findFirst({ where: eq(tblSettings.id, 1) });
    const currentBreeds = (settings?.prohibitedBreeds as string[]) || [];
    
    // Normalize and check for duplicates
    const normalizedBreed = breed.trim().toLowerCase();
    const normalizedExisting = currentBreeds.map(b => b.toLowerCase());
    
    if (normalizedExisting.includes(normalizedBreed)) {
      return res.json({ success: true, breeds: currentBreeds });
    }
    
    const updatedBreeds = [...currentBreeds, breed.trim()];
    
    await db
      .update(tblSettings)
      .set({ prohibitedBreeds: updatedBreeds })
      .where(eq(tblSettings.id, 1));
    
    res.json({ success: true, breeds: updatedBreeds });
  } catch (error) {
    console.error('[admin.settings] Error adding restricted breed:', error);
    res.status(500).json({ success: false, error: 'add_failed' });
  }
});

// DELETE /api/admin/settings/restricted-breeds/:breed
router.delete('/restricted-breeds/:breed', requireOwnerAuth, async (req, res) => {
  try {
    const { breed } = req.params;
    
    if (!breed) {
      return res.status(400).json({ success: false, error: 'missing_breed' });
    }
    
    const settings = await db.query.settings.findFirst({ where: eq(tblSettings.id, 1) });
    const currentBreeds = (settings?.prohibitedBreeds as string[]) || [];
    
    // Case-insensitive removal
    const normalizedBreed = decodeURIComponent(breed).toLowerCase();
    const updatedBreeds = currentBreeds.filter(b => b.toLowerCase() !== normalizedBreed);
    
    await db
      .update(tblSettings)
      .set({ prohibitedBreeds: updatedBreeds })
      .where(eq(tblSettings.id, 1));
    
    res.json({ success: true, breeds: updatedBreeds });
  } catch (error) {
    console.error('[admin.settings] Error removing restricted breed:', error);
    res.status(500).json({ success: false, error: 'remove_failed' });
  }
});

export default router;
