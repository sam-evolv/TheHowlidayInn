import { Router } from "express";
import { db } from "../db/client";
import { users, bookings, settings as tblSettings } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import type { AuthenticatedRequest } from "../middleware/auth";

export const usersRouter = Router();

// GET current user profile
usersRouter.get("/api/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const uid = req.user!.uid;

    // Fetch user from database
    const user = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      phone: users.phone,
      role: users.role,
      completedTrial: users.completedTrial,
      createdAt: users.createdAt
    }).from(users).where(eq(users.id, uid));
    
    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(user[0]);
  } catch (err: any) {
    console.error("GET /api/me error:", err);
    res.status(500).json({ message: "Failed to load profile" });
  }
});

// GET trial status - check if user needs to complete trial before booking other services
usersRouter.get("/api/me/trial-status", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const uid = req.user!.uid;
    
    // Fetch trial rules from settings
    const settings = await db.query.settings.findFirst({ where: eq(tblSettings.id, 1) });
    const trialRules = (settings?.trialRules as any) || {};
    
    // If trial is not required for new customers, allow access
    if (!trialRules.required_for_new_customers) {
      return res.json({ 
        needsTrial: false,
        reason: "trial_not_required"
      });
    }
    
    // Check if user has completed trial
    const user = await db.select({
      completedTrial: users.completedTrial
    }).from(users).where(eq(users.id, uid));
    
    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const needsTrial = !user[0].completedTrial;
    
    res.json({ 
      needsTrial,
      completedTrial: user[0].completedTrial,
      reason: needsTrial ? "trial_required" : "trial_completed"
    });
  } catch (err: any) {
    console.error("GET /api/me/trial-status error:", err);
    res.status(500).json({ message: "Failed to check trial status" });
  }
});

// PATCH update user profile (name, phone)
usersRouter.patch("/api/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { name, phone } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: "Name is required" });
    }

    const updateData: Record<string, any> = {
      name: name.trim()
    };

    // Update phone if provided (allow clearing it with empty string)
    if (phone !== undefined) {
      updateData.phone = typeof phone === 'string' ? phone.trim() || null : null;
    }

    await db.update(users).set(updateData).where(eq(users.id, uid));

    res.json({ ok: true, message: "Profile updated successfully" });
  } catch (err: any) {
    console.error("PATCH /api/me error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// POST mark trial as completed - requires a paid trial booking
usersRouter.post("/api/me/complete-trial", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const uid = req.user!.uid;

    // Verify user has a confirmed/paid trial booking before allowing completion
    const trialBooking = await db.select().from(bookings).where(
      and(
        eq(bookings.userId, uid),
        eq(bookings.serviceType, 'trial'),
        eq(bookings.paymentStatus, 'paid')
      )
    ).limit(1);

    if (trialBooking.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "No paid trial booking found. Please complete and pay for a trial day first."
      });
    }

    // Update user's completedTrial status
    await db.update(users).set({
      completedTrial: true
    }).where(eq(users.id, uid));

    res.json({
      ok: true,
      completedTrial: true,
      message: "Trial successfully completed"
    });
  } catch (err: any) {
    console.error("POST /api/me/complete-trial error:", err);
    res.status(500).json({ message: "Failed to mark trial as completed" });
  }
});

export default usersRouter;