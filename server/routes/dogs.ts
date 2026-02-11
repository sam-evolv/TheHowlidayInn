// TODO HowlidayInn: User-facing dog management API routes

import { Router } from "express";
import { db } from "../db/client";
import { dogs, vaccinations, healthProfiles, settings as tblSettings } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import { computeDogStatus } from "../lib/dogStatus";
import { requireAuth } from "../middleware/auth";
import { dogWizardInsertSchema, dogAboutInsertSchema, vaccinationUpsertSchema, healthProfileUpsertSchema } from "../../shared/schema";
import { handleValidationError, handleDatabaseError, sendErrorResponse } from "../utils/errorUtils";
import { isBreedProhibited } from "../../shared/breeds";
import { ensureTenant } from "../services/userService";

export const dogsRouter = Router();

// GET my dogs
dogsRouter.get("/api/me/dogs", requireAuth, async (req: any, res) => {
  try {
    const myId = req.user.uid;
    console.log("GET /api/me/dogs uid:", myId, "email:", req.user?.email || 'unknown');
    const rows = await db.select().from(dogs).where(eq(dogs.ownerId, myId));
    console.log("GET /api/me/dogs result: count =", rows.length, "for user", req.user?.email || myId);
    res.json(rows);
  } catch (err: any) {
    console.error("GET /api/me/dogs error:", err);
    res.status(500).json({ message: "Failed to load your dogs" });
  }
});

// POST create dog for DogWizard - expects { dog: data } format
dogsRouter.post("/api/me/dogs", requireAuth, async (req: any, res) => {
  try {
    console.log("POST /api/me/dogs uid:", req.user.uid, "email:", req.user?.email || 'unknown', "payload:", JSON.stringify(req.body));
    const myId = req.user.uid;
    
    // Extract dog data from wrapped format
    const dogData = dogAboutInsertSchema.parse(req.body.dog || req.body);
    
    // Check breed policy enforcement
    if (dogData.breed) {
      const settings = await db.query.settings.findFirst({ where: eq(tblSettings.id, 1) });
      const prohibitedBreeds = (settings?.prohibitedBreeds as string[]) || [];
      
      if (isBreedProhibited(dogData.breed, prohibitedBreeds)) {
        return res.status(400).json({ 
          error: "breed_not_allowed",
          message: "We're sorry, but we cannot accommodate this breed at our facility. We'd be happy to recommend other excellent care providers in the area."
        });
      }
    }
    
    const tenantId = await ensureTenant();
    const id = crypto.randomUUID();
    const row = {
      tenantId,
      id, 
      ownerId: myId, 
      name: dogData.name,
      breed: dogData.breed || null,
      sex: dogData.sex || null,
      dob: dogData.dob || null,
      weightKg: dogData.weightKg || null,
      neuteredSpayed: dogData.neuteredSpayed || false,
      color: dogData.color || null,
      microchip: dogData.microchip || null,
      photoUrl: dogData.photoUrl || null,
      vaxTypes: null,
      vaxDate: null,
      vaxExpiry: null,
      temperament: null,
      status: "pending" as const
    };
    
    const [created] = await db.insert(dogs).values([row]).returning();
    console.log("INSERT /api/me/dogs ok:", { id: created.id, ownerId: created.ownerId, name: created.name });
    res.status(201).json(created);
  } catch (err: any) {
    console.error("POST /api/me/dogs error:", err);
    // Handle Zod validation errors specifically
    if (err?.name === 'ZodError') {
      return handleValidationError(err, res, 'POST_/api/me/dogs');
    }
    
    // Handle database errors
    if (err?.code || err?.message?.includes('database')) {
      return handleDatabaseError(err, res, 'POST_/api/me/dogs');
    }
    
    // Handle other errors
    sendErrorResponse(res, err, 'POST_/api/me/dogs', 400, 'Failed to create dog profile');
  }
});

