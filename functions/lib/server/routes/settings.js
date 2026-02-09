// Settings API routes for serving business configuration data
import { Router } from "express";
import { db } from "../db/client";
import { settings } from "../db/schema";
import { eq } from "drizzle-orm";
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
            trialRules: settings.trialRules
        }).from(settings).where(eq(settings.id, 1));
        if (settingsData.length === 0) {
            return res.status(404).json({ message: "Settings not found" });
        }
        const publicSettings = settingsData[0];
        // Ensure all fields have sensible defaults if null
        res.json({
            pricing: publicSettings.pricing || {
                daycare: 20,
                boarding_per_night_single: 25,
                boarding_per_night_two_dogs: 40,
                late_pickup_extra: 10,
                trial_day: 20
            },
            capacity: publicSettings.capacity || {
                large_kennels: 8,
                small_kennels: 12
            },
            policies: publicSettings.policies || {
                vaccinations_required: true,
                kennel_cough_required: true,
                cancellation_policy: "Full refund up to 48h before check-in.",
                neutered_only_facility: false
            },
            contact: publicSettings.contact || {
                phone: "0873345702",
                email: "howlidayinn1@gmail.com",
                booking_confirmations_email: "howlidayinn1@gmail.com"
            },
            hours: publicSettings.hours || {
                weekdays: { drop_off: "8–10am", pick_up: "4–6pm" },
                saturday: { drop_off: "9–11am", pick_up: "4–6pm" },
                sunday: { pick_up: "4–6pm" }
            },
            faqs: publicSettings.faqs || [],
            breedPolicy: publicSettings.breedPolicy || {
                banned_breeds: [],
                crossbreeds_of_banned_not_accepted: false,
                note: ""
            },
            trialRules: publicSettings.trialRules || {
                required_for_new_customers: true
            }
        });
    }
    catch (error) {
        console.error("GET /api/settings/public error:", error);
        res.status(500).json({ message: "Failed to fetch settings" });
    }
});
export default settingsRouter;
