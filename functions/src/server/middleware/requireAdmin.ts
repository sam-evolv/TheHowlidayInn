// HowlidayInn: middleware that checks DB role
import { Request, Response, NextFunction } from "express";
import { db } from "../db/client";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const email = (req as any).authUser?.email;
    if (!email) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (result.length === 0) {
      return res.status(403).json({ error: "User not found" });
    }

    if (result[0].role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    next();
  } catch (err: any) {
    console.error("requireAdmin failed", err.message || err);
    res.status(500).json({ error: "Internal server error" });
  }
}