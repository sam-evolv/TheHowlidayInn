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
export const dogsRouter = Router();
// GET my dogs
dogsRouter.get("/api/me/dogs", requireAuth, async (req, res) => {
    try {
        const myId = req.user.uid;
        console.log("GET /api/me/dogs uid:", myId, "email:", req.user?.email || 'unknown');
        const rows = await db.select().from(dogs).where(eq(dogs.ownerId, myId));
        console.log("GET /api/me/dogs result: count =", rows.length, "for user", req.user?.email || myId);
        res.json(rows);
    }
    catch (err) {
        console.error("GET /api/me/dogs error:", err);
        res.status(500).json({ message: "Failed to load your dogs" });
    }
});
// POST create dog for DogWizard - expects { dog: data } format
dogsRouter.post("/api/me/dogs", requireAuth, async (req, res) => {
    try {
        console.log("POST /api/me/dogs uid:", req.user.uid, "email:", req.user?.email || 'unknown', "payload:", JSON.stringify(req.body));
        const myId = req.user.uid;
        // Extract dog data from wrapped format
        const dogData = dogAboutInsertSchema.parse(req.body.dog || req.body);
        // Check breed policy enforcement
        if (dogData.breed) {
            const settings = await db.query.settings.findFirst({ where: eq(tblSettings.id, 1) });
            const prohibitedBreeds = settings?.prohibitedBreeds || [];
            if (isBreedProhibited(dogData.breed, prohibitedBreeds)) {
                return res.status(400).json({
                    error: "breed_not_allowed",
                    message: "We're sorry, but we cannot accommodate this breed at our facility. We'd be happy to recommend other excellent care providers in the area."
                });
            }
        }
        const id = crypto.randomUUID();
        const row = {
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
            status: "pending"
        };
        const [created] = await db.insert(dogs).values([row]).returning();
        console.log("INSERT /api/me/dogs ok:", { id: created.id, ownerId: created.ownerId, name: created.name });
        res.status(201).json(created);
    }
    catch (err) {
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
dogsRouter.post("/api/dogs", requireAuth, async (req, res) => {
    try {
        console.log("POST /api/dogs uid:", req.user.uid, "email:", req.user?.email || 'unknown', "payload:", JSON.stringify(req.body));
        const myId = req.user.uid;
        // Validate request body with Zod schema
        const dogData = dogAboutInsertSchema.parse(req.body);
        // Check breed policy enforcement
        if (dogData.breed) {
            const settings = await db.query.settings.findFirst({ where: eq(tblSettings.id, 1) });
            const prohibitedBreeds = settings?.prohibitedBreeds || [];
            if (isBreedProhibited(dogData.breed, prohibitedBreeds)) {
                return res.status(400).json({
                    error: "breed_not_allowed",
                    message: "We're sorry, but we cannot accommodate this breed at our facility. We'd be happy to recommend other excellent care providers in the area."
                });
            }
        }
        const id = crypto.randomUUID();
        const row = {
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
            status: "pending"
        };
        const [created] = await db.insert(dogs).values([row]).returning();
        console.log("INSERT /api/dogs ok:", { id: created.id, ownerId: created.ownerId, name: created.name });
        res.status(201).json(created);
    }
    catch (err) {
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
dogsRouter.delete("/api/me/dogs/:id", requireAuth, async (req, res) => {
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
    }
    catch (error) {
        handleDatabaseError(error, res, 'DELETE_/api/me/dogs/:id');
    }
});
// PATCH update dog about fields
dogsRouter.patch("/api/me/dogs/:id", requireAuth, async (req, res) => {
    try {
        const myId = req.user.uid;
        const { id } = req.params;
        const existing = await db.query.dogs.findFirst({ where: and(eq(dogs.id, id), eq(dogs.ownerId, myId)) });
        if (!existing)
            return res.sendStatus(404);
        const dogData = dogWizardInsertSchema.partial().parse(req.body?.dog || {});
        // Check breed policy enforcement if breed is being updated
        if (dogData.breed) {
            const settings = await db.query.settings.findFirst({ where: eq(tblSettings.id, 1) });
            const prohibitedBreeds = settings?.prohibitedBreeds || [];
            if (isBreedProhibited(dogData.breed, prohibitedBreeds)) {
                return res.status(400).json({
                    error: "breed_not_allowed",
                    message: "We're sorry, but we cannot accommodate this breed at our facility. We'd be happy to recommend other excellent care providers in the area."
                });
            }
        }
        // Filter to only valid database columns and handle type conversions
        const updateData = {};
        if (dogData.name)
            updateData.name = dogData.name;
        if (dogData.breed)
            updateData.breed = dogData.breed;
        if (dogData.sex)
            updateData.sex = dogData.sex;
        if (dogData.weightKg)
            updateData.weightKg = parseFloat(dogData.weightKg);
        if (dogData.photoUrl)
            updateData.photoUrl = dogData.photoUrl;
        if (dogData.vaxTypes)
            updateData.vaxTypes = dogData.vaxTypes;
        if (dogData.vaxDate)
            updateData.vaxDate = dogData.vaxDate;
        if (dogData.vaxExpiry)
            updateData.vaxExpiry = dogData.vaxExpiry;
        if (dogData.temperament)
            updateData.temperament = dogData.temperament;
        await db.update(dogs).set(updateData).where(eq(dogs.id, id));
        // Recompute status if breed or vaccination data changed
        if (dogData.breed || dogData.vaxTypes || dogData.vaxDate || dogData.vaxExpiry) {
            const updatedDog = await db.query.dogs.findFirst({ where: eq(dogs.id, id) });
            if (updatedDog) {
                const settings = await db.query.settings.findFirst({ where: eq(tblSettings.id, 1) });
                const vax = await db.select().from(vaccinations).where(eq(vaccinations.dogId, id));
                const { status: newStatus, nextExpiry } = computeDogStatus(updatedDog, vax, {
                    requiredVaccines: settings?.requiredVaccines || [],
                    prohibitedBreeds: settings?.prohibitedBreeds || []
                });
                await db.update(dogs).set({
                    status: newStatus,
                    nextExpiry: nextExpiry || null
                }).where(eq(dogs.id, id));
            }
        }
        res.json({ ok: true });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: "Invalid dog data", details: error.errors });
        }
        console.error('Error updating dog:', error);
        res.status(500).json({ error: "Failed to update dog profile" });
    }
});
// POST upsert vaccination
dogsRouter.post("/api/me/dogs/:id/vaccinations", requireAuth, async (req, res) => {
    try {
        const myId = req.user.uid;
        const { id } = req.params;
        const vaccinationData = vaccinationUpsertSchema.parse(req.body);
        const d = await db.query.dogs.findFirst({ where: and(eq(dogs.id, id), eq(dogs.ownerId, myId)) });
        if (!d)
            return res.sendStatus(404);
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
            requiredVaccines: sets?.requiredVaccines || [],
            prohibitedBreeds: sets?.prohibitedBreeds || []
        });
        await db.update(dogs).set({ status, nextExpiry: nextExpiry || null }).where(eq(dogs.id, id));
        res.json({ ok: true, status, nextExpiry });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: "Invalid vaccination data", details: error.errors });
        }
        console.error('Error saving vaccination:', error);
        res.status(500).json({ error: "Failed to save vaccination" });
    }
});
// GET health
dogsRouter.get("/api/me/dogs/:id/health", requireAuth, async (req, res) => {
    const myId = req.user.uid;
    const { id } = req.params;
    const d = await db.query.dogs.findFirst({ where: and(eq(dogs.id, id), eq(dogs.ownerId, myId)) });
    if (!d)
        return res.sendStatus(404);
    const hp = await db.query.healthProfiles.findFirst({ where: eq(healthProfiles.dogId, id) });
    res.json(hp || {});
});
// PATCH health
dogsRouter.patch("/api/me/dogs/:id/health", requireAuth, async (req, res) => {
    try {
        const myId = req.user.uid;
        const { id } = req.params;
        const d = await db.query.dogs.findFirst({ where: and(eq(dogs.id, id), eq(dogs.ownerId, myId)) });
        if (!d)
            return res.sendStatus(404);
        const healthData = healthProfileUpsertSchema.parse(req.body || {});
        // Remove frontend-only fields that don't exist in database
        const { accuracyConfirmation, emergencyTreatmentConsent, ...dbHealthData } = healthData;
        const existing = await db.query.healthProfiles.findFirst({ where: eq(healthProfiles.dogId, id) });
        if (existing) {
            await db.update(healthProfiles).set(dbHealthData).where(eq(healthProfiles.dogId, id));
        }
        else {
            await db.insert(healthProfiles).values({ dogId: id, ...dbHealthData });
        }
        res.json({ ok: true });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: "Invalid health data", details: error.errors });
        }
        console.error('Error saving health profile:', error);
        res.status(500).json({ error: "Failed to save health profile" });
    }
});
export default dogsRouter;