// POST create dog - simplified route per spec
dogsRouter.post("/api/dogs", requireAuth, async (req: any, res) => {
  try {
    console.log("POST /api/dogs uid:", req.user.uid, "email:", req.user?.email || 'unknown', "payload:", JSON.stringify(req.body));
    const myId = req.user.uid;
    
    // Validate request body with Zod schema
    const dogData = dogAboutInsertSchema.parse(req.body);
    
    // Check breed policy enforcement
    if (dogData.breed) {
      const settings = await db.query.settings.findFirst({ where: eq(tblSettings.id, 1) });
      const prohibitedBreeds = (settings?.prohibitedBreeds as string[]) || [];
      
      if (isBreedProhibited(dogData.breed, prohibitedBreeds)) {
        return res.status(400).json({ 
          error: "breed_not_allowed",
          message: "We're sorry, but we cannot accommodate this breed at our facility. We'd be happy to recommend other excellent care providers in the area."
        });
      }
    }
    
    const tenantId = await ensureTenant();
    const id = crypto.randomUUID();
    const row = {
      tenantId,
      id, 
      ownerId: myId, 
      name: dogData.name,
      breed: dogData.breed || null,
      sex: dogData.sex || null,
      dob: dogData.dob || null,
      weightKg: dogData.weightKg || null,
      neuteredSpayed: dogData.neuteredSpayed || false,
      color: dogData.color || null,
      microchip: dogData.microchip || null,
      photoUrl: dogData.photoUrl || null,
      vaxTypes: null,
      vaxDate: null,
      vaxExpiry: null,
      temperament: null,
      status: "pending" as const
    };
    
    const [created] = await db.insert(dogs).values([row]).returning();
    console.log("INSERT /api/dogs ok:", { id: created.id, ownerId: created.ownerId, name: created.name });
    res.status(201).json(created);
  } catch (err: any) {
    console.error("POST /api/dogs error:", err);
    // Handle Zod validation errors specifically
    if (err?.name === 'ZodError') {
      return handleValidationError(err, res, 'POST_/api/dogs');
    }
    
    // Handle database errors
    if (err?.code || err?.message?.includes('database')) {
      return handleDatabaseError(err, res, 'POST_/api/dogs');
    }
    
    // Handle other errors
    sendErrorResponse(res, err, 'POST_/api/dogs', 400, 'Failed to create dog profile');
  }
});

// DELETE dog
dogsRouter.delete("/api/me/dogs/:id", requireAuth, async (req: any, res) => {
  try {
    const myId = req.user.uid;
    const { id } = req.params;
    
    // Verify dog ownership
    const dog = await db.query.dogs.findFirst({ 
      where: and(eq(dogs.id, id), eq(dogs.ownerId, myId)) 
    });
    
    if (!dog) {
      return res.status(404).json({ error: "Dog not found" });
    }
    
    await db.delete(dogs).where(eq(dogs.id, id));
    res.json({ ok: true });
  } catch (error) {
    handleDatabaseError(error, res, 'DELETE_/api/me/dogs/:id');
  }
});

