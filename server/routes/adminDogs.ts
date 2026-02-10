// TODO HowlidayInn: Admin dashboard API routes for dog management

import { Router } from "express";
import crypto from "crypto";
import { db } from "../db/client";
import { dogs, users, vaccinations, healthProfiles, settings as tblSettings } from "../db/schema";
import { and, eq, ilike, or, sql, gte, lte } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { requireOwnerAuth, getAuth } from "../auth/session";
import { computeDogStatus } from "../lib/dogStatus";

export const adminDogsRouter = Router();

// List with filters
adminDogsRouter.get("/api/admin/dogs", requireOwnerAuth, async (req: any, res: any) => {
  try {
    const { status, owner, breed, q, expiringInDays } = req.query;
    console.log("GET /api/admin/dogs admin:", req.user?.email || req.user?.uid, "filters:", { status, owner, breed, q, expiringInDays });
    
    // Build query with JOIN to include owner information
    const statusFilter = status || 'all';
    
    // Build the query conditionally 
    const queryBuilder = db.select({
      id: dogs.id,
      ownerId: dogs.ownerId,
      name: dogs.name,
      breed: dogs.breed,
      sex: dogs.sex,
      dob: dogs.dob,
      weightKg: dogs.weightKg,
      neuteredSpayed: dogs.neuteredSpayed,
      color: dogs.color,
      microchip: dogs.microchip,
      photoUrl: dogs.photoUrl,
      vaxTypes: dogs.vaxTypes,
      vaxDate: dogs.vaxDate,
      vaxExpiry: dogs.vaxExpiry,
      temperament: dogs.temperament,
      status: dogs.status,
      disallowedReason: dogs.disallowedReason,
      nextExpiry: dogs.nextExpiry,
      createdAt: dogs.createdAt,
      updatedAt: dogs.updatedAt,
      // Include owner information
      ownerName: users.name,
      ownerEmail: users.email
    })
    .from(dogs)
    .leftJoin(users, eq(dogs.ownerId, users.id));
    
    // Apply status filter if not 'all'
    const rows = statusFilter !== 'all' 
      ? await queryBuilder.where(eq(dogs.status, statusFilter))
      : await queryBuilder;
    console.log("GET /api/admin/dogs result: count =", rows.length, "for admin", req.user?.email || req.user?.uid, "status filter:", statusFilter);
    res.json(rows);
  } catch (error) {
    console.error("GET /api/admin/dogs error:", error);
    res.status(500).json({ error: "Failed to fetch dogs" });
  }
});

// Detail
adminDogsRouter.get("/api/admin/dogs/:id", requireOwnerAuth, async (req: any, res: any) => {
  const { id } = req.params;
  const d = await db.query.dogs.findFirst({ where: eq(dogs.id, id) });
  if (!d) return res.sendStatus(404);
  const vax = await db.select().from(vaccinations).where(eq(vaccinations.dogId, id));
  const hp = await db.query.healthProfiles.findFirst({ where: eq(healthProfiles.dogId, id) });
  res.json({ dog: d, vaccinations: vax, health: hp });
});

// Approve or reject
adminDogsRouter.patch("/api/admin/dogs/:id/status", requireOwnerAuth, async (req: any, res: any) => {
  const { id } = req.params;
  const { status, reason } = req.body || {};
  const d = await db.query.dogs.findFirst({ where: eq(dogs.id, id) });
  if (!d) return res.sendStatus(404);
  
  if (status === "rejected") {
    await db.update(dogs).set({ status, disallowedReason: reason || null }).where(eq(dogs.id, id));
    return res.json({ ok: true, status: "rejected" });
  }
  
  // Approve path - set to approved immediately
  if (status === "approved") {
    const sets = await db.query.settings.findFirst({ where: eq(tblSettings.id, 1) });
    const vax = await db.select().from(vaccinations).where(eq(vaccinations.dogId, id));
    const { nextExpiry } = computeDogStatus(d, vax, { 
      requiredVaccines: (sets?.requiredVaccines as any) || [], 
      prohibitedBreeds: (sets?.prohibitedBreeds as string[]) || [] 
    });
    
    // Set status to approved immediately as requested by admin
    await db.update(dogs).set({ 
      status: "approved", 
      nextExpiry: nextExpiry || null, 
      disallowedReason: null 
    }).where(eq(dogs.id, id));
    
    return res.json({ ok: true, status: "approved", nextExpiry });
  }
  
  // Default fallback
  return res.status(400).json({ error: "Invalid status value" });
});

// Daily vaccine scan — accepts CRON token (x-admin-cron header) OR admin session cookie
adminDogsRouter.post("/api/admin/tasks/daily-vaccine-scan", async (req: any, res) => {
  // Method 1: CRON token via header (for automated schedulers)
  const provided = String(req.headers["x-admin-cron"] || "");
  const expected = process.env.ADMIN_CRON_TOKEN || "";
  const validCronToken = !!(expected && provided &&
    provided.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected)));

  // Method 2: Admin session cookie (for manual admin triggers)
  const validAdminSession = !!getAuth(req);

  if (!validCronToken && !validAdminSession) {
    return res.sendStatus(401);
  }
  
  const sets = await db.query.settings.findFirst({ where: eq(tblSettings.id, 1) });
  const allDogs = await db.select().from(dogs);
  
  for (const d of allDogs) {
    const vax = await db.select().from(vaccinations).where(eq(vaccinations.dogId, d.id));
    const { status, nextExpiry } = computeDogStatus(d, vax, { 
      requiredVaccines: (sets?.requiredVaccines as any) || [], 
      prohibitedBreeds: (sets?.prohibitedBreeds as string[]) || [] 
    });
    await db.update(dogs).set({ status, nextExpiry: nextExpiry || null }).where(eq(dogs.id, d.id));
    // TODO HowlidayInn: optionally queue reminders for 30, 14, 7 days
  }
  
  res.json({ ok: true, scanned: true });
});

export default adminDogsRouter;