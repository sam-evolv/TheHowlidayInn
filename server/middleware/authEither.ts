import type { Request, Response, NextFunction } from "express";
import { admin } from "../firebase-admin";
import { db } from "../db/client";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { ensureTenant } from "../services/userService";

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    admin: boolean;
  };
}

export async function authEither(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Try Bearer token first
    const hdr = req.headers.authorization;
    if (hdr?.startsWith("Bearer ")) {
      const idToken = hdr.split(" ")[1];
      const decoded = await admin.auth().verifyIdToken(idToken);
      
      if (decoded?.email) {
        // Check database for user role
        const dbUser = await db.select().from(users).where(eq(users.id, decoded.uid));
        
        // Auto-bootstrap user if needed
        if (dbUser.length === 0) {
          try {
            const tenantId = await ensureTenant();
            await db.insert(users).values({
              tenantId,
              id: decoded.uid,
              email: decoded.email,
              name: decoded.name || null,
              role: "user",
            }).onConflictDoNothing();
            console.log("[authEither] auto-bootstrapped user", { uid: decoded.uid, email: decoded.email });
          } catch (error) {
            console.error("[authEither] failed to bootstrap user", { uid: decoded.uid, error });
          }
        }
        
        const adminStatus = dbUser.length > 0 && dbUser[0].role === "admin";
        req.user = {
          uid: decoded.uid,
          email: decoded.email,
          admin: adminStatus
        };
        return next();
      }
    }
    
    // Try session cookie
    const session = (req as any).cookies?.__session;
    if (session) {
      const decoded = await admin.auth().verifySessionCookie(session, true);
      
      if (decoded?.email) {
        // Check database for user role
        const dbUser = await db.select().from(users).where(eq(users.id, decoded.uid));
        const adminStatus = dbUser.length > 0 && dbUser[0].role === "admin";
        
        req.user = {
          uid: decoded.uid,
          email: decoded.email,
          admin: adminStatus
        };
        return next();
      }
    }
    
    console.error("[authEither] no valid token or cookie found");
    return res.status(401).json({ error: "UNAUTHORIZED" });
  } catch (e: any) {
    console.error("[authEither] error:", e?.message);
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }
}