// PATCH update dog about fields
dogsRouter.patch("/api/me/dogs/:id", requireAuth, async (req: any, res) => {
  try {
    const myId = req.user.uid;
    const { id } = req.params;
    const existing = await db.query.dogs.findFirst({ where: and(eq(dogs.id, id), eq(dogs.ownerId, myId)) });
    if (!existing) return res.sendStatus(404);
    
    const dogData = dogWizardInsertSchema.partial().parse(req.body?.dog || {});
    
    // Check breed policy enforcement if breed is being updated
    if (dogData.breed) {
      const settings = await db.query.settings.findFirst({ where: eq(tblSettings.id, 1) });
      const prohibitedBreeds = (settings?.prohibitedBreeds as string[]) || [];
      
      if (isBreedProhibited(dogData.breed, prohibitedBreeds)) {
        return res.status(400).json({ 
          error: "breed_not_allowed",
          message: "We're sorry, but we cannot accommodate this breed at our facility. We'd be happy to recommend other excellent care providers in the area."
        });
      }
    }
    
    // Filter to only valid database columns and handle type conversions
    const updateData: any = {};
    if (dogData.name) updateData.name = dogData.name;
    if (dogData.breed) updateData.breed = dogData.breed;
    if (dogData.sex) updateData.sex = dogData.sex;
    if (dogData.weightKg) updateData.weightKg = parseFloat(dogData.weightKg as string);
    if (dogData.photoUrl) updateData.photoUrl = dogData.photoUrl;
    if (dogData.vaxTypes) updateData.vaxTypes = dogData.vaxTypes;
    if (dogData.vaxDate) updateData.vaxDate = dogData.vaxDate;
    if (dogData.vaxExpiry) updateData.vaxExpiry = dogData.vaxExpiry;
    if (dogData.temperament) updateData.temperament = dogData.temperament;
    
    await db.update(dogs).set(updateData).where(eq(dogs.id, id));
    
    // Recompute status if breed or vaccination data changed
    if (dogData.breed || dogData.vaxTypes || dogData.vaxDate || dogData.vaxExpiry) {
      const updatedDog = await db.query.dogs.findFirst({ where: eq(dogs.id, id) });
      if (updatedDog) {
        const settings = await db.query.settings.findFirst({ where: eq(tblSettings.id, 1) });
        const vax = await db.select().from(vaccinations).where(eq(vaccinations.dogId, id));
        const { status: newStatus, nextExpiry } = computeDogStatus(updatedDog, vax, { 
          requiredVaccines: (settings?.requiredVaccines as any) || [], 
          prohibitedBreeds: (settings?.prohibitedBreeds as string[]) || [] 
        });
        await db.update(dogs).set({ 
          status: newStatus, 
          nextExpiry: nextExpiry || null 
        }).where(eq(dogs.id, id));
      }
    }
    
    res.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid dog data", details: error.errors });
    }
    console.error('Error updating dog:', error);
    res.status(500).json({ error: "Failed to update dog profile" });
  }
});

