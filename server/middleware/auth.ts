import { Request, Response, NextFunction } from 'express';
import { admin } from '../firebase-admin';
import { db } from '../db/client';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { ensureTenant } from '../services/userService';

// Extend Request type to include user info
export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    admin: boolean;
  };
}

// Middleware to verify Firebase authentication
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const hdr = req.headers.authorization || "";
    const alt = (req.headers["x-id-token"] as string) || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : alt;
    
    if (!token) {
      console.error("auth middleware: missing token");
      return res.status(401).json({ message: 'Authentication token required' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    
    if (!decodedToken?.email) {
      console.error("auth middleware: token has no email", decodedToken?.uid);
      return res.status(401).json({ message: 'Invalid token - no email' });
    }

    // Check database for user by Firebase UID (not email) and auto-create if needed
    let dbUser = await db.select().from(users).where(eq(users.id, decodedToken.uid));
    
    if (dbUser.length === 0) {
      // Auto-bootstrap user on first authenticated request (idempotent)
      try {
        const tenantId = await ensureTenant();
        await db.insert(users).values({
          tenantId,
          id: decodedToken.uid,
          email: decodedToken.email,
          name: decodedToken.name || null,
          role: "user",
        }).onConflictDoNothing(); // Make idempotent to avoid race conditions
        console.log("auth: auto-bootstrapped user", { uid: decodedToken.uid, email: decodedToken.email, tenantId });
        
        // Re-fetch the user (will exist now)
        dbUser = await db.select().from(users).where(eq(users.id, decodedToken.uid));
      } catch (error) {
        console.error("auth: failed to bootstrap user", { uid: decodedToken.uid, error });
        return res.status(500).json({ message: 'Failed to initialize user account' });
      }
    }
    
    const adminStatus = dbUser.length > 0 && dbUser[0].role === 'admin';
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      admin: adminStatus
    };

    next();
  } catch (error: any) {
    const code = error?.code || error?.errorInfo?.code || 'unknown';
    const detail = error?.message || 'unknown error';
    console.error('auth middleware: verifyIdToken failed', { code, detail });
    res.status(401).json({
      message: 'Invalid authentication token',
      firebaseError: code,
      detail,
    });
  }
}

// Middleware to require admin privileges
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user?.admin) {
    return res.status(403).json({ message: 'Admin privileges required' });
  }
  next();
}

// Optional authentication - sets user if token provided
export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const hdr = req.headers.authorization || "";
    const alt = (req.headers["x-id-token"] as string) || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : alt;
    
    if (token) {
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      if (decodedToken?.email) {
        // Check database for user role by Firebase UID (consistent with requireAuth)
        const dbUser = await db.select().from(users).where(eq(users.id, decodedToken.uid));
        const adminStatus = dbUser.length > 0 && dbUser[0].role === 'admin';
      
        req.user = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          admin: adminStatus
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
}