// POST upsert vaccination
dogsRouter.post("/api/me/dogs/:id/vaccinations", requireAuth, async (req: any, res) => {
  try {
    const myId = req.user.uid;
    const { id } = req.params;
    const vaccinationData = vaccinationUpsertSchema.parse(req.body);
    
    const d = await db.query.dogs.findFirst({ where: and(eq(dogs.id, id), eq(dogs.ownerId, myId)) });
    if (!d) return res.sendStatus(404);
    
    const vId = crypto.randomUUID();
    
    // naive upsert by delete+insert to keep code short
    await db.delete(vaccinations).where(and(eq(vaccinations.dogId, id), eq(vaccinations.type, vaccinationData.type)));
    await db.insert(vaccinations).values({
      id: vId,
      dogId: id,
      ...vaccinationData,
      dateAdministered: vaccinationData.dateAdministered ? new Date(vaccinationData.dateAdministered) : null,
      validUntil: vaccinationData.validUntil ? new Date(vaccinationData.validUntil) : null,
    });

    // recompute status
    const sets = await db.query.settings.findFirst({ where: eq(tblSettings.id, 1) });
    const vax = await db.select().from(vaccinations).where(eq(vaccinations.dogId, id));
    const { status, nextExpiry } = computeDogStatus(d, vax, { 
      requiredVaccines: (sets?.requiredVaccines as any) || [], 
      prohibitedBreeds: (sets?.prohibitedBreeds as string[]) || [] 
    });
    await db.update(dogs).set({ status, nextExpiry: nextExpiry || null }).where(eq(dogs.id, id));
    res.json({ ok: true, status, nextExpiry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid vaccination data", details: error.errors });
    }
    console.error('Error saving vaccination:', error);
    res.status(500).json({ error: "Failed to save vaccination" });
  }
});

// POST vaccination card (simplified - single photo upload)
dogsRouter.post("/api/me/dogs/:id/vaccination-card", requireAuth, async (req: any, res) => {
  try {
    const myId = req.user.uid;
    const { id } = req.params;
    const { vaccinationCardUrl, vaccinationNotes } = req.body;
    
    if (!vaccinationCardUrl) {
      return res.status(400).json({ error: "Vaccination card photo is required" });
    }
    
    const d = await db.query.dogs.findFirst({ where: and(eq(dogs.id, id), eq(dogs.ownerId, myId)) });
    if (!d) return res.sendStatus(404);
    
    // Update the dog's vaccination proof URL and notes
    const updateData: any = {
      vaccinationProofUrl: vaccinationCardUrl,
      vaccinationNotes: vaccinationNotes || null,
      updatedAt: new Date()
    };
    
    await db.update(dogs).set(updateData).where(eq(dogs.id, id));
    
    console.log("POST /api/me/dogs/:id/vaccination-card ok:", { dogId: id, hasUrl: !!vaccinationCardUrl });
    res.json({ ok: true });
  } catch (error) {
    console.error('Error saving vaccination card:', error);
    res.status(500).json({ error: "Failed to save vaccination card" });
  }
});

// GET health
dogsRouter.get("/api/me/dogs/:id/health", requireAuth, async (req: any, res) => {
  try {
    const myId = req.user.uid;
    const { id } = req.params;
    const [d] = await db.select().from(dogs).where(and(eq(dogs.id, id), eq(dogs.ownerId, myId))).limit(1);
    if (!d) return res.sendStatus(404);
    const rows = await db.select().from(healthProfiles).where(eq(healthProfiles.dogId, id)).limit(1);
    res.json(rows[0] || {});
  } catch (error: any) {
    console.error('[health-get] ERROR:', error?.message || error, "code:", error?.code);
    res.status(500).json({ error: "Failed to fetch health profile", message: error?.message || String(error) });
  }
});

// PATCH health
dogsRouter.patch("/api/me/dogs/:id/health", requireAuth, async (req: any, res) => {
  const { id } = req.params;
  console.log("[health-save] START dogId:", id, "uid:", req.user?.uid, "body-keys:", Object.keys(req.body || {}));
  try {
    const myId = req.user.uid;

    // Step 1: verify dog ownership
    const [d] = await db.select().from(dogs).where(and(eq(dogs.id, id), eq(dogs.ownerId, myId))).limit(1);
    if (!d) {
      console.log("[health-save] dog not found for uid:", myId, "dogId:", id);
      return res.sendStatus(404);
    }
    console.log("[health-save] dog found:", d.name);

    // Step 2: validate request body
    const healthData = healthProfileUpsertSchema.parse(req.body || {});
    console.log("[health-save] zod parse OK, keys:", Object.keys(healthData));

    // Step 3: remove frontend-only fields that don't exist in database
    const { accuracyConfirmation, emergencyTreatmentConsent, ...dbHealthData } = healthData;

    // Step 4: upsert health profile
    const existingRows = await db.select().from(healthProfiles).where(eq(healthProfiles.dogId, id)).limit(1);
    if (existingRows.length > 0) {
      console.log("[health-save] updating existing profile");
      await db.update(healthProfiles).set({ ...dbHealthData, updatedAt: new Date() }).where(eq(healthProfiles.dogId, id));
    } else {
      console.log("[health-save] inserting new profile");
      await db.insert(healthProfiles).values({ dogId: id, ...dbHealthData });
    }

    console.log("[health-save] SUCCESS");
    res.json({ ok: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error("[health-save] ZodError:", JSON.stringify(error.errors));
      return res.status(400).json({ error: "Invalid health data", details: error.errors });
    }
    console.error("[health-save] ERROR:", error?.message || error, "code:", error?.code, "detail:", error?.detail);
    res.status(500).json({
      error: "Failed to save health profile",
      message: error?.message || String(error),
      code: error?.code,
      detail: error?.detail,
    });
  }
});

export default dogsRouter;